import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  audio: 'mic',
};

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

// ── Text viewer modal ────────────────────────────────────────────────────

function TextViewerModal({
  visible,
  title,
  contextNote,
  content,
  onClose,
}: {
  visible: boolean;
  title: string;
  contextNote?: string | null;
  content: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={[viewerStyles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        {/* Header */}
        <View style={[viewerStyles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[viewerStyles.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={viewerStyles.body}
          contentContainerStyle={[viewerStyles.bodyContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Context note badge */}
          {contextNote ? (
            <View style={[viewerStyles.contextBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="bookmark" size={13} color={colors.mutedForeground} />
              <Text style={[viewerStyles.contextText, { color: colors.mutedForeground }]}>
                {contextNote}
              </Text>
            </View>
          ) : null}

          {/* Full text */}
          <Text style={[viewerStyles.body, { color: colors.foreground }]} selectable>
            {content}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  contextText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
});

// ── Material card ────────────────────────────────────────────────────────

export function MaterialCard({ material, onRetry, onDelete }: Props) {
  const colors = useColors();
  const icon = (TYPE_ICONS[material.type] ?? 'paperclip') as Parameters<typeof Feather>[0]['name'];
  const [showTextViewer, setShowTextViewer] = useState(false);

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
  const hasText = material.type === 'text' && !!material.extractedText;

  const handleOpen = () => {
    if (fileUrl) {
      Linking.openURL(fileUrl).catch(() => {
        console.warn('Could not open file:', fileUrl);
      });
    }
  };

  return (
    <>
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
          {/* Text preview (first 120 chars) */}
          {hasText ? (
            <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
              {material.extractedText!.slice(0, 120)}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {/* Open file */}
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

          {/* View full text */}
          {hasText ? (
            <Pressable
              onPress={() => setShowTextViewer(true)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="eye" size={14} color={colors.primary} />
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

      {/* Full text viewer */}
      {hasText ? (
        <TextViewerModal
          visible={showTextViewer}
          title={material.originalName}
          contextNote={material.contextNote}
          content={material.extractedText!}
          onClose={() => setShowTextViewer(false)}
        />
      ) : null}
    </>
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
