import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../theme/colors';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ onPress, children, loading, disabled, style, textStyle }: ButtonProps) {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  const handlePress = () => {
    if (loading || disabled) return;
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading || disabled}
      style={[
        styles.button,
        {
          backgroundColor: theme.primary,
          opacity: loading || disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.text, { color: '#FFFFFF' }, textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
