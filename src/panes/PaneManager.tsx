import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';
import { Nip28ChannelChat } from '@/components/nip28';
import { Nip90Dashboard } from '@/components/nip90';
import { SellComputePane } from '@/components/sell-compute';
import { DvmJobHistoryPane } from '@/components/dvm';
import { Nip90DvmTestPane } from '@/components/nip90_dvm_test';
import { Nip90ConsumerChatPane } from '@/components/nip90_consumer_chat';
import { Nip90GlobalFeedPane } from '@/components/nip90_feed';

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
  // const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane); // No longer needed here

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
          dismissable={pane.dismissable !== false} // Use dismissable prop directly
          content={pane.content} // Pass content for 'diff' or other types
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
          {pane.type === 'nip90_dashboard' && (
            <Nip90Dashboard />
          )}
          {pane.type === 'sell_compute' && (
            <SellComputePane />
          )}
          {pane.type === 'dvm_job_history' && (
            <DvmJobHistoryPane />
          )}
          {pane.type === 'nip90_dvm_test' && (
            <Nip90DvmTestPane />
          )}
          {pane.type === 'nip90_consumer_chat' && (
            <Nip90ConsumerChatPane />
          )}
          {pane.type === 'nip90_global_feed' && (
            <Nip90GlobalFeedPane />
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
            pane.type === 'nip90_dashboard' ||
            pane.type === 'sell_compute' ||
            pane.type === 'dvm_job_history' ||
            pane.type === 'nip90_dvm_test' ||
            pane.type === 'nip90_consumer_chat' ||
            pane.type === 'nip90_global_feed' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};