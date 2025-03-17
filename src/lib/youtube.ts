import { YOUTUBE_API_KEY } from '~/constants';

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
export async function fetchChannelVideos(channelId: string, maxResults: number = 50): Promise<YouTubeVideo[]> {
  try {
    console.log('Fetching videos for channel:', channelId);
    
    // First get playlist ID (uploads playlist)
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      throw new Error(`Failed to fetch channel playlist: ${channelResponse.statusText}`);
    }

    const channelData = await channelResponse.json();
    console.log('Channel data:', channelData);
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found or has no uploads playlist');
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    console.log('Uploads playlist ID:', uploadsPlaylistId);

    let allVideos: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let totalFetched = 0;
    const maxVideosToFetch = 200; // Limit to 200 videos total to avoid rate limits

    // Fetch videos page by page
    do {
      const pageUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const videosResponse = await fetch(pageUrl);

      if (!videosResponse.ok) {
        throw new Error(`Failed to fetch videos: ${videosResponse.statusText}`);
      }

      const videosData = await videosResponse.json();
      console.log('Found videos in current page:', videosData.items?.length || 0);
      
      if (!videosData.items || videosData.items.length === 0) {
        break;
      }

      allVideos = [...allVideos, ...videosData.items];
      totalFetched += videosData.items.length;
      nextPageToken = videosData.nextPageToken;

      // Break if we've reached our limit or there are no more pages
      if (totalFetched >= maxVideosToFetch || !nextPageToken) {
        break;
      }
    } while (true);

    console.log('Total videos fetched:', allVideos.length);

    if (allVideos.length === 0) {
      return [];
    }

    // Get video statistics in batches of 50
    const videos: YouTubeVideo[] = [];
    for (let i = 0; i < allVideos.length; i += 50) {
      const batch = allVideos.slice(i, i + 50);
      const videoIds = batch.map((item: any) => item.contentDetails.videoId).join(',');
      
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );

      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch video statistics: ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();
      console.log(`Got statistics for videos batch ${i/50 + 1}:`, statsData.items?.length || 0);

      const batchVideos = batch.map((item: any) => {
        const stats = statsData.items?.find((s: any) => s.id === item.contentDetails.videoId)?.statistics || {};
        return {
          id: item.contentDetails.videoId,
          url: `https://youtube.com/watch?v=${item.contentDetails.videoId}`,
          title: item.snippet.title,
          likes: stats.likeCount || '0',
          views: stats.viewCount || '0',
          published_at: item.snippet.publishedAt,
          description: item.snippet.description,
          comments: stats.commentCount || '0',
          preview_image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          youtuber_id: channelId,
        };
      });

      videos.push(...batchVideos);
    }

    console.log('Successfully processed all videos:', videos.length);
    return videos;
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
}