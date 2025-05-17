
# **Integrating @scure/bip39 and @scure/bip32 as Effect Services**


To build cryptographic features (mnemonic and HD key derivation) in an EffectTS v3 (Effect‐TS) app, we define them as _services_ (with tags) or _layers_. This lets us compose and inject the BIP39/BIP32 logic in a type-safe, decoupled way. In practice, we create two services: **BIP39Service** for mnemonic operations and **BIP32Service** for HD key derivation. Each service is exposed via a unique tag in the Effect context. We then implement the service operations using the @scure/bip39 and @scure/bip32 libraries inside Effect.sync or Effect.tryPromise calls. For example, bip39.generateMnemonic(wordlist) produces a new seed phrase , while HDKey.fromMasterSeed(seed) creates a master HD key .



## **Structuring with Effect’s Services and Layers**



EffectTS uses a _Context_ of services identified by **Tags**. We declare a tag for each service interface, e.g.:

```
import { Context } from "effect"
interface BIP39Service {
  generateMnemonic: (wordlist?: string[]) => string
  validateMnemonic: (mnemonic: string, wordlist?: string[]) => boolean
  mnemonicToSeed: (mnemonic: string, password?: string) => Promise<Uint8Array>
}
const BIP39 = Context.GenericTag<BIP39Service>("BIP39")
```

A similar BIP32 tag is defined for the HD key service. Using Context.GenericTag<T>(id) creates a unique tag holding a value of type T. The service implementation is then provided via either a **Layer** or Effect.provideService. For instance, one can do:

```
const BIP39Live: BIP39Service = {
  generateMnemonic: (wordlist) => bip39.generateMnemonic(wordlist),
  validateMnemonic: (mnemonic, wordlist) => bip39.validateMnemonic(mnemonic, wordlist),
  mnemonicToSeed: (mnemonic, password) => bip39.mnemonicToSeed(mnemonic, password)
}
const BIP39Layer = Layer.succeed(BIP39, BIP39Live)
```

This wraps the raw calls in a live layer. By using layers or provideService, Effect ensures any effect depending on BIP39 will receive this implementation. Service tags keep our code modular and testable .



## **BIP39 Service: Mnemonic Generation and Seed Derivation**



The **BIP39Service** provides three core operations:

- **Generate Mnemonic:** Creates a new seed phrase (e.g. 12 words) using bip39.generateMnemonic(wordlist). This returns a string of words . We wrap this in Effect.sync so it returns an Effect<never, string>.

- **Validate Mnemonic:** Checks if a given phrase is valid with bip39.validateMnemonic(mnemonic, wordlist). It returns a boolean (also wrapped in Effect.sync).

- **Mnemonic → Seed:** Converts the mnemonic into a 64-byte seed (Uint8Array) using bip39.mnemonicToSeed(mnemonic, password). This is asynchronous, so we use Effect.tryPromise (or Effect.async) to capture the promise as an effect.




A sample implementation using Effect could be:

```
import * as bip39 from "@scure/bip39"
import { Layer } from "effect"
import { Effect } from "effect"

const BIP39ServiceLive: BIP39Service = {
  generateMnemonic: (wordlist = bip39.wordlists.english) =>
    Effect.sync(() => bip39.generateMnemonic(wordlist)),
  validateMnemonic: (mnemonic, wordlist = bip39.wordlists.english) =>
    Effect.sync(() => bip39.validateMnemonic(mnemonic, wordlist)),
  mnemonicToSeed: (mnemonic, password) =>
    Effect.tryPromise({
      try: () => bip39.mnemonicToSeed(mnemonic, password ?? "")
    })
}

const BIP39Layer = Layer.succeed(BIP39, BIP39ServiceLive)
```

This code makes generateMnemonic and validateMnemonic available as pure effects, and uses Effect.tryPromise to asynchronously derive the seed. According to the @scure/bip39 documentation, generateMnemonic(wordlist) produces a valid seed phrase and mnemonicToSeed(mnemonic, password) derives 64 bytes of entropy .



## **BIP32 Service: Master and Child Key Derivation**



The **BIP32Service** handles hierarchical key derivation. We typically need:

- **Master Key Derivation:** From a seed (Uint8Array), obtain an HD master key. Using HDKey.fromMasterSeed(seed) (defaulting to Bitcoin versions) returns an HDKey instance .

