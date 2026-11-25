-- ==============================================================================
-- FitKey Database Migration: Hardened Complete Persistence Architecture
-- Description: Establishes Supabase as the permanent, tamper-resistant source of
--              truth for user health tracking, goals, summaries, XP ledger,
--              badges, challenges, and reward redemptions.
-- Date: 2026-11-25 (Audited & Hardened)
-- ==============================================================================

-- ==============================================================================
-- 1. `public.health_metrics`: Add idempotent sync_key + preserve existing RLS
-- ==============================================================================
ALTER TABLE IF EXISTS public.health_metrics
    ADD COLUMN IF NOT EXISTS sync_key TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'health_metrics'
          AND c.conname = 'health_metrics_user_sync_key'
    ) THEN
        ALTER TABLE public.health_metrics
            ADD CONSTRAINT health_metrics_user_sync_key UNIQUE (user_id, sync_key);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date
    ON public.health_metrics(user_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_health_metrics_type_date
    ON public.health_metrics(user_id, metric_type, recorded_at);

ALTER TABLE IF EXISTS public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Non-destructively ensure user-scoped policies exist without dropping existing policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_metrics' AND cmd IN ('SELECT', 'ALL')
    ) THEN
        CREATE POLICY "Users can view their own metrics"
            ON public.health_metrics FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_metrics' AND cmd IN ('INSERT', 'ALL')
    ) THEN
        CREATE POLICY "Users can insert their own metrics"
            ON public.health_metrics FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_metrics' AND cmd IN ('UPDATE', 'ALL')
    ) THEN
        CREATE POLICY "Users can update their own metrics"
            ON public.health_metrics FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_metrics' AND cmd IN ('DELETE', 'ALL')
    ) THEN
        CREATE POLICY "Users can delete their own metrics"
            ON public.health_metrics FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;


-- ==============================================================================
-- 2. `public.health_goals`: Non-destructive indexing & preserve existing RLS
--    Note: Avoids adding a blanket UNIQUE(user_id, metric_type, period) constraint
--    because existing schemas include `is_active`, `start_date`, `end_date` where
--    historical/inactive goals or NULL periods may already exist.
--    Updates are performed safely through `public.upsert_health_goals(jsonb)`.
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_health_goals_user
    ON public.health_goals(user_id);

CREATE INDEX IF NOT EXISTS idx_health_goals_user_metric_period
    ON public.health_goals(user_id, metric_type, period);

ALTER TABLE IF EXISTS public.health_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_goals' AND cmd IN ('SELECT', 'ALL')
    ) THEN
        CREATE POLICY "Users can view their own goals"
            ON public.health_goals FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_goals' AND cmd IN ('INSERT', 'ALL')
    ) THEN
        CREATE POLICY "Users can insert their own goals"
            ON public.health_goals FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_goals' AND cmd IN ('UPDATE', 'ALL')
    ) THEN
        CREATE POLICY "Users can update their own goals"
            ON public.health_goals FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_goals' AND cmd IN ('DELETE', 'ALL')
    ) THEN
        CREATE POLICY "Users can delete their own goals"
            ON public.health_goals FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;
END $$;


