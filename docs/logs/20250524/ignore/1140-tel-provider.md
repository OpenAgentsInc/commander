OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748104745910}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748104745952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748104745952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748104745954}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748104745959}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104746014}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748104746015}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104746015}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748104746017}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748104746017}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104746019}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748104746019}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104746020}
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
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748104746695}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748104746696}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748104746699}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104746700}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104747028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104747029}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104747194}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 6', timestamp: 1748104747332}
Kind5050DVMServiceImpl.ts:1496
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748104747628}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748104747628}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104747631}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104747632}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748104747633}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748104747634}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748104747635}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748104747635}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748104747641}
SellComputePane.tsx:168 DVM Service start command successful.
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748104748519}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748104748520}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104748634}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104748634}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104749636}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104749636}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104750638}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104750638}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104751640}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104751640}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104752197}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104752545}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104752642}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104752642}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104753643}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104753644}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104754645}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104754646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104755647}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104755648}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104756649}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104756650}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104757547}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104757651}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104757652}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104757830}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104758653}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104758654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104759655}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104759656}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104760657}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104760658}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Kind: 5050', timestamp: 1748104761116}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Kind: 5050', timestamp: 1748104761117}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job d09116bc | Kind: 5050 | Tokens: ~44 | Encrypted"}', timestamp: 1748104761120}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104761659}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104761659}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748104762661}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748104762661}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104762832}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104763115}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rra36pp5n2...', value: '9aa1a7b2127f2a5fc4d0c1e5c2c6baa29bdb590f6f1c009c9c657d22bc773859', timestamp: 1748104763605}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc34…om pubkey: b8d4d3333b... status: payment-required', timestamp: 1748104763606}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc…l7srustctnfm6szlrx9zrr2gqrlhp3z3j53tv6qqaav70l"]]', timestamp: 1748104763606}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'fd8c613b3840af82efe0c6a2a8f2fb73169ddc11d821e5221c36ed6583c102c8', timestamp: 1748104763613}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104763662}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6, Attempt: 1', value: 'Invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104763663}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104763665}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rra36pp5n2..."}', timestamp: 1748104763666}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending_after_check', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Attempt: 1', timestamp: 1748104763666}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event fd8c613b3840a…169ddc11d821e5221c36ed6583c102c8 to all 3 relays.', timestamp: 1748104763807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: '3 sats', timestamp: 1748104763807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: '{"priceSats":3,"estimatedTokens":44,"encrypted":true}', timestamp: 1748104763807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104764668}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104765670}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104766671}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104767673}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104768116}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104768425}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104768675}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104769677}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104770678}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104771680}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6, Attempt: 2', value: 'Invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104771681}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104771681}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rra36pp5n2..."}', timestamp: 1748104771681}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending_after_check', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Attempt: 2', timestamp: 1748104771682}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104772683}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104773427}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104773685}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104773705}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104774686}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104775688}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104776690}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104777691}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104778693}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104778706}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104779036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104779694}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104780696}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104781698}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104782699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104783701}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6, Attempt: 3', value: 'Invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104783701}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104783702}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rra36pp5n2..."}', timestamp: 1748104783702}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending_after_check', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Attempt: 3', timestamp: 1748104783703}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104784038}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104784323}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104784704}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104785706}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104786708}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104787710}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104788712}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104789325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104789613}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104789713}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104790715}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104791717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104792719}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104793720}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104794615}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104794722}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104794909}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104795724}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104796726}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104797728}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104798730}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104799732}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104799911}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104800225}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104800734}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6, Attempt: 4', value: 'Invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104800734}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104800735}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rra36pp5n2..."}', timestamp: 1748104800736}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending_after_check', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Attempt: 4', timestamp: 1748104800736}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104801737}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104802739}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104803740}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104804741}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104805227}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104805588}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104805743}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104806744}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104807746}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104808748}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104809749}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104810590}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104810751}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104810883}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104811753}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104812754}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104813756}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104814758}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104815759}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104815885}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104816183}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104816761}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104817763}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104818765}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104819766}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104820768}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104821185}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104821477}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104821770}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104822772}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104823774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104824775}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104825777}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104826479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104826772}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104826778}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6, Attempt: 5', value: 'Invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104826779}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rra36pp5n2...', timestamp: 1748104826779}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rra36pp5n2..."}', timestamp: 1748104826780}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending_after_check', label: 'Job ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Attempt: 5', timestamp: 1748104826780}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104827781}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104828783}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104829784}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104830786}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104831774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104831787}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104832073}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104832788}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104833789}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104834791}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104835792}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104836794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104837075}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 6 sats', value: 'Token count: 0', timestamp: 1748104837365}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104837796}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104838798}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104839799}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748104840801}
