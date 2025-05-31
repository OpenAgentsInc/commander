OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748031766419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748031766461}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748031766462}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748031766463}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748031766467}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031766527}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748031766528}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031766528}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748031766529}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748031766530}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031766532}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748031766532}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031766532}
VM1484 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1484 renderer_init:2
logSecurityWarnings @ VM1484 renderer_init:2
(anonymous) @ VM1484 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748031767084}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748031767086}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748031767088}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031767089}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031767547}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031767548}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031767549}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748031767845}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1430
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748031768708}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748031768708}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748031768711}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs', timestamp: 1748031768712}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748031768716}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748031768722}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748031768723}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748031768723}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748031768731}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748031769666}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748031769667}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031772551}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031772825}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031777828}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031778093}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031783096}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031783373}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031788375}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031788646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031793648}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031793910}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'Kind: 5050', timestamp: 1748031796223}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'Kind: 5050', timestamp: 1748031796224}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 270b1381 | Kind: 5050 | Tokens: ~39 | Encrypted"}', timestamp: 1748031796232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rpkf4pp50l...', value: '7fc11a56184f64c6375c94a63dbdf33ed427f066c9a4513d7b7da2c6af172d3c', timestamp: 1748031798671}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c…om pubkey: a1f0109e3e... status: payment-required', timestamp: 1748031798672}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d…e5c6afaufq2pc9q9jstks94n9qf72f4xtfde0tqp8s8tcm"]]', timestamp: 1748031798672}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '522eec117b14c8c83ef4534c27c99f73f3eb1e01a0bcec5a5da1cc6346d2dd43', timestamp: 1748031798680}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 522eec117b14c…f3eb1e01a0bcec5a5da1cc6346d2dd43 to all 3 relays.', timestamp: 1748031798881}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: '3 sats', timestamp: 1748031798881}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: '{"priceSats":3,"estimatedTokens":39,"encrypted":true}', timestamp: 1748031798882}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031798911}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031799166}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031804168}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031804450}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031809451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031809714}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031814715}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031814979}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031819981}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031820264}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031825265}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031825600}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748031828717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'checking_pending_jobs', value: '1 jobs', timestamp: 1748031828717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rpkf4pp50l...', timestamp: 1748031828718}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rpkf4pp50l..."}', timestamp: 1748031828719}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1748031828721}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f65372d123378827"],"#s":["success"],"limit":500}]', timestamp: 1748031828722}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031830602}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031830873}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031835875}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031836155}
Kind5050DVMServiceImpl.ts:1532 Invoice check error: DVMServiceError: Failed to fetch DVM history from relays
    at http://localhost:5173/src/services/dvm/Kind5050DVMServiceImpl.ts?t=1748031754319:174:95
    at http://localhost:5173/node_modules/.vite/deps/chunk-YZAYSWRX.js?v=74cf3d26:8860:31
    at http://localhost:5173/node_modules/.vite/deps/chunk-NHEPLXU6.js?v=74cf3d26:9242:42
