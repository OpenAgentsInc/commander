export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20; // General margin or offset for tiling
export const PANE_OFFSET = 45; // Specific offset for new panes when tiling, as used in openChatPane

// Keep these for now as they're still used in openChatPane.ts and other files
export const CHATS_PANE_ID = "chats";
export const CHANGELOG_PANE_ID = "changelog";

// Add new default NIP-28 channel constants
export const DEFAULT_NIP28_CHANNEL_ID =
  "ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978";
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = "Welcome Chat";
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

// Constants for "Sell Compute" pane
export const SELL_COMPUTE_PANE_ID_CONST = "sell_compute";
export const SELL_COMPUTE_INITIAL_WIDTH = 550;
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

// Approximate height of the Hotbar for positioning calculations
export const HOTBAR_APPROX_HEIGHT = 60; // pixels

// Constants for NIP-90 DVM Test and Consumer Chat panes
export const NIP90_DVM_TEST_PANE_ID = "nip90_dvm_test";
export const NIP90_DVM_TEST_PANE_TITLE = "NIP-90 DVM Test";
export const NIP90_CONSUMER_CHAT_PANE_ID = "nip90_consumer_chat";
export const NIP90_CONSUMER_CHAT_PANE_TITLE =
  "NIP-90 Consumer (Text Inference)";

// Constants for NIP-90 Global Feed pane
export const NIP90_GLOBAL_FEED_PANE_ID = "nip90_global_feed";
export const NIP90_GLOBAL_FEED_PANE_TITLE = "NIP-90 Global Feed";

// Constants for Wallet pane
export const WALLET_PANE_ID = "wallet_pane";
export const WALLET_PANE_TITLE = "Bitcoin Wallet";

// Constants for Page Panes (refactored from previous router pages)
export const SECOND_PAGE_PANE_ID = "second_page_pane_id";
export const SECOND_PAGE_PANE_TITLE = "Second Page";

export const WALLET_SETUP_PANE_ID = "wallet_setup_pane_id";
export const WALLET_SETUP_PANE_TITLE = "Wallet Setup";

export const SEED_PHRASE_BACKUP_PANE_ID = "seed_phrase_backup_pane_id";
export const SEED_PHRASE_BACKUP_PANE_TITLE = "Backup Seed Phrase";

export const RESTORE_WALLET_PANE_ID = "restore_wallet_pane_id";
export const RESTORE_WALLET_PANE_TITLE = "Restore Wallet";

// Constants for Agent Chat pane
export const AGENT_CHAT_PANE_ID = "agent_chat_main";
export const AGENT_CHAT_PANE_TITLE = "Agent Chat";
export const AGENT_CHAT_PANE_DEFAULT_WIDTH = 500;
export const AGENT_CHAT_PANE_DEFAULT_HEIGHT = 600;

// Constants for Previous Chats List pane
export const PREVIOUS_CHATS_PANE_ID = "previous_chats_list_pane";
export const PREVIOUS_CHATS_PANE_TITLE = "Chat History";
export const PREVIOUS_CHATS_PANE_DEFAULT_WIDTH = 300;
export const PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT = 450;

// Constants for Coder pane
export const CODER_PANE_ID = "coder_pane";
export const CODER_PANE_TITLE = "Coder";

// SWE-Bench MVP Panes
export const SWE_BENCH_TASK_BROWSER_PANE_TYPE = "swe_bench_task_browser";
export const SWE_BENCH_TASK_BROWSER_PANE_ID_CONST = "swe_bench_task_browser_main";
export const SWE_BENCH_TASK_BROWSER_PANE_TITLE = "SWE-Bench: Task Browser";

export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE = "swe_bench_evaluation_launcher";
export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE = "SWE-Bench: Launch";

export const SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE = "swe_bench_evaluation_monitor";
export const SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE_BASE = "SWE-Bench: Monitor";

export const SWE_BENCH_RESULTS_VIEWER_PANE_TYPE = "swe_bench_results_viewer";
export const SWE_BENCH_RESULTS_VIEWER_PANE_ID_CONST = "swe_bench_results_viewer_main";
export const SWE_BENCH_RESULTS_VIEWER_PANE_TITLE = "SWE-Bench: Results";
