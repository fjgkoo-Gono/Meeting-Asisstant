import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Material } from '@workspace/api-client-react';

interface Props {
  material: Material;
  onRetry?: () => void;
  onDelete?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  photo: 'image',
  image: 'image',
  pdf: 'file-text',
  excel: 'grid',
  text: 'type',
};

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

export function MaterialCard({ material, onRetry, onDelete }: Props) {
  const colors = useColors();
  const icon = (TYPE_ICONS[material.type] ?? 'paperclip') as Parameters<typeof Feather>[0]['name'];

  const statusColor =
    material.status === 'ready'
      ? '#4caf50'
      : material.status === 'processing'
        ? colors.primary
        : colors.destructive;

  const statusLabel =
    material.status === 'ready'
      ? 'Ready'
      : material.status === 'processing'
        ? 'Processing'
        : 'Failed';

  const hasFile = material.type !== 'text' && material.filename;
  const fileUrl = hasFile ? `${getBaseUrl()}/api/files/${material.filename}` : null;

  const handleOpen = () => {
    if (fileUrl) {
      Linking.openURL(fileUrl).catch(() => {
        console.warn('Could not open file:', fileUrl);
      });
    }
  };

  return (
    <Pressable
      onLongPress={onDelete}
      delayLongPress={400}
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
        {material.contextNote ? (
          <Text style={[styles.contextNote, { color: colors.mutedForeground }]} numberOfLines={2}>
            📌 {material.contextNote}
          </Text>
        ) : null}
        {material.status === 'ready' && material.extractedText ? (
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {material.extractedText.slice(0, 120)}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {hasFile ? (
          <Pressable
            onPress={handleOpen}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="external-link" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
        {material.status === 'error' && onRetry ? (
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={14} color={colors.destructive} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
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
  contextNote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  preview: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
