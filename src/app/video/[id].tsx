import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '~/lib/supabase';

const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_videos')
    .select('*, yt_channels!inner(*)')
    .eq('id', id)
    .single();
  if (error) {
    throw error;
  }
  return data;
};

export default function Video() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: video,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['video', id],
    queryFn: () => fetchVideo(id),
  });

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
    <ScrollView className="flex-1">
      <Stack.Screen options={{ title: video.title }} />

      {/* Video Preview */}
      <Image source={{ uri: video.preview_image }} className="h-56 w-full object-cover" />

      {/* Video Info */}
      <View className="p-4">
        <Text className="text-2xl font-bold">{video.title}</Text>

        <View className="mt-2 flex-row items-center">
          <Image
            source={{ uri: video.yt_channels.profile_image }}
            className="h-10 w-10 rounded-full"
          />
          <View className="ml-3">
            <Text className="font-semibold">{video.yt_channels.name}</Text>
            <Text className="text-gray-600">{video.yt_channels.subscribers} subscribers</Text>
          </View>
        </View>

        <View className="mt-4 flex-row justify-between">
          <View>
            <Text className="text-gray-600">{video.views} views</Text>
            <Text className="text-gray-600">{new Date(video.published_at).toLocaleDateString()}</Text>
          </View>
          <View>
            <Text className="text-gray-600">{video.likes} likes</Text>
            <Text className="text-gray-600">{video.comments} comments</Text>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-lg font-semibold">Description</Text>
          <Text className="mt-2 text-gray-800">{video.description}</Text>
        </View>

        {video.tags && video.tags.length > 0 && (
          <View className="mt-4">
            <Text className="text-lg font-semibold">Tags</Text>
            <View className="mt-2 flex-row flex-wrap">
              {video.tags.map((tag: string, index: number) => (
                <View key={index} className="m-1 rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-gray-800">{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}