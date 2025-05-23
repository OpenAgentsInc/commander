# NIP90 Kind 5050 Event Listening Fix - Log

## Started: Reading telemetry and handshake problem logs

### Initial Analysis from logs/20250523/0017-modelswitch-log.md and 0045-handshake-problem.md

**Key Issue Identified**: Consumer is successfully creating kind 5050 events and publishing them, but **only subscribing to event kinds 6000+** instead of listening for 5050 responses.

From the telemetry in 0045-handshake-problem.md:
- Line 373: `nip90_job_request_published` - Job request published with Kind: 5050
- Line 375: `nostr_sub_created` - Subscription created with filters: `[{"kinds":[6000,6001,6002,6003,6004,600...]}`

**Problem**: We're publishing 5050 requests but only listening for 6000+ responses. Missing subscription to kind 5050 responses from DVMs.
