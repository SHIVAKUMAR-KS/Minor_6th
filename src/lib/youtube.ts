import { YOUTUBE_API_KEY } from '~/constants';
import { YoutubeTranscript } from 'youtube-transcript';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '~/constants';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface YouTubeChannel {
  id: string;
  url: string;
  handle?: string;
  banner_img?: string;
  profile_image: string;
  name: string;
  subscribers: string;
  videos_count: number;
  created_date?: string;
  views: string;
  description: string;
  location?: string;
}

interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  likes: string;
  views: string;
  published_at: string;
  description: string;
  comments: string;
  preview_image: string;
  youtuber_id: string;
  tags?: string[];
}

interface VideoStats {
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  tags: string[];
}

interface PlaylistResponse {
  items: Array<{
    contentDetails: {
      videoId: string;
    };
    snippet: {
      title: string;
      publishedAt: string;
      description: string;
      thumbnails: {
        high?: { url: string };
        default?: { url: string };
      };
    };
  }>;
  nextPageToken?: string;
}

interface VideoResponse {
  items: Array<{
    id: string;
    snippet: {
      tags?: string[];
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
    };
    tags?: string[];
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    videoId?: string;
  };
}

// Extract channel ID from URL
export function extractChannelId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Handle different URL formats
    if (pathname.startsWith('/@')) {
      // Handle handle-based URLs (e.g., youtube.com/@username)
      return pathname.slice(2);
    } else if (pathname.startsWith('/channel/')) {
      // Handle channel ID URLs (e.g., youtube.com/channel/UC...)
      return pathname.split('/')[2];
    } else if (pathname.startsWith('/user/')) {
      // Handle legacy username URLs (e.g., youtube.com/user/username)
      return pathname.split('/')[2];
    }
  } catch (error) {
    console.error('Invalid URL:', error);
  }
  return null;
}

// Fetch channel data
export async function fetchChannelData(channelIdentifier: string): Promise<YouTubeChannel> {
  // First try to get channel by custom URL/handle
  let channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelIdentifier}&type=channel&key=${YOUTUBE_API_KEY}`
  );

  if (!channelResponse.ok) {
    throw new Error('Failed to fetch channel');
  }

  let channelData = await channelResponse.json();
  let channelId = channelData.items?.[0]?.id?.channelId;

  if (!channelId) {
    // If not found by handle, try using the input as a channel ID
    channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelIdentifier}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel');
    }

    channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }

    channelId = channelData.items[0].id;
  }

  // Get full channel details
  const fullChannelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!fullChannelResponse.ok) {
    throw new Error('Failed to fetch channel details');
  }

  const fullChannelData = await fullChannelResponse.json();
  const channel = fullChannelData.items[0];

  return {
    id: channel.id,
    url: `https://youtube.com/channel/${channel.id}`,
    handle: channel.snippet.customUrl,
    banner_img: channel.brandingSettings.image?.bannerExternalUrl,
    profile_image: channel.snippet.thumbnails.high.url,
    name: channel.snippet.title,
    subscribers: channel.statistics.subscriberCount,
    videos_count: parseInt(channel.statistics.videoCount),
    created_date: channel.snippet.publishedAt,
    views: channel.statistics.viewCount,
    description: channel.snippet.description,
    location: channel.snippet.country,
  };
}

// Fetch channel videos
export const fetchChannelVideos = async (channelId: string) => {
  try {
    // Get channel's uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel');
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('No uploads playlist found');
    }

    // Get videos from uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error('Failed to fetch videos');
    }

    const videosData = await videosResponse.json();
    const videoIds = videosData.items
      ?.map((item: any) => item.contentDetails?.videoId)
      .filter((id: string | undefined): id is string => typeof id === 'string');

    if (!videoIds?.length) {
      return [];
    }

    // Remove duplicate videoIds
    const uniqueVideoIds = [...new Set(videoIds)];

    // Get video details
    const videoDetailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${uniqueVideoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoDetailsResponse.ok) {
      throw new Error('Failed to fetch video details');
    }

    const videoDetailsData = await videoDetailsResponse.json();
    return videoDetailsData.items?.map((video: any) => ({
      id: video.id || crypto.randomUUID(),
      url: `https://youtube.com/watch?v=${video.id}`,
      title: video.snippet?.title || '',
      likes: video.statistics?.likeCount || '0',
      views: video.statistics?.viewCount || '0',
      published_at: video.snippet?.publishedAt ? new Date(video.snippet.publishedAt).toISOString() : new Date().toISOString(),
      description: video.snippet?.description || '',
      comments: video.statistics?.commentCount || '0',
      preview_image: video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.high?.url,
      youtuber_id: channelId,
      tags: video.snippet?.tags || [],
    })) || [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

export const fetchVideoSubtitles = async (videoId: string) => {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return null;
  }
};

