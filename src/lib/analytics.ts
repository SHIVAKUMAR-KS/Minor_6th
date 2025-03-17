import { parseISO, format, subDays } from 'date-fns';

export interface VideoPerformanceMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  averageViews: number;
  averageLikes: number;
  averageComments: number;
  engagementRate: number;
  viewsGrowth: number;
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
  }>;
  viewsTrend: Array<{
    date: string;
    views: number;
  }>;
}

export function calculateVideoMetrics(videos: any[]): VideoPerformanceMetrics {
  if (!videos || videos.length === 0) {
    return {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      averageViews: 0,
      averageLikes: 0,
      averageComments: 0,
      engagementRate: 0,
      viewsGrowth: 0,
      topVideos: [],
      viewsTrend: [],
    };
  }

  // Convert string numbers to actual numbers
  const processedVideos = videos.map(video => ({
    ...video,
    views: parseInt(video.views) || 0,
    likes: parseInt(video.likes) || 0,
    comments: parseInt(video.comments) || 0,
    published_at: parseISO(video.published_at),
  }));

  // Calculate totals
  const totalViews = processedVideos.reduce((sum, video) => sum + video.views, 0);
  const totalLikes = processedVideos.reduce((sum, video) => sum + video.likes, 0);
  const totalComments = processedVideos.reduce((sum, video) => sum + video.comments, 0);

  // Calculate averages
  const averageViews = Math.round(totalViews / videos.length);
  const averageLikes = Math.round(totalLikes / videos.length);
  const averageComments = Math.round(totalComments / videos.length);

  // Calculate overall engagement rate (likes + comments) / views * 100
  const engagementRate = totalViews > 0 
    ? ((totalLikes + totalComments) / totalViews) * 100 
    : 0;

  // Calculate views growth (comparing last 30 days to previous 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  const last30DaysViews = processedVideos
    .filter(video => video.published_at >= thirtyDaysAgo)
    .reduce((sum, video) => sum + video.views, 0);

  const previous30DaysViews = processedVideos
    .filter(video => video.published_at >= sixtyDaysAgo && video.published_at < thirtyDaysAgo)
    .reduce((sum, video) => sum + video.views, 0);

  const viewsGrowth = previous30DaysViews > 0 
    ? ((last30DaysViews - previous30DaysViews) / previous30DaysViews) * 100 
    : 0;

  // Get top 5 videos by views
  const topVideos = processedVideos
    .map(video => ({
      id: video.id,
      title: video.title,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      engagementRate: video.views > 0 
        ? ((video.likes + video.comments) / video.views) * 100 
        : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Calculate views trend (last 30 days)
  const viewsByDate = processedVideos
    .filter(video => video.published_at >= thirtyDaysAgo)
    .reduce((acc: { [key: string]: number }, video) => {
      const dateStr = format(video.published_at, 'yyyy-MM-dd');
      acc[dateStr] = (acc[dateStr] || 0) + video.views;
      return acc;
    }, {});

  const viewsTrend = Object.entries(viewsByDate)
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalViews,
    totalLikes,
    totalComments,
    averageViews,
    averageLikes,
    averageComments,
    engagementRate,
    viewsGrowth,
    topVideos,
    viewsTrend,
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
} 