import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Effect, Exit, Cause } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useCoderChat } from '@/hooks/coder/useCoderChat';
import CoderMessageList from './CoderMessageList';
import CoderProseMirrorInput from './CoderProseMirrorInput';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { DatabaseService, DBSession } from '@/services/db';
import { PaneDropdownItem } from '@/types/paneMenu';
import { CODER_PANE_ID } from '@/stores/panes/constants';


export interface CoderPaneProps {
  paneId: string; // The pane's ID
  sessionId?: string; // Passed from pane content
  titleBarButtonsRef?: { current: any; set: (value: any) => void }; // Ref to set title bar buttons and menus
}

const CoderPane: React.FC<CoderPaneProps> = ({ paneId, sessionId: initialSessionId, titleBarButtonsRef }) => {
  // Only log on mount, not every render
  useEffect(() => {
    console.log(`[coder_pa CoderPane] Mounted with paneId: ${paneId}, initialSessionId:`, initialSessionId);
  }, []); // Empty deps = only on mount
  
  const runtime = getMainRuntime(); // For telemetry
  const removePane = usePaneStore((state) => state.removePane);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const updatePaneContent = usePaneStore((state) => state.updatePaneContent);

  // Use the custom hook for chat logic
  const {
    messages,
    isLoading,
    focusKey,
    sendMessage,
    loadMessagesForSession,
    clearMessagesAndSession
  } = useCoderChat({ paneId, initialSessionId });

  // Auto-scroll hook - trigger on messages change
  const {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  } = useAutoScroll([messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, []); // Only on mount

  // Check if last message is streaming
  const isStreamingLastMessage = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    return lastMessage.isStreaming || false;
  }, [messages]);


  const handleExitCoderMode = React.useCallback(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'exit_coder_mode_escape',
        }),
      ).pipe(Effect.provide(runtime)),
    );
    // Close THIS coder pane (not all of them)
    removePane(paneId);
  }, [removePane, paneId, runtime]);

  const handleNewChat = React.useCallback((event?: React.MouseEvent) => {
    // Check if command (Mac) or control (Windows/Linux) key is pressed
    const isCommandOrControl = event && (event.metaKey || event.ctrlKey);
    
    if (isCommandOrControl) {
      // Open new chat in a new pane
      const addPane = usePaneStore.getState().addPane;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Position new pane offset from current one
      const currentPanes = usePaneStore.getState().panes;
      const currentCoderPane = currentPanes.find(p => p.id === paneId);
      const offsetX = 50;
      const offsetY = 50;
      
      const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      addPane({
        id: `coder_pane_${Date.now()}`,
        type: "coder",
        title: `Coder`,
        x: currentCoderPane ? Math.min(currentCoderPane.x + offsetX, screenWidth - 600) : Math.floor((screenWidth - 569) / 2),
        y: currentCoderPane ? Math.min(currentCoderPane.y + offsetY, screenHeight - 400) : 30,
        width: 569,
        height: Math.floor(screenHeight * 0.85),
        content: { sessionId: newSessionId }
      });
    } else {
      // Original behavior - new chat in current pane
      const newSessionId = clearMessagesAndSession();
      updatePaneContent(paneId, { sessionId: newSessionId });
    }

    // Track the new chat action
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'new_chat_started',
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [clearMessagesAndSession, runtime, updatePaneContent, paneId]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Only handle escape if this pane is active
        const currentState = usePaneStore.getState();
        if (currentState.activePaneId === paneId) {
          handleExitCoderMode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExitCoderMode, paneId]);

  // Track Coder Mode open event
  React.useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'coder_mode_opened',
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);


  // State for history menu
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);

  // Fetch chat history
  const { data: chatHistorySessions, refetch: refetchHistory } = useQuery<DBSession[], Error>({
    queryKey: ["allChatSessionsForCoderMenu"],
    queryFn: async () => {
      const dbProgram = Effect.flatMap(DatabaseService, (db) =>
        db.getAllSessions({ sortBy: "last_updated_at", sortOrder: "DESC", limit: 5 }),
      );
      const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      console.error("Failed to fetch chat history for menu:", Cause.pretty(exitResult.cause));
      throw Cause.squash(exitResult.cause);
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Refetch history when menu opens
  useEffect(() => {
    if (historyMenuOpen) {
      refetchHistory();
    }
  }, [historyMenuOpen, refetchHistory]);

  // Format session for menu display
  const formatSessionForMenu = (session: DBSession): string => {
    const date = new Date(session.last_updated_at * 1000);
    const dateStr = date.toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    // Don't show ui-coder sessions in the menu display
    if (session.id.startsWith('ui-coder-')) {
      return `${dateStr} ${timeStr}`;
    }
    const idPrefix = session.id.substring(0, 8);
    return `${dateStr} ${timeStr} | ${idPrefix}...`;
  };

  // Create history menu items
  const historyMenuItems: PaneDropdownItem[] = useMemo(() => {
    if (!chatHistorySessions || chatHistorySessions.length === 0) {
      return [{ label: "No recent chats", action: () => { }, disabled: true }];
    }
    return chatHistorySessions.map(session => ({
      label: formatSessionForMenu(session),
      action: async (event) => {
        console.log("Load chat session:", session.id);

        // Check if Cmd/Ctrl key is held
        const isModifierHeld = event && (event.metaKey || event.ctrlKey);

        // Track telemetry
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: 'coder_mode',
              action: isModifierHeld ? 'history_menu_item_cmd_click' : 'history_menu_item_click',
              label: session.id,
            }),
          ).pipe(Effect.provide(runtime)),
        );

        if (isModifierHeld) {
          // Open in new pane
          const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

          // Create a new coder pane with the messages from the selected session
          const openCoderPane = usePaneStore.getState().addPane;
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;

          // Position new pane offset from current one
          const currentPanes = usePaneStore.getState().panes;
          const currentCoderPane = currentPanes.find(p => p.id === CODER_PANE_ID);
          const offsetX = 50;
          const offsetY = 50;

          openCoderPane({
            id: `coder_pane_${Date.now()}`,
            type: "coder",
            title: `Coder`,
            x: currentCoderPane ? Math.min(currentCoderPane.x + offsetX, screenWidth - 600) : Math.floor((screenWidth - 569) / 2),
            y: currentCoderPane ? Math.min(currentCoderPane.y + offsetY, screenHeight - 400) : 30,
            width: 569,
            height: Math.floor(screenHeight * 0.85),
            dismissable: true,
            content: { sessionId: session.id }, // Pass the existing session ID
          });
        } else {
          const newSessionId = session.id;
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'HIST'}]`;
          console.log(`${componentName} History item clicked, preparing to load session: ${newSessionId}`);

          // Call the loading function from the hook
          await loadMessagesForSession(newSessionId);

          setHistoryMenuOpen(false);
        }
      },
    }));
  }, [chatHistorySessions, runtime, paneId, loadMessagesForSession]);

  // Create title bar buttons with history menu
  const titleBarButtons = useMemo(() => (
    <>
      {/* New Chat Button - will be on right side */}
      <Button
        onClick={handleNewChat}
        variant="outline"
        size="sm"
        className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors h-6 px-2 text-xs"
        title="Start new chat session (Cmd/Ctrl+Click to open in new pane)"
      >
        <MessageSquarePlus className="h-3 w-3 mr-1" />
        New Chat
      </Button>
    </>
  ), [handleNewChat]);

  // Create header menus for left side
  const headerMenus = useMemo(() => [
    {
      id: "coderHistoryMenu",
      triggerLabel: "History",
      items: historyMenuItems,
    }
  ], [historyMenuItems]);

  // Handle menu open state changes
  const handleMenuOpenChange = useCallback((menuId: string, open: boolean) => {
    if (menuId === 'coderHistoryMenu') {
      setHistoryMenuOpen(open);
    }
  }, []);

  // Set title bar buttons in ref if provided
  useEffect(() => {
    if (titleBarButtonsRef && titleBarButtonsRef.set) {
      titleBarButtonsRef.set({
        buttons: titleBarButtons,
        menus: headerMenus,
        menuOpenState: historyMenuOpen,
        onMenuOpenChange: handleMenuOpenChange
      });
    }
  }, [titleBarButtons, headerMenus, historyMenuOpen, handleMenuOpenChange, titleBarButtonsRef]);

  return (
    <div className="h-full w-full flex flex-col bg-black relative">
      <style>{`
        /* Custom styles for Coder pane messages */
        .coder-chat-message .group\\/message {
          background-color: transparent !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .coder-chat-message.user-message .group\\/message {
          max-width: 80% !important;
          border: 1px solid white !important;
        }

        .coder-chat-message.assistant-message .group\\/message {
          max-width: 100% !important;
          border: none !important;
        }

        /* Style the markdown content */
        .coder-chat-message .prose {
          color: white !important;
          max-width: none !important;
        }

        .coder-chat-message .prose p {
          margin-bottom: 0.5em !important;
          line-height: 1.5 !important;
          white-space: pre-wrap !important;
        }

        /* Ensure markdown content in our messages preserves whitespace */
        .coder-chat-message div[class*="whitespace-pre-wrap"] {
          white-space: pre-wrap !important;
        }

        /* Force pre-wrap on all paragraph elements in messages */
        .coder-chat-message p {
          white-space: pre-wrap !important;
        }

        .coder-chat-message .prose pre {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          margin: 0.5em 0 !important;
        }

        .coder-chat-message .prose code {
          color: white !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
        }

        .coder-chat-message .prose pre code {
          background-color: transparent !important;
          padding: 0 !important;
        }

        /* Headings */
        .coder-chat-message .prose h1,
        .coder-chat-message .prose h2,
        .coder-chat-message .prose h3,
        .coder-chat-message .prose h4,
        .coder-chat-message .prose h5,
        .coder-chat-message .prose h6 {
          color: white !important;
          font-weight: bold !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
        }

        /* Lists */
        .coder-chat-message .prose ul,
        .coder-chat-message .prose ol {
          color: white !important;
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }

        .coder-chat-message .prose li {
          color: white !important;
          margin: 0.25em 0 !important;
        }

        /* Links */
        .coder-chat-message .prose a {
          color: #60a5fa !important;
          text-decoration: underline !important;
        }

        .coder-chat-message .prose a:hover {
          color: #93bbfc !important;
        }

        /* Strong and emphasis */
        .coder-chat-message .prose strong {
          color: white !important;
          font-weight: bold !important;
        }

        .coder-chat-message .prose em {
          color: white !important;
          font-style: italic !important;
        }

        /* Blockquotes */
        .coder-chat-message .prose blockquote {
          border-left: 4px solid rgba(255, 255, 255, 0.3) !important;
          padding-left: 1em !important;
          color: rgba(255, 255, 255, 0.8) !important;
          margin: 0.5em 0 !important;
        }

        /* Copy button in code blocks */
        .coder-chat-message .copy-button {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }

        .coder-chat-message .copy-button:hover {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>
      {/* Chat messages area */}
      <CoderMessageList
        messages={messages}
        containerRef={containerRef}
        handleScroll={handleScroll}
        handleTouchStart={handleTouchStart}
        isStreamingLastMessage={isStreamingLastMessage}
      />
      {/* ProseMirror editor at the bottom */}
      <div className="flex items-center justify-center pb-4 px-4">
        <div className="w-[750px] rounded border border-white bg-black">
          <CoderProseMirrorInput onSubmit={sendMessage} disabled={isLoading} focusKey={focusKey} />
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedCoderPane = React.memo(CoderPane, (prevProps, nextProps) => {
  // Only re-render if props actually changed
  return prevProps.paneId === nextProps.paneId &&
    prevProps.sessionId === nextProps.sessionId &&
    prevProps.titleBarButtonsRef === nextProps.titleBarButtonsRef;
});

export default MemoizedCoderPane;
