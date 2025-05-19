import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaneStore } from '@/stores/pane';

const NewChannelButton: React.FC = () => {
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);

  const handleCreateChannel = () => {
    // Generate a default channel name with timestamp
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
    const defaultName = `New Channel ${timestamp}`;
    createNip28Channel(defaultName);
  };

  return (
    <Button
      onClick={handleCreateChannel}
      variant="outline"
      size="icon"
      className="fixed bottom-4 left-[7rem] z-[10000] p-2 !rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
      // left-28 = 7rem, assuming 1rem = 4 units from tailwind config (default)
      // left-4 (1rem), left-16 (4rem), next is left-28 (7rem) if buttons are 2.5rem wide with 0.5rem spacing
      aria-label="Create New Channel"
      title="Create New NIP-28 Channel"
    >
      <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};

export default NewChannelButton;