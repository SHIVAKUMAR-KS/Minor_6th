import { supabase } from './supabase';

export async function deleteVideoRecords(count: number = 500) {
    try {
        // First, get the IDs of the records we want to delete
        const { data: videos, error: fetchError } = await supabase
            .from('yt_videos')
            .select('id')
            .limit(count)
            .order('created_at', { ascending: true }); // Delete oldest records first

        if (fetchError) {
            console.error('Error fetching videos:', fetchError);
            throw fetchError;
        }

        if (!videos || videos.length === 0) {
            console.log('No videos found to delete');
            return;
        }

        const videoIds = videos.map(video => video.id);

        // Delete the records
        const { error: deleteError } = await supabase
            .from('yt_videos')
            .delete()
            .in('id', videoIds);

        if (deleteError) {
            console.error('Error deleting videos:', deleteError);
            throw deleteError;
        }

        console.log(`Successfully deleted ${videos.length} videos`);
        return videos.length;
    } catch (error) {
        console.error('Error in deleteVideoRecords:', error);
        throw error;
    }
} 