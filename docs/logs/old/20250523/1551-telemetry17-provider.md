OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748033377642}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748033377684}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748033377684}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748033377686}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748033377690}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748033377747}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748033377747}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748033377748}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033377749}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033377750}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748033377752}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748033377752}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748033377752}
VM2862 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM2862 renderer_init:2
logSecurityWarnings @ VM2862 renderer_init:2
(anonymous) @ VM2862 renderer_init:2
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1430
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748033381214}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748033381215}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748033381218}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs', timestamp: 1748033381218}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748033381219}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748033381221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748033381221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748033381221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748033381227}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748033382040}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748033382041}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033382771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033382771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033387774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033387774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033392777}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033392777}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033397780}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033397780}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033402783}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033402783}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033407785}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033407786}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033412788}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033412788}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033417791}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033417791}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'Kind: 5050', timestamp: 1748033422740}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: 'Kind: 5050', timestamp: 1748033422740}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', value: '3', timestamp: 1748033422744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', value: '3', timestamp: 1748033422744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f…om pubkey: f42b2e6e3d... status: payment-required', timestamp: 1748033422744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","a28c91e96890cc84e6d9d89700fc80cfcbfc77df030…unt","3000","lnbc3n1mock_invoice_1748033422744"]]', timestamp: 1748033422744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '0c90160dbf9b21c4aa5eb48194fa425e47775014d0126b59e1bba7be7a5a08aa', timestamp: 1748033422747}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033422793}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033422794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 0c90160dbf9b2…47775014d0126b59e1bba7be7a5a08aa to all 3 relays.', timestamp: 1748033422952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: '3 sats', timestamp: 1748033422953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: 'a28c91e96890cc84e6d9d89700fc80cfcbfc77df0302f5be005a066e04d96579', value: '{"priceSats":3,"estimatedTokens":42,"encrypted":true}', timestamp: 1748033422953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033427796}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033427797}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033432799}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033432799}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033437802}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033437802}
SparkServiceImpl.ts:70


           POST https://2.spark.flashnet.xyz/spark_authn.SparkAuthnService/get_challenge 504 (Gateway Timeout)
