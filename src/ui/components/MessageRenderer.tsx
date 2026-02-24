import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';

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

interface MessageRendererProps {
  message: Message;
  showThinking?: boolean;
}

export default function MessageRenderer({ message, showThinking = true }: MessageRendererProps) {
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Skip meta/system messages
  if (message.isMeta && message.role === 'user') {
    return null;
  }

  // User messages
  if (message.role === 'user') {
    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n');

    // Clean command messages
    const cleaned = text
      .replace(/<command-message>.*?<\/command-message>/gs, '')
      .replace(/<command-name>.*?<\/command-name>/gs, '')
      .trim();

    if (!cleaned) return null;

    return (
      <div className="py-4 px-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-user-bubble)', color: 'var(--color-primary)' }}>
            User
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
        </div>
        <div className="pl-1 prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
          <Markdown remarkPlugins={[remarkGfm]}>{cleaned}</Markdown>
        </div>
      </div>
    );
  }

  // Tool result messages (displayed as part of assistant flow)
  if (message.role === 'tool') {
    return null;
  }

  // Assistant messages
  if (message.role === 'assistant') {
    const textBlocks = message.content.filter((b: any) => b.type === 'text');
    const text = textBlocks.map((b: any) => b.text || '').join('\n');

    return (
      <div className="py-4 px-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
            Assistant
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
          {message.model && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              {message.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
            </span>
          )}
          {message.costUsd !== undefined && message.costUsd > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ${message.costUsd.toFixed(4)}
            </span>
          )}
        </div>

        {/* Thinking blocks */}
        {showThinking && message.thinking && message.thinking.map((tb, i) => (
          <ThinkingBlock key={i} thinking={tb.thinking} />
        ))}

        {/* Text content */}
        {text && (
          <div className="pl-1 prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
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
          />
        ))}
      </div>
    );
  }

  return null;
}
