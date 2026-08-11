import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useNavigation } from 'expo-router';
import {
  useGetProject,
  useListMeetings,
  useCreateMeeting,
  getListMeetingsQueryKey,
} from '@workspace/api-client-react';
import { MeetingCard } from '@/components/MeetingCard';
import { useColors } from '@/hooks/useColors';

export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = Number(projectId);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState('');

  const navigation = useNavigation();
  const { data: project, isLoading: loadingProject } = useGetProject(pid);
  useEffect(() => {
    if (project?.name) navigation.setOptions({ title: project.name });
  }, [project?.name, navigation]);
  const {
    data: meetings = [],
    isLoading: loadingMeetings,
    refetch,
    isRefetching,
  } = useListMeetings(pid);

  const { mutate: createMeeting, isPending: creating } = useCreateMeeting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(pid) });
        setShowMeetingModal(false);
        setNewTitle('');
        setNewDate(new Date().toISOString().slice(0, 10));
        setNewNotes('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleCreateMeeting() {
    if (!newTitle.trim() || creating) return;
    createMeeting({ projectId: pid, data: { title: newTitle.trim(), date: newDate, notes: newNotes.trim() || undefined } });
  }

  if (loadingProject) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Project info banner */}
      <View style={[styles.banner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {project?.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={3}>
            {project.description}
          </Text>
        ) : null}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/project-chat',
              params: { projectId: String(pid), projectName: project?.name ?? '' },
            })
          }
          style={({ pressed }) => [
            styles.chatBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="message-circle" size={16} color={colors.primaryForeground} />
          <Text style={[styles.chatBtnText, { color: colors.primaryForeground }]}>
            Ask AI about this project
          </Text>
        </Pressable>
      </View>

      {/* Section header */}
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Meetings{meetings.length > 0 ? ` (${meetings.length})` : ''}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMeetingModal(true);
          }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          hitSlop={6}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {loadingMeetings ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : meetings.length === 0 ? (
        <View style={styles.center}>
          <Feather name="calendar" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No meetings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap + to add the first meeting
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...meetings].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <MeetingCard
              meeting={item}
              onPress={() =>
                router.push({
                  pathname: '/meetings/[meetingId]',
                  params: { meetingId: String(item.id), projectId: String(pid) },
                })
              }
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Meeting modal */}
      <Modal
        visible={showMeetingModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowMeetingModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowMeetingModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Meeting</Text>
              <Pressable onPress={handleCreateMeeting} disabled={!newTitle.trim() || creating} hitSlop={8}>
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.saveBtn,
                      { color: newTitle.trim() ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>TITLE</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Meeting title"
                placeholderTextColor={colors.mutedForeground}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                maxLength={200}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                value={newDate}
                onChangeText={setNewDate}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>NOTES</Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Meeting notes (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
                maxLength={2000}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  banner: {
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  list: { paddingTop: 14 },
  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
});
