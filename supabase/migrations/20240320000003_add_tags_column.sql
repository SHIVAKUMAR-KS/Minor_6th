-- Add tags column to yt_videos table
ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS tags text[];

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_videos_tags;

-- Create a GIN index for efficient text array searching
CREATE INDEX idx_videos_tags ON yt_videos USING GIN (tags); 