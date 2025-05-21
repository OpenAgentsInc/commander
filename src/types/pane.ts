export type Pane = {
  id: string; // Unique identifier for the pane. For chat panes, this might be derived from a chat/thread ID.
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | 'nip28_channel' | 'nip90_dashboard' | 'sell_compute' | 'dvm_job_history' | 'nip90_dvm_test' | 'nip90_consumer_chat' | 'nip90_global_feed' | 'wallet' | string; // Type of content the pane displays. Add more as needed.
  title: string; // Title displayed in the pane's title bar.
  x: number; // X-coordinate of the top-left corner.
  y: number; // Y-coordinate of the top-left corner.
  width: number; // Width of the pane.
  height: number; // Height of the pane.
  isActive?: boolean; // Indicates if the pane is currently active (focused).
  dismissable?: boolean; // If true, the pane can be closed by the user.
  content?: { // Optional content, used by 'diff' type or other custom types.
    oldContent?: string;
    newContent?: string;
    channelId?: string; // Added for NIP28 channels
    channelName?: string; // Optional: for initial title for NIP28 channels
    [key: string]: unknown; // Allows for other content properties
  };
  // Add any other pane-specific properties here, e.g.:
  // chatId?: string; // If the pane is associated with a chat
}

// Type for input when creating a new pane, where x, y, width, height are optional or calculated.
export type PaneInput = Omit<Pane, 'x' | 'y' | 'width' | 'height' | 'id' | 'isActive'> & {
  id?: string; // ID might be generated or passed.
  // Optional initial position/size, can be calculated by the manager if not provided.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}