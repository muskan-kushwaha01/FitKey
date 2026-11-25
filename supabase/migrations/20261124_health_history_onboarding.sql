-- ==============================================================================
-- FitKey Database Migration: HealthHistory Onboarding Persistence
-- Description: Extends existing tables and creates allergies & injuries tables
--              with RLS policies for complete health history persistence.
-- Date: 2026-11-24
-- ==============================================================================

-- 1. Extend `medical_conditions` table
-- Adds dedicated columns for diagnosis year and control status.
ALTER TABLE medical_conditions
    ADD COLUMN IF NOT EXISTS diagnosis_year TEXT,
    ADD COLUMN IF NOT EXISTS is_controlled TEXT;

-- 2. Extend `medications` table
-- Adds dedicated column for clinical reason / indication.
ALTER TABLE medications
    ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Extend `health_profiles` table
-- Adds missing basic info, lifestyle, diet, supplement, and treatment fields.
ALTER TABLE health_profiles
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS blood_group TEXT,
    ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC,
    ADD COLUMN IF NOT EXISTS water_litres NUMERIC,
    ADD COLUMN IF NOT EXISTS sitting_hours NUMERIC,
    ADD COLUMN IF NOT EXISTS smoking TEXT,
    ADD COLUMN IF NOT EXISTS alcohol TEXT,
    ADD COLUMN IF NOT EXISTS stress TEXT,
    ADD COLUMN IF NOT EXISTS meals_per_day TEXT,
    ADD COLUMN IF NOT EXISTS specific_diet TEXT,
    ADD COLUMN IF NOT EXISTS specific_diet_name TEXT,
    ADD COLUMN IF NOT EXISTS intolerances TEXT[],
    ADD COLUMN IF NOT EXISTS deficiencies TEXT[],
    ADD COLUMN IF NOT EXISTS digestive_issues TEXT[],
    ADD COLUMN IF NOT EXISTS supplements TEXT[],
    ADD COLUMN IF NOT EXISTS in_treatment TEXT,
    ADD COLUMN IF NOT EXISTS treatment_condition TEXT,
    ADD COLUMN IF NOT EXISTS treatment_type TEXT,
    ADD COLUMN IF NOT EXISTS treatment_restrictions TEXT;

-- 4. Create `allergies` table
-- Stores user allergies, allergen specifics, reactions, and severity.
CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allergy_type TEXT NOT NULL,
    allergen TEXT,
    reaction TEXT,
    severity TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user-specific lookups on allergies
CREATE INDEX IF NOT EXISTS idx_allergies_user_id ON allergies(user_id);

-- Enable Row Level Security (RLS) on allergies
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

-- Explicit RLS policies for `allergies`
DROP POLICY IF EXISTS "Users can view their own allergies" ON allergies;
CREATE POLICY "Users can view their own allergies"
    ON allergies
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own allergies" ON allergies;
CREATE POLICY "Users can insert their own allergies"
    ON allergies
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own allergies" ON allergies;
CREATE POLICY "Users can update their own allergies"
    ON allergies
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own allergies" ON allergies;
CREATE POLICY "Users can delete their own allergies"
    ON allergies
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Create `injuries` table
-- Stores user physical injuries, pain during activity, status, and surgery history.
CREATE TABLE IF NOT EXISTS injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    injury_type TEXT NOT NULL,
    body_part TEXT,
    status TEXT,
    pain_during_activity TEXT,
    surgery TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user-specific lookups on injuries
CREATE INDEX IF NOT EXISTS idx_injuries_user_id ON injuries(user_id);

-- Enable Row Level Security (RLS) on injuries
ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;

-- Explicit RLS policies for `injuries`
DROP POLICY IF EXISTS "Users can view their own injuries" ON injuries;
CREATE POLICY "Users can view their own injuries"
    ON injuries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own injuries" ON injuries;
CREATE POLICY "Users can insert their own injuries"
    ON injuries
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own injuries" ON injuries;
CREATE POLICY "Users can update their own injuries"
    ON injuries
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own injuries" ON injuries;
CREATE POLICY "Users can delete their own injuries"
    ON injuries
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
