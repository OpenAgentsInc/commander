OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748108127451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748108127493}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748108127493}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748108127494}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748108127499}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748108127554}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748108127554}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748108127555}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748108127556}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748108127556}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748108127558}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748108127559}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748108127559}
VM568 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
Policy set or a policy with "unsafe-eval" enabled. This exposes users of
this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM568 renderer_init:2
logSecurityWarnings @ VM568 renderer_init:2
(anonymous) @ VM568 renderer_init:2
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748108128771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748108128773}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748108128775}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108128775}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108129279}
Kind5050DVMServiceImpl.ts:1577
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start*listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748108130032}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748108130033}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108130036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108130036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748108130037}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748108130039}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748108130039}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748108130039}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748108130045}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748108130046}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748108130046}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 30', timestamp: 1748108130373}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748108130861}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748108130862}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108131038}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108131039}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108132040}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108132041}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108133042}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108133042}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108134043}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108134044}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108134280}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108134615}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108135045}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108135046}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108135362}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748108135363}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748108135364}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108135699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108136047}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108136048}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108137049}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108137050}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748108137396}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748108137396}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 30', timestamp: 1748108137734}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108138050}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108138051}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108138812}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748108138813}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108139052}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108139052}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108139139}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108140053}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108140054}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108141055}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108141056}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108142057}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108142058}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108143059}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108143060}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108144061}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108144062}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108144141}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108144485}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108145063}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108145064}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108146065}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108146066}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108147067}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108147068}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108148070}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108148070}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108149072}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108149072}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108149488}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108149970}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108150074}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108150074}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108151076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108151076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108152078}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108152078}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108153079}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108153079}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108154080}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108154081}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108154972}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748108155082}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748108155083}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108155313}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Kind: 5050', timestamp: 1748108155816}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Kind: 5050', timestamp: 1748108155817}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', value: '3', timestamp: 1748108155828}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', value: '3', timestamp: 1748108155829}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 2926c22322fda4733c2f227991e63ab93d88625e60459…om pubkey: 9d93f44dd7... status: payment-required', timestamp: 1748108155829}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","2926c22322fda4733c2f227991e63ab93d88625e604…unt","3000","lnbc3n1mock_invoice_1748108155829"]]', timestamp: 1748108155829}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'd70537cded971f5a32dab9f8f5e0b7a607b04fbd546223fdb9a7c48f5fdd29fa', timestamp: 1748108155832}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event d70537cded971…07b04fbd546223fdb9a7c48f5fdd29fa to all 3 relays.', timestamp: 1748108156020}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '3 sats', timestamp: 1748108156021}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '{"priceSats":3,"estimatedTokens":49,"encrypted":true}', timestamp: 1748108156021}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108156085}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb, Attempt: 1', value: 'Invoice: lnbc3n1mock_invoice*...', timestamp: 1748108156085}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_start', label: 'lnbc3n1mock_invoice*', timestamp: 1748108156088}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_success', label: 'Status: pending', value: undefined, timestamp: 1748108156088}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Attempt: 1', timestamp: 1748108156089}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108157091}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108158093}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108159095}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108160097}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108160316}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108160725}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108161099}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108162101}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108163102}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108164104}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb, Attempt: 2', value: 'Invoice: lnbc3n1mock_invoice*...', timestamp: 1748108164105}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_start', label: 'lnbc3n1mock_invoice*', timestamp: 1748108164105}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_success', label: 'Status: pending', value: undefined, timestamp: 1748108164106}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'After 2 attempts - FAST MODE', timestamp: 1748108164106}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '3 sats (FAST MODE)', timestamp: 1748108164107}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 2926c22322fda4733c2f227991e63ab93d88625e60459…50) from pubkey: 9d93f44dd7... status: processing', timestamp: 1748108164108}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","2926c22322fda4733c2f227991e63ab93d88625e604…atus","processing","Processing your request..."]]', timestamp: 1748108164108}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '03297734eb8b55345cd26da8315ef2273508e2a29c5a59db0e162df421f39dc5', timestamp: 1748108164113}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 03297734eb8b5…3508e2a29c5a59db0e162df421f39dc5 to all 3 relays.', timestamp: 1748108164291}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'ai_model_selected', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Using model: devstral (requested: devstral, default: gemma2:latest)', timestamp: 1748108164302}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_provider', action: 'generate_text_model_resolved', label: 'OllamaAgentLanguageModelLive', value: 'Using: devstral (requested: devstral, default: gemma3:1b)', timestamp: 1748108164303}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'devstral', timestamp: 1748108164304}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108165727}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108166036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'devstral', timestamp: 1748108168024}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '986cdd27ba12eaa3b9d0fe873b7844bd7bfc0ab64db19adfa096e91bf582ae14', timestamp: 1748108168029}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 986cdd27ba12e…7bfc0ab64db19adfa096e91bf582ae14 to all 3 relays.', timestamp: 1748108168220}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', timestamp: 1748108168220}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '986cdd27ba12eaa3b9d0fe873b7844bd7bfc0ab64db19adfa096e91bf582ae14', timestamp: 1748108168221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108169222}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108170224}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108171038}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108171226}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108171375}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108172227}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108173229}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108174230}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108175232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108176234}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb, Attempt: 3', value: 'Invoice: lnbc3n1mock_invoice*...', timestamp: 1748108176234}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_start', label: 'lnbc3n1mock_invoice*', timestamp: 1748108176235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_success', label: 'Status: pending', value: undefined, timestamp: 1748108176235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Attempt: 3', timestamp: 1748108176235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108176378}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108176712}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108177237}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108178238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108179240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108180242}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108181245}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108181714}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108182036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108182247}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108183248}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108184250}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108185253}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108186254}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108187039}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108187255}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108187394}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108188257}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108189258}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108190260}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108191262}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108192263}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108192396}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108192776}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108193266}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb, Attempt: 4', value: 'Invoice: lnbc3n1mock_invoice*...', timestamp: 1748108193266}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_start', label: 'lnbc3n1mock_invoice*', timestamp: 1748108193267}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:invoice', action: 'check*status_success', label: 'Status: pending', value: undefined, timestamp: 1748108193267}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Attempt: 4', timestamp: 1748108193268}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108194270}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108195271}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108196273}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108197275}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108197778}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108198204}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108198277}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108199279}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108200281}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108201283}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108202285}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108203207}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108203287}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108203631}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108204288}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108205289}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108206291}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108207293}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108208295}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108208634}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108208962}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108209297}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108210298}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108211299}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108212301}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108213303}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108213965}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108214302}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108214320}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108215321}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108216322}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108217324}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108218325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108219304}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108219327}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb, Attempt: 5', value: 'Invoice: lnbc3n1mock_invoice*...', timestamp: 1748108219327}
[Telemetry] {category: 'spark:invoice', action: 'check*status_start', label: 'lnbc3n1mock_invoice*', timestamp: 1748108219327}
[Telemetry] {category: 'spark:invoice', action: 'check_status_success', label: 'Status: pending', value: undefined, timestamp: 1748108219328}
[Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Attempt: 5', timestamp: 1748108219328}
[Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 30 sats', value: 'Token count: 0', timestamp: 1748108219663}
[Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748108220329}
