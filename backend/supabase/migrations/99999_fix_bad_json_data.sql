-- Fix malformed completed_by data that might be causing JSON parsing errors
-- The error "Token '...' is invalid" often happens when a JSONB column contains a scalar string 
-- but is queried as if it's an array/object, or has invalid internal formatting.

DO $$
BEGIN
    -- 1. Ensure all completed_by values are valid JSON arrays.
    -- If it's null, make it empty array.
    UPDATE published_quests 
    SET completed_by = '[]'::jsonb 
    WHERE completed_by IS NULL;

    -- 2. If any row has completed_by that is NOT a JSON array (e.g. a string or object), reset it.
    -- This handles the case where "d9e64979" might be stored as a raw string value.
    UPDATE published_quests 
    SET completed_by = '[]'::jsonb 
    WHERE jsonb_typeof(completed_by) != 'array';

    RAISE NOTICE 'Sanitized completed_by column data';
END $$;
