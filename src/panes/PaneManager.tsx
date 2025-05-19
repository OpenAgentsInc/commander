import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';

// Placeholder Content Components
const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
  <div className="p-2">
    <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
    <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
  </div>
);
const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


export const PaneManager = () => {
  const { panes, activePaneId } = usePaneStore();

  const stripIdPrefix = (id: string): string => {
    return id.replace(/^chat-/, ''); // Simplified
  };

  // No need to sort panes - the array order from the store already 
  // has the active pane at the end due to bringPaneToFrontAction
  
  // Base z-index for all panes
  const baseZIndex = 10;

  return (
    <>
      {panes.map((pane: PaneType, index: number) => (
        <PaneComponent
          key={pane.id}
          title={pane.title}
          id={pane.id}
          x={pane.x}
          y={pane.y}
          height={pane.height}
          width={pane.width}
          type={pane.type}
          isActive={pane.id === activePaneId}
          style={{
            zIndex: baseZIndex + index // Higher index = higher z-index
          }}
          dismissable={pane.type !== 'chats' && pane.dismissable !== false}
          content={pane.content} // Pass content for 'diff' or other types
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={stripIdPrefix(pane.id)} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {/* Add other pane types here, or a more generic fallback */}
          {!(
            pane.type === 'chat' ||
            pane.type === 'chats' ||
            pane.type === 'changelog' ||
            pane.type === 'user' ||
            pane.type === 'diff' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};