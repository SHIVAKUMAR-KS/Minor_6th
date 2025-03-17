-- Update yt_channels table
ALTER TABLE public.yt_channels 
  RENAME COLUMN "Description" TO description;

-- Update yt_videos table
ALTER TABLE public.yt_videos 
  RENAME COLUMN date_posted TO published_at,
  RENAME COLUMN num_comments TO comments;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_yt_videos_youtuber_id;
DROP INDEX IF EXISTS idx_yt_channels_updated_at;
DROP INDEX IF EXISTS idx_yt_videos_published_at;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_yt_videos_youtuber_id ON public.yt_videos(youtuber_id);
CREATE INDEX IF NOT EXISTS idx_yt_channels_updated_at ON public.yt_channels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_yt_videos_published_at ON public.yt_videos(published_at DESC); 