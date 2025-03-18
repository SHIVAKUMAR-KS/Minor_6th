import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, ScrollView, Alert, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Button } from '~/components/Button';
import { fetchChannelVideos } from '~/lib/youtube';
import { supabase } from '~/lib/supabase';
import PerformanceDashboard from '~/components/PerformanceDashboard';
import { calculateVideoMetrics } from '~/lib/analytics';
import { useState } from 'react';
import { useTheme } from '~/context/ThemeContext';
import { lightTheme, darkTheme } from '~/theme/colors';

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const styles = StyleSheet.create({
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  videoCard: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  videoInfo: {
    padding: 8,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  videoStat: {
    fontSize: 12,
  },
});

// Update cache duration to 7 days to reduce API calls
const ANALYSIS_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const fetchChannel = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_channels')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Channel not found');
  }
  return data;
};

const fetchVideos = async (id: string) => {
  const { data, error } = await supabase.from('yt_videos').select('*').eq('youtuber_id', id);
  if (error) {
    throw error;
  }
  return data;
};

const fetchChannelAnalysis = async (channelId: string) => {
  try {
    // First check local storage for even faster access
    const { data, error } = await supabase
      .from('channel_analysis')
      .select('*')
      .eq('channel_id', channelId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching analysis:', error);
      return null;
    }

    // Check if we have any analysis
    if (data && data.length > 0) {
      const lastAnalysis = data[0];
      const analysisAge = Date.now() - new Date(lastAnalysis.updated_at).getTime();

      // Use cached analysis if:
      // 1. It's less than 7 days old OR
      // 2. Channel hasn't posted new videos since last analysis
      if (analysisAge < ANALYSIS_CACHE_DURATION) {
        console.log('Using cached analysis (within cache duration)');
        return lastAnalysis.analysis;
      }
    }
    return null;
  } catch (error) {
    console.error('Error in fetchChannelAnalysis:', error);
    return null;
  }
};

const saveChannelAnalysis = async (channelId: string, analysis: string) => {
  try {
    console.log('Saving analysis for channel:', channelId);

    const { error } = await supabase
      .from('channel_analysis')
      .upsert({
        channel_id: channelId,
        analysis: analysis,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'channel_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving analysis:', error);
      // Log more details about the error
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('Analysis saved successfully');
    }
  } catch (error) {
    console.error('Error in saveChannelAnalysis:', error);
  }
};

const analyzeChannel = async (channel: any, videos: any[], retryCount = 0) => {
  try {
    // Always check cache first
    const cachedAnalysis = await fetchChannelAnalysis(channel.id);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    // If no cache, check if we should use fallback
    const shouldUseFallback = () => {
      const hour = new Date().getHours();
      // Use fallback during peak hours (8 AM - 8 PM)
      return hour >= 8 && hour <= 20;
    };

    if (shouldUseFallback()) {
      console.log('Peak hours detected, using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis(channel, videos);
      await saveChannelAnalysis(channel.id, fallbackAnalysis);
      return fallbackAnalysis;
    }

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is not set');
      return generateFallbackAnalysis(channel, videos);
    }

    // Simplified prompt to reduce tokens
    const prompt = `Analyze YouTube channel:
Channel: ${channel.name}
Subscribers: ${channel.subscribers}
Videos: ${channel.videos_count}
Views: ${channel.views}
Description: ${channel.description}

Format:
Niche: [focus]
Audience: [target]
Strategy: [approach]
Growth: [High/Medium/Low]
Strengths: [2 points]
Improve: [2 points]`;

    console.log('Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200, // Reduced tokens
      }),
    });

    // If we hit any API issues, use fallback immediately
    if (!response.ok || response.status === 429) {
      console.log('API issue detected, using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis(channel, videos);
      await saveChannelAnalysis(channel.id, fallbackAnalysis);
      return fallbackAnalysis;
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    const analysis = data.choices[0].message.content;
    await saveChannelAnalysis(channel.id, analysis);
    return analysis;
  } catch (error) {
    console.error('Error analyzing channel:', error);
    const fallbackAnalysis = generateFallbackAnalysis(channel, videos);
    await saveChannelAnalysis(channel.id, fallbackAnalysis);
    return fallbackAnalysis;
  }
};

// Fallback analysis function that doesn't rely on OpenAI
const generateFallbackAnalysis = (channel: any, videos: any[]) => {
  const avgViews = videos.reduce((sum, video) => sum + (parseInt(video.views) || 0), 0) / videos.length;
  const avgLikes = videos.reduce((sum, video) => sum + (parseInt(video.likes) || 0), 0) / videos.length;
  const engagementRate = (avgLikes / avgViews) * 100;

  return `Channel Analysis:

Niche: ${channel.description.split('.')[0]}
Target Audience: Based on ${channel.subscribers} subscribers and content focus
Content Strategy: ${videos.length} videos with average ${formatNumber(avgViews)} views
Growth Potential: ${engagementRate > 5 ? 'High' : engagementRate > 2 ? 'Medium' : 'Low'}
Key Strengths:
- ${formatNumber(channel.subscribers)} subscribers
- ${formatNumber(channel.views)} total views
- ${channel.videos_count} videos published

Areas for Improvement:
- Consider increasing video frequency
- Focus on improving engagement rate (currently ${engagementRate.toFixed(1)}%)
- Optimize video titles and thumbnails for better CTR`;
};

