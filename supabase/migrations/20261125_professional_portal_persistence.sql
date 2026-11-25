-- ==============================================================================
-- FitKey Database Migration: Complete Professional Portal Persistence (Hardened)
-- Description:
--   1. Extends `public.professional_profiles` with practice, consultation,
--      availability override, and payout destination columns safely & idempotently.
--   2. Adds `professional_profiles_guard_trigger` to prevent client-side
--      self-verification (`verification_status`), ownership spoofing, or fee < 100.
--   3. Hardens `public.professional_availability` with weekday/time checks,
--      overlap prevention trigger, and strict owner-only write RLS.
--  --   4. Validates existing active appointment collisions and halts if conflicts
--      are found; adds a database-level exclusion constraint to prevent
--      future overlapping bookings.
--   5. Extends `public.appointments` and `public.consultations` with clinical,
--      fee, and relationship columns.
--   6. Enforces trusted booking validation in `appointments_booking_guard_trigger`:
--      - Only verified professionals (via `is_verified_professional`) can accept bookings.
--      - `consultations_enabled` must be true.
--      - Booking fee is anchored to trusted `professional_profiles.consultation_fee`.
--      - Custom date override hours are strictly validated (no bypass).
--      - Transaction-level advisory lock prevents concurrent double-booking races.
--      - Cancelled appointments are released and can be re-booked.
--   7. Adds `appointments_update_guard_trigger` to prevent direct REST modification
--      of fee, status, user_id, or professional_id.
--   8. Provides secure RPCs:
--      - `upsert_professional_availability_schedule` (atomic weekly availability)
--      - `update_professional_appointment_status` (authorized professional transitions)
--      - `cancel_patient_appointment` (authorized patient cancellation)
--      - `get_public_professional_summary` (public allowlist, zero PII leak)
-- Date: 2026-11-25
-- ==============================================================================

-- ==============================================================================
-- 1. Extend `public.professional_profiles` Safely & Enforce Guard Trigger
-- ==============================================================================
ALTER TABLE IF EXISTS public.professional_profiles
    ADD COLUMN IF NOT EXISTS profession TEXT,
    ADD COLUMN IF NOT EXISTS qualification TEXT,
    ADD COLUMN IF NOT EXISTS workplace_name TEXT,
    ADD COLUMN IF NOT EXISTS workplace_address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS clinic_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS consultations_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS offer_phone_consultations BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS consultation_types TEXT[] NOT NULL DEFAULT ARRAY['phone']::text[],
    ADD COLUMN IF NOT EXISTS blocked_dates TEXT[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS date_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS blocked_slots TEXT[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS consultation_phone TEXT,
    ADD COLUMN IF NOT EXISTS consent_phone_sharing BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS payout_setup_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS preferred_payout_method TEXT NOT NULL DEFAULT 'upi',
    ADD COLUMN IF NOT EXISTS payout_upi_id TEXT,
    ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS account_number_masked TEXT,
    ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
    ADD COLUMN IF NOT EXISTS configured_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'professional_profiles'
          AND c.contype IN ('p', 'u')
          AND c.conkey = ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = t.oid AND attname = 'user_id')
          ]
    ) THEN
        ALTER TABLE public.professional_profiles
            ADD CONSTRAINT professional_profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professional_profiles_min_fee_check'
    ) THEN
        ALTER TABLE public.professional_profiles
            ADD CONSTRAINT professional_profiles_min_fee_check
            CHECK (consultation_fee IS NULL OR consultation_fee >= 100) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professional_profiles_duration_check'
    ) THEN
        ALTER TABLE public.professional_profiles
            ADD CONSTRAINT professional_profiles_duration_check
            CHECK (duration_minutes IN (15, 20, 30)) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professional_profiles_buffer_check'
    ) THEN
        ALTER TABLE public.professional_profiles
            ADD CONSTRAINT professional_profiles_buffer_check
            CHECK (buffer_minutes IN (0, 5, 10)) NOT VALID;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.professional_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.professional_profiles TO authenticated;
GRANT ALL ON TABLE public.professional_profiles TO service_role;

