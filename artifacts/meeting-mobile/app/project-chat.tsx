import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useColors } from '@/hooks/useColors';
import {
  streamProjectChat,
  fetchProjectChatHistory,
  generateId,
  type ChatMessage as ChatMessageType,
} from '@/lib/chat';

export default function ProjectChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const pid = Number(projectId);
  const navigation = useNavigation();
  useEffect(() => {
    if (projectName) navigation.setOptions({ title: `${projectName} — AI` });
  }, [projectName, navigation]);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchProjectChatHistory(pid).then((history) => {
        setMessages(history);
        setChatLoaded(true);
      });
    }
  }, [pid]);

  async function handleSend() {
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
      await streamProjectChat(
        pid,
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

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const headerHeight = useHeaderHeight();
  const reversedMessages = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
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
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <ActivityIndicator color={colors.primary} animating={false} />
              </View>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={{ paddingBottom: bottomPad }}>
        <ChatInput
          value={chatInput}
          onChangeText={setChatInput}
          onSend={handleSend}
          isStreaming={isStreaming}
          placeholder="Ask about all meetings in this project…"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    paddingTop: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
