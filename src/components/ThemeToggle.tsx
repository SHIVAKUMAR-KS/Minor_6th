import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from '../theme/colors';

export function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            style={[
                styles.button,
                {
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                },
            ]}
        >
            <Text style={[styles.text, { color: theme.text }]}>
                {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        minWidth: 120,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
    },
}); 