DROP POLICY IF EXISTS "Professionals can view their own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can view their own profile"
    ON public.professional_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Professionals can insert their own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can insert their own profile"
    ON public.professional_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Professionals can update their own profile" ON public.professional_profiles;
CREATE POLICY "Professionals can update their own profile"
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Guard trigger: protects verification_status and user_id from client tampering
CREATE OR REPLACE FUNCTION public.professional_profiles_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin')
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER
              AND (r.rolsuper OR r.rolbypassrls)
        )
    );
BEGIN
    IF v_is_privileged THEN
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF NEW.consultation_fee IS NOT NULL AND NEW.consultation_fee < 100 THEN
        RAISE EXCEPTION 'Consultation fee must be at least ₹100' USING ERRCODE = '22023';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.user_id IS DISTINCT FROM v_uid THEN
            RAISE EXCEPTION 'Cannot create professional profile for another user' USING ERRCODE = '42501';
        END IF;

        -- Clients may never self-assign a verified status on creation
        NEW.verification_status := 'Pending Verification';
        NEW.created_at := COALESCE(NEW.created_at, pg_catalog.now());
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    -- UPDATE protections
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Professional user_id cannot be modified' USING ERRCODE = '42501';
    END IF;

    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        RAISE EXCEPTION 'verification_status is controlled by FitKey review and cannot be self-modified'
            USING ERRCODE = '42501';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        NEW.created_at := OLD.created_at;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_profiles_guard ON public.professional_profiles;
CREATE TRIGGER trg_professional_profiles_guard
    BEFORE INSERT OR UPDATE ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.professional_profiles_guard_trigger();


-- ==============================================================================
-- 2. Harden `public.professional_availability` (Overlap Prevention & RLS)
-- ==============================================================================
ALTER TABLE IF EXISTS public.professional_availability
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professional_availability_day_range_check'
    ) THEN
        ALTER TABLE public.professional_availability
            ADD CONSTRAINT professional_availability_day_range_check
            CHECK (day_of_week BETWEEN 0 AND 6) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'professional_availability_time_order_check'
    ) THEN
        ALTER TABLE public.professional_availability
            ADD CONSTRAINT professional_availability_time_order_check
            CHECK (end_time > start_time) NOT VALID;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_professional_availability_prof_day
    ON public.professional_availability (professional_id, day_of_week, is_active);

ALTER TABLE IF EXISTS public.professional_availability ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_availability FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professional_availability TO authenticated;
GRANT ALL ON TABLE public.professional_availability TO service_role;

DROP POLICY IF EXISTS "Authenticated users can view active availability or own slots" ON public.professional_availability;
CREATE POLICY "Authenticated users can view active availability or own slots"
    ON public.professional_availability
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id OR is_active = true);

DROP POLICY IF EXISTS "Professionals can insert their own availability" ON public.professional_availability;
CREATE POLICY "Professionals can insert their own availability"
    ON public.professional_availability
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Professionals can update their own availability" ON public.professional_availability;
CREATE POLICY "Professionals can update their own availability"
    ON public.professional_availability
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = professional_id)
    WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Professionals can delete their own availability" ON public.professional_availability;
CREATE POLICY "Professionals can delete their own availability"
    ON public.professional_availability
    FOR DELETE
    TO authenticated
    USING (auth.uid() = professional_id);

CREATE OR REPLACE FUNCTION public.professional_availability_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin')
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER
              AND (r.rolsuper OR r.rolbypassrls)
        )
    );