overrideMethod @ hook.js:608
(anonymous) @ Kind5050DVMServiceImpl.ts:1532
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9275
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
Failure @ chunk-NHEPLXU6.js?v=74cf3d26:9275
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
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
tell @ chunk-NHEPLXU6.js?v=74cf3d26:8626
callback @ chunk-NHEPLXU6.js?v=74cf3d26:9149
proxyResume @ chunk-YZAYSWRX.js?v=74cf3d26:8654
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1126
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1078
setTimeout
unsafeSchedule @ chunk-NHEPLXU6.js?v=74cf3d26:1076
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1126
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
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
tell @ chunk-NHEPLXU6.js?v=74cf3d26:8626
callback @ chunk-NHEPLXU6.js?v=74cf3d26:9149
proxyResume @ chunk-YZAYSWRX.js?v=74cf3d26:8654
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:3237
Promise.then
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
scheduleTask @ chunk-NHEPLXU6.js?v=74cf3d26:901
drainQueueLaterOnExecutor @ chunk-NHEPLXU6.js?v=74cf3d26:8849
tell @ chunk-NHEPLXU6.js?v=74cf3d26:8626
callback @ chunk-NHEPLXU6.js?v=74cf3d26:9149
proxyResume @ chunk-YZAYSWRX.js?v=74cf3d26:8654
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1126
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1078
setTimeout
unsafeSchedule @ chunk-NHEPLXU6.js?v=74cf3d26:1076
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:1126
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
start @ chunk-NHEPLXU6.js?v=74cf3d26:9103
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:140
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
(anonymous) @ Kind5050DVMServiceImpl.ts:1541
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:8455
effect_internal_function @ chunk-YZAYSWRX.js?v=74cf3d26:723
Iterator @ chunk-NHEPLXU6.js?v=74cf3d26:8455
Success @ chunk-NHEPLXU6.js?v=74cf3d26:9261
(anonymous) @ chunk-NHEPLXU6.js?v=74cf3d26:9428
context @ chunk-NHEPLXU6.js?v=74cf3d26:2162
runLoop @ chunk-NHEPLXU6.js?v=74cf3d26:9424
evaluateEffect @ chunk-NHEPLXU6.js?v=74cf3d26:9055
start @ chunk-NHEPLXU6.js?v=74cf3d26:9103
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:140
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:272
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:267
(anonymous) @ chunk-4PXXWCXP.js?v=74cf3d26:109
handleGoOnlineToggle @ SellComputePane.tsx:163
executeDispatch @ chunk-QW7VXTSL.js?v=74cf3d26:11736
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
processDispatchQueue @ chunk-QW7VXTSL.js?v=74cf3d26:11772
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:12182
batchedUpdates$1 @ chunk-QW7VXTSL.js?v=74cf3d26:2628
dispatchEventForPluginEventSystem @ chunk-QW7VXTSL.js?v=74cf3d26:11877
dispatchEvent @ chunk-QW7VXTSL.js?v=74cf3d26:14792
dispatchDiscreteEvent @ chunk-QW7VXTSL.js?v=74cf3d26:14773
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
_c2 @ button.tsx:46
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateForwardRef @ chunk-QW7VXTSL.js?v=74cf3d26:6461
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7864
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<Button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
SellComputePane @ SellComputePane.tsx:286
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<SellComputePane>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
t12 @ PaneManager.tsx:109
PaneManager @ PaneManager.tsx:73
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<PaneManager>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
HomePage @ HomePage.tsx:249
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<HomePage>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
(anonymous) @ @tanstack_react-router.js?v=74cf3d26:4337
mountMemo @ chunk-QW7VXTSL.js?v=74cf3d26:5052
useMemo @ chunk-QW7VXTSL.js?v=74cf3d26:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=74cf3d26:915
MatchInnerImpl @ @tanstack_react-router.js?v=74cf3d26:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6482
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
MatchImpl @ @tanstack_react-router.js?v=74cf3d26:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6482
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
OutletImpl @ @tanstack_react-router.js?v=74cf3d26:4424
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6482
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<OutletImpl>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
Root @ __root.tsx:14
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<Root>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
(anonymous) @ @tanstack_react-router.js?v=74cf3d26:4337
mountMemo @ chunk-QW7VXTSL.js?v=74cf3d26:5052
useMemo @ chunk-QW7VXTSL.js?v=74cf3d26:16513
exports.useMemo @ chunk-5LFKFUIN.js?v=74cf3d26:915
MatchInnerImpl @ @tanstack_react-router.js?v=74cf3d26:4334
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6482
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<MatchInnerImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
MatchImpl @ @tanstack_react-router.js?v=74cf3d26:4274
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
updateSimpleMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6528
updateMemoComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6482
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7915
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<MatchImpl>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
MatchesInner @ @tanstack_react-router.js?v=74cf3d26:4465
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performSyncWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:11635
flushSyncWorkAcrossRoots_impl @ chunk-QW7VXTSL.js?v=74cf3d26:11536
processRootScheduleInMicrotask @ chunk-QW7VXTSL.js?v=74cf3d26:11558
(anonymous) @ chunk-QW7VXTSL.js?v=74cf3d26:11649
<MatchesInner>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
Matches @ @tanstack_react-router.js?v=74cf3d26:4439
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=74cf3d26:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=74cf3d26:36
<Matches>
exports.jsx @ chunk-D3OMFVKC.js?v=74cf3d26:250
RouterProvider @ @tanstack_react-router.js?v=74cf3d26:5181
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooksAgain @ chunk-QW7VXTSL.js?v=74cf3d26:4281
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4217
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=74cf3d26:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=74cf3d26:36
<RouterProvider>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=74cf3d26:250
App @ App.tsx:72
react-stack-bottom-frame @ chunk-QW7VXTSL.js?v=74cf3d26:17424
renderWithHooks @ chunk-QW7VXTSL.js?v=74cf3d26:4206
updateFunctionComponent @ chunk-QW7VXTSL.js?v=74cf3d26:6619
beginWork @ chunk-QW7VXTSL.js?v=74cf3d26:7654
runWithFiberInDEV @ chunk-QW7VXTSL.js?v=74cf3d26:1485
performUnitOfWork @ chunk-QW7VXTSL.js?v=74cf3d26:10868
workLoopSync @ chunk-QW7VXTSL.js?v=74cf3d26:10728
renderRootSync @ chunk-QW7VXTSL.js?v=74cf3d26:10711
performWorkOnRoot @ chunk-QW7VXTSL.js?v=74cf3d26:10330
performWorkOnRootViaSchedulerTask @ chunk-QW7VXTSL.js?v=74cf3d26:11623
performWorkUntilDeadline @ chunk-QW7VXTSL.js?v=74cf3d26:36
<App>
exports.createElement @ chunk-5LFKFUIN.js?v=74cf3d26:773
startApp @ renderer.ts:33
await in startApp
(anonymous) @ renderer.ts:87
chunk-NHEPLXU6.js?v=74cf3d26:9453 timestamp=2025-05-23T20:23:58.732Z level=INFO fiber=#217 message="Continuing with invoice checks despite error"
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031841157}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031841434}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031846437}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031846700}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031851702}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031851978}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031856980}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031857256}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031862258}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748031862537}