// Helper function to extract keywords from text
function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  // Remove special characters and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words and remove common words
  const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at']);
  const words = cleanText.split(/\s+/).filter(word => !commonWords.has(word));
  
  // Count word frequencies
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    if (word.length > 3) { // Only consider words longer than 3 characters
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });
  
  // Sort by frequency and get top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Helper function to estimate video duration from transcript
function estimateDuration(transcript: string): string {
  const wordsPerMinute = 150; // Average speaking rate
  const minutes = Math.ceil(transcript.split(/\s+/).length / wordsPerMinute);
  return `${minutes} minutes`;
}

export const analyzeVideoContent = async (videoId: string, title: string, subtitles: string) => {
  try {
    // Truncate subtitles if too long (OpenAI has token limits)
    const truncatedSubtitles = subtitles.slice(0, 2000) + (subtitles.length > 2000 ? '...' : '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Analyze this YouTube video content based on its title and subtitles:

Title: ${title}

Content:
${truncatedSubtitles}

Provide a concise analysis in this format:
1. Main Topic: [1-2 sentences]
2. Key Points: [3-4 bullet points]
3. Target Audience: [1 sentence]
4. Content Quality: [High/Medium/Low with brief explanation]
5. SEO Keywords: [5-7 relevant keywords]`
        }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze video content');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing video content:', error);
    return null;
  }
};

export const analyzeVideoSubtitles = async (videoId: string) => {
  try {
    // Get video subtitles first
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(item => item.text).join(' ');

    // Get video details
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!videoResponse.ok) {
      const errorData = await videoResponse.json();
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Failed to fetch video details'}`);
    }

    const videoData = await videoResponse.json();
    const video = videoData.items?.[0];
    
    if (!video) {
      throw new Error('Video not found in API response');
    }

    // Extract keywords from title and transcript
    const keywords = extractKeywords(`${video.snippet?.title} ${fullText}`);

    // Calculate engagement metrics
    const viewCount = parseInt(video.statistics?.viewCount || '0');
    const likeCount = parseInt(video.statistics?.likeCount || '0');
    const commentCount = parseInt(video.statistics?.commentCount || '0');
    
    const engagementRate = viewCount > 0 
      ? ((likeCount / viewCount) * 100).toFixed(2) 
      : '0';
    
    const commentRate = viewCount > 0 
      ? ((commentCount / viewCount) * 100).toFixed(2) 
      : '0';

    // Generate content analysis
    const contentAnalysis = `Video Analysis:

Title: ${video.snippet?.title}
Published: ${new Date(video.snippet?.publishedAt || '').toLocaleDateString()}
Duration: ${estimateDuration(fullText)}

Performance Metrics:
- Views: ${video.statistics?.viewCount || '0'}
- Likes: ${video.statistics?.likeCount || '0'}
- Comments: ${video.statistics?.commentCount || '0'}
- Engagement Rate: ${engagementRate}% (likes per view)
- Comment Rate: ${commentRate}% (comments per view)

Content Analysis:
- Main Topic: ${video.snippet?.title}
- Content Type: ${video.snippet?.tags?.join(', ') || 'Not specified'}
- Key Keywords: ${keywords.join(', ')}
- Video Length: ${estimateDuration(fullText)}

Summary:
${video.snippet?.description?.slice(0, 200)}...

Transcript Preview:
${fullText.slice(0, 200)}...`;

    // Prepare the complete analysis
    const analysis = {
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || '',
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      commentCount: video.statistics?.commentCount || '0',
      transcript: fullText,
      contentAnalysis,
      summary: `This video titled "${video.snippet?.title}" was published on ${new Date(video.snippet?.publishedAt || '').toLocaleDateString()}. 
                It has ${video.statistics?.viewCount || '0'} views, ${video.statistics?.likeCount || '0'} likes, and ${video.statistics?.commentCount || '0'} comments.
                The video discusses: ${fullText.substring(0, 200)}...`,
    };

    return analysis;
  } catch (error) {
    return {
      title: 'Video Analysis',
      description: 'Unable to fetch video details',
      publishedAt: new Date().toISOString(),
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
      transcript: 'Transcript not available',
      contentAnalysis: `Error analyzing video: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your YouTube API key and try again.`,
      summary: 'Unable to analyze video content. Please try again later.',
    };
  }
};

export const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_videos')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Video not found');
  }
  return data[0];
};