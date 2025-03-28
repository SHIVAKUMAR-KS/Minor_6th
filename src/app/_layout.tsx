import '../../global.css';

import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../theme/colors';
import { View, StatusBar, SafeAreaView, Platform } from 'react-native';
import { ThemeToggle } from '../components/ThemeToggle';

// Create a client
const queryClient = new QueryClient();

function LayoutContent() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            color: theme.text,
            fontSize: 20, // Responsive header font size
          },
          headerRight: () => <ThemeToggle />,
          contentStyle: {
            backgroundColor: theme.background,
            paddingHorizontal: 16, // Mobile padding
          },
        }}
      />
    </SafeAreaView>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LayoutContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
