OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748204844114}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748204844163}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748204844164}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748204844165}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748204844170}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748204844235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748204844236}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748204844237}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748204844238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748204844238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748204844240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748204844241}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748204844241}
localhost/:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: http://localhost:5173/src/assets/fonts/berkeley-mono/BerkeleyMono-Bold.woff2
localhost/:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: http://localhost:5173/src/assets/fonts/berkeley-mono/BerkeleyMono-Regular.woff2
VM2781 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM2781 renderer_init:2
logSecurityWarnings @ VM2781 renderer_init:2
(anonymous) @ VM2781 renderer_init:2
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
textarea.tsx:7 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: http://localhost:5173/src/assets/fonts/berkeley-mono/BerkeleyMono-BoldItalic.woff2
textarea.tsx:7 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: http://localhost:5173/src/assets/fonts/berkeley-mono/BerkeleyMono-Italic.woff2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748204844986}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748204844988}
SellComputePane.tsx:143 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:61 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:69 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748204846448}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748204846450}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748204846453}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204846454}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204847689}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:agent_chat', action: 'change_provider', label: 'claude_code', timestamp: 1748204848059}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test', timestamp: 1748204849242}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748204849243
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: claude_code', value: 'assistant-1748204849243', timestamp: 1748204849244}
useAgentChat.ts:170 [useAgentChat] Orchestrator: Starting stream via provider: claude_code for message: assistant-1748204849243 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'claude_code', timestamp: 1748204849245}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'claude_code', value: 'claude-sonnet', timestamp: 1748204849257}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_claude_code', label: 'claude_code', timestamp: 1748204849257}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_claude_code', label: 'claude_code', timestamp: 1748204849257}
ChatOrchestratorService.ts:393 [ChatOrchestratorService] Successfully created Claude Code IPC provider for claude_code
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_error', label: 'Claude Code stream error: Utility process exited unexpectedly with code 1', timestamp: 1748204849364}
useAgentChat.ts:230 [useAgentChat] Stream error state: {isAbort: false, messageId: 'assistant-1748204849243', signalAborted: false, causeType: 'Fail', defectType: 'N/A'}
useAgentChat.ts:250 [useAgentChat] Stream error: {messageId: 'assistant-1748204849243', error: AiProviderError: Claude Code stream error: Utility process exited unexpectedly with code 1
    at h…, cause: 'AiProviderError: Claude Code stream error: Utility…i/orchestration/ChatOrchestratorService.ts:220:29'}
overrideMethod @ hook.js:608
(anonymous) @ useAgentChat.ts:250
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:9242
effect_internal_function @ chunk-YZAYSWRX.js?v=a80f3706:723
Sync @ chunk-NHEPLXU6.js?v=a80f3706:9242
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:9428
context @ chunk-NHEPLXU6.js?v=a80f3706:2162
runLoop @ chunk-NHEPLXU6.js?v=a80f3706:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=a80f3706:9055
evaluateMessageWhileSuspended @ chunk-NHEPLXU6.js?v=a80f3706:9032
drainQueueOnCurrentThread @ chunk-NHEPLXU6.js?v=a80f3706:8820
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:8519
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:869
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:875
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:875
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:875
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:875
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
starveInternal @ chunk-NHEPLXU6.js?v=a80f3706:875
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=a80f3706:885
scheduleTask @ chunk-NHEPLXU6.js?v=a80f3706:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=a80f3706:8849
tell @ chunk-NHEPLXU6.js?v=a80f3706:8626
callback @ chunk-NHEPLXU6.js?v=a80f3706:9149
deferredUnsafeDone @ chunk-YZAYSWRX.js?v=a80f3706:9639
unsafeCompleteDeferred @ chunk-3J4N7BOM.js?v=a80f3706:1020
(anonymous) @ chunk-3J4N7BOM.js?v=a80f3706:746
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:9394
effect_internal_function @ chunk-YZAYSWRX.js?v=a80f3706:723
Commit @ chunk-NHEPLXU6.js?v=a80f3706:9394
(anonymous) @ chunk-NHEPLXU6.js?v=a80f3706:9428
context @ chunk-NHEPLXU6.js?v=a80f3706:2162
runLoop @ chunk-NHEPLXU6.js?v=a80f3706:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=a80f3706:9055
start @ chunk-NHEPLXU6.js?v=a80f3706:9103
(anonymous) @ chunk-4PXXWCXP.js?v=a80f3706:140
(anonymous) @ chunk-4PXXWCXP.js?v=a80f3706:109
(anonymous) @ chunk-4PXXWCXP.js?v=a80f3706:272
(anonymous) @ chunk-4PXXWCXP.js?v=a80f3706:267
(anonymous) @ chunk-4PXXWCXP.js?v=a80f3706:109
pipe @ chunk-YZAYSWRX.js?v=a80f3706:122
(anonymous) @ chunk-3J4N7BOM.js?v=a80f3706:8034
fail @ chunk-3J4N7BOM.js?v=a80f3706:7580
(anonymous) @ ChatOrchestratorService.ts:304
errorListener @ VM2783 preload.js:73
emit @ VM2690 node:events:518
onMessage @ VM2781 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_failure_stream', label: 'Claude Code stream error: Utility process exited unexpectedly with code 1', value: 'AiProviderError: Claude Code stream error: Utility…i/orchestration/ChatOrchestratorService.ts:220:29', timestamp: 1748204849366}
useAgentChat.ts:267 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748204849243', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:283 [useAgentChat] Clearing abort controller for message: assistant-1748204849243
useAgentChat.ts:287 [useAgentChat] Clearing current assistant message ID: assistant-1748204849243
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204852696}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204853385}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204858388}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204859062}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204864067}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204864837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204869845}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204870728}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748204875735}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 437 sats', value: 'Token count: 0', timestamp: 1748204876819}
