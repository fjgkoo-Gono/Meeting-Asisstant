import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Meeting } from '@workspace/api-client-react';

interface Props {
  meeting: Meeting;
  onPress: () => void;
  onLongPress?: () => void;
}

export function MeetingCard({ meeting, onPress, onLongPress }: Props) {
  const colors = useColors();

  const date = new Date(meeting.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
        <Feather name="file-text" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {meeting.title}
        </Text>
        <View style={styles.meta}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{date}</Text>
        </View>
        {meeting.notes ? (
          <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
            {meeting.notes}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  notes: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