- **Child Key Derivation:** Given an HDKey, derive a child along a path string (e.g. "m/44'/0'/0'/0/0"). We call hdkey.derive(path), which returns a new HDKey for that path .

- (Optional) Exporting keys or signatures. The HDKey also exposes properties like .publicKey and .privateKey, and methods .sign() and .verify() if needed for Bitcoin-specific signing .




An Effect-style implementation might be:

```
import { HDKey } from "@scure/bip32"
import { Layer } from "effect"
import { Effect } from "effect"

interface BIP32Service {
  fromSeed: (seed: Uint8Array) => HDKey
  derivePath: (hdkey: HDKey, path: string) => HDKey
}

const BIP32ServiceLive: BIP32Service = {
  fromSeed: (seed) =>
    Effect.sync(() => HDKey.fromMasterSeed(seed)),
  derivePath: (hdkey, path) =>
    Effect.sync(() => hdkey.derive(path))
}

const BIP32Layer = Layer.succeed(BIP32, BIP32ServiceLive)
```

Here, both methods are synchronous, so we use Effect.sync. This matches the @scure/bip32 API: HDKey.fromMasterSeed(seed) constructs the root key, and .derive(path) computes a child key . (In an application, you might also wrap these in effects if you want to catch errors, but by default they throw on invalid inputs.)



## **Combining Services with Layers**



We can **compose** these service layers into a single environment. For example:

```
const cryptoEnv = Layer.merge(BIP39Layer, BIP32Layer)
```

This cryptoEnv layer provides both BIP39 and BIP32 services. An effect that requires both can be given cryptoEnv via Effect.provideLayer. For instance:

```
const program = Effect.gen(function*($) {
  const { generateMnemonic, mnemonicToSeed } = yield* $(Effect.service(BIP39))
  const { fromSeed, derivePath } = yield* $(Effect.service(BIP32))
  const words = yield* $(generateMnemonic())
  const seed = yield* $(mnemonicToSeed(words))
  const master = yield* $(fromSeed(seed))
  const child = yield* $(derivePath(master, "m/44'/0'/0'/0/0"))
  // Use child.publicKey, child.privateKey, etc.
  return child
})

Effect.runPromise(Effect.provideLayer(program, cryptoEnv))
```

In this example, Effect.service(BIP39) and Effect.service(BIP32) fetch the implementations from context, then we sequentially generate a mnemonic, derive its seed, get the master key, and derive a child key. By providing cryptoEnv (which merges both layers) we satisfy all requirements. Using layers like this separates _construction_ of services from _consumption_.



## **provideService**

##  **vs. Layers**



EffectTS supports both **Effect.provideService** and **layers** for injecting services:

- **provideService / provide:** Use Effect.provideService(effect, Tag, implementation) to attach a single service implementation. This is straightforward for one-off cases. E.g. Effect.provideService(program, BIP39, BIP39ServiceLive) would make the BIP39 service available to program . For multiple services, you can chain or use Effect.provide with a combined context.

- **Layers (Layer.succeed etc.):** Layers act as _constructors_ for services. They are reusable and composable. A layer can depend on other services and combine many providers. For our cryptography example, layers are recommended because BIP39 and BIP32 may both be needed together and might have their own sub-dependencies. Layers also align with modern EffectTS best practices for testability and clarity .




In summary, **use layers** when you have multiple services or when a service has its own dependencies. Layers make it easy to build a testable graph of dependencies. Effect.provideService is fine for simple cases or quick examples, but layers scale better in real applications.



## **TypeScript Code Snippets**



Below is a sketch of fully-typed Effect-v3 code for these services. **(Ensure your project uses ESM modules and has @effect packages installed.)**

