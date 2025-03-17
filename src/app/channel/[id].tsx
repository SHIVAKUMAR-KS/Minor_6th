import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Button } from '~/components/Button';
import { fetchChannelVideos } from '~/lib/youtube';
import { supabase } from '~/lib/supabase';
import { PerformanceDashboard } from '~/components/PerformanceDashboard';
import { calculateVideoMetrics } from '~/lib/analytics';
import { useState } from 'react';

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

export default function Channel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'analytics'>('overview');

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

  const collectVideos = async () => {
    try {
      // Fetch latest videos using YouTube API
      const newVideos = await fetchChannelVideos(id);

      if (newVideos.length === 0) {
        Alert.alert('No Videos', 'No videos found for this channel');
        return;
      }

      console.log('Saving videos to database:', newVideos.length);

      // Save videos to database
      const { error } = await supabase.from('yt_videos').upsert(
        newVideos.map(video => ({
          id: video.id,
          url: video.url,
          title: video.title,
          likes: video.likes,
          views: video.views,
          published_at: video.published_at,
          description: video.description,
          comments: video.comments,
          preview_image: video.preview_image,
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
        <Pressable
          className={`flex-1 py-2 ${activeTab === 'overview' ? 'border-b-2 border-blue-500' : ''}`}
          onPress={() => setActiveTab('overview')}
        >
          <Text className={`text-center ${activeTab === 'overview' ? 'text-blue-500' : 'text-gray-600'}`}>
            Overview
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2 ${activeTab === 'videos' ? 'border-b-2 border-blue-500' : ''}`}
          onPress={() => setActiveTab('videos')}
        >
          <Text className={`text-center ${activeTab === 'videos' ? 'text-blue-500' : 'text-gray-600'}`}>
            Videos
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2 ${activeTab === 'analytics' ? 'border-b-2 border-blue-500' : ''}`}
          onPress={() => setActiveTab('analytics')}
        >
          <Text className={`text-center ${activeTab === 'analytics' ? 'text-blue-500' : 'text-gray-600'}`}>
            Analytics
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ScrollView className="flex-1 p-4">
          <Text className="text-lg font-semibold mb-2">About</Text>
          <Text className="mb-4">{channel.description}</Text>
          <Text className="text-lg font-semibold mb-2">Stats</Text>
          <View className="space-y-2">
            <Text>Total Videos: {channel.videos_count}</Text>
            <Text>Total Views: {channel.views}</Text>
            <Text>Created: {new Date(channel.created_date).toLocaleDateString()}</Text>
            {channel.location && <Text>Location: {channel.location}</Text>}
          </View>
        </ScrollView>
      )}

      {activeTab === 'videos' && (
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
            ) : videos?.length === 0 ? (
              <Text className="my-4 text-gray-500">No videos found. Click Refresh Videos to fetch latest videos.</Text>
            ) : (
              <View className="space-y-4">
                {videos?.map((video) => (
                  <Link key={video.id} href={`/video/${video.id}`} asChild>
                    <Pressable className="rounded-lg border border-gray-200 overflow-hidden">
                      <Image source={{ uri: video.preview_image }} className="h-48 w-full object-cover" />
                      <View className="p-4">
                        <Text className="text-lg font-semibold">{video.title}</Text>
                        <View className="flex-row space-x-4 mt-2">
                          <Text className="text-gray-600">{video.views} views</Text>
                          <Text className="text-gray-600">{video.likes} likes</Text>
                          <Text className="text-gray-600">{video.comments} comments</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'analytics' && metrics && (
        <PerformanceDashboard metrics={metrics} />
      )}
    </View>
  );
}