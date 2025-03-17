import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '~/lib/supabase';

const fetchJob = async (id: string) => {
  const { data, error } = await supabase.from('scrape_jobs').select('*').eq('id', id).single();
  if (error) {
    throw error;
  }
  return data;
};

export default function JobPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: scrapeJob,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id),
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = supabase
      .channel('supabase_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scrape_jobs', filter: `id=eq.${id}` },
        (payload) => {
          const updatedJob = payload.new;
          router.replace(`/channel/${updatedJob.channel_id}`);
          queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
      )
      .subscribe();

    return () => {
      channels.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="mb-4 text-2xl font-semibold">Job Status</Text>
      <View className="flex-row items-center">
        <Text className="text-xl">{scrapeJob.status}</Text>
        {scrapeJob.status === 'running' && <ActivityIndicator size="large" className="ml-4" />}
      </View>
    </View>
  );
}