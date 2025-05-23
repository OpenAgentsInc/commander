OllamaAgentLanguageModelLive.ts:21 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
walletStore.ts:187 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:161 WalletStore: Initializing services with mnemonic starting with: draft...
runtime.ts:165 Creating a production-ready Effect runtime for renderer...
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: REGTEST', value: '2', timestamp: 1747972633837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_provider_config_service_created', value: '{"model":"gemma3:1b","temperature":0.7,"max_tokens":2048}', timestamp: 1747972633889}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_provided_config_service', value: 'gemma3:1b', timestamp: 1747972633889}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_language_model_provider_ready', value: 'gemma3:1b', timestamp: 1747972633889}
VM556 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM556 renderer_init:2
logSecurityWarnings @ VM556 renderer_init:2
(anonymous) @ VM556 renderer_init:2
walletStore.ts:172 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: REGTEST', value: 'success', timestamp: 1747972634405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1747972634407}
SparkServiceImpl.ts:156 [SparkService Finalizer] Wallet connections cleaned up successfully for network: REGTEST.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: REGTEST', timestamp: 1747972634412}
runtime.ts:169 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1747972634412}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747972634478}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747972634479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747972634481}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747972634483}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747972634484}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747972634988}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747972634998}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747972635002}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747972637410}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747972637412}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'testing', timestamp: 1747972641399}
useAgentChat.ts:116 [useAgentChat] Created new AbortController for message: assistant-1747972641399
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'agent_language_model_resolved_successfully', label: 'AgentLanguageModel.Tag resolved from runtime', value: 'assistant-1747972641399', timestamp: 1747972641400}
useAgentChat.ts:155 [useAgentChat] Starting stream for message: assistant-1747972641399 Current signal state: {aborted: false, controller: 'present'}
useAgentChat.ts:203 [useAgentChat] Stream error state: {isAbort: false, messageId: 'assistant-1747972641399', signalAborted: false, causeType: 'Die', defectType: 'Error'}
useAgentChat.ts:223 [useAgentChat] Stream error: {messageId: 'assistant-1747972641399', error: Error: Service not found: @effect/ai-openai/OpenAiLanguageModel/Config (defined at http://localhost…, cause: 'Error: Service not found: @effect/ai-openai/OpenAi…s/.vite/deps/chunk-EW5ALU3O.js?v=85a3d508:9242:42'}
overrideMethod @ hook.js:608
(anonymous) @ useAgentChat.ts:223
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:9242
effect_internal_function @ chunk-AK2MHIIY.js?v=85a3d508:723
Sync @ chunk-EW5ALU3O.js?v=85a3d508:9242
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:9428
context @ chunk-EW5ALU3O.js?v=85a3d508:2162
runLoop @ chunk-EW5ALU3O.js?v=85a3d508:9424
evaluateEffect @ chunk-EW5ALU3O.js?v=85a3d508:9055
evaluateMessageWhileSuspended @ chunk-EW5ALU3O.js?v=85a3d508:9032
drainQueueOnCurrentThread @ chunk-EW5ALU3O.js?v=85a3d508:8820
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:8519
starveInternal @ chunk-EW5ALU3O.js?v=85a3d508:869
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:885
Promise.then
starve @ chunk-EW5ALU3O.js?v=85a3d508:885
starveInternal @ chunk-EW5ALU3O.js?v=85a3d508:875
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:885
Promise.then
starve @ chunk-EW5ALU3O.js?v=85a3d508:885
starveInternal @ chunk-EW5ALU3O.js?v=85a3d508:875
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:885
Promise.then
starve @ chunk-EW5ALU3O.js?v=85a3d508:885
starveInternal @ chunk-EW5ALU3O.js?v=85a3d508:875
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:885
Promise.then
starve @ chunk-EW5ALU3O.js?v=85a3d508:885
scheduleTask @ chunk-EW5ALU3O.js?v=85a3d508:901
drainQueueLaterOnExecutor @ chunk-EW5ALU3O.js?v=85a3d508:8849
tell @ chunk-EW5ALU3O.js?v=85a3d508:8626
resume @ chunk-EW5ALU3O.js?v=85a3d508:8546
unsafeFork2 @ chunk-EW5ALU3O.js?v=85a3d508:9866
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:12556
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:9305
effect_internal_function @ chunk-AK2MHIIY.js?v=85a3d508:723
WithRuntime @ chunk-EW5ALU3O.js?v=85a3d508:9305
(anonymous) @ chunk-EW5ALU3O.js?v=85a3d508:9428
context @ chunk-EW5ALU3O.js?v=85a3d508:2162
runLoop @ chunk-EW5ALU3O.js?v=85a3d508:9424
evaluateEffect @ chunk-EW5ALU3O.js?v=85a3d508:9055
start @ chunk-EW5ALU3O.js?v=85a3d508:9103
(anonymous) @ chunk-JDKXPMYB.js?v=85a3d508:140
(anonymous) @ chunk-JDKXPMYB.js?v=85a3d508:109
(anonymous) @ useAgentChat.ts:267
t6 @ AgentChatPane.tsx:70
t8 @ ChatWindow.tsx:69
executeDispatch @ chunk-QW7VXTSL.js?v=85a3d508:11736
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
processDispatchQueue @ chunk-QW7VXTSL.js?v=85a3d508:11772
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:12182
batchedUpdates$1 @ chunk-QW7VXTSL.js?v=85a3d508:2628
dispatchEventForPluginEventSystem @ chunk-QW7VXTSL.js?v=85a3d508:11877
dispatchEvent @ chunk-QW7VXTSL.js?v=85a3d508:14792
dispatchDiscreteEvent @ chunk-QW7VXTSL.js?v=85a3d508:14773
<textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
Textarea @ textarea.tsx:7
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<Textarea>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
ChatWindow @ ChatWindow.tsx:99
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<ChatWindow>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
ChatContainer @ ChatContainer.tsx:64
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<ChatContainer>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
AgentChatPane @ AgentChatPane.tsx:116
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<AgentChatPane>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
t12 @ PaneManager.tsx:130
PaneManager @ PaneManager.tsx:73
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<PaneManager>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
HomePage @ HomePage.tsx:249
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<HomePage>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
(anonymous) @ @tanstack_react-router.js?v=85a3d508:4337
mountMemo @ chunk-QW7VXTSL.js?v=85a3d508:5052
useMemo @ chunk-QW7VXTSL.js?v=85a3d508:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=85a3d508:915
MatchInnerImpl @ @tanstack_react-router.js?v=85a3d508:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6482
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
MatchImpl @ @tanstack_react-router.js?v=85a3d508:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6482
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
OutletImpl @ @tanstack_react-router.js?v=85a3d508:4424
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6482
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<OutletImpl>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
Root @ __root.tsx:14
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<Root>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
(anonymous) @ @tanstack_react-router.js?v=85a3d508:4337
mountMemo @ chunk-QW7VXTSL.js?v=85a3d508:5052
useMemo @ chunk-QW7VXTSL.js?v=85a3d508:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=85a3d508:915
MatchInnerImpl @ @tanstack_react-router.js?v=85a3d508:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6482
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
MatchImpl @ @tanstack_react-router.js?v=85a3d508:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=85a3d508:6482
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
MatchesInner @ @tanstack_react-router.js?v=85a3d508:4465
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=85a3d508:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=85a3d508:11558
(anonymous) @ chunk-QW7VXTSL.js?v=85a3d508:11649
<MatchesInner>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
Matches @ @tanstack_react-router.js?v=85a3d508:4439
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=85a3d508:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=85a3d508:36
<Matches>
exports.jsx @ chunk-D3OMFVKC.js?v=85a3d508:250
RouterProvider @ @tanstack_react-router.js?v=85a3d508:5181
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=85a3d508:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=85a3d508:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=85a3d508:36
<RouterProvider>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=85a3d508:250
App @ App.tsx:67
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=85a3d508:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=85a3d508:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=85a3d508:6619
beginWork @ chunk-QW7VXTSL.js?v=85a3d508:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=85a3d508:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=85a3d508:10868
workLoopSync @ chunk-QW7VXTSL.js?v=85a3d508:10728
renderRootSync @ chunk-QW7VXTSL.js?v=85a3d508:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=85a3d508:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=85a3d508:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=85a3d508:36
<App>
exports.createElement @ chunk-5LFKFUIN.js?v=85a3d508:773
startApp @ renderer.ts:33
await in startApp
(anonymous) @ renderer.ts:87
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_failure_stream', label: 'Service not found: @effect/ai-openai/OpenAiLanguag…ite/deps/@effect_ai-openai.js?v=85a3d508:9738:90)', value: 'Error: Service not found: @effect/ai-openai/OpenAi…s/.vite/deps/chunk-EW5ALU3O.js?v=85a3d508:9242:42', timestamp: 1747972641417}
useAgentChat.ts:240 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747972641399', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:256 [useAgentChat] Clearing abort controller for message: assistant-1747972641399
useAgentChat.ts:260 [useAgentChat] Clearing current assistant message ID: assistant-1747972641399
