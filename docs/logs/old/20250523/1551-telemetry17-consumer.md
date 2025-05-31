OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748033414782}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748033414830}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748033414831}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748033414832}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748033414837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748033414919}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748033414919}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748033414920}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033414921}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033414921}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748033414923}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748033414924}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748033414924}
VM12481 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM12481 renderer_init:2
logSecurityWarnings @ VM12481 renderer_init:2
(anonymous) @ VM12481 renderer_init:2
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748033418913}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748033418914}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033419945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033419945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'testing', timestamp: 1748033421976}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748033421977
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748033421977', timestamp: 1748033421977}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748033421977 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748033421978}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748033421990}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748033421991}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748033421994}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'f42b2e6e3db905c72635a83e35c475147d6a35d91004b0bee8870d608f800f9a', value: 'Ephemeral key', timestamp: 1748033421997}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748033421997}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748033422005}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', timestamp: 1748033422006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event a28c91e96890c…cbfc77df0302f5be005a066e04d96579 to all 3 relays.', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'Kind: 5050', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: a28c91e968…4e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748033422795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["a28c91e96890cc84e…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748033422795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748033422795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748033422795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '0c90160dbf9b21c4aa5eb48194fa425e47775014d0126b59e1bba7be7a5a08aa', value: 'Kind: 7000 | Job: a28c91e96890cc84e6d9d89700fc80cf…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748033422866}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '0c90160dbf9b21c4aa5eb48194fa425e47775014d0126b59e1bba7be7a5a08aa', value: 'Content: ... | Tags: [["e","a28c91e96890cc84e6d9d8…unt","3000","lnbc3n1mock_invoice_1748033422744"]]', timestamp: 1748033422866}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: '3 sats', timestamp: 1748033422867}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: '3 sats', timestamp: 1748033422867}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'lnbc3n1mock_invoice_', timestamp: 1748033422867}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'lnbc3n1mock_invoice_', timestamp: 1748033422867}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'mock_hash_1748033422867', timestamp: 1748033422869}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Auto-paid 3 sats. Payment hash: mock_hash_17... Waiting for DVM to process...","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":77,"totalTokens":77,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748033421977 Chunk length: 77
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033424947}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033424948}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033429949}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033429949}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033434951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033434951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033439953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033439953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033444955}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033444955}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033449958}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033449958}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033454960}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033454961}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033459963}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033459963}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033464965}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033464966}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033469968}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033469968}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033474970}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033474971}
SparkServiceImpl.ts:70


           POST https://2.spark.flashnet.xyz/spark_authn.SparkAuthnService/get_challenge 504 (Gateway Timeout)
fetchTransport @ lib-6GUHA7WW.js?v=ad354b67:394
await in fetchTransport
handleTransportErrors @ lib-6GUHA7WW.js?v=ad354b67:815
decodeResponse @ lib-6GUHA7WW.js?v=ad354b67:611
makeCall @ lib-6GUHA7WW.js?v=ad354b67:847
unaryMethod @ lib-6GUHA7WW.js?v=ad354b67:1087
(anonymous) @ lib-6GUHA7WW.js?v=ad354b67:1111
authenticate @ @buildonspark_spark-sdk.js?v=ad354b67:66600
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=ad354b67:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=ad354b67:66493
createClients @ @buildonspark_spark-sdk.js?v=ad354b67:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=ad354b67:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=ad354b67:71314
try @ SparkServiceImpl.ts:70
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
start @ chunk-QHMFDAEA.js?v=ad354b67:9108
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:140
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:272
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:267
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:111
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:257
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:388
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:274
then @ chunk-FDM57WKT.js?v=ad354b67:280
hydrate @ chunk-FDM57WKT.js?v=ad354b67:387
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:426
createStoreImpl @ chunk-THUVLC43.js?v=ad354b67:20
createStore @ chunk-THUVLC43.js?v=ad354b67:23
createImpl @ chunk-F5CQ472C.js?v=ad354b67:24
(anonymous) @ walletStore.ts:35
SparkServiceImpl.ts:70 Authentication error: ClientError: /spark_authn.SparkAuthnService/get_challenge UNKNOWN: Transport error: /spark_authn.SparkAuthnService/get_challenge UNAVAILABLE: Received HTTP 504 response: <html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'94476cac2e7bc303',t:'MTc0ODAzMzQ3NS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&... (truncated)
    at handleTransportErrors (lib-6GUHA7WW.js?v=ad354b67:827:17)
    at async decodeResponse (lib-6GUHA7WW.js?v=ad354b67:611:24)
    at async makeCall (lib-6GUHA7WW.js?v=ad354b67:847:9)
    at async unaryMethod (lib-6GUHA7WW.js?v=ad354b67:1087:26)
    at async Object.get_challenge (lib-6GUHA7WW.js?v=ad354b67:1111:22)
    at async ConnectionManager.authenticate (@buildonspark_spark-sdk.js?v=ad354b67:66600:29)
    at async ConnectionManager.createSparkClient (@buildonspark_spark-sdk.js?v=ad354b67:66580:23)
overrideMethod @ hook.js:608
authenticate @ @buildonspark_spark-sdk.js?v=ad354b67:66622
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=ad354b67:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=ad354b67:66493
createClients @ @buildonspark_spark-sdk.js?v=ad354b67:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=ad354b67:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=ad354b67:71314
try @ SparkServiceImpl.ts:70
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
start @ chunk-QHMFDAEA.js?v=ad354b67:9108
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:140
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:272
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:267
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:111
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:257
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:388
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:274
then @ chunk-FDM57WKT.js?v=ad354b67:280
hydrate @ chunk-FDM57WKT.js?v=ad354b67:387
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:426
createStoreImpl @ chunk-THUVLC43.js?v=ad354b67:20
createStore @ chunk-THUVLC43.js?v=ad354b67:23
createImpl @ chunk-F5CQ472C.js?v=ad354b67:24
(anonymous) @ walletStore.ts:35
@buildonspark_spark-sdk.js?v=ad354b67:66623 Uncaught (in promise) AuthenticationError: Authentication failed
    at ConnectionManager.authenticate (@buildonspark_spark-sdk.js?v=ad354b67:66623:13)
    at async ConnectionManager.createSparkClient (@buildonspark_spark-sdk.js?v=ad354b67:66580:23)
authenticate @ @buildonspark_spark-sdk.js?v=ad354b67:66623
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=ad354b67:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=ad354b67:66493
createClients @ @buildonspark_spark-sdk.js?v=ad354b67:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=ad354b67:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=ad354b67:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=ad354b67:71314
try @ SparkServiceImpl.ts:70
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
start @ chunk-QHMFDAEA.js?v=ad354b67:9108
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:140
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:272
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:267
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:111
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:257
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:388
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:274
then @ chunk-FDM57WKT.js?v=ad354b67:280
hydrate @ chunk-FDM57WKT.js?v=ad354b67:387
(anonymous) @ chunk-FDM57WKT.js?v=ad354b67:426
createStoreImpl @ chunk-THUVLC43.js?v=ad354b67:20
createStore @ chunk-THUVLC43.js?v=ad354b67:23
createImpl @ chunk-F5CQ472C.js?v=ad354b67:24
(anonymous) @ walletStore.ts:35
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033479973}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033479974}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033484975}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033484975}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033489977}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033489978}
