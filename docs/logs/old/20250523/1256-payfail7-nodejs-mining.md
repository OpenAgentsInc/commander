# Payment Failure 7: Move PoW Mining to Node.js Main Process

## Brilliant Insight

Why are we mining PoW in the browser when we have Node.js? This is an Electron app!

## Performance Comparison

### Browser (Renderer Process)
- JavaScript V8 with browser restrictions
- Single-threaded, blocks UI
- ~10-50k iterations/second
- 28-bit PoW: 90-450 minutes

### Node.js (Main Process)
- Full V8 without browser overhead
- Can use Worker Threads
- Native crypto modules
- ~100-500k iterations/second
- 28-bit PoW: 9-45 minutes
- Can use native addons for 10-100x speedup

## Implementation Strategy

### Option 1: IPC Mining Service (Quick Fix)

**1. Create Main Process Mining Service**

`src/main-mining.ts`:
```typescript
import { ipcMain } from 'electron';
import { createHash } from 'crypto';
import { Worker } from 'worker_threads';

ipcMain.handle('mine-pow', async (event, { eventData, targetDifficulty }) => {
  // Use Node.js crypto for faster hashing
  const mineWithNodeCrypto = async () => {
    let nonce = 0;
    const startTime = Date.now();
    
    while (nonce < 10_000_000) {
      const eventWithNonce = {
        ...eventData,
        tags: [...eventData.tags, ["nonce", nonce.toString(), targetDifficulty.toString()]]
      };
      
      // Use Node's crypto for faster SHA256
      const serialized = serializeEvent(eventWithNonce);
      const hash = createHash('sha256').update(serialized).digest('hex');
      
      const difficulty = countLeadingZeroBits(hash);
      if (difficulty >= targetDifficulty) {
        return {
          success: true,
          event: { ...eventWithNonce, id: hash },
          nonce,
          iterations: nonce,
          timeMs: Date.now() - startTime
        };
      }
      
      nonce++;
      
      // Progress update every 100k
      if (nonce % 100000 === 0) {
        event.sender.send('mine-pow-progress', { iterations: nonce, bestDifficulty: difficulty });
      }
    }
    
    return { success: false, iterations: nonce };
  };
  
  return await mineWithNodeCrypto();
});
```

**2. Update NIP13ServiceImpl to use IPC**

`src/services/nip13/NIP13ServiceImpl.ts`:
```typescript
import { ipcRenderer } from 'electron';

// In browser/renderer process
mineEvent: (event: NostrEvent, options: MiningOptions): Effect.Effect<MinedEvent, NIP13Error> => {
  // Detect if we're in renderer process
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Use IPC to mine in main process
    return Effect.tryPromise({
      try: async () => {
        const result = await window.electronAPI.minePow({
          eventData: event,
          targetDifficulty: options.targetDifficulty
        });
        
        if (!result.success) {
          throw new Error(`Mining failed after ${result.iterations} iterations`);
        }
        
        return {
          ...result.event,
          miningMetadata: {
            difficulty: options.targetDifficulty,
            iterations: result.iterations,
            timeMs: result.timeMs
          }
        };
      },
      catch: (error) => new NIP13Error(String(error))
    });
  }
  
  // Fallback to browser mining (existing code)
  // ...
};
```

### Option 2: Worker Threads (Better Performance)

**1. Create Worker Thread Mining Script**

`src/main-mining-worker.ts`:
```typescript
import { parentPort, workerData } from 'worker_threads';
import { createHash } from 'crypto';

const { eventData, targetDifficulty, startNonce, endNonce } = workerData;

let nonce = startNonce;
while (nonce < endNonce) {
  const eventWithNonce = {
    ...eventData,
    tags: [...eventData.tags, ["nonce", nonce.toString(), targetDifficulty.toString()]]
  };
  
  const serialized = serializeEvent(eventWithNonce);
  const hash = createHash('sha256').update(serialized).digest('hex');
  
  const difficulty = countLeadingZeroBits(hash);
  if (difficulty >= targetDifficulty) {
    parentPort?.postMessage({
      success: true,
      event: { ...eventWithNonce, id: hash },
      nonce,
      iterations: nonce - startNonce
    });
    return;
  }
  
  if (nonce % 100000 === 0) {
    parentPort?.postMessage({
      progress: true,
      iterations: nonce - startNonce,
      bestDifficulty: difficulty
    });
  }
  
  nonce++;
}

parentPort?.postMessage({ success: false });
```

**2. Main Process Coordinator**

```typescript
import { Worker } from 'worker_threads';
import os from 'os';

ipcMain.handle('mine-pow', async (event, { eventData, targetDifficulty }) => {
  const numCPUs = os.cpus().length;
  const workers: Worker[] = [];
  const TOTAL_ITERATIONS = 10_000_000;
  const iterationsPerWorker = Math.ceil(TOTAL_ITERATIONS / numCPUs);
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    for (let i = 0; i < numCPUs; i++) {
      const startNonce = i * iterationsPerWorker;
      const endNonce = Math.min(startNonce + iterationsPerWorker, TOTAL_ITERATIONS);
      
      const worker = new Worker('./main-mining-worker.js', {
        workerData: { eventData, targetDifficulty, startNonce, endNonce }
      });
      
      worker.on('message', (msg) => {
        if (msg.success && !resolved) {
          resolved = true;
          // Terminate all workers
          workers.forEach(w => w.terminate());
          resolve(msg);
        } else if (msg.progress) {
          event.sender.send('mine-pow-progress', msg);
        }
      });
      
      worker.on('error', reject);
      workers.push(worker);
    }
  });
});
```

### Option 3: Native Addon (Ultimate Performance)

For production, consider a native C++ addon:

```cpp
// binding.cc
#include <node.h>
#include <openssl/sha.h>

// Native mining implementation
// 10-100x faster than JavaScript
```

## Expected Performance Gains

### Single-threaded Node.js
- 2-10x faster than browser
- 28-bit PoW: 45-90 minutes → 9-45 minutes

### Multi-threaded (8 cores)
- 16-80x faster than browser
- 28-bit PoW: 45-90 minutes → 3-6 minutes

### Native Addon
- 100-1000x faster than browser
- 28-bit PoW: 45-90 minutes → 30 seconds - 3 minutes

## Quick Implementation Path

1. **Immediate**: Move mining to main process with IPC (Option 1)
2. **Next Sprint**: Implement worker threads (Option 2)
3. **Production**: Consider native addon for heavy PoW requirements

## Preload Script Updates

`src/preload.ts`:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // Existing APIs...
  
  // Add PoW mining
  minePow: (params: MiningParams) => ipcRenderer.invoke('mine-pow', params),
  onMiningProgress: (callback: (progress: MiningProgress) => void) => {
    ipcRenderer.on('mine-pow-progress', (_, progress) => callback(progress));
  }
});
```

## Why This Wasn't Done Initially

Likely the NIP13Service was designed to be "pure Effect" and work in any environment. But for Electron apps, leveraging the main process for compute-intensive tasks is the right architecture.

## Conclusion

Moving PoW mining to Node.js main process is the correct solution for an Electron app. It provides:
- Better performance (2-100x faster)
- Non-blocking UI
- Access to native modules
- Multi-threading capabilities
- Path to native addon optimization

This is a much better approach than trying to optimize browser-based mining!