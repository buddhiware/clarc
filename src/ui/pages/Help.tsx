import Badge from '../components/Badge';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2
        className="text-xl font-semibold mb-4 pb-2"
        style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {children}
      </div>
    </section>
  );
}

function KeyRow({ keys, description }: { keys: string; description: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-4">
        <kbd
          className="inline-block px-2 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 0 var(--color-border)',
          }}
        >
          {keys}
        </kbd>
      </td>
      <td className="py-1.5" style={{ color: 'var(--color-text-muted)' }}>{description}</td>
    </tr>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: 'var(--color-text-muted)' }}>{children}</p>;
}

export default function Help() {
  const tocItems = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Projects & Timeline' },
    { id: 'sessions', label: 'Session Detail' },
    { id: 'collapsible', label: 'Collapsible Content' },
    { id: 'context-panel', label: 'Context Panel' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'search', label: 'Search' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'export', label: 'Export' },
    { id: 'settings', label: 'Settings' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts' },
    { id: 'data-privacy', label: 'Data & Privacy' },
    { id: 'cost', label: 'Cost Estimation' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gradient mb-2">clarc Help</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Everything you need to know about using clarc.
        </p>
      </div>

      {/* Table of Contents */}
      <nav
        className="card mb-10 p-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Contents
        </div>
        <div className="grid grid-cols-2 gap-1">
          {tocItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm px-2 py-1 rounded hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      <Section id="welcome" title="Welcome">
        <P>
          <strong style={{ color: 'var(--color-text)' }}>clarc</strong> (inspired by the idea of a Claude archive) is a local tool that reads your Claude Code
          session history from <code>~/.claude/</code> and presents it as a browsable web interface with search,
          analytics, markdown export, and sub-agent visualization.
        </P>
        <P>
          clarc <strong style={{ color: 'var(--color-text)' }}>never modifies</strong> your Claude Code data. All access is read-only.
          A transparent sync layer copies data to a local working directory (<code>~/.config/clarc/data/</code>)
          so the original files are never touched at runtime.
        </P>
      </Section>

      <Section id="dashboard" title="Dashboard">
        <P>
          The home page gives you an at-a-glance overview of your entire Claude Code history.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li><strong style={{ color: 'var(--color-text)' }}>Hero Stats</strong> — Total projects, sessions, messages, and estimated cost displayed as gradient stat cards.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Daily Activity Chart</strong> — An interactive area chart (powered by recharts) showing messages per day. Hover to see exact counts.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Model Usage Table</strong> — Token counts and cost breakdown per model (Opus, Sonnet, Haiku).</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Project Cards</strong> — Quick links to each project with session count, message count, and last activity time.</li>
        </ul>
      </Section>

      <Section id="projects" title="Projects & Timeline">
        <P>
          clarc discovers projects by scanning directories in <code>~/.claude/projects/</code>. Each directory
          represents a project, named after its encoded filesystem path.
        </P>
        <P>
          The <strong style={{ color: 'var(--color-text)' }}>Project Detail</strong> page shows sessions in a vertical timeline:
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li><strong style={{ color: 'var(--color-text)' }}>Vertical Rail</strong> — A line runs down the left side with circle nodes for each session.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Date Grouping</strong> — Sessions are grouped by "Today", "Yesterday", "This Week", or month/year headers.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Session Cards</strong> — Each card shows the session summary, model, message count, file size, and last modified date.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Sub-agents</strong> — Shown as smaller branching nodes with dashed connectors. Click to open the agent conversation in the context panel.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Quick Preview</strong> — Hover a session card and click the eye icon to preview it in the context panel without leaving the page.</li>
        </ul>
        <P>
          The sidebar always shows all projects sorted by last activity with a filter input to narrow the list.
          Settings and Help links are pinned at the bottom of the sidebar.
        </P>
      </Section>

      <Section id="sessions" title="Session Detail">
        <P>
          The full conversation view is the core of clarc.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Glass Header</strong> — A sticky frosted-glass bar at the top shows breadcrumbs
            (project &gt; session), model badge, message count, token usage, estimated cost, git branch, duration, and date.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Conversation Turns</strong> — Messages are grouped into turns: each turn starts
            with a user message followed by all subsequent assistant responses and tool calls.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Thinking Blocks</strong> — Collapsible sections showing Claude's reasoning.
            Toggle all at once with the "Show/Hide Thinking" button in the header. The default state
            can be configured in Settings.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Collapsible Messages</strong> — Long user and assistant messages are automatically
            collapsed with a gradient fade and "Show more" toggle. A sticky "Show less" pill appears when scrolling
            through expanded content. Threshold is configurable in Settings.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Tool Calls</strong> — Collapsible sections showing tool invocations and results.
            Each tool has a type-specific icon. Click the expand icon to open in the context panel.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Agent Chips</strong> — If the session spawned sub-agents, they appear as clickable
            chips in the header. Click to open the agent conversation in the context panel.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Scroll Navigation</strong> — A thin progress bar at the top shows your scroll position.
            A floating pill at the bottom-right provides jump-to-top and jump-to-bottom buttons.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Session Navigation</strong> — Press <kbd className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>[</kbd> and <kbd className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>]</kbd> to navigate between sessions within the same project.
          </li>
        </ul>
      </Section>

      <Section id="collapsible" title="Collapsible Content">
        <P>
          Long messages are automatically collapsed to keep conversations scannable. Both user and assistant
          text content are collapsed when they exceed a configurable height threshold (default 300px).
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Auto-collapse</strong> — Messages taller than the threshold
            are collapsed with a gradient fade-out at the bottom and a "Show more (N lines)" button.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Show more / Show less</strong> — Click to expand or collapse.
            The transition animates smoothly.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Sticky collapse pill</strong> — When you expand a very long message
            and scroll through it, a sticky "Show less" pill appears at the top so you can collapse without
            scrolling back down. Collapsing also scrolls you back to the start of the message.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Configurable threshold</strong> — Adjust the collapse height
            in <a href="/settings" style={{ color: 'var(--color-primary)' }}>Settings</a>, or set it to 0 to disable collapsing entirely.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Independent of other collapsibles</strong> — Thinking blocks and
            tool calls have their own collapse behavior and are not affected by this setting.
          </li>
        </ul>
      </Section>

      <Section id="context-panel" title="Context Panel">
        <P>
          The context panel is an artifact-style side panel that slides out from the right edge of the screen.
          It lets you inspect agent conversations, tool call details, and session previews without navigating away from your current page.
        </P>
        <div
          className="card p-4 my-3"
          style={{ backgroundColor: 'var(--color-surface)', borderLeft: '3px solid var(--color-primary)' }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>How to open the panel</div>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <li>Click an <strong style={{ color: 'var(--color-text)' }}>agent chip</strong> in a session header</li>
            <li>Click an <strong style={{ color: 'var(--color-text)' }}>agent node</strong> on the project timeline</li>
            <li>Click the <strong style={{ color: 'var(--color-text)' }}>expand icon</strong> on a tool call block</li>
            <li>Click the <strong style={{ color: 'var(--color-text)' }}>eye icon</strong> on a session card for a quick preview</li>
          </ul>
        </div>
        <P>
          Close the panel by clicking the X button, pressing <kbd className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>Esc</kbd>,
          or clicking outside. The panel supports back-navigation if you've opened multiple items.
        </P>
      </Section>

      <Section id="analytics" title="Analytics">
        <P>
          The analytics page provides a multi-panel dashboard showing usage patterns and costs.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li><strong style={{ color: 'var(--color-text)' }}>Stats Overview</strong> — Cards showing total sessions, messages, input tokens, output tokens, and total cost.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Cost by Model</strong> — Horizontal bar chart showing spend breakdown per model with exact dollar amounts.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Cost Over Time</strong> — Area chart showing daily cost trends.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Token Usage Over Time</strong> — Stacked area chart with input and output token counts over time.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Cache Efficiency</strong> — Circular progress indicator for cache hit rate, plus cache read token count and longest session info.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Activity by Hour</strong> — Bar chart showing which hours of the day you're most active.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Activity Heatmap</strong> — GitHub-style grid (7 rows x 24 columns) showing activity density by day of week and hour.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Daily Activity Table</strong> — Scrollable table with sessions, messages, and tool calls per day.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Top Projects</strong> — Ranked list with horizontal bars showing relative session and message counts.</li>
        </ul>
      </Section>

      <Section id="search" title="Search">
        <P>
          Full-text search across all your Claude Code sessions.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>Type your query in the search bar and press <strong style={{ color: 'var(--color-text)' }}>Enter</strong> or click <strong style={{ color: 'var(--color-text)' }}>Search</strong>.</li>
          <li>Searches through all message text content (user and assistant) and thinking blocks.</li>
          <li>Matching is case-insensitive substring.</li>
          <li>Results show project name, message type, date, and a snippet with highlighted matches.</li>
          <li>Click a result to jump directly to the matching message — the page scrolls to it and highlights it with a brief flash.</li>
          <li>Press <kbd className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>/</kbd> from anywhere to jump to search.</li>
        </ul>
      </Section>

      <Section id="tasks" title="Tasks">
        <P>
          A Kanban-style board showing tasks created during Claude Code sessions (via the TaskCreate tool).
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>Three columns: <Badge variant="success">Pending</Badge> <Badge variant="warning">In Progress</Badge> <Badge variant="default">Done</Badge></li>
          <li>Each task card shows the subject, description preview, project link, and dependency info.</li>
          <li>Blocked tasks display a pulsing red indicator.</li>
          <li>If you don't see any tasks, it means no sessions have used the task system.</li>
        </ul>
      </Section>

      <Section id="export" title="Export">
        <P>
          Export any session as a Markdown file.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>Click <strong style={{ color: 'var(--color-text)' }}>Export .md</strong> in the session header to download the file directly.</li>
          <li>Visit <code>/sessions/[id]/preview</code> for a rendered preview with toggles to include/exclude thinking blocks and tool calls.</li>
          <li>The export includes YAML frontmatter with session metadata (model, tokens, cost, duration).</li>
          <li>User messages appear as <code>## User</code> headings; assistant messages as <code>## Assistant</code> headings with thinking and tool calls in <code>&lt;details&gt;</code> blocks.</li>
        </ul>
      </Section>

      <Section id="settings" title="Settings">
        <P>
          The Settings page lets you configure your clarc experience. Open it from the sidebar or
          navigate to <code>/settings</code>.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Theme</strong> — Switch between System (follows your OS), Light,
            and Dark mode. The theme is applied immediately.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Auto-collapse threshold</strong> — Control when long messages are collapsed.
            Default is 300px. Set to 0 to disable collapsing.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Show thinking by default</strong> — Whether thinking blocks are
            visible when you open a session. You can always toggle per-session using the header button.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Data info</strong> — View your source directory, data directory,
            sync interval, and server port.
          </li>
        </ul>
        <P>
          All settings are stored in your browser's localStorage and persist across sessions.
        </P>
      </Section>

      <Section id="shortcuts" title="Keyboard Shortcuts">
        <P>
          Press <kbd className="inline-block px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>?</kbd> at
          any time to see the shortcuts overlay. Shortcuts are disabled when typing in input fields.
        </P>
        <table className="w-full mt-3">
          <tbody>
            <KeyRow keys="/" description="Jump to search and focus the input" />
            <KeyRow keys="?" description="Show keyboard shortcuts overlay" />
            <KeyRow keys="Esc" description="Close panel, overlay, or go back" />
            <KeyRow keys="[" description="Previous session (in session view)" />
            <KeyRow keys="]" description="Next session (in session view)" />
          </tbody>
        </table>
      </Section>

      <Section id="data-privacy" title="Data & Privacy">
        <P>
          clarc runs entirely locally. No data is sent to any external service.
        </P>
        <ul className="list-disc pl-5 space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Read-only access</strong> — clarc never creates, modifies, or deletes files
            in <code>~/.claude/</code>. In Docker, the directory is mounted with the <code>:ro</code> flag.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>Data sync</strong> — At startup and every 5 minutes, clarc copies session files
            from <code>~/.claude/</code> to <code>~/.config/clarc/data/</code>. This is add-only (files are never deleted from the local copy,
            preserving history even if the source prunes old sessions). These paths are visible on
            the <a href="/settings" style={{ color: 'var(--color-primary)' }}>Settings</a> page.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>What's read</strong> — Session JSONL files, todo JSON files, <code>stats-cache.json</code>,
            and <code>history.jsonl</code>.
          </li>
          <li>
            <strong style={{ color: 'var(--color-text)' }}>What's ignored</strong> — <code>credentials.json</code>, <code>settings.json</code>,
            debug logs, cache, downloads, and backups directories.
          </li>
        </ul>
      </Section>

      <Section id="cost" title="Cost Estimation">
        <P>
          clarc estimates costs by extracting token usage from every assistant message in each session
          and applying Anthropic's published per-model pricing.
        </P>
        <table className="w-full mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="text-left py-2 font-medium" style={{ color: 'var(--color-text)' }}>Model</th>
              <th className="text-right py-2 font-medium" style={{ color: 'var(--color-text)' }}>Input</th>
              <th className="text-right py-2 font-medium" style={{ color: 'var(--color-text)' }}>Output</th>
              <th className="text-right py-2 font-medium" style={{ color: 'var(--color-text)' }}>Cache Read</th>
              <th className="text-right py-2 font-medium" style={{ color: 'var(--color-text)' }}>Cache Create</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td className="py-2">Sonnet 4</td>
              <td className="text-right py-2">$3.00</td>
              <td className="text-right py-2">$15.00</td>
              <td className="text-right py-2">$0.30</td>
              <td className="text-right py-2">$0.75</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td className="py-2">Opus 4.5/4.6</td>
              <td className="text-right py-2">$15.00</td>
              <td className="text-right py-2">$75.00</td>
              <td className="text-right py-2">$1.50</td>
              <td className="text-right py-2">$3.75</td>
            </tr>
            <tr>
              <td className="py-2">Haiku 4.5</td>
              <td className="text-right py-2">$0.25</td>
              <td className="text-right py-2">$1.25</td>
              <td className="text-right py-2">$0.025</td>
              <td className="text-right py-2">$0.0625</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Prices are per million tokens. Cache read tokens (typically the bulk of usage) are priced at ~10% of the standard input rate.
          Costs are estimates and may differ from your actual bill due to volume discounts or custom pricing.
        </p>
      </Section>

      {/* Footer */}
      <div className="mt-12 pt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
        clarc v0.2
      </div>
    </div>
  );
}
