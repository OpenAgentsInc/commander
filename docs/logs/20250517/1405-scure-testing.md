
### **How to test your Effect‑based BIP‑39 / BIP‑32 services with Vitest**



Below is a **complete** Vitest test‑suite that exercises every operation exposed by the BIP39Service and BIP32Service we created earlier.

1. **Happy‑path round‑trip** – generate a mnemonic, validate it, turn it into a seed, build a master key and derive a child key.

2. **Deterministic vector checks** – verify that the implementation reproduces the official BIP‑39 and BIP‑32 reference vectors (so you know the math is right).

3. **Dependency‑injection demo** – show that the services can be mocked and hot‑swapped through Effect.provideService, proving they are unit‑testable.




> **Folder layout**

```
src/
├── cryptoService.ts      # the code from the previous reply
tests/
└── cryptoService.test.ts # the file below
vitest.config.ts          # normal ESM/TS config
```

```
// tests/cryptoService.test.ts
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { CryptoLayer, BIP39, BIP32 } from "../src/cryptoService.js"
import { Uint8Array } from "node:buffer"        // Node ≥17 gives global, import for TS

/**
 * Convenience helpers -------------------------------------------------------
 */
const run = <A>(eff: Effect.Effect<A>) => Effect.runPromise(Effect.provideLayer(eff, CryptoLayer))

/**
 * 1. Round‑trip: generate → validate → seed → master → child
 */
describe("BIP‑39/BIP‑32 round‑trip", () => {
  it("generates a valid 12‑word mnemonic and derives a valid HD child key", async () => {
    const result = await run(
      Effect.gen(function* ($) {
        const bip39 = yield* $(Effect.service(BIP39))
        const bip32 = yield* $(Effect.service(BIP32))

        const mnemonic = yield* $(bip39.generateMnemonic())
        const valid    = yield* $(bip39.validateMnemonic(mnemonic))
        const seed     = yield* $(bip39.mnemonicToSeed(mnemonic))
        const master   = yield* $(bip32.fromSeed(seed))
        const child    = yield* $(bip32.derivePath(master, "m/44'/0'/0'/0/0"))

        return { mnemonic, valid, master, child }
      })
    )

    expect(result.valid).toBe(true)
    // 12 or 24 words are normal; generated defaults to 12
    expect(result.mnemonic.trim().split(/\s+/)).toHaveLength(12)
    // master key must expose extended keys + 33‑byte compressed pubkey
    expect(result.master.privateExtendedKey.startsWith("xprv")).toBe(true)
    expect(result.child.publicKey.length).toBe(33)
  })
})

/**
 * 2. Reference‑vector checks (BIP‑39 test‑vector #1, BIP‑32 test‑vector #1)
 *    Mnemonic: "abandon" x 11 + "about"  (English word‑list)
 *    Passphrase: "TREZOR"
 *    Expected seed (64‑byte) & extended keys taken from the official specs.
 */
describe("Reference vectors", () => {
  // constants from the BIP‑39 / BIP‑32 specs
  const mnemonic =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
  const passphrase = "TREZOR"
  const seedHex =
    "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e5349553" +
    "1f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04"

  // BIP‑32 vector #1 (seed = 0x000102…0f)
  const vector1SeedHex = "000102030405060708090a0b0c0d0e0f"
  const vector1MasterXprv =
    "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkV" +
    "vvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi"   //  [oai_citation:0‡Bitcoin Wiki](https://en.bitcoin.it/wiki/BIP_0032_TestVectors)
  const vector1Child0H_Xpub =
    "xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHh" +
    "wBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw"   //  [oai_citation:1‡Bitcoin Wiki](https://en.bitcoin.it/wiki/BIP_0032_TestVectors)

  it("produces the official BIP‑39 seed", async () => {
    const seed = await run(
      Effect.flatMap(
        Effect.service(BIP39),
        (svc) => svc.mnemonicToSeed(mnemonic, passphrase)
      )
    )
    expect(Buffer.from(seed).toString("hex")).toBe(seedHex)
  })

  it("reproduces the BIP‑32 master xprv and m/0' child xpub", async () => {
    const { master, child0h } = await run(
      Effect.gen(function* ($) {
        const bip32 = yield* $(Effect.service(BIP32))

        const seed   = Uint8Array.from(Buffer.from(vector1SeedHex, "hex"))
        const master = yield* $(bip32.fromSeed(seed))
        const child  = yield* $(bip32.derivePath(master, "m/0'"))
        return { master, child0h: child }
      })
    )

    expect(master.privateExtendedKey).toBe(vector1MasterXprv)
    expect(child0h.publicExtendedKey).toBe(vector1Child0H_Xpub)
  })
})

/**
 * 3. Mocked services demonstrate Effect‑style dependency injection
 */
describe("Mock injection", () => {
  it("substitutes a fake BIP‑39 service", async () => {
    const fakeMnemonic = "foo bar baz"
    const FakeBIP39 = {
      generateMnemonic: () => Effect.succeed(fakeMnemonic),
      validateMnemonic: () => Effect.succeed(true),
      mnemonicToSeed:   () => Effect.succeed(new Uint8Array([13, 37]))
    }
    // provide *only* the BIP‑39 mock, keep real BIP‑32 so child ops still work
    const program = Effect.flatMap(
      Effect.service(BIP39),
      (svc) => svc.generateMnemonic()
    )
    const result = await Effect.runPromise(
      Effect.provideService(program, BIP39, FakeBIP39)
    )
    expect(result).toBe(fakeMnemonic)
  })
})
```

### **How the tests work**

|**Section**|**What it proves**|**Key points**|
|---|---|---|
|**1 Round‑trip**|Your “live” CryptoLayer composes and functions; the flow mnemonic → seed → master → child succeeds in one Effect program.|Uses random generation, then checks invariants (12 words, key sizes).|
|**2 Reference vectors**|@scure/bip39 and @scure/bip32 reproduce the canonical outputs from the BIPs.|We feed in the official mnemonic / seed and assert exact hex & Base58 strings.|
|**3 Mock injection**|You can inject alternative implementations via Effect.provideService, which is vital for deterministic unit tests in larger apps.|The live code is never executed; the mock returns canned values.|

### **Running the suite**

```
pnpm add -D vitest @types/node           # or npm / yarn
pnpm vitest
```

Because everything is pure ESM and uses only @scure/* (which need no Node built‑ins beyond crypto’s RNG that Electron provides), the tests run identically in Node and Electron’s test harness.



**All cryptographic constants** (xprv/xpub) were copied verbatim from the Bitcoin wiki’s BIP‑32 test‑vector #1 page.
