-- The booking guard inserts status='upcoming'. Preserve the project's existing
-- appointment status rule and extend it to accept that existing app status.
DO $$
DECLARE
    v_constraint_oid oid;
    v_constraint_definition text;
    v_check_expression text;
BEGIN
    SELECT c.oid, pg_catalog.pg_get_constraintdef(c.oid)
    INTO v_constraint_oid, v_constraint_definition
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.appointments'::regclass
      AND c.conname = 'appointments_status_check'
      AND c.contype = 'c';

    IF v_constraint_oid IS NULL THEN
        RAISE EXCEPTION 'Expected appointments_status_check constraint was not found.';
    END IF;

    IF pg_catalog.strpos(pg_catalog.lower(v_constraint_definition), 'upcoming') > 0 THEN
        RETURN;
    END IF;

    IF pg_catalog.left(v_constraint_definition, 7) <> 'CHECK ('
       OR pg_catalog.right(v_constraint_definition, 1) <> ')' THEN
        RAISE EXCEPTION 'Unexpected appointments_status_check definition: %', v_constraint_definition;
    END IF;

    v_check_expression := pg_catalog.substr(
        v_constraint_definition,
        8,
        pg_catalog.char_length(v_constraint_definition) - 8
    );

    ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
    EXECUTE 'ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK ('
        || v_check_expression
        || ' OR status = ''upcoming'') NOT VALID';
END;
$$;
