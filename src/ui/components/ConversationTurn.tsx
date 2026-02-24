import MessageRenderer from './MessageRenderer';

interface Message {
  uuid: string;
  type: string;
  role: string;
  content: any[];
  thinking?: { thinking: string }[];
  timestamp: string;
  model?: string;
  tokenUsage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number };
  costUsd?: number;
  toolCalls?: { id: string; name: string; input: any; result?: any; isError?: boolean }[];
  isMeta?: boolean;
}

interface ConversationTurnProps {
  messages: Message[];
  turnNumber: number;
  showThinking: boolean;
  collapseThreshold?: number;
  onToolClick?: (toolCall: { id: string; name: string; input: any; result?: any; isError?: boolean }) => void;
}

export default function ConversationTurn({ messages, turnNumber, showThinking, collapseThreshold, onToolClick }: ConversationTurnProps) {
  if (messages.length === 0) return null;

  return (
    <div
      className="relative animate-fadeIn"
      style={{
        borderLeft: '3px solid',
        borderImage: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05)) 1',
      }}
    >
      {/* Turn number */}
      <div
        className="absolute -left-[1px] top-0 text-[10px] font-mono px-1.5 py-0.5 rounded-r-md"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text-muted)',
        }}
      >
        #{turnNumber}
      </div>

      <div className="pt-1">
        {messages.map((msg, i) => (
          <MessageRenderer
            key={msg.uuid || i}
            message={msg}
            showThinking={showThinking}
            collapseThreshold={collapseThreshold}
            onToolClick={onToolClick}
          />
        ))}
      </div>
    </div>
  );
}

/** Group messages into conversation turns: each turn starts with a user message */
export function groupIntoTurns(messages: Message[]): Message[][] {
  const turns: Message[][] = [];
  let current: Message[] = [];

  for (const msg of messages) {
    if (msg.role === 'user' && current.length > 0) {
      turns.push(current);
      current = [];
    }
    current.push(msg);
  }

  if (current.length > 0) {
    turns.push(current);
  }

  return turns;
}
