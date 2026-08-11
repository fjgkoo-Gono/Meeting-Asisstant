import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Material } from '@workspace/api-client-react';

interface Props {
  material: Material;
  onRetry?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  photo: 'image',
  image: 'image',
  pdf: 'file-text',
  excel: 'grid',
  text: 'type',
};

export function MaterialCard({ material, onRetry }: Props) {
  const colors = useColors();
  const icon = (TYPE_ICONS[material.type] ?? 'paperclip') as Parameters<typeof Feather>[0]['name'];

  const statusColor =
    material.status === 'ready'
      ? '#4caf50'
      : material.status === 'processing'
        ? colors.primary
        : colors.destructive;

  const statusLabel =
    material.status === 'ready' ? 'Ready' : material.status === 'processing' ? 'Processing' : 'Failed';

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {material.originalName}
        </Text>
        <View style={styles.statusRow}>
          {material.status === 'processing' ? (
            <ActivityIndicator size="small" color={statusColor} />
          ) : (
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={[styles.typeText, { color: colors.mutedForeground }]}>
            · {material.type.toUpperCase()}
          </Text>
        </View>
        {material.status === 'ready' && material.extractedText ? (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {material.extractedText.slice(0, 120)}
          </Text>
        ) : null}
      </View>
      {material.status === 'error' && onRetry ? (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-cw" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  preview: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  retryBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
