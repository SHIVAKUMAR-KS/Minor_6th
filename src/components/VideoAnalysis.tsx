import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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

    const renderGitHubContent = () => {
        if (!analysis.githubUrl) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>GitHub Content</Text>
                <Text style={styles.githubUrl}>{analysis.githubUrl}</Text>
                {analysis.githubFileType === 'pdf' ? (
                    <Text style={styles.noteText}>
                        This link contains a PDF file. Please visit the GitHub URL to view it.
                    </Text>
                ) : !analysis.githubCode ? (
                    <Text style={styles.noteText}>
                        Unable to fetch code content. Please visit the GitHub URL directly.
                    </Text>
                ) : (
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeText}>{analysis.githubCode}</Text>
                    </View>
                )}
            </View>
        );
    };

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

                {renderGitHubContent()}

                {sections.map((section: string, index: number) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {section.split('\n')[0]}
                        </Text>
                        <Text style={styles.analysisText}>
                            {section.split('\n').slice(1).join('\n')}
                        </Text>
                    </View>
                ))}

                {/* {analysis.contentAnalysis && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Content Analysis</Text>
                        <Text style={styles.contentText}>{analysis.contentAnalysis}</Text>
                    </View>
                )} */}

                {analysis.actualCode && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Code from Video</Text>
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeText}>{analysis.actualCode}</Text>
                        </View>
                    </View>
                )}

                {analysis.codeSnippets && analysis.codeSnippets.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Code Snippets</Text>
                        {analysis.codeSnippets.map((snippet: string, index: number) => (
                            <View key={index} style={styles.codeSnippetContainer}>
                                <Text style={styles.codeSnippetTitle}>Snippet {index + 1}</Text>
                                <Text style={styles.codeSnippetText}>{snippet}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {analysis.summary && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Summary</Text>
                        <Text style={styles.summaryText}>{analysis.summary}</Text>
                    </View>
                )}

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
    noteText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 8,
    },
    codeSnippetContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
    },
    codeSnippetTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 8,
    },
    codeSnippetText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    codeContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    codeText: {
        fontFamily: Platform.select({
            ios: 'Menlo',
            android: 'monospace',
            default: 'Consolas'
        }),
        fontSize: 12,
        color: '#333',
    },
    contentText: {
        lineHeight: 20,
        color: '#444',
    },
    summaryText: {
        lineHeight: 20,
        color: 'black',
        marginTop: 8,
        fontWeight:'bold',
        backgroundColor:'orange'
        
        
    },
    githubUrl: {
        fontSize: 12,
        color: '#2196F3',
        marginBottom: 8,
        textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
    },
}); 