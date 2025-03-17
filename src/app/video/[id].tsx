import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/context/ThemeContext';
import { lightTheme, darkTheme } from '~/theme/colors';

const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_videos')
    .select('*, yt_channels!inner(*)')
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

export default function Video() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.error }}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: video.title,
          headerStyle: {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            color: theme.text,
          },
        }}
      />

      {/* Video Preview */}
      <Image
        source={{ uri: video.preview_image }}
        style={{ height: 224, width: '100%', resizeMode: 'cover' }}
      />

      {/* Video Info */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{video.title}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Image
            source={{ uri: video.yt_channels.profile_image }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontWeight: '600', color: theme.text }}>{video.yt_channels.name}</Text>
            <Text style={{ color: theme.textSecondary }}>{video.yt_channels.subscribers} subscribers</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <View>
            <Text style={{ color: theme.textSecondary }}>{video.views} views</Text>
            <Text style={{ color: theme.textSecondary }}>{new Date(video.published_at).toLocaleDateString()}</Text>
          </View>
          <View>
            <Text style={{ color: theme.textSecondary }}>{video.likes} likes</Text>
            <Text style={{ color: theme.textSecondary }}>{video.comments} comments</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Description</Text>
          <Text style={{ marginTop: 8, color: theme.textSecondary }}>{video.description}</Text>
        </View>

        {video.tags && video.tags.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Tags</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {video.tags.map((tag: string, index: number) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    margin: 4
                  }}
                >
                  <Text style={{ color: theme.text }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}