import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, Link, router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '~/components/Button';
import { Container } from '~/components/Container';
import { fetchChannelData, extractChannelId } from '~/lib/youtube';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/context/ThemeContext';

const POPULAR_CHANNELS = [{ name: 'TakeUForward |', id: 'UCYSa_YLoJokZAwHhlwJntIA' }, { name: 'Coding_Channel', id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw' }];
const fetchChannels = async () => { const { data, error } = await supabase.from('yt_channels').select('*').order('updated_at', { ascending: false }); if (error) throw error; return data; };

export default function Home() {
  const [url, setUrl] = useState(''); const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient(); const { isDark } = useTheme(); const theme = isDark ? darkTheme : lightTheme;
  const { data: channels, isLoading, error } = useQuery({ queryKey: ['channels'], queryFn: fetchChannels });

  const startAnalyzing = async () => { try { setIsAnalyzing(true); const channelId = extractChannelId(url); if (!channelId) throw new Error('Invalid YouTube URL'); const channelData = await fetchChannelData(channelId); await supabase.from('yt_channels').upsert({ ...channelData, updated_at: new Date().toISOString() }); queryClient.invalidateQueries({ queryKey: ['channels'] }); router.push(`/channel/${channelData.id}`); } catch (error) { Alert.alert('Error', error.message); } finally { setIsAnalyzing(false); } };

  const handleDeleteChannel = async (channelId) => { Alert.alert('Delete Channel', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await supabase.from('yt_channels').delete().eq('id', channelId); queryClient.invalidateQueries({ queryKey: ['channels'] }); } catch (error) { Alert.alert('Error', error.message); } } } ]); };

  return (
    <Container>
      <Stack.Screen options={{ title: 'AI-Powered YouTube Analysis', headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }} />
      <View style={[styles.section, { backgroundColor: theme.background }]}>
        <TextInput placeholder="Enter YouTube URL" value={url} onChangeText={setUrl} style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]} />
        <Button onPress={startAnalyzing} loading={isAnalyzing} style={styles.button}>Start Analyzing</Button>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularChannels}>
        {POPULAR_CHANNELS.map((channel) => (
          <Link key={channel.id} href={`/channel/${channel.id}`} asChild>
            <Pressable style={[styles.popularChannelCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.popularChannelText, { color: theme.text }]}>{channel.name}</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
      <View style={[styles.section, { backgroundColor: theme.background }]}>
        {isLoading ? <ActivityIndicator size="large" color={theme.text} /> : error ? <Text style={[styles.errorText, { color: theme.error }]}>Error loading channels</Text> : channels?.length === 0 ? <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No channels analyzed yet</Text> : (
          <ScrollView style={styles.recentChannels}>
            {channels?.map((channel) => (
              <View key={channel.id} style={styles.channelCardContainer}>
                <Link href={`/channel/${channel.  id}`} asChild>
                  <Pressable style={[styles.channelCard, { backgroundColor: theme.surface }]}>
                    <Image source={{ uri: channel.profile_image }} style={styles.channelImage} />
                    <Text style={[styles.channelName, { color: theme.text }]}>{channel.name}</Text>
                    <Text style={[styles.channelSubscribers, { color: theme.textSecondary }]}>{channel.subscribers} subscribers</Text>
                  </Pressable>
                </Link>
                <Pressable style={[styles.deleteButton, { backgroundColor: theme.error }]} onPress={() => handleDeleteChannel(channel.id)}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16 }, input: { borderRadius: 8, borderWidth: 1, padding: 12, fontSize: 16, marginBottom: 12 }, button: { marginTop: 8 },
  popularChannels: { marginTop: 8 }, popularChannelCard: { padding: 12, borderRadius: 8, marginRight: 12, minWidth: 120, alignItems: 'center' },
  popularChannelText: { fontSize: 16, fontWeight: '600' }, loadingIndicator: { marginTop: 16 }, errorText: { fontSize: 16, textAlign: 'center', marginTop: 16 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 }, recentChannels: { marginTop: 8 }, channelCardContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  channelCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1 }, channelImage: { width: 48, height: 48, borderRadius: 24 },
  channelName: { fontSize: 16, fontWeight: '600' }, channelSubscribers: { fontSize: 14, marginTop: 2 }, deleteButton: { padding: 12, borderRadius: 8, marginLeft: 8 },
});