```
// cryptoService.ts
import { Context, Layer, Effect } from "effect"
import * as bip39 from "@scure/bip39"
import { HDKey } from "@scure/bip32"

// 1. Define service interfaces
export interface BIP39Service {
  generateMnemonic: (wordlist?: string[]) => Effect.Effect<never, string>
  validateMnemonic: (mnemonic: string, wordlist?: string[]) => Effect.Effect<never, boolean>
  mnemonicToSeed: (mnemonic: string, password?: string) => Effect.Effect<unknown, Uint8Array>
}
export interface BIP32Service {
  fromSeed: (seed: Uint8Array) => Effect.Effect<never, HDKey>
  derivePath: (hdkey: HDKey, path: string) => Effect.Effect<never, HDKey>
}

// 2. Create tags
export const BIP39 = Context.GenericTag<BIP39Service>("BIP39Service")
export const BIP32 = Context.GenericTag<BIP32Service>("BIP32Service")

// 3. Live implementations
const BIP39ServiceLive: BIP39Service = {
  generateMnemonic: (wordlist = bip39.wordlists.english) =>
    Effect.sync(() => bip39.generateMnemonic(wordlist)),
  validateMnemonic: (mnemonic, wordlist = bip39.wordlists.english) =>
    Effect.sync(() => bip39.validateMnemonic(mnemonic, wordlist)),
  mnemonicToSeed: (mnemonic, password) =>
    Effect.tryPromise({
      try: () => bip39.mnemonicToSeed(mnemonic, password ?? "")
    })
}
const BIP32ServiceLive: BIP32Service = {
  fromSeed: (seed) =>
    Effect.sync(() => HDKey.fromMasterSeed(seed)),  // defaults to Bitcoin versions
  derivePath: (hdkey, path) =>
    Effect.sync(() => hdkey.derive(path))
}

// 4. Layers providing the services
export const BIP39LiveLayer = Layer.succeed(BIP39, BIP39ServiceLive)
export const BIP32LiveLayer = Layer.succeed(BIP32, BIP32ServiceLive)

// 5. Combined crypto layer
export const CryptoLayer = Layer.merge(BIP39LiveLayer, BIP32LiveLayer)
```

This module exports CryptoLayer which can be provided to any effect needing BIP39 or BIP32. It’s fully typed and compatible with ESM (import syntax) and works in Electron (which supports Node’s crypto for random generation).



## **Testing and Mocking Services**



Effect’s design makes it easy to **mock** these services for testing. You simply provide a fake implementation via the same tags. For example:

```
import { Effect } from "effect"
import { BIP39, BIP32 } from "./cryptoService"

// A mock BIP39 service for tests
const MockBIP39: BIP39Service = {
  generateMnemonic: () => Effect.succeed("abandon abandon ... about"),
  validateMnemonic: () => Effect.succeed(true),
  mnemonicToSeed: () => Effect.succeed(new Uint8Array([0xca, 0xfe]))
}
// A mock BIP32 service for tests
const MockBIP32: BIP32Service = {
  fromSeed: () => Effect.succeed({ derive: () => ({}) } as unknown as HDKey),
  derivePath: () => Effect.succeed({} as HDKey)
}

// Example test effect that uses the services
const testEffect = Effect.gen(function*($) {
  const { generateMnemonic } = yield* $(Effect.service(BIP39))
  const words = yield* $(generateMnemonic())
  // ... assert on words or trigger error
})

// Provide mocks and run
Effect.runPromise(
  Effect.provideService(
    Effect.provideService(testEffect, BIP39, MockBIP39),
    BIP32, MockBIP32
  )
)
```

Alternatively, use layers for tests:

```
const MockBIP39Layer = Layer.succeed(BIP39, MockBIP39)
const MockBIP32Layer = Layer.succeed(BIP32, MockBIP32)
Effect.runPromise(Effect.provideLayer(testEffect, Layer.merge(MockBIP39Layer, MockBIP32Layer)))
```

This way, you can assert that your code calls the cryptography APIs as expected without invoking real randomness or key derivation. The effect type system ensures you can only run the effect when the required services are provided, enhancing test safety.



## **Summary**



By wrapping @scure/bip39 and @scure/bip32 in Effect-style services, we achieve a **fully idiomatic, composable architecture**. Each operation (mnemonic gen/validation, seed derivation, master/child key derivation) becomes a method on a service interface. We use Effect’s Context/Tag to define dependencies, and either Effect.provideService or (preferably) Layer.succeed to supply implementations . This ensures clean separation between pure business logic and the low-level crypto library, allows easy mocking in tests, and integrates smoothly with Electron’s ESM environment. The @scure/bip39 and @scure/bip32 packages themselves are designed for ESM and minimal bundling , so importing them in TypeScript (with import) works out-of-the-box in an Electron app.



**Sources:** Official usage of @scure/bip39 and @scure/bip32 ; EffectTS documentation on services and layers .
