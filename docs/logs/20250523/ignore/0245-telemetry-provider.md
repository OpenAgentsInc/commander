Kind5050DVMServiceImpl.ts:887
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1747986151975}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1747986151975}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1747986151978}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1747986151980}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f65372d123378827"],"#s":["success"],"limit":500}]', timestamp: 1747986151981}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nos.lol/","wss://relay.damus.io/","wss://relay.snort.social/"]', timestamp: 1747986151982}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…us.io","wss://relay.nostr.band","wss://nos.lol"]}', timestamp: 1747986151988}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1747986151989}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1747986152001}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1747986152755}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '0 entries fetched', timestamp: 1747986152756}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1747986152757}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1747986153140}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1747986153140}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '37aef2e420f8a323bab21602e4aedf1171ca0bf763c50dfab06b10f1aabb649b', value: 'Kind: 5050', timestamp: 1747986159497}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '37aef2e420f8a323bab21602e4aedf1171ca0bf763c50dfab06b10f1aabb649b', value: 'Kind: 5050', timestamp: 1747986159498}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'f6ec71f7bc375aff2b638eeb6ef2074c0fbc44e1dd47e103733364cc70253394', timestamp: 1747986159505}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event f6ec71f7bc375aff…1dd47e103733364cc70253394: 1 succeeded, 2 failed.', value: 'Failures: Error: pow: 28 bits needed. (2), Error: no active subscription', timestamp: 1747986159672}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'ai_params_intended', label: 'Job ID: 37aef2e420f8a323bab21602e4aedf1171ca0bf763c50dfab06b10f1aabb649b', value: '{"requestParams":{"model":"devstral","temperature"…,"top_k":40,"top_p":0.9,"frequency_penalty":0.5}}', timestamp: 1747986159673}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747986159675}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1747986160816}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 10 sats', value: '{"amountSats":10,"memo":"NIP-90 Job: 37aef2e4"}', timestamp: 1747986160817}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbcrt100n1p5rqfhnpp...', value: 'e8bb03a7c468c4e24341da8ff2d236dc38bd71eb12a01f3a0631fa78d99af71b', timestamp: 1747986163954}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_result_ready', label: 'Job ID: 37aef2e420f8a323bab21602e4aedf1171ca0bf763c50dfab06b10f1aabb649b', value: '{"totalTokens":63,"priceSats":10,"outputLength":155,"encrypted":true}', timestamp: 1747986163972}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'fe909867bbb46c12c252f295d78ff3c377daa259001a78b9f5e20d3ecf919e40', timestamp: 1747986163973}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event fe909867bbb46c12…9001a78b9f5e20d3ecf919e40: 1 succeeded, 2 failed.', value: 'Failures: Error: pow: 28 bits needed. (2), Error: no active subscription', timestamp: 1747986164149}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'ee40a90c0213eb450345a879fc10d1a087b38ba21e9803c201e940bfd0ddc674', timestamp: 1747986164156}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event ee40a90c0213eb45…21e9803c201e940bfd0ddc674: 1 succeeded, 2 failed.', value: 'Failures: Error: pow: 28 bits needed. (2), Error: no active subscription', timestamp: 1747986164320}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_result_published', label: 'Job ID: 37aef2e420f8a323bab21602e4aedf1171ca0bf763c50dfab06b10f1aabb649b', value: 'fe909867bbb46c12c252f295d78ff3c377daa259001a78b9f5e20d3ecf919e40', timestamp: 1747986164321}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747986180111}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747986180387}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747986210390}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747986210672}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1747986212759}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1747986212760}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f65372d123378827"],"#s":["success"],"limit":500}]', timestamp: 1747986212761}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 1 events', timestamp: 1747986212951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '1 entries fetched', timestamp: 1747986212952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1747986212952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747986240674}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747986240942}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747986270944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747986271205}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1747986272953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1747986272954}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f65372d123378827"],"#s":["success"],"limit":500}]', timestamp: 1747986272955}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 1 events', timestamp: 1747986273140}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '1 entries fetched', timestamp: 1747986273140}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1747986273141}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747986301206}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747986301477}