fetchTransport @ lib-6GUHA7WW.js?v=74cf3d26:394
await in fetchTransport
handleTransportErrors @ lib-6GUHA7WW.js?v=74cf3d26:815
decodeResponse @ lib-6GUHA7WW.js?v=74cf3d26:611
makeCall @ lib-6GUHA7WW.js?v=74cf3d26:847
unaryMethod @ lib-6GUHA7WW.js?v=74cf3d26:1087
(anonymous) @ lib-6GUHA7WW.js?v=74cf3d26:1111
authenticate @ @buildonspark_spark-sdk.js?v=74cf3d26:66600
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=74cf3d26:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=74cf3d26:66493
createClients @ @buildonspark_spark-sdk.js?v=74cf3d26:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=74cf3d26:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=74cf3d26:71314
try @ SparkServiceImpl.ts:70
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:3237
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9394
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
Commit @ chunk-NHEPLXU6.js?v=74cf3d26:9394
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9428
context @ chunk-NHEPLXU6.js?v=74cf3d26:2162
runLoop @ chunk-NHEPLXU6.js?v=74cf3d26:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=74cf3d26:9055
evaluateMessageWhileSuspended @ chunk-NHEPLXU6.js?v=74cf3d26:9032
drainQueueOnCurrentThread @ chunk-NHEPLXU6.js?v=74cf3d26:8820
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:8519
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:869
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
start @ chunk-NHEPLXU6.js?v=74cf3d26:9108
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:140
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:272
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:267
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:111
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:257
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:388
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:274
then @ chunk-FDM57WKT.js?v=74cf3d26:280
hydrate @ chunk-FDM57WKT.js?v=74cf3d26:387
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:426
createStoreImpl @ chunk-THUVLC43.js?v=74cf3d26:20
createStore @ chunk-THUVLC43.js?v=74cf3d26:23
createImpl @ chunk-F5CQ472C.js?v=74cf3d26:24
(anonymous) @ walletStore.ts:35
SparkServiceImpl.ts:70 Authentication error: ClientError: /spark_authn.SparkAuthnService/get_challenge UNKNOWN: Transport error: /spark_authn.SparkAuthnService/get_challenge UNAVAILABLE: Received HTTP 504 response: <html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<script>(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'94476bc3892a16b5',t:'MTc0ODAzMzQzOC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&... (truncated)
    at handleTransportErrors (lib-6GUHA7WW.js?v=74cf3d26:827:17)
    at async decodeResponse (lib-6GUHA7WW.js?v=74cf3d26:611:24)
    at async makeCall (lib-6GUHA7WW.js?v=74cf3d26:847:9)
    at async unaryMethod (lib-6GUHA7WW.js?v=74cf3d26:1087:26)
    at async Object.get_challenge (lib-6GUHA7WW.js?v=74cf3d26:1111:22)
    at async ConnectionManager.authenticate (@buildonspark_spark-sdk.js?v=74cf3d26:66600:29)
    at async ConnectionManager.createSparkClient (@buildonspark_spark-sdk.js?v=74cf3d26:66580:23)
overrideMethod @ hook.js:608
authenticate @ @buildonspark_spark-sdk.js?v=74cf3d26:66622
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=74cf3d26:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=74cf3d26:66493
createClients @ @buildonspark_spark-sdk.js?v=74cf3d26:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=74cf3d26:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=74cf3d26:71314
try @ SparkServiceImpl.ts:70
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:3237
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9394
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
Commit @ chunk-NHEPLXU6.js?v=74cf3d26:9394
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9428
context @ chunk-NHEPLXU6.js?v=74cf3d26:2162
runLoop @ chunk-NHEPLXU6.js?v=74cf3d26:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=74cf3d26:9055
evaluateMessageWhileSuspended @ chunk-NHEPLXU6.js?v=74cf3d26:9032
drainQueueOnCurrentThread @ chunk-NHEPLXU6.js?v=74cf3d26:8820
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:8519
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:869
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
start @ chunk-NHEPLXU6.js?v=74cf3d26:9108
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:140
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:272
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:267
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:111
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:257
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:388
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:274
then @ chunk-FDM57WKT.js?v=74cf3d26:280
hydrate @ chunk-FDM57WKT.js?v=74cf3d26:387
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:426
createStoreImpl @ chunk-THUVLC43.js?v=74cf3d26:20
createStore @ chunk-THUVLC43.js?v=74cf3d26:23
createImpl @ chunk-F5CQ472C.js?v=74cf3d26:24
(anonymous) @ walletStore.ts:35
@buildonspark_spark-sdk.js?v=74cf3d26:66623 Uncaught (in promise) AuthenticationError: Authentication failed
    at ConnectionManager.authenticate (@buildonspark_spark-sdk.js?v=74cf3d26:66623:13)
    at async ConnectionManager.createSparkClient (@buildonspark_spark-sdk.js?v=74cf3d26:66580:23)
authenticate @ @buildonspark_spark-sdk.js?v=74cf3d26:66623
await in authenticate
createSparkClient @ @buildonspark_spark-sdk.js?v=74cf3d26:66580
(anonymous) @ @buildonspark_spark-sdk.js?v=74cf3d26:66493
createClients @ @buildonspark_spark-sdk.js?v=74cf3d26:66492
initializeWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71322
initWalletFromSeed @ @buildonspark_spark-sdk.js?v=74cf3d26:71679
await in initWalletFromSeed
initWallet @ @buildonspark_spark-sdk.js?v=74cf3d26:71639
await in initWallet
initialize @ @buildonspark_spark-sdk.js?v=74cf3d26:71314
try @ SparkServiceImpl.ts:70
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:3237
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
(anonymous) @ chunk-YZAYSWRX.js?v=74cf3d26:8673
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9394
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
Commit @ chunk-NHEPLXU6.js?v=74cf3d26:9394
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9428
context @ chunk-NHEPLXU6.js?v=74cf3d26:2162
runLoop @ chunk-NHEPLXU6.js?v=74cf3d26:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=74cf3d26:9055
evaluateMessageWhileSuspended @ chunk-NHEPLXU6.js?v=74cf3d26:9032
drainQueueOnCurrentThread @ chunk-NHEPLXU6.js?v=74cf3d26:8820
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:8519
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:869
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
starveInternal @ chunk-NHEPLXU6.js?v=74cf3d26:875
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:885
Promise.then
starve @ chunk-NHEPLXU6.js?v=74cf3d26:885
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
start @ chunk-NHEPLXU6.js?v=74cf3d26:9108
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:140
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:272
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:267
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:111
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:257
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
buildRuntimeAsync @ runtime.ts:225
reinitializeRuntime @ runtime.ts:275
_initializeServices @ walletStore.ts:176
(anonymous) @ walletStore.ts:204
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:388
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:274
then @ chunk-FDM57WKT.js?v=74cf3d26:280
hydrate @ chunk-FDM57WKT.js?v=74cf3d26:387
(anonymous) @ chunk-FDM57WKT.js?v=74cf3d26:426
createStoreImpl @ chunk-THUVLC43.js?v=74cf3d26:20
createStore @ chunk-THUVLC43.js?v=74cf3d26:23
createImpl @ chunk-F5CQ472C.js?v=74cf3d26:24
(anonymous) @ walletStore.ts:35
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748033441220}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'checking_pending_jobs', value: '1 jobs', timestamp: 1748033441221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check_status_start', label: 'lnbc3n1mock_invoice_', timestamp: 1748033441221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check_status_success', label: 'Status: pending', value: undefined, timestamp: 1748033441222}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1748033441223}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f65372d123378827"],"#s":["success"],"limit":500}]', timestamp: 1748033441224}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1748033441495}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '0 entries fetched', timestamp: 1748033441496}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1748033441496}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033442804}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033442805}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033447807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033447808}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033452809}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033452810}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033457812}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033457812}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748033462814}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748033462815}
