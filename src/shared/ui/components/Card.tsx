import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../colors';
import { borderRadius, spacing } from '../spacing';
import { shadows } from '../shadows';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  padding?: number;
}

export function Card({ children, style, shadow = 'sm', padding = spacing.lg }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        shadows[shadow],
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
});
