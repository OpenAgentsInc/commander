OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748024976646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748024976706}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748024976707}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748024976708}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748024976713}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024976769}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024976769}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024976770}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748024976771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748024976771}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024976774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024976774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024976774}
VM1026 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1026 renderer_init:2
logSecurityWarnings @ VM1026 renderer_init:2
(anonymous) @ VM1026 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748024977334}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748024977337}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748024977341}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024977342}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748024977796}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748024977798}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024977815}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748024978078}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1430
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748024980478}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748024980479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1748024980482}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs', timestamp: 1748024980483}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748024980484}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748024980486}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748024980486}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748024980491}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '192d0214b10354306dadf91d496c867b686ed33b07376d6f27cd0d4b66ade7ef', value: 'Kind: 5050', timestamp: 1748024980780}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '192d0214b10354306dadf91d496c867b686ed33b07376d6f27cd0d4b66ade7ef', value: 'Kind: 5050', timestamp: 1748024980781}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 192d0214 | Kind: 5050 | Tokens: ~40 | Encrypted"}', timestamp: 1748024980787}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748024981240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748024981240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024982817}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024983093}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rp05kpp547...', value: 'afa7ffeb19c6083d5c02affab81ce641fb3a4f64167c6ddfbb6776e746ad58f6', timestamp: 1748024983259}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 192d0214b10354306dadf91d496c867b686ed33b07376…om pubkey: 89bc98da7c... status: payment-required', timestamp: 1748024983260}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","192d0214b10354306dadf91d496c867b686ed33b073…9vz6h5fz789wv4rmgy9wnnhlkn6d8ec6mugk3vgpvxxq8f"]]', timestamp: 1748024983260}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'c390d54672bdcfeadeed2c57f3a98e318ecc2f87798b788fc502f2cddd1206a2', timestamp: 1748024983269}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event c390d54672bdc…8ecc2f87798b788fc502f2cddd1206a2 to all 3 relays.', timestamp: 1748024983452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '192d0214b10354306dadf91d496c867b686ed33b07376d6f27cd0d4b66ade7ef', value: '3 sats', timestamp: 1748024983452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '192d0214b10354306dadf91d496c867b686ed33b07376d6f27cd0d4b66ade7ef', value: '{"priceSats":3,"estimatedTokens":40,"encrypted":true}', timestamp: 1748024983453}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024988095}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024988365}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '6f9d4729a1f8e137a8560bded96a96fb7b2e4bff67221a6f1f78eff41683ba8e', value: 'Kind: 5050', timestamp: 1748024990608}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '6f9d4729a1f8e137a8560bded96a96fb7b2e4bff67221a6f1f78eff41683ba8e', value: 'Kind: 5050', timestamp: 1748024990609}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 6f9d4729 | Kind: 5050 | Tokens: ~44 | Encrypted"}', timestamp: 1748024990614}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rp05lpp5u3...', value: 'e4493ae382d9391ee831dd645cf9419d26cf4431972eea1d67454c98c5a8ca8d', timestamp: 1748024991836}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 6f9d4729a1f8e137a8560bded96a96fb7b2e4bff67221…om pubkey: 8cbdc9d2cc... status: payment-required', timestamp: 1748024991837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","6f9d4729a1f8e137a8560bded96a96fb7b2e4bff672…7q53as3f3mlla7l77d7k6nddchdu3pmrpjaacdcqlfdhjq"]]', timestamp: 1748024991837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'e9ca518ab33952543172001d007824cfac095290df39a6e459b87496d99a3d69', timestamp: 1748024991844}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event e9ca518ab3395…ac095290df39a6e459b87496d99a3d69 to all 3 relays.', timestamp: 1748024992033}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '6f9d4729a1f8e137a8560bded96a96fb7b2e4bff67221a6f1f78eff41683ba8e', value: '3 sats', timestamp: 1748024992033}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '6f9d4729a1f8e137a8560bded96a96fb7b2e4bff67221a6f1f78eff41683ba8e', value: '{"priceSats":3,"estimatedTokens":44,"encrypted":true}', timestamp: 1748024992034}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024993367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024993636}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748024998639}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748024999274}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748025004277}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748025004635}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748025009637}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748025009913}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748025014915}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1748025015201}
