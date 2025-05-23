OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
walletStore.ts:187 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:161 WalletStore: Initializing services with mnemonic starting with: draft...
runtime.ts:183 Creating a production-ready Effect runtime for renderer...
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: REGTEST', value: '2', timestamp: 1747980327239}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1747980327282}
VM1249 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1249 renderer_init:2
logSecurityWarnings @ VM1249 renderer_init:2
(anonymous) @ VM1249 renderer_init:2
walletStore.ts:172 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: REGTEST', value: 'success', timestamp: 1747980328107}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1747980328110}
SparkServiceImpl.ts:156 [SparkService Finalizer] Wallet connections cleaned up successfully for network: REGTEST.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: REGTEST', timestamp: 1747980328116}
runtime.ts:187 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1747980328116}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747980328178}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747980328179}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980328180}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747980328183}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747980328184}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747980328703}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747980328717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980328724}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747980331221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747980331223}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test', timestamp: 1747980333509}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747980333510
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1747980333510', timestamp: 1747980333511}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1747980333510 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1747980333512}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1747980333525}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1747980333526}
ChatOrchestratorService.ts:92 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: 'YOUR_DEVSTRAL_DVM_PUBKEY_HEX', dvmRelays: Array(2), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1747980333530}
ChatOrchestratorService.ts:116 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1747980333534}
event_creation.ts:87 [NIP90 Helper] Invalid targetDvmPkHexForEncryption ('YOUR_DEVSTRAL_DVM_PUBKEY_HEX'). Sending unencrypted request.
overrideMethod @ hook.js:608
(anonymous) @ event_creation.ts:87
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:8455
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
Iterator @ chunk-SWNAZCRB.js?v=9ee002f0:8455
Sync @ chunk-SWNAZCRB.js?v=9ee002f0:9248
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:9428
context @ chunk-SWNAZCRB.js?v=9ee002f0:2162
runLoop @ chunk-SWNAZCRB.js?v=9ee002f0:9424
evaluateEffect @ chunk-SWNAZCRB.js?v=9ee002f0:9055
evaluateMessageWhileSuspended @ chunk-SWNAZCRB.js?v=9ee002f0:9032
drainQueueOnCurrentThread @ chunk-SWNAZCRB.js?v=9ee002f0:8820
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:8519
starveInternal @ chunk-SWNAZCRB.js?v=9ee002f0:869
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:885
Promise.then
starve @ chunk-SWNAZCRB.js?v=9ee002f0:885
scheduleTask @ chunk-SWNAZCRB.js?v=9ee002f0:901
drainQueueLaterOnExecutor @ chunk-SWNAZCRB.js?v=9ee002f0:8849
tell @ chunk-SWNAZCRB.js?v=9ee002f0:8626
callback @ chunk-SWNAZCRB.js?v=9ee002f0:9149
proxyResume @ chunk-3LBJP6S5.js?v=9ee002f0:8654
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:3099
Promise.then
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:3099
(anonymous) @ chunk-3LBJP6S5.js?v=9ee002f0:8673
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
(anonymous) @ chunk-3LBJP6S5.js?v=9ee002f0:8673
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:9394
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
Commit @ chunk-SWNAZCRB.js?v=9ee002f0:9394
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:9428
context @ chunk-SWNAZCRB.js?v=9ee002f0:2162
runLoop @ chunk-SWNAZCRB.js?v=9ee002f0:9424
evaluateEffect @ chunk-SWNAZCRB.js?v=9ee002f0:9055
evaluateMessageWhileSuspended @ chunk-SWNAZCRB.js?v=9ee002f0:9032
drainQueueOnCurrentThread @ chunk-SWNAZCRB.js?v=9ee002f0:8820
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:8519
starveInternal @ chunk-SWNAZCRB.js?v=9ee002f0:869
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:885
Promise.then
starve @ chunk-SWNAZCRB.js?v=9ee002f0:885
scheduleTask @ chunk-SWNAZCRB.js?v=9ee002f0:901
drainQueueLaterOnExecutor @ chunk-SWNAZCRB.js?v=9ee002f0:8849
tell @ chunk-SWNAZCRB.js?v=9ee002f0:8626
resume @ chunk-SWNAZCRB.js?v=9ee002f0:8546
unsafeFork2 @ chunk-SWNAZCRB.js?v=9ee002f0:9866
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:12556
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:9305
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
WithRuntime @ chunk-SWNAZCRB.js?v=9ee002f0:9305
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:9428
context @ chunk-SWNAZCRB.js?v=9ee002f0:2162
runLoop @ chunk-SWNAZCRB.js?v=9ee002f0:9424
evaluateEffect @ chunk-SWNAZCRB.js?v=9ee002f0:9055
start @ chunk-SWNAZCRB.js?v=9ee002f0:9103
(anonymous) @ chunk-T7QF2HXC.js?v=9ee002f0:140
(anonymous) @ chunk-T7QF2HXC.js?v=9ee002f0:109
(anonymous) @ useAgentChat.ts:292
t6 @ AgentChatPane.tsx:70
t8 @ ChatWindow.tsx:69
executeDispatch @ chunk-QW7VXTSL.js?v=9ee002f0:11736
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
processDispatchQueue @ chunk-QW7VXTSL.js?v=9ee002f0:11772
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:12182
batchedUpdates$1 @ chunk-QW7VXTSL.js?v=9ee002f0:2628
dispatchEventForPluginEventSystem @ chunk-QW7VXTSL.js?v=9ee002f0:11877
dispatchEvent @ chunk-QW7VXTSL.js?v=9ee002f0:14792
dispatchDiscreteEvent @ chunk-QW7VXTSL.js?v=9ee002f0:14773
<textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
Textarea @ textarea.tsx:7
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<Textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
ChatWindow @ ChatWindow.tsx:99
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<ChatWindow>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
ChatContainer @ ChatContainer.tsx:64
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<ChatContainer>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
AgentChatPane @ AgentChatPane.tsx:116
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<AgentChatPane>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
t12 @ PaneManager.tsx:130
PaneManager @ PaneManager.tsx:73
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<PaneManager>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
HomePage @ HomePage.tsx:249
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<HomePage>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
(anonymous) @ @tanstack_react-router.js?v=9ee002f0:4337
mountMemo @ chunk-QW7VXTSL.js?v=9ee002f0:5052
useMemo @ chunk-QW7VXTSL.js?v=9ee002f0:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=9ee002f0:915
MatchInnerImpl @ @tanstack_react-router.js?v=9ee002f0:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6482
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
MatchImpl @ @tanstack_react-router.js?v=9ee002f0:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6482
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
OutletImpl @ @tanstack_react-router.js?v=9ee002f0:4424
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6482
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<OutletImpl>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
Root @ __root.tsx:14
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<Root>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
(anonymous) @ @tanstack_react-router.js?v=9ee002f0:4337
mountMemo @ chunk-QW7VXTSL.js?v=9ee002f0:5052
useMemo @ chunk-QW7VXTSL.js?v=9ee002f0:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=9ee002f0:915
MatchInnerImpl @ @tanstack_react-router.js?v=9ee002f0:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6482
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
MatchImpl @ @tanstack_react-router.js?v=9ee002f0:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6482
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
MatchesInner @ @tanstack_react-router.js?v=9ee002f0:4465
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=9ee002f0:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=9ee002f0:11558
(anonymous) @ chunk-QW7VXTSL.js?v=9ee002f0:11649
<MatchesInner>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
Matches @ @tanstack_react-router.js?v=9ee002f0:4439
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=9ee002f0:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=9ee002f0:36
<Matches>
exports.jsx @ chunk-D3OMFVKC.js?v=9ee002f0:250
RouterProvider @ @tanstack_react-router.js?v=9ee002f0:5181
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=9ee002f0:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=9ee002f0:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=9ee002f0:36
<RouterProvider>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=9ee002f0:250
App @ App.tsx:67
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=9ee002f0:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=9ee002f0:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=9ee002f0:6619
beginWork @ chunk-QW7VXTSL.js?v=9ee002f0:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=9ee002f0:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=9ee002f0:10868
workLoopSync @ chunk-QW7VXTSL.js?v=9ee002f0:10728
renderRootSync @ chunk-QW7VXTSL.js?v=9ee002f0:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=9ee002f0:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=9ee002f0:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=9ee002f0:36
<App>
exports.createElement @ chunk-5LFKFUIN.js?v=9ee002f0:773
startApp @ renderer.ts:33
await in startApp
(anonymous) @ renderer.ts:87
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://purplepag.es/","wss://nos.lol/","wss://rel…/offchain.pub/","wss://nostr-pub.wellorder.net/"]', timestamp: 1747980333542}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '884d2101750e7f3653d8b30542af3fb0ede91b02abc81e137c8029565b8e78e3', timestamp: 1747980333542}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 884d2101750e7f36…2abc81e137c8029565b8e78e3: 3 succeeded, 3 failed.', value: 'Failures: Error: blocked: Purple Pages only accept…8 bits needed. (2), Error: no active subscription', timestamp: 1747980334230}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 884d2101750e7f3653d8b30542af3fb0ede91b02abc81e137c8029565b8e78e3', value: 'Kind: 5050', timestamp: 1747980334230}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 884d210175…653d8b30542af3fb0ede91b02abc81e137c8029565b8e78e3', timestamp: 1747980334231}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…offchain.pub/","wss://nostr-pub.wellorder.net/"]}', timestamp: 1747980334232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980358725}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980359228}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980389231}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980389699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980419702}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980419998}
