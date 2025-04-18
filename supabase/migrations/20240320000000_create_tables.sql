-- Create the yt_channels table
CREATE TABLE IF NOT EXISTS public.yt_channels (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    handle TEXT,
    banner_img TEXT,
    profile_image TEXT,
    name TEXT NOT NULL,
    subscribers TEXT,
    videos_count INTEGER,
    created_date TIMESTAMP WITH TIME ZONE,
    views TEXT,
    description TEXT,
    location TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the yt_videos table
CREATE TABLE IF NOT EXISTS public.yt_videos (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    likes TEXT,
    views TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    comments TEXT,
    preview_image TEXT,
    youtuber_id TEXT REFERENCES public.yt_channels(id) ON DELETE CASCADE,
    tags TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_yt_videos_youtuber_id ON public.yt_videos(youtuber_id);
CREATE INDEX IF NOT EXISTS idx_yt_channels_updated_at ON public.yt_channels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_yt_videos_published_at ON public.yt_videos(published_at DESC); 