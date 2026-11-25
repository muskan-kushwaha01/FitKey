-- Dynamic registered-user leaderboard, public verified-practitioner discovery,
-- safe availability lookup, and patient rescheduling. No tables are added.

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS booking_reference text,
    ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_booking_reference
    ON public.appointments (booking_reference)
    WHERE booking_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_user_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
    user_id uuid,
    display_name text,
    avatar_url text,
    available_xp bigint,
    rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH balances AS (
        SELECT
            p.id,
            COALESCE(NULLIF(pg_catalog.btrim(p.full_name), ''), 'FitKey Member') AS full_name,
            NULLIF(pg_catalog.btrim(p.avatar_url), '') AS avatar,
            GREATEST(COALESCE(SUM(
                CASE pg_catalog.upper(xt.type)
                    WHEN 'EARN' THEN xt.amount
                    WHEN 'SPEND' THEN -xt.amount
                    ELSE 0
                END
            ), 0), 0)::bigint AS xp
        FROM public.profiles p
        LEFT JOIN public.xp_transactions xt ON xt.user_id = p.id
        WHERE COALESCE(pg_catalog.lower(p.account_type), 'user') = 'user'
          AND COALESCE(p.leaderboard_visibility, true) = true
        GROUP BY p.id, p.full_name, p.avatar_url
    ), ranked AS (
        SELECT b.*, pg_catalog.row_number() OVER (ORDER BY b.xp DESC, b.full_name ASC, b.id ASC) AS board_rank
        FROM balances b
    )
    SELECT r.id, r.full_name, r.avatar, r.xp, r.board_rank
    FROM ranked r
    WHERE r.board_rank <= GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
       OR r.id = auth.uid()
    ORDER BY r.board_rank;
$$;

REVOKE ALL ON FUNCTION public.get_user_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_consultation_professionals()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT pg_catalog.jsonb_build_object(
        'profile', pg_catalog.jsonb_build_object(
            'id', pp.user_id,
            'full_name', COALESCE(NULLIF(pg_catalog.btrim(pr.full_name), ''), 'Healthcare Professional'),
            'avatar_url', NULLIF(pg_catalog.btrim(pr.avatar_url), ''),
            'profession', pp.profession,
            'specialization', pp.specialization,
            'qualification', pp.qualification,
            'experience_years', pp.experience_years,
            'bio', pp.bio,
            'workplace_name', pp.workplace_name,
            'workplace_address', pp.workplace_address,
            'city', pp.city,
            'state', pp.state,
            'consultation_fee', pp.consultation_fee,
            'duration_minutes', pp.duration_minutes,
            'buffer_minutes', pp.buffer_minutes,
            'timezone', pp.timezone,
            'consultations_enabled', pp.consultations_enabled,
            'offer_phone_consultations', pp.offer_phone_consultations,
            'blocked_dates', COALESCE(pp.blocked_dates, '{}'::text[]),
            'blocked_slots', COALESCE(pp.blocked_slots, '{}'::text[]),
            'date_overrides', COALESCE(pp.date_overrides, '{}'::jsonb),
            'booked_slots', COALESCE((
                SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                    'date', a.appointment_date,
                    'start_time', a.start_time,
                    'end_time', a.end_time
                ))
                FROM public.appointments a
                WHERE a.professional_id = pp.user_id
                  AND a.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
                  AND pg_catalog.lower(COALESCE(a.status, '')) IN ('upcoming', 'confirmed', 'pending', 'in_progress')
            ), '[]'::jsonb)
        ),
        'availability', COALESCE((
            SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'day_of_week', pa.day_of_week,
                'start_time', pa.start_time,
                'end_time', pa.end_time,
                'is_active', pa.is_active
            ) ORDER BY pa.day_of_week, pa.start_time)
            FROM public.professional_availability pa
            WHERE pa.professional_id = pp.user_id AND pa.is_active = true
        ), '[]'::jsonb),
        'rating', pg_catalog.jsonb_build_object(
            'avg', COALESCE((SELECT pg_catalog.avg(prv.rating)::numeric(3,2)
                             FROM public.professional_reviews prv
                             WHERE prv.professional_id = pp.user_id), 0),
            'total', (SELECT pg_catalog.count(*)
                      FROM public.professional_reviews prv
                      WHERE prv.professional_id = pp.user_id)
        )
    )
    FROM public.professional_profiles pp
    LEFT JOIN public.profiles pr ON pr.id = pp.user_id
    WHERE pp.onboarding_completed = true
      AND pp.consultations_enabled = true
      AND pg_catalog.lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved')
      AND pp.consultation_fee >= 100
      AND pp.offer_phone_consultations = true
    ORDER BY COALESCE(NULLIF(pg_catalog.btrim(pr.full_name), ''), 'Healthcare Professional');
