-- Add cover_photo column to spaces table
-- This allows spaces to have a cover/banner image

-- Add cover_photo column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spaces' 
    AND column_name = 'cover_photo'
  ) THEN
    ALTER TABLE spaces ADD COLUMN cover_photo TEXT;
  END IF;
END $$;

-- Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spaces' 
    AND column_name = 'cover_photo'
  ) THEN
    RAISE EXCEPTION 'Failed to add cover_photo column to spaces table';
  END IF;
END $$;







