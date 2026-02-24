import { createContext, useContext, useReducer, useCallback, useState } from 'react';

export interface PanelContent {
  type: 'agent' | 'session-preview' | 'tool-detail' | 'file-content';
  title?: string;
  projectId?: string;
  agentId?: string;
  agentDescription?: string;
  sessionId?: string;
  toolCall?: { id: string; name: string; input: any; result?: any; isError?: boolean };
  filePath?: string;
  fileContent?: string;
}

interface PanelState {
  isOpen: boolean;
  content: PanelContent | null;
  history: PanelContent[];
}

type PanelAction =
  | { type: 'OPEN'; payload: PanelContent }
  | { type: 'CLOSE' }
  | { type: 'BACK' };

interface ContextPanelContextValue {
  isOpen: boolean;
  content: PanelContent | null;
  history: PanelContent[];
  panelWidth: number;
  openPanel: (content: PanelContent) => void;
  closePanel: () => void;
  goBack: () => void;
  setPanelWidth: (width: number) => void;
}

const DEFAULT_PANEL_WIDTH = 480;
const PANEL_WIDTH_KEY = 'clarc-panel-width';

function getSavedPanelWidth(): number {
  try {
    const saved = localStorage.getItem(PANEL_WIDTH_KEY);
    if (saved) {
      const w = parseInt(saved);
      if (w >= 320 && w <= 1200) return w;
    }
  } catch {}
  return DEFAULT_PANEL_WIDTH;
}

const ContextPanelContext = createContext<ContextPanelContextValue>({
  isOpen: false,
  content: null,
  history: [],
  panelWidth: DEFAULT_PANEL_WIDTH,
  openPanel: () => {},
  closePanel: () => {},
  goBack: () => {},
  setPanelWidth: () => {},
});

function reducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'OPEN':
      return {
        isOpen: true,
        content: action.payload,
        history: state.content ? [...state.history, state.content] : state.history,
      };
    case 'CLOSE':
      return { isOpen: false, content: null, history: [] };
    case 'BACK': {
      if (state.history.length === 0) {
        return { isOpen: false, content: null, history: [] };
      }
      const prev = state.history[state.history.length - 1];
      return {
        isOpen: true,
        content: prev,
        history: state.history.slice(0, -1),
      };
    }
    default:
      return state;
  }
}

export function ContextPanelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    isOpen: false,
    content: null,
    history: [],
  });

  const [panelWidth, setPanelWidthState] = useState(getSavedPanelWidth);

  const openPanel = useCallback((content: PanelContent) => {
    dispatch({ type: 'OPEN', payload: content });
  }, []);

  const closePanel = useCallback(() => {
    dispatch({ type: 'CLOSE' });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  const setPanelWidth = useCallback((width: number) => {
    const clamped = Math.max(320, Math.min(width, window.innerWidth * 0.7));
    setPanelWidthState(clamped);
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(clamped)));
    } catch {}
  }, []);

  return (
    <ContextPanelContext.Provider
      value={{
        isOpen: state.isOpen,
        content: state.content,
        history: state.history,
        panelWidth,
        openPanel,
        closePanel,
        goBack,
        setPanelWidth,
      }}
    >
      {children}
    </ContextPanelContext.Provider>
  );
}

export function useContextPanel() {
  return useContext(ContextPanelContext);
}
