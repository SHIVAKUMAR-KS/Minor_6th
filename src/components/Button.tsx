import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View, ActivityIndicator } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function Button({ onPress, children, loading, className }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`rounded-lg bg-blue-500 px-4 py-2 ${loading ? 'opacity-50' : ''} ${className || ''}`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-center text-white font-semibold">{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = {
  button: 'items-center bg-indigo-500 rounded-[28px] shadow-md p-4',
  buttonText: 'text-white text-lg font-semibold text-center',
};
