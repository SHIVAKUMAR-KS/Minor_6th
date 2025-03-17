import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { VideoPerformanceMetrics, formatNumber } from '~/lib/analytics';

interface Props {
    metrics: VideoPerformanceMetrics;
}

export function PerformanceDashboard({ metrics }: Props) {
    const screenWidth = Dimensions.get('window').width;

    const chartData = {
        labels: metrics.viewsTrend.map(item => item.date.split('-')[2]), // Just show the day
        datasets: [{
            data: metrics.viewsTrend.map(item => item.views),
        }],
    };

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Overview Cards */}
            <View className="p-4">
                <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <Text className="text-lg font-semibold">Total Views</Text>
                    <Text className="text-2xl font-bold">{formatNumber(metrics.totalViews)}</Text>
                    <Text className="text-sm text-gray-500">
                        {metrics.viewsGrowth >= 0 ? '↑' : '↓'} {Math.abs(metrics.viewsGrowth).toFixed(1)}% from last month
                    </Text>
                </View>

                <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <Text className="text-lg font-semibold">Total Likes</Text>
                    <Text className="text-2xl font-bold">{formatNumber(metrics.totalLikes)}</Text>
                    <Text className="text-sm text-gray-500">Average: {formatNumber(metrics.averageLikes)}</Text>
                </View>

                <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <Text className="text-lg font-semibold">Total Comments</Text>
                    <Text className="text-2xl font-bold">{formatNumber(metrics.totalComments)}</Text>
                    <Text className="text-sm text-gray-500">Average: {formatNumber(metrics.averageComments)}</Text>
                </View>

                <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <Text className="text-lg font-semibold">Engagement Rate</Text>
                    <Text className="text-2xl font-bold">{metrics.engagementRate.toFixed(2)}%</Text>
                    <Text className="text-sm text-gray-500">(Likes + Comments) / Views</Text>
                </View>
            </View>

            {/* Views Trend Chart */}
            <View className="p-4">
                <Text className="text-lg font-semibold mb-4">Views Trend (Last 30 Days)</Text>
                <LineChart
                    data={chartData}
                    width={screenWidth - 32}
                    height={220}
                    chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                        style: {
                            borderRadius: 16,
                        },
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16,
                    }}
                />
            </View>

            {/* Top Videos */}
            <View className="p-4">
                <Text className="text-lg font-semibold mb-4">Top Performing Videos</Text>
                {metrics.topVideos.map((video, index) => (
                    <View key={video.id} className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="font-bold">{index + 1}. {video.title}</Text>
                                <View className="flex-row mt-2 space-x-4">
                                    <Text className="text-gray-500">Views: {formatNumber(video.views)}</Text>
                                    <Text className="text-gray-500">Likes: {formatNumber(video.likes)}</Text>
                                    <Text className="text-gray-500">Comments: {formatNumber(video.comments)}</Text>
                                </View>
                            </View>
                            <Text className="text-blue-500">{video.engagementRate.toFixed(1)}%</Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
} 