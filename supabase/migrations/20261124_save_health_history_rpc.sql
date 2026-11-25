-- ==============================================================================
-- FitKey Database Migration: Hardened Atomic RPC for HealthHistory Onboarding
-- Description: Provides a single transactional, schema-qualified RPC function
--              to atomically save health profile, conditions, medications,
--              allergies, and injuries with strict security checks.
-- Date: 2026-11-24
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_health_history_onboarding(
    p_profile jsonb,
    p_conditions jsonb,
    p_medications jsonb,
    p_allergies jsonb,
    p_injuries jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_intolerances text[];
    v_deficiencies text[];
    v_digestive_issues text[];
    v_supplements text[];
BEGIN
    -- 1. Ensure caller is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Validate argument types
    IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN
        RAISE EXCEPTION 'Invalid profile payload: expected a JSON object';
    END IF;

    IF p_conditions IS NULL OR jsonb_typeof(p_conditions) <> 'array' THEN
        RAISE EXCEPTION 'Invalid conditions payload: expected a JSON array';
    END IF;

    IF p_medications IS NULL OR jsonb_typeof(p_medications) <> 'array' THEN
        RAISE EXCEPTION 'Invalid medications payload: expected a JSON array';
    END IF;

    IF p_allergies IS NULL OR jsonb_typeof(p_allergies) <> 'array' THEN
        RAISE EXCEPTION 'Invalid allergies payload: expected a JSON array';
    END IF;

    IF p_injuries IS NULL OR jsonb_typeof(p_injuries) <> 'array' THEN
        RAISE EXCEPTION 'Invalid injuries payload: expected a JSON array';
    END IF;

    -- 3. Safely extract profile arrays (preventing jsonb_array_elements_text failure on null/missing)
    v_intolerances := CASE
        WHEN jsonb_typeof(p_profile->'intolerances') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_profile->'intolerances'))
        ELSE '{}'::text[]
    END;

    v_deficiencies := CASE
        WHEN jsonb_typeof(p_profile->'deficiencies') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_profile->'deficiencies'))
        ELSE '{}'::text[]
    END;

    v_digestive_issues := CASE
        WHEN jsonb_typeof(p_profile->'digestive_issues') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_profile->'digestive_issues'))
        ELSE '{}'::text[]
    END;

    v_supplements := CASE
        WHEN jsonb_typeof(p_profile->'supplements') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_profile->'supplements'))
        ELSE '{}'::text[]
    END;

    -- 4. Replace conditions: delete old and insert new for the authenticated user
    DELETE FROM public.medical_conditions WHERE user_id = v_user_id;
    IF p_conditions IS NOT NULL AND jsonb_array_length(p_conditions) > 0 THEN
        INSERT INTO public.medical_conditions (
            user_id,
            condition_name,
            diagnosis_year,
            is_controlled,
            status,
            notes
        )
        SELECT
            v_user_id,
            (c->>'condition_name')::text,
            c->>'diagnosis_year',
            c->>'is_controlled',
            COALESCE(LOWER(c->>'status'), 'active'),
            c->>'notes'
        FROM jsonb_array_elements(p_conditions) AS c;
    END IF;

    -- 5. Replace medications: delete old and insert new for the authenticated user
    DELETE FROM public.medications WHERE user_id = v_user_id;
    IF p_medications IS NOT NULL AND jsonb_array_length(p_medications) > 0 THEN
        INSERT INTO public.medications (
            user_id,
            medication_name,
            dosage,
            frequency,
            reason,
            status
        )
        SELECT
            v_user_id,
            (m->>'medication_name')::text,
            m->>'dosage',
            m->>'frequency',
            m->>'reason',
            COALESCE(m->>'status', 'active')
        FROM jsonb_array_elements(p_medications) AS m;
    END IF;

    -- 6. Replace allergies: delete old and insert new for the authenticated user
    DELETE FROM public.allergies WHERE user_id = v_user_id;
    IF p_allergies IS NOT NULL AND jsonb_array_length(p_allergies) > 0 THEN
        INSERT INTO public.allergies (
            user_id,
            allergy_type,
            allergen,
            reaction,
            severity
        )
        SELECT
            v_user_id,
            (a->>'allergy_type')::text,
            a->>'allergen',
            a->>'reaction',
            a->>'severity'
        FROM jsonb_array_elements(p_allergies) AS a;
    END IF;

    -- 7. Replace injuries: delete old and insert new for the authenticated user
    DELETE FROM public.injuries WHERE user_id = v_user_id;
    IF p_injuries IS NOT NULL AND jsonb_array_length(p_injuries) > 0 THEN
        INSERT INTO public.injuries (
            user_id,
            injury_type,
            body_part,
            status,
            pain_during_activity,
            surgery
        )
        SELECT
            v_user_id,
            (i->>'injury_type')::text,
            i->>'body_part',
            i->>'status',
            i->>'pain_during_activity',
            i->>'surgery'
        FROM jsonb_array_elements(p_injuries) AS i;
    END IF;

    -- 8. Upsert health profile (including height_cm, weight_kg, and gender)
    INSERT INTO public.health_profiles (
        user_id,
        height_cm,
        weight_kg,
        gender,
        age,
        blood_group,
        activity_level,
        sleep_hours,
        water_litres,
        sitting_hours,
        smoking,
        alcohol,
        stress,
        meals_per_day,
        specific_diet,
        specific_diet_name,
        intolerances,
        deficiencies,
        digestive_issues,
        supplements,
        in_treatment,
        treatment_condition,
        treatment_type,
        treatment_restrictions,
        dietary_preference,
        onboarding_completed,
        updated_at
    )
    VALUES (
        v_user_id,
        (p_profile->>'height_cm')::numeric,
        (p_profile->>'weight_kg')::numeric,
        p_profile->>'gender',
        (p_profile->>'age')::integer,
        p_profile->>'blood_group',
        p_profile->>'activity_level',
        (p_profile->>'sleep_hours')::numeric,
        (p_profile->>'water_litres')::numeric,
        (p_profile->>'sitting_hours')::numeric,
        p_profile->>'smoking',
        p_profile->>'alcohol',
        p_profile->>'stress',
        p_profile->>'meals_per_day',
        p_profile->>'specific_diet',
        CASE
            WHEN p_profile->>'specific_diet' = 'Yes' THEN p_profile->>'specific_diet_name'
            ELSE NULL
        END,
        v_intolerances,
        v_deficiencies,
        v_digestive_issues,
        v_supplements,
        p_profile->>'in_treatment',
        CASE
            WHEN p_profile->>'in_treatment' = 'Yes' THEN p_profile->>'treatment_condition'
            ELSE NULL
        END,
        CASE
            WHEN p_profile->>'in_treatment' = 'Yes' THEN p_profile->>'treatment_type'
            ELSE NULL
        END,
        CASE
            WHEN p_profile->>'in_treatment' = 'Yes' THEN p_profile->>'treatment_restrictions'
            ELSE NULL
        END,
        p_profile->>'dietary_preference',
        true,
        pg_catalog.now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- 8a. Fields owned by WellnessSetup: preserve existing values if omitted/null
        height_cm = COALESCE(EXCLUDED.height_cm, public.health_profiles.height_cm),
        weight_kg = COALESCE(EXCLUDED.weight_kg, public.health_profiles.weight_kg),
        gender = COALESCE(EXCLUDED.gender, public.health_profiles.gender),
        age = COALESCE(EXCLUDED.age, public.health_profiles.age),
        blood_group = COALESCE(EXCLUDED.blood_group, public.health_profiles.blood_group),

        -- 8b. Fields owned by HealthHistory: write submitted values directly so explicit null can clear old data
        activity_level = EXCLUDED.activity_level,
        sleep_hours = EXCLUDED.sleep_hours,
        water_litres = EXCLUDED.water_litres,
        sitting_hours = EXCLUDED.sitting_hours,
        smoking = EXCLUDED.smoking,
        alcohol = EXCLUDED.alcohol,
        stress = EXCLUDED.stress,
        meals_per_day = EXCLUDED.meals_per_day,
        dietary_preference = EXCLUDED.dietary_preference,

        -- 8c. Specific diet toggle: changing to 'No' clears specific_diet_name
        specific_diet = EXCLUDED.specific_diet,
        specific_diet_name = CASE
            WHEN EXCLUDED.specific_diet = 'Yes' THEN EXCLUDED.specific_diet_name
            ELSE NULL
        END,

        -- 8d. In-treatment toggle: changing to 'No' clears all treatment detail fields
        in_treatment = EXCLUDED.in_treatment,
        treatment_condition = CASE
            WHEN EXCLUDED.in_treatment = 'Yes' THEN EXCLUDED.treatment_condition
            ELSE NULL
        END,
        treatment_type = CASE
            WHEN EXCLUDED.in_treatment = 'Yes' THEN EXCLUDED.treatment_type
            ELSE NULL
        END,
        treatment_restrictions = CASE
            WHEN EXCLUDED.in_treatment = 'Yes' THEN EXCLUDED.treatment_restrictions
            ELSE NULL
        END,

        -- 8e. Arrays: submitted empty arrays clear previous values, omitted/null arrays preserve previous values
        intolerances = CASE
            WHEN jsonb_typeof(p_profile->'intolerances') = 'array' THEN v_intolerances
            ELSE public.health_profiles.intolerances
        END,
        deficiencies = CASE
            WHEN jsonb_typeof(p_profile->'deficiencies') = 'array' THEN v_deficiencies
            ELSE public.health_profiles.deficiencies
        END,
        digestive_issues = CASE
            WHEN jsonb_typeof(p_profile->'digestive_issues') = 'array' THEN v_digestive_issues
            ELSE public.health_profiles.digestive_issues
        END,
        supplements = CASE
            WHEN jsonb_typeof(p_profile->'supplements') = 'array' THEN v_supplements
            ELSE public.health_profiles.supplements
        END,

        onboarding_completed = true,
        updated_at = pg_catalog.now();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Explicitly restrict EXECUTE permissions: authenticated users only
REVOKE ALL ON FUNCTION public.save_health_history_onboarding(jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_health_history_onboarding(jsonb, jsonb, jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_health_history_onboarding(jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