BEGIN
    IF NOT v_is_privileged THEN
        IF v_uid IS NULL THEN
            RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
        END IF;
        IF TG_OP = 'INSERT' THEN
            NEW.professional_id := v_uid;
        ELSIF NEW.professional_id IS DISTINCT FROM OLD.professional_id OR OLD.professional_id IS DISTINCT FROM v_uid THEN
            RAISE EXCEPTION 'Cannot modify availability for another professional' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'Availability end_time must be after start_time' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(NEW.is_active, true) THEN
        IF NEW.professional_id IS NULL
           OR NEW.day_of_week IS NULL
           OR NEW.start_time IS NULL
           OR NEW.end_time IS NULL
           OR NEW.day_of_week NOT BETWEEN 0 AND 6
           OR NEW.end_time <= NEW.start_time THEN
            RAISE EXCEPTION 'Invalid availability slot'
                USING ERRCODE = '22023';
        END IF;

        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtext(
                NEW.professional_id::text
                || '_availability_'
                || NEW.day_of_week::text
            )
        );
    END IF;
    IF COALESCE(NEW.is_active, true) THEN
        IF EXISTS (
            SELECT 1
            FROM public.professional_availability pa
            WHERE pa.professional_id = NEW.professional_id
              AND pa.day_of_week = NEW.day_of_week
              AND pa.is_active = true
              AND pa.id IS DISTINCT FROM NEW.id
              AND NEW.start_time < pa.end_time
              AND NEW.end_time > pa.start_time
        ) THEN
            RAISE EXCEPTION 'Overlapping availability slot for day_of_week %', NEW.day_of_week
                USING ERRCODE = '23P01';
        END IF;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_availability_guard ON public.professional_availability;
CREATE TRIGGER trg_professional_availability_guard
    BEFORE INSERT OR UPDATE ON public.professional_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.professional_availability_guard_trigger();

