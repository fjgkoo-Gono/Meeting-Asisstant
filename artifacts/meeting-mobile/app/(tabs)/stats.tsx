import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGetStats } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as Parameters<typeof Feather>[0]['name']} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useGetStats();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border }]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard
              icon="folder"
              value={data?.totalProjects ?? 0}
              label="Projects"
              color={colors.primary}
            />
            <StatCard
              icon="users"
              value={data?.totalMeetings ?? 0}
              label="Meetings"
              color="#5d8693"
            />
          </View>

          {/* Recent meetings */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Meetings
          </Text>

          {(data?.recentMeetings ?? []).length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No meetings yet
              </Text>
            </View>
          ) : (
            (data?.recentMeetings ?? []).map((m) => {
              const date = new Date(m.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              return (
                <Pressable
                  key={m.id}
                  onPress={() =>
                    router.push({
                      pathname: '/meetings/[meetingId]',
                      params: { meetingId: String(m.id), projectId: String(m.projectId) },
                    })
                  }
                  style={({ pressed }) => [
                    styles.recentCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.recentIcon, { backgroundColor: colors.muted }]}>
                    <Feather name="file-text" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.recentBody}>
                    <Text style={[styles.recentTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text style={[styles.recentProject, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {m.projectName} · {date}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBody: { flex: 1, gap: 3 },
  recentTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  recentProject: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