$$;

REVOKE ALL ON FUNCTION public.get_public_consultation_professionals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_consultation_professionals() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_professional_booking_data(
    p_professional_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_professional_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL
       OR p_end_date < p_start_date OR p_end_date > p_start_date + 31 THEN
        RAISE EXCEPTION 'Invalid professional or booking date range' USING ERRCODE = '22023';
    END IF;

    SELECT pg_catalog.jsonb_build_object(
        'profile', pg_catalog.jsonb_build_object(
            'id', pp.user_id,
            'consultations_enabled', pp.consultations_enabled,
            'consultation_fee', pp.consultation_fee,
            'duration_minutes', pp.duration_minutes,
            'buffer_minutes', pp.buffer_minutes,
            'timezone', pp.timezone,
            'blocked_dates', COALESCE(pp.blocked_dates, '{}'::text[]),
            'blocked_slots', COALESCE(pp.blocked_slots, '{}'::text[]),
            'date_overrides', COALESCE(pp.date_overrides, '{}'::jsonb)
        ),
        'availability', COALESCE((
            SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'day_of_week', pa.day_of_week,
                'start_time', pa.start_time,
                'end_time', pa.end_time
            ) ORDER BY pa.start_time)
            FROM public.professional_availability pa
            WHERE pa.professional_id = pp.user_id AND pa.is_active = true
        ), '[]'::jsonb),
        'booked_slots', COALESCE((
            SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                'date', a.appointment_date,
                'start_time', a.start_time,
                'end_time', a.end_time
            ))
            FROM public.appointments a
            WHERE a.professional_id = pp.user_id
              AND a.appointment_date BETWEEN p_start_date AND p_end_date
              AND pg_catalog.lower(COALESCE(a.status, '')) IN ('upcoming', 'confirmed', 'pending', 'in_progress')
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.professional_profiles pp
    WHERE pp.user_id = p_professional_id
      AND pp.onboarding_completed = true
      AND pp.consultations_enabled = true
      AND pg_catalog.lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved')
      AND pp.offer_phone_consultations = true;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_professional_booking_data(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_professional_booking_data(uuid, date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.reschedule_patient_appointment(
    p_appointment_id uuid,
    p_appointment_date date,
    p_start_time time
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_appointment public.appointments%ROWTYPE;
    v_duration integer;
    v_buffer integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id AND user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Appointment not found.');
    END IF;
    IF pg_catalog.lower(COALESCE(v_appointment.status, '')) NOT IN ('upcoming', 'confirmed', 'pending') THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Only upcoming appointments can be rescheduled.');
    END IF;
    IF p_appointment_date IS NULL OR p_start_time IS NULL OR p_appointment_date < CURRENT_DATE THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Choose a valid future appointment slot.');
    END IF;

    SELECT COALESCE(pp.duration_minutes, 20), COALESCE(pp.buffer_minutes, 0)
    INTO v_duration, v_buffer
    FROM public.professional_profiles pp
    WHERE pp.user_id = v_appointment.professional_id
      AND pp.onboarding_completed = true
      AND pp.consultations_enabled = true
      AND pp.offer_phone_consultations = true
      AND pg_catalog.lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved');
    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Practitioner is not accepting bookings.');
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext(v_appointment.professional_id::text || '_' || p_appointment_date::text)
    );
    IF EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.professional_id = v_appointment.professional_id
          AND a.appointment_date = p_appointment_date
          AND a.id <> v_appointment.id
          AND pg_catalog.lower(COALESCE(a.status, '')) IN ('upcoming', 'confirmed', 'pending', 'in_progress')
          AND p_start_time < (a.end_time + (v_buffer || ' minutes')::interval)::time
          AND (p_start_time + ((v_duration + v_buffer) || ' minutes')::interval)::time > a.start_time
    ) THEN
        RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'This appointment slot is no longer available.');
    END IF;

    UPDATE public.appointments
    SET appointment_date = p_appointment_date,
        start_time = p_start_time,
        updated_at = pg_catalog.now()
    WHERE id = p_appointment_id
    RETURNING * INTO v_appointment;

    RETURN pg_catalog.jsonb_build_object('success', true, 'appointment', pg_catalog.to_jsonb(v_appointment));
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_patient_appointment(uuid, date, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_patient_appointment(uuid, date, time) TO authenticated;

CREATE OR REPLACE FUNCTION public.book_patient_appointment(
    p_professional_id uuid,
    p_appointment_date date,
    p_start_time time,
    p_patient_name text,
    p_patient_phone text,
    p_phone_consented boolean,
    p_patient_age integer DEFAULT NULL,
    p_patient_gender text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_health_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_appointment public.appointments%ROWTYPE;
    v_booking_reference text := 'FK-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.gen_random_uuid()::text, 1, 8));
    v_duration integer;
    v_buffer integer;
    v_timezone text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_patient_name IS NULL OR pg_catalog.btrim(p_patient_name) = '' THEN
        RAISE EXCEPTION 'Patient name is required' USING ERRCODE = '22023';
    END IF;
    IF p_patient_phone IS NULL OR pg_catalog.length(pg_catalog.regexp_replace(p_patient_phone, '[^0-9]', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'A valid patient phone number is required' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(p_phone_consented, false) = false THEN
        RAISE EXCEPTION 'Patient phone consent is required' USING ERRCODE = '22023';
    END IF;
    IF p_appointment_date IS NULL OR p_appointment_date < CURRENT_DATE OR p_start_time IS NULL THEN
        RAISE EXCEPTION 'Choose a valid future appointment slot' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(pp.duration_minutes, 20), COALESCE(pp.buffer_minutes, 0), COALESCE(pp.timezone, 'Asia/Kolkata')
    INTO v_duration, v_buffer, v_timezone
    FROM public.professional_profiles pp
    WHERE pp.user_id = p_professional_id
      AND pp.onboarding_completed = true
      AND pp.consultations_enabled = true
      AND pp.offer_phone_consultations = true
      AND pg_catalog.lower(pg_catalog.btrim(COALESCE(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Practitioner is not currently accepting bookings' USING ERRCODE = '22023';
    END IF;
    IF p_appointment_date = (pg_catalog.now() AT TIME ZONE v_timezone)::date
       AND p_start_time <= (pg_catalog.now() AT TIME ZONE v_timezone)::time THEN
        RAISE EXCEPTION 'Choose a future appointment time' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext(p_professional_id::text || '_' || p_appointment_date::text)
    );
    IF EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.professional_id = p_professional_id
          AND a.appointment_date = p_appointment_date
          AND pg_catalog.lower(COALESCE(a.status, '')) IN ('upcoming', 'confirmed', 'pending', 'in_progress')
          AND p_start_time < (a.end_time + (v_buffer || ' minutes')::interval)::time
          AND (p_start_time + ((v_duration + v_buffer) || ' minutes')::interval)::time > a.start_time
    ) THEN
        RAISE EXCEPTION 'This appointment slot is no longer available' USING ERRCODE = '23P01';
    END IF;

    INSERT INTO public.appointments (
        professional_id, user_id, appointment_date, start_time,
        patient_name, patient_phone, phone_consented, patient_age,
        patient_gender, consultation_type, notes, health_details, booked_at,
        booking_reference, payment_status
    ) VALUES (
        p_professional_id, v_uid, p_appointment_date, p_start_time,
        pg_catalog.btrim(p_patient_name), pg_catalog.regexp_replace(p_patient_phone, '[^0-9]', '', 'g'),
        true, p_patient_age, NULLIF(pg_catalog.btrim(COALESCE(p_patient_gender, '')), ''),
        'Phone Consultation', NULLIF(pg_catalog.btrim(COALESCE(p_notes, '')), ''),
        COALESCE(p_health_details, '{}'::jsonb), pg_catalog.now(),
        v_booking_reference, 'pending'
    )
    RETURNING * INTO v_appointment;

    RETURN pg_catalog.jsonb_build_object('success', true, 'appointment', pg_catalog.to_jsonb(v_appointment));
END;
$$;

REVOKE ALL ON FUNCTION public.book_patient_appointment(uuid, date, time, text, text, boolean, integer, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_patient_appointment(uuid, date, time, text, text, boolean, integer, text, text, jsonb) TO authenticated;
