-- Add project_type column to spaces table
-- Allows spaces to specify their project type: DeFi, InfoFi, Other, Undisclosed

ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'undisclosed'
CHECK (project_type IN ('defi', 'infofi', 'other', 'undisclosed'));

-- Add index for project_type queries
CREATE INDEX IF NOT EXISTS idx_spaces_project_type ON spaces(project_type);

-- Add comment to document the column
COMMENT ON COLUMN spaces.project_type IS 'Type of project: defi, infofi, other, or undisclosed';
