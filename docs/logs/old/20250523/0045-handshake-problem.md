# Problem

I'm trying to send an inference job from this computer to my other computer over NIP90. When I send a chat message, it successfully creates a kind 5050. But I see the default "Go online" behavior is only subscribing to event kinds 6000+.

## Telemetry (consumer computer)

```
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'who r u', timestamp: 1747978949313}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747978949314
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1747978949314', timestamp: 1747978949315}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1747978949314 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1747978949315}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1747978949328}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1747978949328}
ChatOrchestratorService.ts:92 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: 'YOUR_DEVSTRAL_DVM_PUBKEY_HEX', dvmRelays: Array(2), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1747978949332}
ChatOrchestratorService.ts:116 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1747978949335}
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
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://purplepag.es/","wss://nos.lol/","wss://rel…/offchain.pub/","wss://nostr-pub.wellorder.net/"]', timestamp: 1747978949343}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '60d1c1f739ffc390dfde4701e8835777c594df6852445f2ea5118d826e444460', timestamp: 1747978949343}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 60d1c1f739ffc390…852445f2ea5118d826e444460: 4 succeeded, 2 failed.', value: 'Failures: Error: blocked: Purple Pages only accept…nd 0, 3 and 10002., Error: no active subscription', timestamp: 1747978950097}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 60d1c1f739ffc390dfde4701e8835777c594df6852445f2ea5118d826e444460', value: 'Kind: 5050', timestamp: 1747978950097}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 60d1c1f739…0dfde4701e8835777c594df6852445f2ea5118d826e444460', timestamp: 1747978950098}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…offchain.pub/","wss://nostr-pub.wellorder.net/"]}', timestamp: 1747978950098}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747978968711}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747978969203}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747978999207}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747978999476}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979029479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979029771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:agent_chat', action: 'change_provider', label: 'ollama_gemma3_1b', timestamp: 1747979035283}
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
useAgentChat.ts:303 [useAgentChat] Unmounting - aborting current stream. {messageId: 'assistant-1747978949314', signalAborted: false}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'hook_unmount_stream_cancel', label: 'assistant-1747978949314', timestamp: 1747979045299}
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747979045676}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747979045678}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'hi', timestamp: 1747979047913}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747979047914
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: ollama_gemma3_1b', value: 'assistant-1747979047914', timestamp: 1747979047915}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: ollama_gemma3_1b for message: assistant-1747979047914 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'ollama_gemma3_1b', timestamp: 1747979047915}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'ollama_gemma3_1b', value: 'gemma3:1b', timestamp: 1747979047928}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_ollama', label: 'ollama_gemma3_1b', timestamp: 1747979047929}
OllamaAsOpenAIClientLive.ts:424 [OllamaAsOpenAIClientLive] Starting stream for gemma3:1b with params: {
  "model": "gemma3:1b",
  "messages": [
    {
      "role": "system",
      "content": "You are Commander's AI Agent. Be helpful and concise.",
      "timestamp": 1747979047914
    },
    {
      "role": "user",
      "content": "hi"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747979047933}
OllamaAsOpenAIClientLive.ts:439 [OllamaAsOpenAIClientLive] Setting up IPC stream for gemma3:1b
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"Hello","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Hello","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" there","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" there","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 6
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"!","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"!","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" How","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" How","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" can","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" can","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" help","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" help","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" you","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" you","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" today","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" today","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 6
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"?","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-588","object":"chat.completion.chunk","created":1747979049,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[]}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1747979047914 Chunk length: 0
OllamaAsOpenAIClientLive.ts:490 [OllamaAsOpenAIClientLive] IPC onDone received for gemma3:1b. Calling emit.end().
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_done', label: 'gemma3:1b', timestamp: 1747979049282}
OllamaAsOpenAIClientLive.ts:574 [OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with gemma3:1b. ipcStreamCancel called.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'cancel_requested', label: 'gemma3:1b', timestamp: 1747979049284}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747979047914', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1747979047914
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1747979047914
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:agent_chat', action: 'change_provider', label: 'nip90_devstral', timestamp: 1747979051279}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'does this work', timestamp: 1747979054231}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1747979054232
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1747979054232', timestamp: 1747979054232}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1747979054232 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1747979054233}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1747979054244}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1747979054245}
ChatOrchestratorService.ts:92 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: 'YOUR_DEVSTRAL_DVM_PUBKEY_HEX', dvmRelays: Array(2), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1747979054251}
ChatOrchestratorService.ts:116 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1747979054254}
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
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'b7eb2b8eca9a599ce594266bbff22ea81fbeccb3053d8b8bcd58b67d302f0de7', timestamp: 1747979054262}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event b7eb2b8eca9a599c…3053d8b8bcd58b67d302f0de7: 4 succeeded, 2 failed.', value: 'Failures: Error: blocked: Purple Pages only accept…nd 0, 3 and 10002., Error: no active subscription', timestamp: 1747979054450}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: b7eb2b8eca9a599ce594266bbff22ea81fbeccb3053d8b8bcd58b67d302f0de7', value: 'Kind: 5050', timestamp: 1747979054451}action: "nip90_job_request_published"category: "feature"label: "Published job request with ID: b7eb2b8eca9a599ce594266bbff22ea81fbeccb3053d8b8bcd58b67d302f0de7"timestamp: 1747979054451value: "Kind: 5050"[[Prototype]]: Object
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: b7eb2b8eca…ce594266bbff22ea81fbeccb3053d8b8bcd58b67d302f0de7', timestamp: 1747979054451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…offchain.pub/","wss://nostr-pub.wellorder.net/"]}', timestamp: 1747979054452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979059773}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979060053}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979090056}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979090317}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979120988}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979121263}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979151987}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979152240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979182987}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979183468}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979213986}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979214590}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747979215984}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747979216440}
```
