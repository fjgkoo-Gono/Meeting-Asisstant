import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  ScrollView,
  ActionSheetIOS,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from 'expo-router';
import {
  useGetMeeting,
  useListMaterials,
  useCreateMaterial,
  useRetryMaterial,
  useUpdateMeeting,
  useDeleteMaterial,
  getListMaterialsQueryKey,
  getGetMeetingQueryKey,
} from '@workspace/api-client-react';
import { MaterialCard } from '@/components/MaterialCard';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useColors } from '@/hooks/useColors';
import {
  streamMeetingChat,
  fetchMeetingChatHistory,
  generateId,
  type ChatMessage as ChatMessageType,
} from '@/lib/chat';
import { uploadPhotoMaterial, uploadDocumentMaterial } from '@/lib/upload';

type Tab = 'materials' | 'chat';

export default function MeetingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { meetingId, projectId } = useLocalSearchParams<{
    meetingId: string;
    projectId: string;
  }>();
  const mid = Number(meetingId);
  const pid = Number(projectId);

  const [activeTab, setActiveTab] = useState<Tab>('materials');

  // --- Edit meeting ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // --- Materials ---
  const navigation = useNavigation();
  const {
    data: meeting,
    isLoading: loadingMeeting,
  } = useGetMeeting(pid, mid);
  useEffect(() => {
    if (meeting?.title) navigation.setOptions({ title: meeting.title });
  }, [meeting?.title, navigation]);

  const { mutate: updateMeeting, isPending: updatingMeeting } = useUpdateMeeting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(pid, mid) });
        setShowEditModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  function openEditModal() {
    if (!meeting) return;
    setEditTitle(meeting.title);
    setEditDate(meeting.date);
    setEditNotes(meeting.notes ?? '');
    setShowEditModal(true);
  }

  function handleSaveMeeting() {
    if (!editTitle.trim() || updatingMeeting) return;
    updateMeeting({
      projectId: pid,
      meetingId: mid,
      data: { title: editTitle.trim(), date: editDate, notes: editNotes.trim() || null },
    });
  }

  const {
    data: materials = [],
    isLoading: loadingMaterials,
    refetch: refetchMaterials,
    isRefetching: isRefetchingMaterials,
  } = useListMaterials(pid, mid, {
    query: {
      queryKey: getListMaterialsQueryKey(pid, mid),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return false;
        const hasProcessing = data.some((m) => m.status === 'processing');
        return hasProcessing ? 2000 : false;
      },
    },
  });

  const { mutate: createMaterial, isPending: creatingMaterial } = useCreateMaterial({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(pid, mid) });
        setShowTextModal(false);
        setTextContent('');
        setTextName('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const { mutate: retryMaterial } = useRetryMaterial({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(pid, mid) });
      },
    },
  });

  const { mutate: deleteMaterial } = useDeleteMaterial({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(pid, mid) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  function handleDeleteMaterial(materialId: number, name: string) {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMaterial({ projectId: pid, meetingId: mid, materialId }),
        },
      ],
    );
  }

  // Text material modal
  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textName, setTextName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // --- Chat ---
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (activeTab === 'chat' && !initializedRef.current) {
      initializedRef.current = true;
      fetchMeetingChatHistory(pid, mid).then((history) => {
        setMessages(history);
        setChatLoaded(true);
      });
    }
  }, [activeTab, pid, mid]);

  async function handleSendChat() {
    if (!chatInput.trim() || isStreaming) return;
    const text = chatInput.trim();
    const currentMessages = [...messages];
    const userMsg: ChatMessageType = { id: generateId(), role: 'user', content: text };

    setChatInput('');
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = '';
    let assistantAdded = false;
    const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      await streamMeetingChat(
        pid,
        mid,
        text,
        history,
        (chunk) => {
          fullContent += chunk;
          if (!assistantAdded) {
            setShowTyping(false);
            setMessages((prev) => [
              ...prev,
              { id: generateId(), role: 'assistant', content: fullContent },
            ]);
            assistantAdded = true;
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          }
        },
        (err) => {
          setShowTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: generateId(), role: 'assistant', content: `Error: ${err}` },
          ]);
        },
      );
    } catch {
      setShowTyping(false);
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  // --- Photo upload ---
  async function handleAddPhoto(source: 'camera' | 'gallery') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera access required', 'Please grant camera permission in Settings.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Photo access required', 'Please grant photo library permission in Settings.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      await uploadPhotoMaterial(
        pid,
        mid,
        asset.uri,
        asset.fileName ?? 'photo.jpg',
        asset.mimeType ?? 'image/jpeg',
        'photo',
      );
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(pid, mid) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleAddDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      const materialType =
        mimeType === 'application/pdf' ? 'pdf' : 'excel';
      setUploadingDocument(true);
      await uploadDocumentMaterial(
        pid,
        mid,
        asset.uri,
        asset.name,
        mimeType,
        materialType,
      );
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(pid, mid) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploadingDocument(false);
    }
  }

  function showAddOptions() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Choose from Files', 'Add Text Note'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) handleAddPhoto('camera');
          else if (idx === 2) handleAddPhoto('gallery');
          else if (idx === 3) handleAddDocument();
          else if (idx === 4) setShowTextModal(true);
        },
      );
    } else {
      // Android / web: use a simple alert
      Alert.alert('Add Material', 'Choose source', [
        { text: 'Take Photo', onPress: () => handleAddPhoto('camera') },
        { text: 'From Library', onPress: () => handleAddPhoto('gallery') },
        { text: 'From Files', onPress: () => handleAddDocument() },
        { text: 'Text Note', onPress: () => setShowTextModal(true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const reversedMessages = [...messages].reverse();

  if (loadingMeeting) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Meeting meta */}
      <View style={[styles.meetingMeta, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.metaTopRow}>
          {meeting?.date ? (
            <View style={styles.metaRow}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {new Date(meeting.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
          <Pressable onPress={openEditModal} hitSlop={8} style={styles.editBtn}>
            <Feather name="edit-2" size={15} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {meeting?.notes ? (
          <Text style={[styles.notesText, { color: colors.mutedForeground }]} numberOfLines={3}>
            {meeting.notes}
          </Text>
        ) : null}
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['materials', 'chat'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Feather
              name={tab === 'materials' ? 'paperclip' : 'message-circle'}
              size={15}
              color={activeTab === tab ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? colors.primary : colors.mutedForeground,
                  fontWeight: activeTab === tab ? ('600' as const) : ('400' as const),
                },
              ]}
            >
              {tab === 'materials' ? 'Materials' : 'AI Chat'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Materials tab */}
      {activeTab === 'materials' && (
        <View style={{ flex: 1 }}>
          {/* Add button row */}
          <View style={[styles.addRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.addLabel, { color: colors.mutedForeground }]}>
              {materials.length} {materials.length === 1 ? 'material' : 'materials'}
            </Text>
            <Pressable
              onPress={showAddOptions}
              disabled={uploadingPhoto || uploadingDocument}
              style={({ pressed }) => [
                styles.addMaterialBtn,
                { backgroundColor: colors.primary, opacity: pressed || uploadingPhoto || uploadingDocument ? 0.7 : 1 },
              ]}
            >
              {uploadingPhoto || uploadingDocument ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Feather name="plus" size={16} color={colors.primaryForeground} />
              )}
              <Text style={[styles.addMaterialText, { color: colors.primaryForeground }]}>
                Add
              </Text>
            </Pressable>
          </View>

          {loadingMaterials ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : materials.length === 0 ? (
            <View style={styles.center}>
              <Feather name="paperclip" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No materials yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Add photos, PDFs, documents, or text notes
              </Text>
            </View>
          ) : (
            <FlatList
              data={materials}
              keyExtractor={(m) => String(m.id)}
              renderItem={({ item }) => (
                <MaterialCard
                  material={item}
                  onRetry={
                    item.status === 'error'
                      ? () => retryMaterial({ projectId: pid, meetingId: mid, materialId: item.id })
                      : undefined
                  }
                  onDelete={() => handleDeleteMaterial(item.id, item.originalName)}
                />
              )}
              contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetchingMaterials}
                  onRefresh={refetchMaterials}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Chat tab */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          {!chatLoaded ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={reversedMessages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <ChatMessage message={item} />}
              inverted={messages.length > 0}
              ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chatList}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Feather name="message-circle" size={40} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    Ask about this meeting
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    I can summarize materials, find decisions, and answer questions about the content.
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
          <View style={{ paddingBottom: bottomPad }}>
            <ChatInput
              value={chatInput}
              onChangeText={setChatInput}
              onSend={handleSendChat}
              isStreaming={isStreaming}
              placeholder="Ask about this meeting…"
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Edit Meeting modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <RNKeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Meeting</Text>
              <Pressable
                onPress={handleSaveMeeting}
                disabled={!editTitle.trim() || updatingMeeting}
                hitSlop={8}
              >
                {updatingMeeting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.saveBtn,
                      { color: editTitle.trim() ? colors.primary : colors.mutedForeground },
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
                value={editTitle}
                onChangeText={setEditTitle}
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
                value={editDate}
                onChangeText={setEditDate}
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
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                maxLength={2000}
              />
            </ScrollView>
          </View>
        </RNKeyboardAvoidingView>
      </Modal>

      {/* Text material modal */}
      <Modal
        visible={showTextModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowTextModal(false)}
      >
        <RNKeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowTextModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Text Note</Text>
              <Pressable
                onPress={() => {
                  if (!textContent.trim() || creatingMaterial) return;
                  createMaterial({
                    projectId: pid,
                    meetingId: mid,
                    data: { type: 'text', name: textName.trim() || undefined, content: textContent.trim() } as Parameters<typeof createMaterial>[0]['data'],
                  });
                }}
                disabled={!textContent.trim() || creatingMaterial}
                hitSlop={8}
              >
                {creatingMaterial ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.saveBtn,
                      { color: textContent.trim() ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>TITLE (OPTIONAL)</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Note title"
                placeholderTextColor={colors.mutedForeground}
                value={textName}
                onChangeText={setTextName}
                maxLength={200}
              />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>CONTENT</Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Paste or type meeting notes, decisions, action items…"
                placeholderTextColor={colors.mutedForeground}
                value={textContent}
                onChangeText={setTextContent}
                multiline
                autoFocus
                maxLength={20000}
              />
            </ScrollView>
          </View>
        </RNKeyboardAvoidingView>
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
  meetingMeta: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  editBtn: {
    padding: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  addMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addMaterialText: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'Inter_500Medium',
  },
  emptyTitle: {
    fontSize: 17,
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
  chatList: { paddingTop: 16 },
  chatEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
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
    height: 200,
    textAlignVertical: 'top',
  },
});