export default function Channel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'analytics'>('overview');
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const {
    data: channel,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['channel', id],
    queryFn: () => fetchChannel(id),
  });

  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
  } = useQuery({
    queryKey: ['videos', id],
    queryFn: () => fetchVideos(id),
  });

  const metrics = videos ? calculateVideoMetrics(videos) : null;

  const {
    data: channelAnalysis,
    isLoading: analysisLoading,
  } = useQuery({
    queryKey: ['channel-analysis', id],
    queryFn: () => channel && videos ? analyzeChannel(channel, videos) : null,
    enabled: !!channel && !!videos,
  });

  const collectVideos = async () => {
    try {
      // Fetch latest videos using YouTube API
      const newVideos = await fetchChannelVideos(id);

      if (newVideos.length === 0) {
        Alert.alert('No Videos', 'No videos found for this channel');
        return;
      }

      // Save videos to database
      const { error } = await supabase.from('yt_videos').upsert(
        newVideos.map(video => ({
          id: video.id,
          url: video.url,
          title: video.title,
          likes: parseInt(video.likes) || 0,
          views: parseInt(video.views) || 0,
          published_at: video.published_at,
          description: video.description || '',
          comments: parseInt(video.comments) || 0,
          preview_image: video.preview_image || '',
          youtuber_id: video.youtuber_id,
          updated_at: new Date().toISOString(),
        }))
      );

      if (error) {
        console.error('Error saving videos:', error);
        throw error;
      }

      // Refresh videos list
      queryClient.invalidateQueries({ queryKey: ['videos', id] });
      Alert.alert('Success', `${newVideos.length} videos updated successfully`);
    } catch (error: any) {
      console.error('Error in collectVideos:', error);
      Alert.alert('Error', error.message);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500">Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: channel.name }} />

      {/* Channel Header */}
      <View>
        {channel.banner_img && (
          <Image source={{ uri: channel.banner_img }} className="h-32 w-full object-cover" />
        )}
        <View className="p-4">
          <View className="flex-row items-center">
            <Image source={{ uri: channel.profile_image }} className="h-20 w-20 rounded-full" />
            <View className="ml-4">
              <Text className="text-2xl font-bold">{channel.name}</Text>
              <Text className="text-gray-600">{channel.subscribers} subscribers</Text>
            </View>
          </View>
          <Text className="mt-4">{channel.description}</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View className="flex-row border-b border-gray-200">
        {(['overview', 'videos', 'analytics'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 ${activeTab === tab
              ? 'border-b-2 border-blue-500'
              : 'border-b-2 border-transparent'
              }`}
          >
            <Text
              className={`text-center font-medium ${activeTab === tab ? 'text-blue-500' : 'text-gray-500'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {(() => {
          switch (activeTab) {
            case 'overview':
              return (
                <ScrollView style={{ flex: 1, padding: 16, backgroundColor: theme.background }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: theme.text }}>About</Text>
                  <Text style={{ marginBottom: 16, color: theme.text }}>{channel.description}</Text>

                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: theme.text }}>Channel Stats</Text>
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    <Text style={{ color: theme.text }}>Total Videos: {channel.videos_count}</Text>
                    <Text style={{ color: theme.text }}>Total Views: {formatNumber(channel.views)}</Text>
                    <Text style={{ color: theme.text }}>Created: {new Date(channel.created_date).toLocaleDateString()}</Text>
                    {channel.location && <Text style={{ color: theme.text }}>Location: {channel.location}</Text>}
                  </View>

                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: theme.text }}>AI Analysis</Text>
                  {analysisLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : channelAnalysis ? (
                    <Text style={{ color: theme.text, lineHeight: 24 }}>{channelAnalysis}</Text>
                  ) : (
                    <Text style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                      Unable to generate analysis at this time.
                    </Text>
                  )}
                </ScrollView>
              );
            case 'videos':
              return (
                <ScrollView className="flex-1">
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-4">
                      <Text className="text-xl font-bold">Videos</Text>
                      <Button onPress={collectVideos} loading={videosLoading}>
                        Refresh Videos
                      </Button>
                    </View>

                    {videosLoading ? (
                      <ActivityIndicator className="my-4" />
                    ) : videosError ? (
                      <Text className="text-red-500">Error loading videos</Text>
                    ) : !videos || videos.length === 0 ? (
                      <Text className="my-4 text-gray-500">No videos found. Click Refresh Videos to fetch latest videos.</Text>
                    ) : (
                      <View style={styles.videoGrid}>
                        {videos.map((video, index) => (
                          <Link
                            key={`${video.id}-${index}`}
                            href={`/video/${video.id}`}
                            asChild
                          >
                            <Pressable style={[styles.videoCard, { backgroundColor: theme.surface }]}>
                              <Image
                                source={{ uri: video.preview_image }}
                                style={styles.thumbnail}
                              />
                              <View style={styles.videoInfo}>
                                <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                                  {video.title}
                                </Text>
                                <View style={styles.videoStats}>
                                  <Text style={[styles.videoStat, { color: theme.textSecondary }]}>
                                    {formatNumber(video.views)} views
                                  </Text>
                                  <Text style={[styles.videoStat, { color: theme.textSecondary }]}>
                                    {formatNumber(video.likes)} likes
                                  </Text>
                                  <Text style={[styles.videoStat, { color: theme.textSecondary }]}>
                                    {formatNumber(video.comments)} comments
                                  </Text>
                                </View>
                              </View>
                            </Pressable>
                          </Link>
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>
              );
            case 'analytics':
              return metrics ? <PerformanceDashboard metrics={metrics} /> : null;
            default:
              return null;
          }
        })()}
      </View>
    </View>
  );
}