OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748024145317}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748024145359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748024145359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748024145360}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748024145365}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024145418}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024145419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024145419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748024145420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748024145421}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024145423}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024145423}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024145423}
VM1024 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1024 renderer_init:2
logSecurityWarnings @ VM1024 renderer_init:2
(anonymous) @ VM1024 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748024145989}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748024145990}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748024145992}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024145993}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024146436}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024146438}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024146486}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024146708}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1338
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748024148502}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748024148503}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748024148506}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs', timestamp: 1748024148506}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748024148507}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748024148508}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748024148509}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748024148514}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748024149354}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748024149355}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024151489}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024151777}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '7538d08c02023ec15011e0d10472c0fe261bb963c567ee8d3acda9c2daecc9ef', value: 'Kind: 5050', timestamp: 1748024152881}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '7538d08c02023ec15011e0d10472c0fe261bb963c567ee8d3acda9c2daecc9ef', value: 'Kind: 5050', timestamp: 1748024152882}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 7538d08c | Kind: 5050 | Tokens: ~41 | Encrypted"}', timestamp: 1748024152890}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rpw66pp5ca...', value: 'c745f9b66a8351c74381df85256bb5106882b2fc75718ea625e0af25a50ed77a', timestamp: 1748024155561}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'a44db33af46a61213345ebc0e6b81af57fad258b4d0af6aca8de03a31781e242', timestamp: 1748024155571}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event a44db33af46a6…7fad258b4d0af6aca8de03a31781e242 to all 3 relays.', timestamp: 1748024155763}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '7538d08c02023ec15011e0d10472c0fe261bb963c567ee8d3acda9c2daecc9ef', value: '3 sats', timestamp: 1748024155763}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '7538d08c02023ec15011e0d10472c0fe261bb963c567ee8d3acda9c2daecc9ef', value: '{"priceSats":3,"estimatedTokens":41,"encrypted":true}', timestamp: 1748024155764}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024156779}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024157041}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024162044}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024162312}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024167314}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024167589}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024172591}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024172861}
