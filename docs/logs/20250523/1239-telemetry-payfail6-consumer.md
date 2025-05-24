OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:126 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:260 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:108 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:230 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748021924851}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748021924901}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748021924902}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748021924903}
runtime.ts:234 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748021924907}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748021924964}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748021924965}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748021924965}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748021924966}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748021924966}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748021924969}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748021924969}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748021924969}
VM561 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM561 renderer_init:2
logSecurityWarnings @ VM561 renderer_init:2
(anonymous) @ VM561 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748021925532}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748021925534}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748021925536}
runtime.ts:275 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748021925537}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748021925977}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748021925978}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748021926026}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 500', timestamp: 1748021926269}
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748021926439}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748021926441}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'testing', timestamp: 1748021928525}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748021928526
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748021928526', timestamp: 1748021928526}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748021928526 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748021928527}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748021928536}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748021928537}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(1), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748021928539}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: '55b4f3351f031416bcf3915d12fd386a9bda1ca05fc86d3e1130b0a6cbb76eb5', value: 'Ephemeral key', timestamp: 1748021928542}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748021928542}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nos.lol/"]', timestamp: 1748021928550}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '0b366b592a665ac2bb5aa3321b56d5367eb278d450f8968557b9fa4d5e833904', timestamp: 1748021928550}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:error', action: 'nostr_publish_total_failure', label: '[Nostr] Failed to publish event 0b366b592a665ac2bb…8968557b9fa4d5e833904 to all 1 configured relays.', value: 'Reasons: Error: pow: 28 bits needed. (2)', timestamp: 1748021929269}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_error', label: 'NIP-90 stream setup error: Failed to publish event…f the 1 configured relays. All 1 attempts failed.', timestamp: 1748021929273}
useAgentChat.ts:228 [useAgentChat] Stream error state: {isAbort: false, messageId: 'assistant-1748021928526', signalAborted: false, causeType: 'Fail', defectType: 'N/A'}
useAgentChat.ts:248 [useAgentChat] Stream error: {messageId: 'assistant-1748021928526', error: AiProviderError: NIP-90 stream setup error: Failed to publish event 0b366b592a665ac2bb5aa3321b56d53…, cause: 'AiProviderError: NIP-90 stream setup error: Failed…s/.vite/deps/chunk-QHMFDAEA.js?v=ad354b67:9242:42'}
overrideMethod @ hook.js:608
(anonymous) @ useAgentChat.ts:248
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9242
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Sync @ chunk-QHMFDAEA.js?v=ad354b67:9242
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
evaluateMessageWhileSuspended @ chunk-QHMFDAEA.js?v=ad354b67:9032
drainQueueOnCurrentThread @ chunk-QHMFDAEA.js?v=ad354b67:8820
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:8519
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:869
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
scheduleTask @ chunk-QHMFDAEA.js?v=ad354b67:901
drainQueueLaterOnExecutor @ chunk-QHMFDAEA.js?v=ad354b67:8849
tell @ chunk-QHMFDAEA.js?v=ad354b67:8626
callback @ chunk-QHMFDAEA.js?v=ad354b67:9149
proxyResume @ chunk-3LBJP6S5.js?v=ad354b67:8654
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3237
Promise.then
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3237
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9394
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Commit @ chunk-QHMFDAEA.js?v=ad354b67:9394
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
evaluateMessageWhileSuspended @ chunk-QHMFDAEA.js?v=ad354b67:9032
drainQueueOnCurrentThread @ chunk-QHMFDAEA.js?v=ad354b67:8820
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:8519
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:869
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
scheduleTask @ chunk-QHMFDAEA.js?v=ad354b67:901
drainQueueLaterOnExecutor @ chunk-QHMFDAEA.js?v=ad354b67:8849
tell @ chunk-QHMFDAEA.js?v=ad354b67:8626
callback @ chunk-QHMFDAEA.js?v=ad354b67:9149
proxyResume @ chunk-3LBJP6S5.js?v=ad354b67:8654
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3237
Promise.then
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3237
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9394
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Commit @ chunk-QHMFDAEA.js?v=ad354b67:9394
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
evaluateMessageWhileSuspended @ chunk-QHMFDAEA.js?v=ad354b67:9032
drainQueueOnCurrentThread @ chunk-QHMFDAEA.js?v=ad354b67:8820
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:8519
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:869
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
scheduleTask @ chunk-QHMFDAEA.js?v=ad354b67:901
drainQueueLaterOnExecutor @ chunk-QHMFDAEA.js?v=ad354b67:8849
tell @ chunk-QHMFDAEA.js?v=ad354b67:8626
callback @ chunk-QHMFDAEA.js?v=ad354b67:9149
proxyResume @ chunk-3LBJP6S5.js?v=ad354b67:8654
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3099
Promise.then
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:3099
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
(anonymous) @ chunk-3LBJP6S5.js?v=ad354b67:8673
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9394
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Commit @ chunk-QHMFDAEA.js?v=ad354b67:9394
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
evaluateMessageWhileSuspended @ chunk-QHMFDAEA.js?v=ad354b67:9032
drainQueueOnCurrentThread @ chunk-QHMFDAEA.js?v=ad354b67:8820
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:8519
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:869
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
scheduleTask @ chunk-QHMFDAEA.js?v=ad354b67:901
drainQueueLaterOnExecutor @ chunk-QHMFDAEA.js?v=ad354b67:8849
tell @ chunk-QHMFDAEA.js?v=ad354b67:8626
resume @ chunk-QHMFDAEA.js?v=ad354b67:8546
unsafeFork2 @ chunk-QHMFDAEA.js?v=ad354b67:9866
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:12556
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9305
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
WithRuntime @ chunk-QHMFDAEA.js?v=ad354b67:9305
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
start @ chunk-QHMFDAEA.js?v=ad354b67:9103
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:140
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
(anonymous) @ useAgentChat.ts:292
t6 @ AgentChatPane.tsx:70
t8 @ ChatWindow.tsx:69
executeDispatch @ chunk-QW7VXTSL.js?v=ad354b67:11736
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
processDispatchQueue @ chunk-QW7VXTSL.js?v=ad354b67:11772
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:12182
batchedUpdates$1 @ chunk-QW7VXTSL.js?v=ad354b67:2628
dispatchEventForPluginEventSystem @ chunk-QW7VXTSL.js?v=ad354b67:11877
dispatchEvent @ chunk-QW7VXTSL.js?v=ad354b67:14792
dispatchDiscreteEvent @ chunk-QW7VXTSL.js?v=ad354b67:14773
<textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
Textarea @ textarea.tsx:7
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<Textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
ChatWindow @ ChatWindow.tsx:99
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<ChatWindow>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
ChatContainer @ ChatContainer.tsx:64
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<ChatContainer>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
AgentChatPane @ AgentChatPane.tsx:116
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<AgentChatPane>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
t12 @ PaneManager.tsx:130
PaneManager @ PaneManager.tsx:73
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<PaneManager>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
HomePage @ HomePage.tsx:249
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<HomePage>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
(anonymous) @ @tanstack_react-router.js?v=ad354b67:4337
mountMemo @ chunk-QW7VXTSL.js?v=ad354b67:5052
useMemo @ chunk-QW7VXTSL.js?v=ad354b67:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=ad354b67:915
MatchInnerImpl @ @tanstack_react-router.js?v=ad354b67:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6482
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
MatchImpl @ @tanstack_react-router.js?v=ad354b67:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6482
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
OutletImpl @ @tanstack_react-router.js?v=ad354b67:4424
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6482
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<OutletImpl>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
Root @ __root.tsx:14
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<Root>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
(anonymous) @ @tanstack_react-router.js?v=ad354b67:4337
mountMemo @ chunk-QW7VXTSL.js?v=ad354b67:5052
useMemo @ chunk-QW7VXTSL.js?v=ad354b67:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=ad354b67:915
MatchInnerImpl @ @tanstack_react-router.js?v=ad354b67:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6482
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
MatchImpl @ @tanstack_react-router.js?v=ad354b67:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=ad354b67:6482
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
MatchesInner @ @tanstack_react-router.js?v=ad354b67:4465
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=ad354b67:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=ad354b67:11558
(anonymous) @ chunk-QW7VXTSL.js?v=ad354b67:11649
<MatchesInner>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
Matches @ @tanstack_react-router.js?v=ad354b67:4439
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=ad354b67:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=ad354b67:36
<Matches>
exports.jsx @ chunk-D3OMFVKC.js?v=ad354b67:250
RouterProvider @ @tanstack_react-router.js?v=ad354b67:5181
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=ad354b67:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=ad354b67:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=ad354b67:36
<RouterProvider>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=ad354b67:250
App @ App.tsx:72
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=ad354b67:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=ad354b67:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=ad354b67:6619
beginWork @ chunk-QW7VXTSL.js?v=ad354b67:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=ad354b67:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=ad354b67:10868
workLoopSync @ chunk-QW7VXTSL.js?v=ad354b67:10728
renderRootSync @ chunk-QW7VXTSL.js?v=ad354b67:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=ad354b67:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=ad354b67:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=ad354b67:36
<App>
exports.createElement @ chunk-5LFKFUIN.js?v=ad354b67:773
startApp @ renderer.ts:33
await in startApp
(anonymous) @ renderer.ts:87
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_failure_stream', label: 'NIP-90 stream setup error: Failed to publish event…f the 1 configured relays. All 1 attempts failed.', value: 'AiProviderError: NIP-90 stream setup error: Failed…s/.vite/deps/chunk-QHMFDAEA.js?v=ad354b67:9242:42', timestamp: 1748021929277}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748021928526', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748021928526
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748021928526
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748021931028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748021931315}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748021936319}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748021936623}
