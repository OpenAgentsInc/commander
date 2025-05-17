
# **KeyService Placement and Naming**



Following the pattern of existing services (e.g. src/services/ollama/OllamaService.ts ), the KeyService should live under its own folder. For example:

- **Directory:** src/services/key (all lowercase, matching other service folders)

- **Main file:** KeyService.ts inside that folder (src/services/key/KeyService.ts), exporting the service interface and implementation.




Each service folder in the repo uses a <Name>Service.ts file (e.g. OllamaService.ts ), so “KeyService” follows that convention.



## **Module Structure (Effect v3 idioms)**



Inside KeyService.ts, use Effect v3’s tagged service and layer pattern. For example:

- **Interface:** Define export interface KeyService { … } listing methods:

    - generateMnemonic(): Effect<never, never, string> – returns a random 12-word mnemonic.

    - validateMnemonic(mnemonic: string): boolean – checks if the phrase is valid.

    - deriveSeed(mnemonic: string): Effect<never, never, Uint8Array> – derives a 64-byte seed from mnemonic.

    - deriveKey(seed: Uint8Array, path: string): Effect<never, Error, <KeyType>> – derives a BIP32 key at the given path (you can return a string or object with key info).


- **Tag:** Create a Context tag for injection, e.g.:


```
import { Context, Effect } from "effect"
export const KeyService = Context.Tag<KeyService>()
```

- (Other services use a similar Tag from the effect framework.)

- **Live Layer:** Provide a live implementation using Effect layers. For example:


```
import * as bip39 from "@scure/bip39"
import { fromSeed } from "@scure/bip32"
export const KeyServiceLive = Effect.Layer.succeed(KeyService, {
  generateMnemonic: () => Effect.sync(() => bip39.generateMnemonic()),
  validateMnemonic: (m) => bip39.validateMnemonic(m),
  deriveSeed: (m) => Effect.sync(() => bip39.mnemonicToSeedSync(m)),
  deriveKey: (seed, path) => Effect.sync(() => {
    const node = fromSeed(seed).derive(path)
    return node.toBase58()  // or node.publicKey / node.privateKey
  })
})
```

- This follows the repo’s service style of exporting a tag and a Live layer. (Other services similarly define a tag and a Layer.succeed or equivalent.)

- **Exports:** Export the tag and layer (and the interface) from the module. For example:


```
export type { KeyService }
export { KeyService, KeyServiceLive }
```





## **Test File Location and Structure**



Place tests under a __tests__ subfolder next to the service. For example:

```
src/services/key/__tests__/index.test.ts
```

This mirrors how other services are tested (e.g. tests for socket live under src/services/socket/__tests__ ). Use Vitest as the framework.



In the test file, import the service (using the project’s path aliases, e.g. import { KeyService } from "@/services/key/KeyService" or relative path) and write typical unit tests. Wrap Effect-returns using Effect.runPromise or similar. For example:

```
import { describe, it, expect } from 'vitest'
import * as Effect from 'effect'
import { KeyService } from '@/services/key/KeyService'

describe('KeyService', () => {
  it('generates a 12-word mnemonic', async () => {
    const mnemonic = await Effect.runPromise(KeyService.generateMnemonic())
    expect(mnemonic.split(' ').length).toBe(12)
  })

  it('validates a correct mnemonic', () => {
    const valid = KeyService.validateMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
    expect(valid).toBe(true)
  })

  it('rejects an invalid mnemonic', () => {
    const valid = KeyService.validateMnemonic('foo bar baz')
    expect(valid).toBe(false)
  })

  it('derives a 64-byte seed from mnemonic', async () => {
    const seed = await Effect.runPromise(KeyService.deriveSeed('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'))
    expect(seed).toBeInstanceOf(Uint8Array)
    expect(seed.length).toBe(64)
  })

  it('derives a key from seed and BIP32 path', async () => {
    const seed = await Effect.runPromise(KeyService.deriveSeed('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'))
    const key = await Effect.runPromise(KeyService.deriveKey(seed, "m/44'/0'/0'/0/0"))
    expect(typeof key).toBe('string')
    expect(key).toMatch(/^xprv|xpub/) // example check: BIP32 base58 key format
  })
})
```

These tests show the pattern: use Vitest’s describe/it, call Effect-returning methods with runPromise, and check outputs. Tests reside in the __tests__ folder .



**Compatibility:** Use only ESM imports (import statements) and avoid Node-only APIs so Electron/Vite can bundle. The @scure/bip39 and @scure/bip32 libraries are pure JS (ESM-compatible) and work in Electron.



**Summary:** Create src/services/key/KeyService.ts exporting a KeyService interface, an Effect Context tag, and a live layer implementing mnemonic and key derivation. Put corresponding tests in src/services/key/__tests__/index.test.ts, following the patterns above. This aligns with existing services (e.g. OllamaService.ts in src/services/ollama ) and their test structure .



**Sources:** Existing service organization in the repo and test file placement .
