// src/services/featureflags/FeatureFlag.ts
export enum Feature {
  // AI Providers for AgentChatPane
  CLAUDE_CODE_PROVIDER = "CLAUDE_CODE_PROVIDER",
  OLLAMA_PROVIDER = "OLLAMA_PROVIDER",

  // Panes / UI Modes
  CODER_PANE = "CODER_PANE", // The fullscreen Coder Mode/Pane, toggled by Hotbar 1
  HAND_TRACKING = "HAND_TRACKING", // Hand tracking system & Hotbar 9 toggle
  WALLET_PANE = "WALLET_PANE", // Wallet pane, toggled by Hotbar 3
  DVM_PROVIDER_PANE = "DVM_PROVIDER_PANE", // "Sell Compute" pane, toggled by Hotbar 2
  DVM_JOB_HISTORY_PANE = "DVM_JOB_HISTORY_PANE", // DVM Job History pane, toggled by Hotbar 4
  PREVIOUS_CHATS_PANE = "PREVIOUS_CHATS_PANE", // Chat History pane, toggled by Hotbar 6

  // These are specific NIP-90 tool panes, not directly on hotbar usually,
  // but good to have flags if they are accessed differently.
  // For now, their visibility can be tied to a general DVM_CONSUMER_TOOLS or similar if needed,
  // or just implicitly disabled if their entry points are removed.
  // For v0.0.5, these are disabled by disabling their access points.
  NIP90_DASHBOARD_PANE = "NIP90_DASHBOARD_PANE",
  NIP90_CONSUMER_CHAT_PANE = "NIP90_CONSUMER_CHAT_PANE",
  NIP90_GLOBAL_FEED_PANE = "NIP90_GLOBAL_FEED_PANE",

  // NIP28_CHAT_PANE - Not directly on hotbar, related to NIP-28 functionality.
  
  // Agent Chat Pane - The old multi-provider chat interface
  AGENT_CHAT_PANE = "AGENT_CHAT_PANE", // Agent Chat pane, toggled by Hotbar 5
}