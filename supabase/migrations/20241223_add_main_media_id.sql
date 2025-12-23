-- Add main_media_id column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS main_media_id UUID REFERENCES project_media(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN projects.main_media_id IS 'Reference to the main image for this project on public detail page';
