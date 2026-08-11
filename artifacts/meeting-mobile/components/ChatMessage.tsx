import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { ChatMessage as ChatMessageType } from '@/lib/chat';

interface Props {
  message: ChatMessageType;
}

/**
 * Renders a single chat bubble. The assistant response is rendered with
 * basic markdown-like formatting (bold **text**, bullet points starting with -).
 */
export function ChatMessage({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <MessageText content={message.content} isUser={isUser} colors={colors} />
      </View>
    </View>
  );
}

function MessageText({
  content,
  isUser,
  colors,
}: {
  content: string;
  isUser: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const textColor = isUser ? colors.primaryForeground : colors.foreground;

  // Split into lines and render with basic markdown
  const lines = content.split('\n');
  return (
    <View style={styles.textContainer}>
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: textColor }]}>·</Text>
              <FormattedText
                text={line.slice(2)}
                baseStyle={[styles.bodyText, { color: textColor }]}
                boldStyle={[styles.bodyText, styles.bold, { color: textColor }]}
              />
            </View>
          );
        }
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const hText = line.replace(/^#{1,3} /, '');
          return (
            <Text key={i} style={[styles.heading, { color: textColor }]}>
              {hText}
            </Text>
          );
        }
        if (line.trim() === '') {
          return <View key={i} style={styles.spacer} />;
        }
        return (
          <FormattedText
            key={i}
            text={line}
            baseStyle={[styles.bodyText, { color: textColor }]}
            boldStyle={[styles.bodyText, styles.bold, { color: textColor }]}
          />
        );
      })}
    </View>
  );
}

/** Renders inline **bold** segments within a line. */
function FormattedText({
  text,
  baseStyle,
  boldStyle,
}: {
  text: string;
  baseStyle: object[];
  boldStyle: object[];
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={boldStyle}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  textContainer: {
    gap: 2,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600' as const,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bullet: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: -1,
  },
  spacer: {
    height: 4,
  },
});