-- ==============================================================================
-- 3. `public.daily_wellness_summaries`
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_wellness_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps_total INTEGER DEFAULT 0 CHECK (steps_total >= 0),
    water_ml NUMERIC DEFAULT 0 CHECK (water_ml >= 0),
    sleep_hours NUMERIC DEFAULT 0 CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    active_minutes INTEGER DEFAULT 0 CHECK (active_minutes >= 0),
    overall_pct INTEGER DEFAULT 0 CHECK (overall_pct >= 0 AND overall_pct <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT daily_wellness_summaries_user_date_key UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_wellness_summaries_user_date
    ON public.daily_wellness_summaries(user_id, date);

ALTER TABLE public.daily_wellness_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily summaries" ON public.daily_wellness_summaries;
CREATE POLICY "Users can view their own daily summaries"
    ON public.daily_wellness_summaries FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily summaries" ON public.daily_wellness_summaries;
CREATE POLICY "Users can insert their own daily summaries"
    ON public.daily_wellness_summaries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily summaries" ON public.daily_wellness_summaries;
CREATE POLICY "Users can update their own daily summaries"
    ON public.daily_wellness_summaries FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own daily summaries" ON public.daily_wellness_summaries;
CREATE POLICY "Users can delete their own daily summaries"
    ON public.daily_wellness_summaries FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ==============================================================================
-- 4. `public.xp_transactions` (Read-Only from Client; Server RPC Writes Only)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    ref_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
    ON public.xp_transactions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_dedup
    ON public.xp_transactions(user_id, ref_id)
    WHERE ref_id IS NOT NULL;

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Enforce client read-only access (prevents arbitrary client XP forging)
DROP POLICY IF EXISTS "Users can view their own xp transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can insert their own xp transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can update their own xp transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can delete their own xp transactions" ON public.xp_transactions;

CREATE POLICY "Users can view their own xp transactions"
    ON public.xp_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.xp_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.xp_transactions TO authenticated;


-- ==============================================================================
-- 5. `public.user_badges` (Read-Only from Client; Server RPC Writes Only)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_badges_user_badge_key UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user
    ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can update their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can delete their own badges" ON public.user_badges;

CREATE POLICY "Users can view their own badges"
    ON public.user_badges FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_badges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_badges TO authenticated;


-- ==============================================================================
-- 6. `public.user_challenges` (Read-Only from Client; Server RPC Writes Only)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL,
    date DATE NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    CONSTRAINT user_challenges_user_challenge_date_key UNIQUE (user_id, challenge_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_date
    ON public.user_challenges(user_id, date);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.user_challenges;

CREATE POLICY "Users can view their own challenges"
    ON public.user_challenges FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_challenges TO authenticated;


-- ==============================================================================
-- 7. `public.reward_redemptions` (Read-Only from Client; Server RPC Writes Only)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL,
    title TEXT NOT NULL,
    xp_cost INTEGER NOT NULL CHECK (xp_cost > 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    voucher_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT reward_redemptions_user_reward_key UNIQUE (user_id, reward_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user
    ON public.reward_redemptions(user_id);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Users can update their own redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Users can delete their own redemptions" ON public.reward_redemptions;

CREATE POLICY "Users can view their own redemptions"
    ON public.reward_redemptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.reward_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reward_redemptions TO authenticated;


-- ==============================================================================
-- 8. `public.notifications`: Non-destructive RLS verification
--    Live schema uses `recipient_id` (not `user_id`). Never drops existing policies.
-- ==============================================================================
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'notifications' AND cmd IN ('SELECT', 'ALL')
        ) THEN
            CREATE POLICY "Users can view their own notifications"
                ON public.notifications FOR SELECT
                TO authenticated
                USING (auth.uid() = recipient_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'notifications' AND cmd IN ('UPDATE', 'ALL')
        ) THEN
            CREATE POLICY "Users can update their own notifications"
                ON public.notifications FOR UPDATE
                TO authenticated
                USING (auth.uid() = recipient_id)
                WITH CHECK (auth.uid() = recipient_id);
        END IF;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'notifications' AND cmd IN ('SELECT', 'ALL')
        ) THEN
            CREATE POLICY "Users can view their own notifications"
                ON public.notifications FOR SELECT
                TO authenticated
                USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;


-- ==============================================================================
-- 9. Trusted Server-Side Security Definer RPCs
-- ==============================================================================

-- 9a. Upsert Daily Health Goals safely even with existing historical/inactive rows
CREATE OR REPLACE FUNCTION public.upsert_health_goals(p_goals jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_item record;
    v_target_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_goals IS NULL OR jsonb_typeof(p_goals) <> 'object' THEN
        RAISE EXCEPTION 'Invalid goals payload: expected JSON object';
    END IF;

    FOR v_item IN
        SELECT metric_type, target_value, unit
        FROM (VALUES
            ('steps', (p_goals->>'steps')::numeric, 'steps'),
            ('water', COALESCE((p_goals->>'waterMl')::numeric, (p_goals->>'water')::numeric), 'ml'),
            ('sleep', COALESCE((p_goals->>'sleepHours')::numeric, (p_goals->>'sleep')::numeric), 'hours'),
            ('active_minutes', COALESCE((p_goals->>'activeMinutes')::numeric, (p_goals->>'active_minutes')::numeric), 'minutes')
        ) AS t(metric_type, target_value, unit)
        WHERE target_value IS NOT NULL AND target_value > 0
    LOOP
        SELECT id INTO v_target_id
        FROM public.health_goals
        WHERE user_id = v_user_id
          AND metric_type = v_item.metric_type
          AND COALESCE(period, 'daily') = 'daily'
          AND COALESCE(is_active, true) = true
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1;

        IF v_target_id IS NOT NULL THEN
            UPDATE public.health_goals
            SET target_value = v_item.target_value,
                unit = v_item.unit,
                period = 'daily',
                is_active = true
            WHERE id = v_target_id AND user_id = v_user_id;
        ELSE
            INSERT INTO public.health_goals (
                user_id,
                metric_type,
                target_value,
                unit,
                period,
                is_active,
                start_date
            ) VALUES (
                v_user_id,
                v_item.metric_type,
                v_item.target_value,
                v_item.unit,
                'daily',
                true,
                CURRENT_DATE
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_health_goals(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_health_goals(jsonb) TO authenticated;


-- 9b. Idempotent One-Time Welcome Bonus (+250 XP)
CREATE OR REPLACE FUNCTION public.claim_welcome_xp_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_inserted_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.xp_transactions (
        user_id,
        type,
        amount,
        source,
        ref_id,
        description
    ) VALUES (
        v_user_id,
        'EARN',
        250,
        'INIT',
        'init-starter-bonus',
        'Welcome to FitKey Rewards'
    )
    ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_inserted_id;

    RETURN jsonb_build_object(
        'success', true,
        'awarded', v_inserted_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_welcome_xp_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_xp_bonus() TO authenticated;


-- 9c. Server-Verified Daily Challenge Evaluation & XP Awarding
CREATE OR REPLACE FUNCTION public.evaluate_and_claim_daily_challenges(
    p_date date DEFAULT CURRENT_DATE,
    p_day_start timestamptz DEFAULT NULL,
    p_day_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_start timestamptz;
    v_end timestamptz;
    v_date_str text;
    v_steps_goal numeric := 8000;
    v_water_goal numeric := 2500;
    v_sleep_goal numeric := 8;
    v_active_goal numeric := 30;
    v_steps numeric := 0;
    v_water numeric := 0;
    v_sleep numeric := 0;
    v_active numeric := 0;
    v_done_count integer := 0;
    v_xp_awarded integer := 0;
    v_c record;
    v_progress integer;
    v_completed boolean;
    v_ref_id text;
    v_inserted uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_date IS NULL THEN
        p_date := CURRENT_DATE;
    END IF;

    v_date_str := pg_catalog.to_char(p_date, 'YYYY-MM-DD');
    v_start := COALESCE(p_day_start, p_date::timestamptz);
    v_end := COALESCE(p_day_end, (p_date + 1)::timestamptz);

    -- Read user's active goals from DB (with defaults)
    SELECT COALESCE(
        (SELECT target_value FROM public.health_goals WHERE user_id = v_user_id AND metric_type = 'steps' AND COALESCE(is_active, true) = true ORDER BY created_at DESC NULLS LAST LIMIT 1),
        8000
    ) INTO v_steps_goal;

    SELECT COALESCE(
        (SELECT target_value FROM public.health_goals WHERE user_id = v_user_id AND metric_type = 'water' AND COALESCE(is_active, true) = true ORDER BY created_at DESC NULLS LAST LIMIT 1),
        2500
    ) INTO v_water_goal;

    SELECT COALESCE(
        (SELECT target_value FROM public.health_goals WHERE user_id = v_user_id AND metric_type = 'sleep' AND COALESCE(is_active, true) = true ORDER BY created_at DESC NULLS LAST LIMIT 1),
        8
    ) INTO v_sleep_goal;

    SELECT COALESCE(
        (SELECT target_value FROM public.health_goals WHERE user_id = v_user_id AND metric_type = 'active_minutes' AND COALESCE(is_active, true) = true ORDER BY created_at DESC NULLS LAST LIMIT 1),
        30
    ) INTO v_active_goal;

    -- Read actual tracked metrics from DB for p_date
    SELECT COALESCE(
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'steps' AND sync_key = 'steps:' || v_date_str
         LIMIT 1),
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'steps' AND sync_key IS NULL
           AND recorded_at >= v_start AND recorded_at < v_end
         ORDER BY recorded_at DESC NULLS LAST LIMIT 1),
        0
    ) INTO v_steps;

    SELECT COALESCE(
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'water' AND sync_key = 'water:' || v_date_str
         LIMIT 1),
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'water' AND sync_key IS NULL
           AND recorded_at >= v_start AND recorded_at < v_end
         ORDER BY recorded_at DESC NULLS LAST LIMIT 1),
        0
    ) INTO v_water;

    SELECT COALESCE(
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'sleep' AND sync_key = 'sleep:' || v_date_str
         LIMIT 1),
        (SELECT value FROM public.health_metrics
         WHERE user_id = v_user_id AND metric_type = 'sleep' AND sync_key IS NULL
           AND recorded_at >= v_start AND recorded_at < v_end
         ORDER BY recorded_at DESC NULLS LAST LIMIT 1),
        0
    ) INTO v_sleep;

    SELECT COALESCE(SUM(value), 0) INTO v_active
    FROM public.health_metrics
    WHERE user_id = v_user_id
      AND metric_type IN ('exercise', 'active_minutes')
      AND (
          sync_key LIKE 'activity:' || v_date_str || ':%'
          OR (
              (sync_key IS NULL OR sync_key NOT LIKE 'activity:____-__-__:%')
              AND recorded_at >= v_start AND recorded_at < v_end
          )
      );

    -- Authoritative server-side challenge definitions & XP rewards
    FOR v_c IN
        SELECT * FROM (VALUES
            ('hydration-hero', 'Hydration Hero', 50, v_water, GREATEST(v_water_goal, 1)),
            ('step-master',    'Step Master',    75, v_steps, GREATEST(v_steps_goal, 1)),
            ('sleep-champion', 'Sleep Champion', 100, v_sleep, GREATEST(v_sleep_goal, 1)),
            ('active-mover',   'Active Mover',   60, v_active, GREATEST(v_active_goal, 1))
        ) AS defs(id, title, reward, cur_val, goal_val)
    LOOP
        v_progress := LEAST(100, GREATEST(0, ROUND((v_c.cur_val / v_c.goal_val) * 100)::integer));
        v_completed := v_progress >= 100;

        INSERT INTO public.user_challenges (
            user_id,
            challenge_id,
            date,
            progress,
            completed,
            completed_at
        ) VALUES (
            v_user_id,
            v_c.id,
            p_date,
            v_progress,
            v_completed,
            CASE WHEN v_completed THEN pg_catalog.now() ELSE NULL END
        )
        ON CONFLICT (user_id, challenge_id, date) DO UPDATE SET
            progress = GREATEST(public.user_challenges.progress, EXCLUDED.progress),
            completed = public.user_challenges.completed OR EXCLUDED.completed,
            completed_at = COALESCE(public.user_challenges.completed_at, EXCLUDED.completed_at);

        IF v_completed THEN
            v_done_count := v_done_count + 1;
            v_ref_id := 'challenge-' || v_c.id || '-' || v_date_str;
            v_inserted := NULL;

            INSERT INTO public.xp_transactions (
                user_id,
                type,
                amount,
                source,
                ref_id,
                description
            ) VALUES (
                v_user_id,
                'EARN',
                v_c.reward,
                'CHALLENGE',
                v_ref_id,
                'Completed ' || v_c.title || ' challenge'
            )
            ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
            RETURNING id INTO v_inserted;

            IF v_inserted IS NOT NULL THEN
                v_xp_awarded := v_xp_awarded + v_c.reward;
            END IF;
        END IF;
    END LOOP;

    -- Daily bonus if all 4 challenges completed
    IF v_done_count = 4 THEN
        v_ref_id := 'bonus-all-daily-' || v_date_str;
        v_inserted := NULL;

        INSERT INTO public.xp_transactions (
            user_id,
            type,
            amount,
            source,
            ref_id,
            description
        ) VALUES (
            v_user_id,
            'EARN',
            50,
            'BONUS',
            v_ref_id,
            'Completed all daily missions bonus'
        )
        ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
        RETURNING id INTO v_inserted;

        IF v_inserted IS NOT NULL THEN
            v_xp_awarded := v_xp_awarded + 50;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_date_str,
        'done_count', v_done_count,
        'xp_awarded', v_xp_awarded
    );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_and_claim_daily_challenges(date, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_and_claim_daily_challenges(date, timestamptz, timestamptz) TO authenticated;


-- 9d. Reconcile Historical Dates After Legacy Migration
CREATE OR REPLACE FUNCTION public.reconcile_historical_challenges(p_windows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_win jsonb;
    v_count integer := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_windows IS NULL OR jsonb_typeof(p_windows) <> 'array' THEN
        RETURN jsonb_build_object('success', true, 'processed', 0);
    END IF;

    FOR v_win IN SELECT el.win FROM jsonb_array_elements(p_windows) AS el(win) LIMIT 90
    LOOP
        IF v_win->>'date' IS NOT NULL THEN
            PERFORM public.evaluate_and_claim_daily_challenges(
                (v_win->>'date')::date,
                NULLIF(v_win->>'start_ts', '')::timestamptz,
                NULLIF(v_win->>'end_ts', '')::timestamptz
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_historical_challenges(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_historical_challenges(jsonb) TO authenticated;


-- 9e. Server-Verified Badge Evaluation & XP Awarding
CREATE OR REPLACE FUNCTION public.evaluate_and_unlock_badges(p_today date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_lifetime_activities integer := 0;
    v_lifetime_active_minutes numeric := 0;
    v_days_with_sleep_count integer := 0;
    v_days_sleep_7h integer := 0;
    v_max_water numeric := 0;
    v_days_water_2l integer := 0;
    v_lifetime_steps numeric := 0;
    v_current_streak integer := 0;
    v_total_missions integer := 0;
    v_lifetime_xp numeric := 0;
    v_active_dates date[];
    v_check_date date;
    v_pass integer;
    v_unlocked_any boolean;
    v_b record;
    v_badge_inserted uuid;
    v_xp_inserted uuid;
    v_newly_unlocked integer := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_today IS NULL THEN
        p_today := CURRENT_DATE;
    END IF;

    -- 1. Activity counts & minutes
    SELECT COUNT(*)::integer, COALESCE(SUM(value), 0)
    INTO v_lifetime_activities, v_lifetime_active_minutes
    FROM public.health_metrics
    WHERE user_id = v_user_id
      AND metric_type IN ('exercise', 'active_minutes')
      AND value > 0;

    -- 2. Sleep aggregations per date (using sync_key date when present, fallback UTC date)
    WITH per_day_sleep AS (
        SELECT
            CASE
                WHEN sync_key ~ '^sleep:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN split_part(sync_key, ':', 2)::date
                ELSE (recorded_at AT TIME ZONE 'UTC')::date
            END AS d,
            MAX(value) AS hrs
        FROM public.health_metrics
        WHERE user_id = v_user_id AND metric_type = 'sleep' AND value > 0
        GROUP BY 1
    )
    SELECT COUNT(*)::integer, COUNT(*) FILTER (WHERE hrs >= 7)::integer
    INTO v_days_with_sleep_count, v_days_sleep_7h
    FROM per_day_sleep;

    -- 3. Water aggregations per date
    WITH per_day_water AS (
        SELECT
            CASE
                WHEN sync_key ~ '^water:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN split_part(sync_key, ':', 2)::date
                ELSE (recorded_at AT TIME ZONE 'UTC')::date
            END AS d,
            MAX(value) AS ml
        FROM public.health_metrics
        WHERE user_id = v_user_id AND metric_type = 'water' AND value > 0
        GROUP BY 1
    )
    SELECT COALESCE(MAX(ml), 0), COUNT(*) FILTER (WHERE ml >= 2000)::integer
    INTO v_max_water, v_days_water_2l
    FROM per_day_water;

    -- 4. Steps total across dates
    WITH per_day_steps AS (
        SELECT
            CASE
                WHEN sync_key ~ '^steps:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN split_part(sync_key, ':', 2)::date
                ELSE (recorded_at AT TIME ZONE 'UTC')::date
            END AS d,
            MAX(value) AS st
        FROM public.health_metrics
        WHERE user_id = v_user_id AND metric_type = 'steps' AND value > 0
        GROUP BY 1
    )
    SELECT COALESCE(SUM(st), 0) INTO v_lifetime_steps FROM per_day_steps;

    -- 5. Current streak calculation across active metric dates (no temp tables)
    SELECT COALESCE(
        ARRAY_AGG(DISTINCT
            CASE
                WHEN sync_key ~ '^(steps|water|sleep|activity):[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN split_part(sync_key, ':', 2)::date
                ELSE (recorded_at AT TIME ZONE 'UTC')::date
            END
        ),
        ARRAY[]::date[]
    )
    INTO v_active_dates
    FROM public.health_metrics
    WHERE user_id = v_user_id AND value > 0;

    v_check_date := p_today;
    IF NOT (v_check_date = ANY(v_active_dates)) THEN
        v_check_date := p_today - 1;
    END IF;

    WHILE v_check_date = ANY(v_active_dates) AND v_current_streak <= 3650 LOOP
        v_current_streak := v_current_streak + 1;
        v_check_date := v_check_date - 1;
    END LOOP;

    -- 6. Challenge mission count
    SELECT COUNT(*)::integer INTO v_total_missions
    FROM public.xp_transactions
    WHERE user_id = v_user_id AND type = 'EARN' AND source = 'CHALLENGE';

    -- Run up to 2 passes so if badge XP pushes lifetime XP past 1000, 'fitkey-legend' also unlocks
    FOR v_pass IN 1..2 LOOP
        v_unlocked_any := false;

        SELECT COALESCE(SUM(amount), 0) INTO v_lifetime_xp
        FROM public.xp_transactions
        WHERE user_id = v_user_id AND type = 'EARN';

        FOR v_b IN
            SELECT * FROM (VALUES
                ('first-step',           'First Step',           50,  v_lifetime_activities >= 1),
                ('night-owl-rest',       'Restful Start',        50,  v_days_with_sleep_count >= 1),
                ('hydro-starter',        'Hydration Starter',    50,  v_max_water >= 1000),
                ('hydration-hero-badge', 'Hydration Enthusiast', 100, v_days_water_2l >= 3),
                ('consistency-3',        '3-Day Momentum',       100, v_current_streak >= 3),
                ('workout-warrior',      'Workout Warrior',      120, v_lifetime_activities >= 5),
                ('restful-nights',       'Sleep Master',         120, v_days_sleep_7h >= 3),
                ('7-day-streak',         '7 Day Streak',         200, v_current_streak >= 7),
                ('century-walker',       '10k Walker',           200, v_lifetime_steps >= 10000),
                ('active-century',       'Active Century',       250, v_lifetime_active_minutes >= 100),
                ('wellness-champion',    'Wellness Champion',    500, v_total_missions >= 10),
                ('fitkey-legend',        'FitKey Legend',        750, v_lifetime_xp >= 1000)
            ) AS defs(id, title, reward, qualified)
            WHERE qualified = true
        LOOP
            v_badge_inserted := NULL;
            INSERT INTO public.user_badges (user_id, badge_id)
            VALUES (v_user_id, v_b.id)
            ON CONFLICT (user_id, badge_id) DO NOTHING
            RETURNING id INTO v_badge_inserted;

            IF v_badge_inserted IS NOT NULL THEN
                v_unlocked_any := true;
                v_newly_unlocked := v_newly_unlocked + 1;
            END IF;

            -- Ensure corresponding one-time XP award exists
            v_xp_inserted := NULL;
            INSERT INTO public.xp_transactions (
                user_id,
                type,
                amount,
                source,
                ref_id,
                description
            ) VALUES (
                v_user_id,
                'EARN',
                v_b.reward,
                'BADGE',
                'badge-' || v_b.id,
                'Unlocked ' || v_b.title || ' badge'
            )
            ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
            RETURNING id INTO v_xp_inserted;
        END LOOP;

        EXIT WHEN NOT v_unlocked_any;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'newly_unlocked', v_newly_unlocked
    );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_and_unlock_badges(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_and_unlock_badges(date) TO authenticated;


-- 9f. Server-Verified Reward Redemption (Atomic Balance Lock & Spend)
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_title text;
    v_cost integer;
    v_available_xp integer := 0;
    v_voucher_code text;
    v_redemption_id uuid;
    v_created_at timestamptz;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Per-user advisory lock prevents race condition double-spends
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

    -- Authoritative server-side reward catalog
    CASE p_reward_id
        WHEN 'fitness-voucher' THEN
            v_title := 'Fitness Store Voucher';
            v_cost := 500;
        WHEN 'wellness-starter-kit' THEN
            v_title := 'Wellness Starter Kit';
            v_cost := 800;
        WHEN 'fitkey-elite-badge' THEN
            v_title := 'FitKey Elite Badge';
            v_cost := 300;
        WHEN 'nutrition-guide-pass' THEN
            v_title := 'Nutrition Masterclass Pass';
            v_cost := 650;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'ITEM_NOT_FOUND',
                'message', 'Reward item not found.'
            );
    END CASE;

    IF EXISTS (
        SELECT 1 FROM public.reward_redemptions
        WHERE user_id = v_user_id AND reward_id = p_reward_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'ALREADY_CLAIMED',
            'message', 'You have already claimed this reward.'
        );
    END IF;

    SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)::integer
    INTO v_available_xp
    FROM public.xp_transactions
    WHERE user_id = v_user_id;

    IF v_available_xp < v_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_XP',
            'available', v_available_xp,
            'message', 'You need ' || (v_cost - v_available_xp)::text || ' more XP to unlock this reward.'
        );
    END IF;

    v_voucher_code := 'FIT-' || upper(replace(p_reward_id, '-', '')) || '-' || upper(substr(md5(pg_catalog.gen_random_uuid()::text), 1, 6));

    INSERT INTO public.xp_transactions (
        user_id,
        type,
        amount,
        source,
        ref_id,
        description
    ) VALUES (
        v_user_id,
        'SPEND',
        v_cost,
        'REWARD',
        'redeem-' || p_reward_id,
        'Redeemed ' || v_title
    );

    INSERT INTO public.reward_redemptions (
        user_id,
        reward_id,
        title,
        xp_cost,
        status,
        voucher_code
    ) VALUES (
        v_user_id,
        p_reward_id,
        v_title,
        v_cost,
        'active',
        v_voucher_code
    )
    RETURNING id, created_at INTO v_redemption_id, v_created_at;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully unlocked ' || v_title || '!',
        'item', jsonb_build_object(
            'id', v_redemption_id,
            'rewardId', p_reward_id,
            'title', v_title,
            'points', v_cost,
            'voucherCode', v_voucher_code,
            'redeemedAt', v_created_at
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(text) TO authenticated;


-- 9g. Server-Verified Consultation XP Discount Spend (Max 200 XP per booking)
CREATE OR REPLACE FUNCTION public.spend_consultation_xp_discount(
    p_amount integer,
    p_ref_id text,
    p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_available_xp integer := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_amount IS NULL OR p_amount < 1 OR p_amount > 200 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INVALID_AMOUNT',
            'message', 'Consultation discount must be between 1 and 200 XP.'
        );
    END IF;

    IF p_ref_id IS NULL OR btrim(p_ref_id) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INVALID_REF',
            'message', 'Booking reference is required.'
        );
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_user_id::text));

    IF EXISTS (
        SELECT 1 FROM public.xp_transactions
        WHERE user_id = v_user_id AND ref_id = p_ref_id
    ) THEN
        RETURN jsonb_build_object('success', true, 'already_applied', true);
    END IF;

    SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)::integer
    INTO v_available_xp
    FROM public.xp_transactions
    WHERE user_id = v_user_id;

    IF v_available_xp < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_XP',
            'available', v_available_xp
        );
    END IF;

    INSERT INTO public.xp_transactions (
        user_id,
        type,
        amount,
        source,
        ref_id,
        description
    ) VALUES (
        v_user_id,
        'SPEND',
        p_amount,
        'CONSULTATION',
        p_ref_id,
        COALESCE(NULLIF(btrim(p_description), ''), 'Consultation fee XP discount')
    );

    RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.spend_consultation_xp_discount(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_consultation_xp_discount(integer, text, text) TO authenticated;
