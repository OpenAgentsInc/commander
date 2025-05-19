import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Nip28ChannelChat } from '@/components/nip28';

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
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);

  const stripIdPrefix = (id: string): string => {
    return id.replace(/^chat-|^nip28-/, ''); // Updated to strip nip28 prefix too
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
          titleBarButtons={
            pane.type === 'chats' ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent pane activation when clicking button
                  // Generate a channel name with timestamp rather than using prompt() which isn't available in packaged app
                  const timestamp = new Date().toLocaleTimeString().replace(/:/g, '');
                  const defaultName = `Channel-${timestamp}`;
                  createNip28Channel(defaultName);
                }}
                className="p-1 h-auto text-xs"
                title="Create NIP-28 Channel"
              >
                <PlusCircle size={12} className="mr-1" /> New Chan
              </Button>
            ) : undefined
          }
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={stripIdPrefix(pane.id)} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'nip28_channel' && pane.content?.channelId && (
            <Nip28ChannelChat
              channelId={pane.content.channelId}
              channelName={pane.content.channelName || pane.title}
            />
          )}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {/* Add other pane types here, or a more generic fallback */}
          {!(
            pane.type === 'chat' ||
            pane.type === 'chats' ||
            pane.type === 'changelog' ||
            pane.type === 'user' ||
            pane.type === 'diff' ||
            pane.type === 'nip28_channel' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};