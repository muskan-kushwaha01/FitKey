-- FitKey XP & Rewards History Support Migration (Additive & Idempotent)
-- Safely complements 20261125_complete_persistence_architecture.sql:
--   1. Adds composite descending indexes for fast per-user XP & redemption history reads.
--   2. Adds SECURITY INVOKER RPC `public.get_xp_history()` returning unified wallet totals,
--      chronological running balances, and joined reward voucher metadata from existing tables.

-- ==============================================================================
-- 1. Composite History Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created
    ON public.xp_transactions(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_created
    ON public.reward_redemptions(user_id, created_at DESC, id DESC);


-- ==============================================================================
-- 2. Authoritative Unified XP History RPC (RLS-Enforced via SECURITY INVOKER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_xp_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_lifetime_earned integer := 0;
    v_total_spent integer := 0;
    v_earned_count integer := 0;
    v_spent_count integer := 0;
    v_entries jsonb := '[]'::jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::integer,
        COALESCE(SUM(CASE WHEN type = 'SPEND' THEN amount ELSE 0 END), 0)::integer,
        COUNT(*) FILTER (WHERE type = 'EARN')::integer,
        COUNT(*) FILTER (WHERE type = 'SPEND')::integer
    INTO v_lifetime_earned, v_total_spent, v_earned_count, v_spent_count
    FROM public.xp_transactions
    WHERE user_id = v_user_id;

    WITH ordered_ledger AS (
        SELECT
            xt.id,
            xt.type,
            xt.amount,
            xt.source,
            xt.ref_id,
            xt.description,
            xt.created_at,
            rr.id AS redemption_id,
            rr.reward_id,
            rr.title AS reward_title,
            rr.status AS redemption_status,
            rr.voucher_code,
            rr.created_at AS redeemed_at,
            GREATEST(
                0,
                SUM(CASE WHEN xt.type = 'EARN' THEN xt.amount ELSE -xt.amount END) OVER (
                    ORDER BY
                        xt.created_at ASC,
                        CASE WHEN xt.type = 'EARN' THEN 0 ELSE 1 END ASC,
                        xt.id ASC
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                )
            )::integer AS balance_after
        FROM public.xp_transactions xt
        LEFT JOIN public.reward_redemptions rr
            ON rr.user_id = xt.user_id
           AND xt.source = 'REWARD'
           AND xt.ref_id = 'redeem-' || rr.reward_id
        WHERE xt.user_id = v_user_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', l.id,
                'type', l.type,
                'amount', l.amount,
                'source', l.source,
                'ref_id', l.ref_id,
                'description', l.description,
                'created_at', l.created_at,
                'balance_after', l.balance_after,
                'redemption_id', l.redemption_id,
                'reward_id', l.reward_id,
                'reward_title', l.reward_title,
                'redemption_status', l.redemption_status,
                'voucher_code', l.voucher_code,
                'redeemed_at', l.redeemed_at
            )
            ORDER BY
                l.created_at DESC,
                CASE WHEN l.type = 'EARN' THEN 0 ELSE 1 END DESC,
                l.id DESC
        ),
        '[]'::jsonb
    )
    INTO v_entries
    FROM ordered_ledger l;

    RETURN jsonb_build_object(
        'success', true,
        'summary', jsonb_build_object(
            'available_xp', GREATEST(0, v_lifetime_earned - v_total_spent),
            'lifetime_earned', v_lifetime_earned,
            'total_spent', v_total_spent,
            'earned_count', v_earned_count,
            'spent_count', v_spent_count,
            'total_count', v_earned_count + v_spent_count
        ),
        'entries', v_entries
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_xp_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_xp_history() TO authenticated;
