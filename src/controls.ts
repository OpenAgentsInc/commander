import { type KeyboardControlsEntry } from "@react-three/drei";

export enum AppControls {
  CODER_MODE = "CODER_MODE", // New
  SELL_COMPUTE = "SELL_COMPUTE", // Was HOTBAR_1
  WALLET_PANE = "WALLET_PANE",   // Was HOTBAR_2
  DVM_HISTORY = "DVM_HISTORY", // Was HOTBAR_3
  AGENT_CHAT = "AGENT_CHAT",   // Was HOTBAR_4
  PREVIOUS_CHATS = "PREVIOUS_CHATS", // Was HOTBAR_5 (if applicable)
  SWE_BENCH_BROWSER = "SWE_BENCH_BROWSER", // New
  // Slot 8 is conceptually empty for direct hotbar shortcuts
  HOTBAR_9 = "HOTBAR_9", // Hand Tracking
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.CODER_MODE, keys: ["Digit1", "Numpad1"] },
  { name: AppControls.SELL_COMPUTE, keys: ["Digit2", "Numpad2"] },
  { name: AppControls.WALLET_PANE, keys: ["Digit3", "Numpad3"] },
  { name: AppControls.DVM_HISTORY, keys: ["Digit4", "Numpad4"] },
  { name: AppControls.AGENT_CHAT, keys: ["Digit5", "Numpad5"] },
  { name: AppControls.PREVIOUS_CHATS, keys: ["Digit6", "Numpad6"] }, // If active
  { name: AppControls.SWE_BENCH_BROWSER, keys: ["Digit7", "Numpad7"] },
  // No Digit8 for now
  { name: AppControls.HOTBAR_9, keys: ["Digit9", "Numpad9"] },
];
