import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';
import { SparkleIcon, UserIcon } from './Icons';
import Badge from './Badge';

interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  isError?: boolean;
}

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
  toolCalls?: ToolCall[];
  isMeta?: boolean;
}

interface MessageRendererProps {
  message: Message;
  showThinking?: boolean;
  onToolClick?: (toolCall: ToolCall) => void;
}

function CostBadge({ cost }: { cost: number }) {
  const variant = cost < 0.01 ? 'success' : cost < 0.10 ? 'warning' : 'error';
  return <Badge variant={variant}>${cost.toFixed(4)}</Badge>;
}

export default function MessageRenderer({ message, showThinking = true, onToolClick }: MessageRendererProps) {
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (message.isMeta && message.role === 'user') {
    return null;
  }

  // User messages
  if (message.role === 'user') {
    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n');

    const cleaned = text
      .replace(/<command-message>.*?<\/command-message>/gs, '')
      .replace(/<command-name>.*?<\/command-name>/gs, '')
      .trim();

    if (!cleaned) return null;

    return (
      <div className="py-4 px-6 animate-fadeIn">
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <UserIcon size={14} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>You</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
            </div>
            <div
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: 'var(--color-user-bubble)',
                borderLeft: '3px solid var(--color-primary)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
                <Markdown remarkPlugins={[remarkGfm]}>{cleaned}</Markdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tool result messages
  if (message.role === 'tool') {
    return null;
  }

  // Assistant messages
  if (message.role === 'assistant') {
    const textBlocks = message.content.filter((b: any) => b.type === 'text');
    const text = textBlocks.map((b: any) => b.text || '').join('\n');

    return (
      <div
        className="py-4 px-6 animate-fadeIn"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-accent-violet)' }}
          >
            <SparkleIcon size={14} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Assistant</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
              {message.model && (
                <Badge variant="model">
                  {message.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
                </Badge>
              )}
              {message.costUsd !== undefined && message.costUsd > 0 && (
                <CostBadge cost={message.costUsd} />
              )}
            </div>

            {/* Thinking blocks */}
            {showThinking && message.thinking && message.thinking.map((tb, i) => (
              <ThinkingBlock key={i} thinking={tb.thinking} />
            ))}

            {/* Text content */}
            {text && (
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
                <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
              </div>
            )}

            {/* Tool calls */}
            {message.toolCalls && message.toolCalls.map(tc => (
              <ToolCallBlock
                key={tc.id}
                name={tc.name}
                input={tc.input}
                result={tc.result}
                isError={tc.isError}
                onExpand={onToolClick ? () => onToolClick(tc) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
