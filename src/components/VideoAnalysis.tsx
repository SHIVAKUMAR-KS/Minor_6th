import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { analyzeVideoSubtitles } from '~/lib/youtube';

interface VideoAnalysisProps {
    videoId: string;
}

export const VideoAnalysis: React.FC<VideoAnalysisProps> = ({ videoId }) => {
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFullTranscript, setShowFullTranscript] = useState(false);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await analyzeVideoSubtitles(videoId);
                setAnalysis(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to analyze video');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [videoId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Analyzing video content...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <Text style={styles.errorHelpText}>
                    Please check your YouTube API key configuration in your .env file.
                </Text>
            </View>
        );
    }

    if (!analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No analysis available</Text>
            </View>
        );
    }

    // Split the content analysis into sections
    const sections = analysis.contentAnalysis.split('\n\n').filter(Boolean);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{analysis.title}</Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analysis.viewCount}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analysis.likeCount}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analysis.commentCount}</Text>
                        <Text style={styles.statLabel}>Comments</Text>
                    </View>
                </View>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {section.split('\n')[0]}
                        </Text>
                        <Text style={styles.analysisText}>
                            {section.split('\n').slice(1).join('\n')}
                        </Text>
                    </View>
                ))}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{analysis.description}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transcript</Text>
                    <Text style={styles.transcriptText}>
                        {showFullTranscript ? analysis.transcript : analysis.transcript.slice(0, 1000)}
                    </Text>
                    {analysis.transcript.length > 1000 && (
                        <Text
                            style={styles.showMoreButton}
                            onPress={() => setShowFullTranscript(!showFullTranscript)}
                        >
                            {showFullTranscript ? 'Show Less' : 'Show More'}
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    section: {
        marginBottom: 16,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    analysisText: {
        lineHeight: 24,
        whiteSpace: 'pre-line',
        color: '#444',
    },
    descriptionText: {
        lineHeight: 20,
        color: '#444',
    },
    transcriptText: {
        lineHeight: 20,
        color: '#444',
    },
    loadingText: {
        marginTop: 8,
        textAlign: 'center',
        color: '#666',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorHelpText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    showMoreButton: {
        color: '#2196F3',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
        padding: 8,
    },
}); 