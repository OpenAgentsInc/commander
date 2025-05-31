OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
walletStore.ts:187 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:161 WalletStore: Initializing services with mnemonic starting with: draft...
runtime.ts:183 Creating a production-ready Effect runtime for renderer...
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: REGTEST', value: '2', timestamp: 1747978598954}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1747978598996}
VM28019 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM28019 renderer_init:2
logSecurityWarnings @ VM28019 renderer_init:2
(anonymous) @ VM28019 renderer_init:2
walletStore.ts:172 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: REGTEST', value: 'success', timestamp: 1747978599528}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1747978599529}
SparkServiceImpl.ts:156 [SparkService Finalizer] Wallet connections cleaned up successfully for network: REGTEST.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: REGTEST', timestamp: 1747978599533}
runtime.ts:187 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1747978599534}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747978599593}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747978599594}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747978599595}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747978599598}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747978599599}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747978600152}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747978600160}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747978600177}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747978601553}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747978601555}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test', timestamp: 1747978604520}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747978604521
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1747978604521', timestamp: 1747978604522}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1747978604521 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1747978604523}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1747978604537}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_nip90_not_implemented', label: 'nip90_devstral', timestamp: 1747978604538}
ChatOrchestratorService.ts:62 [ChatOrchestratorService] NIP90 provider not yet implemented, falling back to default Ollama provider
overrideMethod @ hook.js:608
(anonymous) @ ChatOrchestratorService.ts:62
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:8455
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
Iterator @ chunk-SWNAZCRB.js?v=9ee002f0:8455
Iterator @ chunk-SWNAZCRB.js?v=9ee002f0:9391
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
OllamaAsOpenAIClientLive.ts:424 [OllamaAsOpenAIClientLive] Starting stream for gemma3:1b with params: {
  "model": "gemma3:1b",
  "messages": [
    {
      "role": "system",
      "content": "You are Commander's AI Agent. Be helpful and concise.",
      "timestamp": 1747978604521
    },
    {
      "role": "user",
      "content": "test"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747978604542}
OllamaAsOpenAIClientLive.ts:439 [OllamaAsOpenAIClientLive] Setting up IPC stream for gemma3:1b
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978604,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978604,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":",","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":",","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978604,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"'","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"'","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"m","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"m","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" here","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" here","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" How","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" How","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" can","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" can","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" help","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" help","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" you","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" you","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" today","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" today","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 6
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-255","object":"chat.completion.chunk","created":1747978605,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978604521 Chunk length: 0
OllamaAsOpenAIClientLive.ts:490 [OllamaAsOpenAIClientLive] IPC onDone received for gemma3:1b. Calling emit.end().
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_done', label: 'gemma3:1b', timestamp: 1747978605155}
OllamaAsOpenAIClientLive.ts:574 [OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with gemma3:1b. ipcStreamCancel called.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'cancel_requested', label: 'gemma3:1b', timestamp: 1747978605157}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747978604521', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1747978604521
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1747978604521
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:agent_chat', action: 'change_provider', label: 'ollama_gemma3_1b', timestamp: 1747978610170}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test', timestamp: 1747978611742}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747978611743
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: ollama_gemma3_1b', value: 'assistant-1747978611743', timestamp: 1747978611743}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: ollama_gemma3_1b for message: assistant-1747978611743 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'ollama_gemma3_1b', timestamp: 1747978611744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'ollama_gemma3_1b', value: 'gemma3:1b', timestamp: 1747978611754}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_ollama', label: 'ollama_gemma3_1b', timestamp: 1747978611754}
OllamaAsOpenAIClientLive.ts:424 [OllamaAsOpenAIClientLive] Starting stream for gemma3:1b with params: {
  "model": "gemma3:1b",
  "messages": [
    {
      "role": "system",
      "content": "You are Commander's AI Agent. Be helpful and concise.",
      "timestamp": 1747978611743
    },
    {
      "role": "user",
      "content": "test"
    },
    {
      "role": "assistant",
      "content": "Okay, I'm here. How can I help you today?",
      "providerInfo": {
        "name": "Devstral (NIP-90)",
        "type": "nip90",
        "model": "devstral"
      }
    },
    {
      "role": "user",
      "content": "test"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747978611755}
OllamaAsOpenAIClientLive.ts:439 [OllamaAsOpenAIClientLive] Setting up IPC stream for gemma3:1b
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"  ","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"  ","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"Let","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Let","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 3
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"’","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"’","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"s","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"s","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" start","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" start","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 6
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" with","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" with","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" a","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" a","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978611,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" simple","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" simple","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 7
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" question","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" question","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 9
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":":","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":":","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" **","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" **","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 3
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"What","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"What","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" is","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" is","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 3
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" your","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" your","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" name","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" name","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"**","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"**","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-662","object":"chat.completion.chunk","created":1747978612,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978611743 Chunk length: 0
OllamaAsOpenAIClientLive.ts:490 [OllamaAsOpenAIClientLive] IPC onDone received for gemma3:1b. Calling emit.end().
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_done', label: 'gemma3:1b', timestamp: 1747978612114}
OllamaAsOpenAIClientLive.ts:574 [OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with gemma3:1b. ipcStreamCancel called.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'cancel_requested', label: 'gemma3:1b', timestamp: 1747978612114}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747978611743', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1747978611743
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1747978611743
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:agent_chat', action: 'change_provider', label: 'nip90_devstral', timestamp: 1747978613744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test', timestamp: 1747978615616}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747978615617
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1747978615617', timestamp: 1747978615617}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1747978615617 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1747978615618}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1747978615627}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_nip90_not_implemented', label: 'nip90_devstral', timestamp: 1747978615627}
ChatOrchestratorService.ts:62 [ChatOrchestratorService] NIP90 provider not yet implemented, falling back to default Ollama provider
overrideMethod @ hook.js:608
(anonymous) @ ChatOrchestratorService.ts:62
(anonymous) @ chunk-SWNAZCRB.js?v=9ee002f0:8455
effect_internal_function @ chunk-3LBJP6S5.js?v=9ee002f0:723
Iterator @ chunk-SWNAZCRB.js?v=9ee002f0:8455
Iterator @ chunk-SWNAZCRB.js?v=9ee002f0:9391
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
OllamaAsOpenAIClientLive.ts:424 [OllamaAsOpenAIClientLive] Starting stream for gemma3:1b with params: {
  "model": "gemma3:1b",
  "messages": [
    {
      "role": "system",
      "content": "You are Commander's AI Agent. Be helpful and concise.",
      "timestamp": 1747978615617
    },
    {
      "role": "user",
      "content": "test"
    },
    {
      "role": "assistant",
      "content": "Okay, I'm here. How can I help you today?",
      "providerInfo": {
        "name": "Devstral (NIP-90)",
        "type": "nip90",
        "model": "devstral"
      }
    },
    {
      "role": "user",
      "content": "test"
    },
    {
      "role": "assistant",
      "content": "Okay.  Let’s start with a simple question: **What is your name?**",
      "providerInfo": {
        "name": "Ollama (Local)",
        "type": "ollama",
        "model": "gemma3:1b"
      }
    },
    {
      "role": "user",
      "content": "test"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747978615628}
OllamaAsOpenAIClientLive.ts:439 [OllamaAsOpenAIClientLive] Setting up IPC stream for gemma3:1b
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"My","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"My","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" name","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" name","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" is","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" is","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 3
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" Commander","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" Commander","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 10
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" AI","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" AI","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 3
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-768","object":"chat.completion.chunk","created":1747978615,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747978615617 Chunk length: 0
OllamaAsOpenAIClientLive.ts:490 [OllamaAsOpenAIClientLive] IPC onDone received for gemma3:1b. Calling emit.end().
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_done', label: 'gemma3:1b', timestamp: 1747978615831}
OllamaAsOpenAIClientLive.ts:574 [OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with gemma3:1b. ipcStreamCancel called.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'cancel_requested', label: 'gemma3:1b', timestamp: 1747978615832}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747978615617', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1747978615617
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1747978615617
