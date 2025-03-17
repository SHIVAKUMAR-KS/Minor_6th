import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { VideoPerformanceMetrics, formatNumber, formatDuration } from '../lib/analytics';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../theme/colors';

interface PerformanceDashboardProps {
    metrics: VideoPerformanceMetrics | null;
}

export default function PerformanceDashboard({ metrics }: PerformanceDashboardProps) {
    const screenWidth = Dimensions.get('window').width;
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    if (!metrics) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Loading metrics...</Text>
            </View>
        );
    }

    // Format dates to be more readable (e.g., "Mar 15" instead of "03-15")
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Memoize chart data to prevent unnecessary recalculations
    const chartData = useMemo(() => ({
        views: {
            labels: metrics.viewsTrend.map(item => formatDate(item.date)),
            datasets: [{
                data: metrics.viewsTrend.map(item => item.views),
            }],
        },
        engagement: {
            labels: metrics.engagementTrend.map(item => formatDate(item.date)),
            datasets: [{
                data: metrics.engagementTrend.map(item => item.engagementRate),
            }],
        },
        duration: {
            labels: ['Short', 'Medium', 'Long'],
            datasets: [{
                data: [
                    metrics.durationAnalysis.short,
                    metrics.durationAnalysis.medium,
                    metrics.durationAnalysis.long,
                ],
            }],
        },
    }), [metrics]);

    // Memoize chart configurations
    const chartConfig = useMemo(() => ({
        backgroundColor: theme.card,
        backgroundGradientFrom: theme.card,
        backgroundGradientTo: theme.card,
        decimalPlaces: 0,
        color: (opacity = 1) => theme.chart.line,
        labelColor: (opacity = 1) => theme.chart.label,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: theme.chart.dot,
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: theme.chart.grid,
        },
        propsForLabels: {
            fontSize: 10,
            fontWeight: '500',
        },
        propsForHorizontalLabels: {
            fontSize: 10,
            fontWeight: '500',
        },
        propsForVerticalLabels: {
            fontSize: 10,
            fontWeight: '500',
        },
    }), [theme]);

    const engagementChartConfig = useMemo(() => ({
        ...chartConfig,
        color: (opacity = 1) => theme.chart.line,
    }), [chartConfig, theme]);

    // Memoize insights calculations
    const insights = useMemo(() => ({
        views: {
            peak: Math.max(...metrics.viewsTrend.map(item => item.views)),
            average: Math.round(metrics.viewsTrend.reduce((sum, item) => sum + item.views, 0) / metrics.viewsTrend.length),
        },
        engagement: {
            peak: Math.max(...metrics.engagementTrend.map(item => item.engagementRate)),
            average: metrics.engagementTrend.reduce((sum, item) => sum + item.engagementRate, 0) / metrics.engagementTrend.length,
        },
    }), [metrics]);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{formatNumber(metrics.totalViews)}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Views</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{formatNumber(metrics.averageViews)}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg. Views</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{metrics.engagementRate.toFixed(1)}%</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Engagement Rate</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.text }]}>{metrics.viewsGrowth.toFixed(1)}%</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Views Growth</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Views Trend</Text>
                <LineChart
                    data={chartData.views}
                    width={screenWidth - 32}
                    height={240}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    withDots={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                    withShadow={false}
                    segments={5}
                    yAxisLabel=""
                    yAxisSuffix=" views"
                    fromZero
                    verticalLabelRotation={45}
                />
                <View style={[styles.chartInsights, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Peak views: {formatNumber(insights.views.peak)} views
                    </Text>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Average views: {formatNumber(insights.views.average)} views
                    </Text>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Engagement Rate Trend</Text>
                <LineChart
                    data={chartData.engagement}
                    width={screenWidth - 32}
                    height={240}
                    chartConfig={engagementChartConfig}
                    bezier
                    style={styles.chart}
                    withDots={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    withHorizontalLabels={true}
                    withVerticalLabels={true}
                    withShadow={false}
                    segments={5}
                    yAxisLabel=""
                    yAxisSuffix="%"
                    fromZero
                    verticalLabelRotation={45}
                />
                <View style={[styles.chartInsights, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Peak engagement: {insights.engagement.peak.toFixed(1)}%
                    </Text>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Average engagement: {insights.engagement.average.toFixed(1)}%
                    </Text>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Video Duration Analysis</Text>
                <BarChart
                    data={chartData.duration}
                    width={screenWidth - 32}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                    fromZero
                    yAxisSuffix=" videos"
                    yAxisLabel=""
                />
                <View style={[styles.durationInsights, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Best performing duration: {metrics.durationAnalysis.bestPerforming}
                    </Text>
                    <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        Average duration: {formatDuration(metrics.durationAnalysis.averageDuration)}
                    </Text>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Videos</Text>
                {metrics.topVideos.map((video, index) => (
                    <View key={`top-video-${video.id}-${index}`} style={[styles.topVideoCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>{video.title}</Text>
                        <View style={styles.videoStats}>
                            <Text style={[styles.videoStat, { color: theme.textSecondary }]}>{formatNumber(video.views)} views</Text>
                            <Text style={[styles.videoStat, { color: theme.textSecondary }]}>{video.engagementRate.toFixed(1)}% engagement</Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    section: {
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    chartInsights: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
    },
    durationInsights: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
    },
    insightText: {
        fontSize: 14,
        marginBottom: 4,
    },
    topVideoCard: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    videoStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    videoStat: {
        fontSize: 14,
    },
}); 