-- Atomic weekly schedule replacement RPC for authenticated professional
CREATE OR REPLACE FUNCTION public.upsert_professional_availability_schedule(p_slots jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_item jsonb;
    v_day int;
    v_start time;
    v_end time;
    v_active boolean;
    v_count int := 0;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_slots IS NULL OR pg_catalog.jsonb_typeof(p_slots) <> 'array' THEN
        RAISE EXCEPTION 'p_slots must be a JSON array' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.professional_availability
    WHERE professional_id = v_uid;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_slots)
    LOOP
        v_day := (v_item->>'day_of_week')::int;
        v_start := (v_item->>'start_time')::time;
        v_end := (v_item->>'end_time')::time;
        v_active := COALESCE((v_item->>'is_active')::boolean, true);

        IF v_day IS NULL OR v_day < 0 OR v_day > 6 THEN
            RAISE EXCEPTION 'Invalid day_of_week: %', v_day USING ERRCODE = '22023';
        END IF;

        IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
            RAISE EXCEPTION 'Invalid slot time range (% - %) on day %', v_start, v_end, v_day
                USING ERRCODE = '22023';
        END IF;

        INSERT INTO public.professional_availability (
            professional_id,
            day_of_week,
            start_time,
            end_time,
            is_active
        )
        VALUES (
            v_uid,
            v_day,
            v_start,
            v_end,
            v_active
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'count', v_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_professional_availability_schedule(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_professional_availability_schedule(jsonb) TO authenticated;


-- ==============================================================================
-- 3. Extend `public.appointments` & `public.consultations`
-- ==============================================================================
ALTER TABLE IF EXISTS public.appointments
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS consultation_type TEXT NOT NULL DEFAULT 'Phone Consultation',
    ADD COLUMN IF NOT EXISTS fee NUMERIC,
    ADD COLUMN IF NOT EXISTS patient_name TEXT,
    ADD COLUMN IF NOT EXISTS patient_phone TEXT,
    ADD COLUMN IF NOT EXISTS phone_consented BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS patient_age INTEGER,
    ADD COLUMN IF NOT EXISTS patient_gender TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS health_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE IF EXISTS public.consultations
    ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS consultation_type TEXT NOT NULL DEFAULT 'Phone Consultation',
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS fee NUMERIC,
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
DO $$
DECLARE
    v_duplicate_count INTEGER;
    v_duplicate_details TEXT;
BEGIN
    SELECT
        COUNT(*),
        string_agg(
            format(
                'Appointment ID: %s, Records: %s',
                appointment_id,
                record_count
            ),
            chr(10)
        )
    INTO v_duplicate_count, v_duplicate_details
    FROM (
        SELECT appointment_id, COUNT(*) AS record_count
        FROM public.consultations
        WHERE appointment_id IS NOT NULL
        GROUP BY appointment_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF v_duplicate_count > 0 THEN
        RAISE EXCEPTION
            'Migration halted: duplicate consultation appointment IDs found.%Details:%',
            chr(10),
            COALESCE(v_duplicate_details, 'No details available')
            USING ERRCODE = '23505';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'consultations'
          AND c.conname = 'consultations_appointment_id_key'
    ) THEN
        ALTER TABLE public.consultations
            ADD CONSTRAINT consultations_appointment_id_key UNIQUE (appointment_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- Enable btree_gist extension for PostgreSQL GiST exclusion constraints on UUID + Range
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Immutable helper function to compute appointment timestamp half-open range [start, end)
-- Strictly validates date and time inputs: rejects NULLs, zero-duration, and overnight appointments.
-- Guarantees that only valid non-empty half-open intervals [start, end) are indexed and checked.
CREATE OR REPLACE FUNCTION public.appointment_active_slot_range(
    p_date date,
    p_start time,
    p_end time
)
RETURNS tsrange
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'appointment_date cannot be null' USING ERRCODE = '22004';
    END IF;
    IF p_start IS NULL THEN
        RAISE EXCEPTION 'start_time cannot be null' USING ERRCODE = '22004';
    END IF;
    IF p_end IS NULL THEN
        RAISE EXCEPTION 'end_time cannot be null' USING ERRCODE = '22004';
    END IF;
    IF p_end <= p_start THEN
        RAISE EXCEPTION 'end_time (%) must be strictly greater than start_time (%) - zero duration and overnight appointments are not permitted',
            p_end, p_start
            USING ERRCODE = '22023';
    END IF;

    RETURN pg_catalog.tsrange((p_date + p_start), (p_date + p_end), '[)');
END;
$$;

-- Validate existing active appointments before adding the exclusion constraint.
-- This block is non-destructive: it never modifies appointments, consultations or payments.

DO $$
DECLARE
    v_null_prof_count INTEGER;
    v_invalid_count INTEGER;
    v_invalid_details TEXT;
    v_overlap_count INTEGER;
    v_overlap_details TEXT;
BEGIN
    -- 1. Reject active appointments with NULL professional_id.
    SELECT count(*)
    INTO v_null_prof_count
    FROM public.appointments
    WHERE lower(COALESCE(status, '')) IN (
        'upcoming', 'confirmed', 'in_progress', 'pending'
    )
    AND professional_id IS NULL;

    IF v_null_prof_count > 0 THEN
        RAISE EXCEPTION
            'Migration halted: % active appointment(s) have NULL professional_id. Resolve these records manually.',
            v_null_prof_count
            USING ERRCODE = '23502';
    END IF;

    -- 2. Reject active appointments with invalid dates or time ranges.
    SELECT
        count(*),
        string_agg(
            format(
                'Appointment ID: %s, Professional: %s, Date: %s, Start: %s, End: %s, Status: %s',
                id, professional_id, appointment_date,
                start_time, end_time, status
            ),
            chr(10)
        )
    INTO v_invalid_count, v_invalid_details
    FROM public.appointments
    WHERE lower(COALESCE(status, '')) IN (
        'upcoming', 'confirmed', 'in_progress', 'pending'
    )
    AND (
        appointment_date IS NULL
        OR start_time IS NULL
        OR end_time IS NULL
        OR end_time <= start_time
    );

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION
            'Migration halted: % active appointment(s) have invalid date/time values.%Details:%',
            v_invalid_count,
            chr(10),
            COALESCE(v_invalid_details, 'No details available')
            USING ERRCODE = '22023';
    END IF;

    -- 3. Reject overlapping active appointments.
    -- Half-open ranges allow back-to-back appointments.
    SELECT
        count(*),
        string_agg(
            format(
                'Professional: %s, Date: %s, Appointment A: %s (%s-%s), Appointment B: %s (%s-%s)',
                a1.professional_id,
                a1.appointment_date,
                a1.id, a1.start_time, a1.end_time,
                a2.id, a2.start_time, a2.end_time
            ),
            chr(10)
        )
    INTO v_overlap_count, v_overlap_details
    FROM public.appointments a1
    JOIN public.appointments a2
        ON a1.professional_id = a2.professional_id
        AND a1.appointment_date = a2.appointment_date
        AND a1.id < a2.id
    WHERE lower(COALESCE(a1.status, '')) IN (
        'upcoming', 'confirmed', 'in_progress', 'pending'
    )
    AND lower(COALESCE(a2.status, '')) IN (
        'upcoming', 'confirmed', 'in_progress', 'pending'
    )
    AND public.appointment_active_slot_range(
        a1.appointment_date, a1.start_time, a1.end_time
    ) &&
    public.appointment_active_slot_range(
        a2.appointment_date, a2.start_time, a2.end_time
    );

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION
            'Migration halted: % overlapping active appointment pair(s) detected.%Details:%',
            v_overlap_count,
            chr(10),
            COALESCE(v_overlap_details, 'No details available')
            USING ERRCODE = '23P01';
    END IF;
END;
$$;


-- Database-level active appointment slot exclusion constraint
-- Uses half-open interval [start, end) so back-to-back appointments (e.g. 10:00-10:20 and 10:20-10:40)
-- remain valid, while preventing any concurrent overlapping slots across different start times.
-- Cancelling an appointment (status = 'cancelled') releases the slot immediately.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'appointments'
          AND c.conname = 'appointments_no_overlapping_active_slots'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT appointments_no_overlapping_active_slots
            EXCLUDE USING gist (
                professional_id WITH =,
                (public.appointment_active_slot_range(appointment_date, start_time, end_time)) WITH &&
            )
            WHERE (lower(COALESCE(status, '')) IN ('upcoming', 'confirmed', 'in_progress', 'pending'));
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_professional_date
    ON public.appointments (professional_id, appointment_date DESC, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date
    ON public.appointments (user_id, appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_consultations_professional
    ON public.consultations (professional_id, created_at DESC);

-- ==============================================================================
-- 4. Row Level Security on Appointments & Consultations
-- ==============================================================================
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.appointments FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.appointments TO service_role;

DROP POLICY IF EXISTS "Participants can view their own appointments" ON public.appointments;
CREATE POLICY "Participants can view their own appointments"
    ON public.appointments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
CREATE POLICY "Users can create their own appointments"
    ON public.appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Restrict direct UPDATE privileges: all appointment status mutations MUST flow through secure RPCs
DROP POLICY IF EXISTS "Participants can update their own appointments" ON public.appointments;

ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.consultations FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.consultations TO authenticated;
GRANT ALL ON TABLE public.consultations TO service_role;

DROP POLICY IF EXISTS "Participants can view their own consultations" ON public.consultations;
CREATE POLICY "Participants can view their own consultations"
    ON public.consultations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = professional_id
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.appointments a
            WHERE a.id = consultations.appointment_id
              AND (a.professional_id = auth.uid() OR a.user_id = auth.uid())
        )
    );


-- ==============================================================================
-- 5. Booking Guard Trigger & Update Guard Trigger
-- ==============================================================================

-- Guard trigger on INSERT / UPDATE of appointments
CREATE OR REPLACE FUNCTION public.appointments_booking_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_prof public.professional_profiles%ROWTYPE;
    v_dow int;
    v_date_str text;
    v_slot_key text;
    v_override jsonb;
    v_override_start time;
    v_override_end time;
    v_calc_end_time time;
    v_is_verified boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF NEW.professional_id IS NULL THEN
        RAISE EXCEPTION 'professional_id is required and cannot be null' USING ERRCODE = '22004';
    END IF;

    -- Only check availability on INSERT or when date/time is modified on UPDATE
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
            AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
            AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time) THEN
            NEW.updated_at := pg_catalog.now();
            RETURN NEW;
        END IF;
    END IF;

    IF NEW.appointment_date IS NULL THEN
        RAISE EXCEPTION 'appointment_date is required and cannot be null' USING ERRCODE = '22004';
    END IF;

    IF NEW.start_time IS NULL THEN
        RAISE EXCEPTION 'start_time is required and cannot be null' USING ERRCODE = '22004';
    END IF;

    -- Serialize booking and rescheduling transactions per professional and date
    -- to prevent concurrency race conditions across all overlapping slot ranges
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext(NEW.professional_id::text || '_' || NEW.appointment_date::text)
    );

    SELECT *
    INTO v_prof
    FROM public.professional_profiles
    WHERE user_id = NEW.professional_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Professional profile not found' USING ERRCODE = '22023';
    END IF;

    -- 1. Check verified practitioner status
    v_is_verified := (lower(pg_catalog.btrim(COALESCE(v_prof.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved'));
    IF NOT v_is_verified THEN
        RAISE EXCEPTION 'Professional is not verified to conduct consultations' USING ERRCODE = '22023';
    END IF;

    -- 2. Check consultations_enabled
    IF COALESCE(v_prof.consultations_enabled, false) = false THEN
        RAISE EXCEPTION 'Professional is not currently accepting consultations' USING ERRCODE = '22023';
    END IF;

    -- 3. Enforce trusted duration, end_time, and fee from doctor profile (ignore client overrides)
    IF TG_OP = 'INSERT' THEN
        NEW.user_id := auth.uid();
        NEW.duration_minutes := COALESCE(v_prof.duration_minutes, 20);
        NEW.fee := COALESCE(v_prof.consultation_fee, 500);
        NEW.status := 'upcoming';
    END IF;

    v_calc_end_time := (NEW.start_time + (COALESCE(NEW.duration_minutes, 20) || ' minutes')::interval)::time;
NEW.end_time := v_calc_end_time;
    IF NEW.end_time IS NULL THEN
        RAISE EXCEPTION 'end_time is required and cannot be null' USING ERRCODE = '22004';
    END IF;

    IF NEW.end_time <= NEW.start_time THEN
        RAISE EXCEPTION 'end_time (%) must be strictly greater than start_time (%) - zero duration and overnight appointments are not permitted',
            NEW.end_time, NEW.start_time
            USING ERRCODE = '22023';
    END IF;

    -- 4. Check blocked dates
    v_date_str := pg_catalog.to_char(NEW.appointment_date, 'YYYY-MM-DD');
    IF v_prof.blocked_dates IS NOT NULL AND v_date_str = ANY(v_prof.blocked_dates) THEN
        RAISE EXCEPTION 'Selected date % is blocked by the professional', v_date_str
            USING ERRCODE = '22023';
    END IF;

    -- 5. Check blocked slots
    v_slot_key := v_date_str || '_' || pg_catalog.to_char(NEW.start_time, 'HH24:MI');
    IF v_prof.blocked_slots IS NOT NULL AND v_slot_key = ANY(v_prof.blocked_slots) THEN
        RAISE EXCEPTION 'Selected slot % is blocked by the professional', v_slot_key
            USING ERRCODE = '22023';
    END IF;

    -- 6. Check date override
    v_override := COALESCE(v_prof.date_overrides, '{}'::jsonb) -> v_date_str;
    IF v_override IS NOT NULL AND COALESCE((v_override->>'unavailable')::boolean, false) THEN
        RAISE EXCEPTION 'Selected date % is marked unavailable', v_date_str
            USING ERRCODE = '22023';
    END IF;

    -- 7. Validate working hours (custom override hours OR regular weekly schedule)
    IF v_override IS NOT NULL AND (v_override->>'startTime') IS NOT NULL AND (v_override->>'endTime') IS NOT NULL THEN
        v_override_start := (v_override->>'startTime')::time;
        v_override_end := (v_override->>'endTime')::time;
        IF NEW.start_time < v_override_start OR NEW.end_time > v_override_end THEN
            RAISE EXCEPTION 'Selected slot (% - %) is outside the professional custom hours (% - %) on %',
                NEW.start_time, NEW.end_time, v_override_start, v_override_end, v_date_str
                USING ERRCODE = '22023';
        END IF;
    ELSE
        v_dow := EXTRACT(DOW FROM NEW.appointment_date)::int;
        IF EXISTS (
            SELECT 1
            FROM public.professional_availability pa
            WHERE pa.professional_id = NEW.professional_id
        ) AND NOT EXISTS (
            SELECT 1
            FROM public.professional_availability pa
            WHERE pa.professional_id = NEW.professional_id
              AND pa.day_of_week = v_dow
              AND pa.is_active = true
              AND NEW.start_time >= pa.start_time
              AND NEW.end_time <= pa.end_time
        ) THEN
            RAISE EXCEPTION 'Selected slot is outside the professional availability schedule'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- 8. Prevent overlapping active appointments for the same professional on this date
    IF EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.professional_id = NEW.professional_id
          AND a.appointment_date = NEW.appointment_date
          AND a.id IS DISTINCT FROM NEW.id
          AND lower(COALESCE(a.status, '')) IN ('upcoming', 'confirmed', 'in_progress', 'pending')
          AND public.appointment_active_slot_range(a.appointment_date, a.start_time, a.end_time) &&
              public.appointment_active_slot_range(NEW.appointment_date, NEW.start_time, NEW.end_time)
    ) THEN
        RAISE EXCEPTION 'This time slot overlaps with an existing appointment (% - %)',
            NEW.start_time, NEW.end_time
            USING ERRCODE = '23P01';
    END IF;

    NEW.created_at := COALESCE(NEW.created_at, pg_catalog.now());
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_booking_guard ON public.appointments;
CREATE TRIGGER trg_appointments_booking_guard
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.appointments_booking_guard_trigger();

-- Direct UPDATE guard trigger to protect ownership, fees, and unauthorized status modifications
CREATE OR REPLACE FUNCTION public.appointments_update_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin')
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER
              AND (r.rolsuper OR r.rolbypassrls)
        )
    );
BEGIN
    IF v_is_privileged THEN
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'appointment user_id cannot be modified' USING ERRCODE = '42501';
    END IF;

    IF NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN
        RAISE EXCEPTION 'appointment professional_id cannot be modified' USING ERRCODE = '42501';
    END IF;

    IF NEW.fee IS DISTINCT FROM OLD.fee THEN
        RAISE EXCEPTION 'appointment fee cannot be modified directly' USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Appointment status changes must be performed through authorized procedures'
            USING ERRCODE = '42501';
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_update_guard ON public.appointments;
CREATE TRIGGER trg_appointments_update_guard
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.appointments_update_guard_trigger();


-- ==============================================================================
-- 6. Secure Appointment Status & Cancellation RPCs
-- ==============================================================================

-- Atomic appointment + consultation status transition RPC for the owning professional
CREATE OR REPLACE FUNCTION public.update_professional_appointment_status(
    p_appointment_id uuid,
    p_new_status text,
    p_reason text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_apt public.appointments%ROWTYPE;
    v_norm_status text := lower(pg_catalog.btrim(COALESCE(p_new_status, '')));
    v_old_status text;
    v_consult_status text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF v_norm_status NOT IN ('upcoming', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid appointment status: %', p_new_status USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO v_apt
    FROM public.appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Appointment not found.'
        );
    END IF;

    IF v_apt.professional_id IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'You are not authorized to modify another professional''s appointment'
            USING ERRCODE = '42501';
    END IF;

    v_old_status := lower(pg_catalog.btrim(COALESCE(v_apt.status, '')));

    -- Disallow mutating already completed or cancelled appointments
    IF v_old_status IN ('completed', 'cancelled') AND v_norm_status <> v_old_status THEN
        RAISE EXCEPTION 'Cannot modify an appointment that is already %', v_old_status
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.appointments
    SET
        status = v_norm_status,
        cancellation_reason = CASE
            WHEN v_norm_status = 'cancelled' THEN COALESCE(NULLIF(pg_catalog.btrim(p_reason), ''), cancellation_reason, 'Cancelled by practitioner')
            ELSE cancellation_reason
        END,
        notes = COALESCE(NULLIF(pg_catalog.btrim(p_notes), ''), notes),
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id
    RETURNING * INTO v_apt;

    v_consult_status := CASE v_norm_status
        WHEN 'upcoming' THEN 'scheduled'
        WHEN 'confirmed' THEN 'scheduled'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'no_show' THEN 'no_show'
        ELSE v_norm_status
    END;

    INSERT INTO public.consultations (
        appointment_id,
        professional_id,
        user_id,
        consultation_type,
        duration_minutes,
        fee,
        status,
        notes,
        completed_at,
        updated_at
    )
    VALUES (
        v_apt.id,
        v_apt.professional_id,
        v_apt.user_id,
        COALESCE(v_apt.consultation_type, 'Phone Consultation'),
        COALESCE(v_apt.duration_minutes, 20),
        v_apt.fee,
        v_consult_status,
        v_apt.notes,
        CASE WHEN v_norm_status = 'completed' THEN pg_catalog.now() ELSE NULL END,
        pg_catalog.now()
    )
    ON CONFLICT (appointment_id) DO UPDATE SET
        professional_id = COALESCE(public.consultations.professional_id, EXCLUDED.professional_id),
        user_id = COALESCE(public.consultations.user_id, EXCLUDED.user_id),
        status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, public.consultations.notes),
        completed_at = CASE
            WHEN EXCLUDED.status = 'completed' THEN COALESCE(public.consultations.completed_at, pg_catalog.now())
            ELSE public.consultations.completed_at
        END,
        updated_at = pg_catalog.now();

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'appointment', pg_catalog.to_jsonb(v_apt)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_professional_appointment_status(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_professional_appointment_status(uuid, text, text, text) TO authenticated;

-- Patient appointment cancellation RPC (releases slot and marks consultation cancelled)
CREATE OR REPLACE FUNCTION public.cancel_patient_appointment(
    p_appointment_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_apt public.appointments%ROWTYPE;
    v_old_status text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_apt
    FROM public.appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'error', 'Appointment not found.'
        );
    END IF;

    IF v_apt.user_id IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'You are not authorized to cancel this appointment'
            USING ERRCODE = '42501';
    END IF;

    v_old_status := lower(pg_catalog.btrim(COALESCE(v_apt.status, '')));
    IF v_old_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Appointment is already %', v_old_status USING ERRCODE = '22023';
    END IF;

    UPDATE public.appointments
    SET
        status = 'cancelled',
        cancellation_reason = COALESCE(NULLIF(pg_catalog.btrim(p_reason), ''), 'Cancelled by patient'),
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id
    RETURNING * INTO v_apt;

    UPDATE public.consultations
    SET
        status = 'cancelled',
        updated_at = pg_catalog.now()
    WHERE appointment_id = p_appointment_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'appointment', pg_catalog.to_jsonb(v_apt)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_patient_appointment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_patient_appointment(uuid, text) TO authenticated;


-- ==============================================================================
-- 7. Public Professional Discovery RPC (Strict Non-PII Allowlist)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_public_professional_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT pg_catalog.jsonb_build_object(
        'user_id', pp.user_id,
        'full_name', COALESCE(NULLIF(pg_catalog.btrim(pr.full_name), ''), 'Verified Practitioner'),
        'avatar_url', NULLIF(pg_catalog.btrim(pr.avatar_url), ''),
        'profession', pp.profession,
        'specialization', COALESCE(NULLIF(pg_catalog.btrim(pp.specialization), ''), 'Clinical Wellness'),
        'qualification', pp.qualification,
        'experience_years', pp.experience_years,
        'bio', pp.bio,
        'workplace_name', pp.workplace_name,
        'workplace_address', pp.workplace_address,
        'city', pp.city,
        'state', pp.state,
        'clinic_photo_url', pp.clinic_photo_url,
        'consultations_enabled', pp.consultations_enabled,
        'duration_minutes', pp.duration_minutes,
        'buffer_minutes', pp.buffer_minutes,
        'timezone', pp.timezone,
        'consultation_types', pp.consultation_types,
        'consultation_fee', pp.consultation_fee,
        'verification_status', COALESCE(NULLIF(pg_catalog.btrim(pp.verification_status), ''), 'Pending Verification'),
        'is_verified', (lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved')),
        'created_at', pp.created_at
    )
    INTO v_result
    FROM public.professional_profiles pp
    LEFT JOIN public.profiles pr ON pr.id = pp.user_id
    WHERE pp.user_id = p_user_id
      AND (
          (lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved'))
          OR pp.user_id = auth.uid()
      )
    LIMIT 1;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_professional_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_professional_summary(uuid) TO authenticated;
