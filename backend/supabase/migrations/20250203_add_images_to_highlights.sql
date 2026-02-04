ALTER TABLE weekly_highlights 
ADD COLUMN IF NOT EXISTS desktop_image text,
ADD COLUMN IF NOT EXISTS mobile_image text;
