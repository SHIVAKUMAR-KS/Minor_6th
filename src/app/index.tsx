import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, Link, router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert, Image, ActivityIndicator } from 'react-native';

import { Button } from '~/components/Button';
import { Container } from '~/components/Container';
import { fetchChannelData, extractChannelId } from '~/lib/youtube';
import { supabase } from '~/lib/supabase';

const POPULAR_CHANNELS = [
  { name: 'notJustDev', id: 'UCYSa_YLoJokZAwHhlwJntIA' },
  { name: 'PewDiePie', id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw' },
];

const fetchChannels = async () => {
  const { data, error } = await supabase
    .from('yt_channels')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: channels,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
  });

  const startAnalyzing = async () => {
    try {
      setIsAnalyzing(true);

      // Extract channel ID from URL
      const channelId = extractChannelId(url);
      if (!channelId) {
        throw new Error('Invalid YouTube channel URL');
      }

      // Fetch channel data from YouTube API
      const channelData = await fetchChannelData(channelId);

      // Save to database
      const { error: saveError } = await supabase
        .from('yt_channels')
        .upsert({
          ...channelData,
          updated_at: new Date().toISOString(),
        });

      if (saveError) {
        throw saveError;
      }

      // Refresh channels list
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      // Navigate to channel page
      router.push(`/channel/${channelData.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Container>
      <Stack.Screen options={{ title: 'YouTube Channel Analysis' }} />

      {/* Search Input */}
      <View className="p-4">
        <TextInput
          placeholder="Enter YouTube channel URL"
          value={url}
          onChangeText={setUrl}
          className="rounded-lg border border-gray-300 p-2"
        />
        <Button
          onPress={startAnalyzing}
          loading={isAnalyzing}
          className="mt-2"
        >
          Start Analyzing
        </Button>
      </View>

      {/* Popular Channels */}
      <View className="p-4">
        <Text className="text-xl font-bold">Popular Channels</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          {POPULAR_CHANNELS.map((channel) => (
            <Link key={channel.id} href={`/channel/${channel.id}`} asChild>
              <Pressable className="mr-4 rounded-lg bg-gray-100 p-4">
                <Text className="font-semibold">{channel.name}</Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </View>

      {/* Recently Analyzed */}
      <View className="flex-1 p-4">
        <Text className="text-xl font-bold">Recently Analyzed</Text>
        {isLoading ? (
          <ActivityIndicator className="mt-4" />
        ) : error ? (
          <Text className="mt-4 text-red-500">Error loading channels</Text>
        ) : channels?.length === 0 ? (
          <Text className="mt-4 text-gray-500">No channels analyzed yet</Text>
        ) : (
          <ScrollView className="mt-2">
            {channels?.map((channel) => (
              <Link key={channel.id} href={`/channel/${channel.id}`} asChild>
                <Pressable className="mb-4 flex-row items-center rounded-lg border border-gray-200 p-4">
                  <Image
                    source={{ uri: channel.profile_image }}
                    className="h-12 w-12 rounded-full"
                  />
                  <View className="ml-4">
                    <Text className="font-semibold">{channel.name}</Text>
                    <Text className="text-gray-600">{channel.subscribers} subscribers</Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        )}
      </View>
    </Container>
  );
}
