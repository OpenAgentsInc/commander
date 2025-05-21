export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20; // General margin or offset for tiling
export const PANE_OFFSET = 45; // Specific offset for new panes when tiling, as used in openChatPane

// Keep these for now as they're still used in openChatPane.ts and other files
export const CHATS_PANE_ID = 'chats';
export const CHANGELOG_PANE_ID = 'changelog';

// Add new default NIP-28 channel constants
export const DEFAULT_NIP28_CHANNEL_ID = 'ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978';
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = 'Welcome Chat';
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

// Constants for "Sell Compute" pane
export const SELL_COMPUTE_PANE_ID_CONST = 'sell_compute';
export const SELL_COMPUTE_INITIAL_WIDTH = 550;
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

// Approximate height of the Hotbar for positioning calculations
export const HOTBAR_APPROX_HEIGHT = 60; // pixels

// Constants for NIP-90 DVM Test and Consumer Chat panes
export const NIP90_DVM_TEST_PANE_ID = 'nip90_dvm_test';
export const NIP90_DVM_TEST_PANE_TITLE = 'NIP-90 DVM Test';
export const NIP90_CONSUMER_CHAT_PANE_ID = 'nip90_consumer_chat';
export const NIP90_CONSUMER_CHAT_PANE_TITLE = 'NIP-90 Consumer (Text Inference)';