import React from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { VideoAnalysis } from '~/components/VideoAnalysis';
import { fetchVideo } from '~/lib/youtube';

export default function VideoPage() {
  const { id } = useLocalSearchParams();
  const [video, setVideo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadVideo = async () => {
      try {
        setLoading(true);
        const data = await fetchVideo(id as string);
        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>{video.title}</Text>

          <View style={styles.statsContainer}>
            <Text style={styles.stat}>Views: {video.views}</Text>
            <Text style={styles.stat}>Likes: {video.likes}</Text>
            <Text style={styles.stat}>Comments: {video.comments}</Text>
          </View>

          <Image
            source={{ uri: video.preview_image }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          <Text style={styles.description}>{video.description}</Text>
        </View>
      </ScrollView>

      <View style={styles.analysisContainer}>
        <VideoAnalysis videoId={id as string} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  stat: {
    fontSize: 16,
    color: '#666',
  },
  thumbnail: {
    width: '100%',
    height: 192,
    borderRadius: 8,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 16,
  },
  analysisContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});