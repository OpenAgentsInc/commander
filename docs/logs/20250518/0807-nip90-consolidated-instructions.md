Okay, I've reviewed the recent NIP-90 documents and your request for a simpler, consolidated path. We'll focus on implementing the UI for the Commander user to create and publish a NIP-90 job request. This will be done step-by-step, with a test first, then the implementation to make it pass.

Here are the consolidated next instructions for the coding agent:

**Goal:** Allow a user to fill out a form in the Commander UI, create a NIP-90 job request event, and publish it to Nostr relays.

**Overall Plan:**

1.  Create the basic UI form component (`Nip90RequestForm.tsx`).
2.  Implement state management for the form fields.
3.  Create a helper function (`createNip90JobRequest`) to construct the NIP-90 event.
4.  Implement the form submission logic, including ephemeral key generation and calling the `NostrService` to publish.
5.  Add UI feedback for loading, success, and error states.
6.  Integrate the new form into the `HomePage.tsx`.

---

**Step 1: Create the Basic UI Form (`Nip90RequestForm.tsx`)**

- **File to Create:** `src/components/nip90/Nip90RequestForm.tsx`
- **File to Create (Test):** `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`

**1.A: Write the Test for Basic Form Rendering**

- **In `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:**

  ```typescript
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  const queryClient = new QueryClient();

  describe('Nip90RequestForm', () => {
    it('should render the form with initial fields and a submit button', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <Nip90RequestForm />
        </QueryClientProvider>
      );

      // Check for labels or placeholder texts
      expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Input Data/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Output MIME Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bid Amount \(msats\)/i)).toBeInTheDocument();

      // Check for the submit button
      expect(screen.getByRole('button', { name: /Publish Job Request/i })).toBeInTheDocument();
    });
  });
  ```

**1.B: Implement the Basic Form Structure**

- **In `src/components/nip90/Nip90RequestForm.tsx`:**
  Use Shadcn UI components (`Input`, `Textarea`, `Button`, `Label`). For now, "Job Kind" can be a simple `Input type="number"`.

  ```typescript
  import React, { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Textarea } from '@/components/ui/textarea';
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

  export default function Nip90RequestForm() {
    // State will be added in the next step
    const [jobKind, setJobKind] = useState<string>("5100"); // Default to Text Generation
    const [inputData, setInputData] = useState<string>("");
    const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
    const [bidAmount, setBidAmount] = useState<string>("");

    // Submission logic will be added later
    const handlePublishRequest = async () => {
      console.log('Publishing request with:', { jobKind, inputData, outputMimeType, bidAmount });
      // Placeholder for actual publishing logic
    };

    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Create NIP-90 Job Request</CardTitle>
          <CardDescription>Define and publish a new job request to the Nostr network.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jobKind">Job Kind (e.g., 5100 for Text Gen)</Label>
            <Input
              id="jobKind"
              type="number"
              value={jobKind}
              onChange={(e) => setJobKind(e.target.value)}
              placeholder="e.g., 5100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inputData">Input Data</Label>
            <Textarea
              id="inputData"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Enter the data for the job (e.g., a prompt for text generation)"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outputMimeType">Output MIME Type</Label>
            <Input
              id="outputMimeType"
              value={outputMimeType}
              onChange={(e) => setOutputMimeType(e.target.value)}
              placeholder="e.g., text/plain, image/jpeg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bidAmount">Bid Amount (msats)</Label>
            <Input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Optional: e.g., 1000 for 1 sat"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handlePublishRequest} className="w-full">
            Publish Job Request
          </Button>
        </CardFooter>
      </Card>
    );
  }
  ```

- **Action:** Create/update these files. Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The test should pass.

---

**Step 2: Implement Form State Management**

- **File to Modify (Test):** `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`
- **File to Modify:** `src/components/nip90/Nip90RequestForm.tsx`

**2.A: Write Test for Form State Updates**

- **In `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`, add a new test case:**

  ```typescript
  // ... (existing imports and describe block) ...
  import { fireEvent } from '@testing-library/react';

  // ... (existing test case 'should render the form...') ...

  it('should update state when input fields are changed', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90RequestForm />
      </QueryClientProvider>
    );

    const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
    fireEvent.change(jobKindInput, { target: { value: '5001' } });
    expect(jobKindInput.value).toBe('5001');

    const inputDataTextarea = screen.getByLabelText(/Input Data/i) as HTMLTextAreaElement;
    fireEvent.change(inputDataTextarea, { target: { value: 'Test prompt' } });
    expect(inputDataTextarea.value).toBe('Test prompt');

    const outputMimeInput = screen.getByLabelText(/Output MIME Type/i) as HTMLInputElement;
    fireEvent.change(outputMimeInput, { target: { value: 'application/json' } });
    expect(outputMimeInput.value).toBe('application/json');

    const bidAmountInput = screen.getByLabelText(/Bid Amount \(msats\)/i) as HTMLInputElement;
    fireEvent.change(bidAmountInput, { target: { value: '500' } });
    expect(bidAmountInput.value).toBe('500');
  });
  ```

**2.B: Implement State Hooks**

- **In `src/components/nip90/Nip90RequestForm.tsx`:**
  The basic state management with `useState` and connecting it to input `value` and `onChange` props was already included in Step 1.B. This test verifies that part.

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The new test should pass.

---

**Step 3: Create NIP-90 Event Helper Function**

- **File to Create:** `src/helpers/nip90/event_creation.ts` (or similar, e.g., `src/utils/nostr_event_helpers.ts`)
- **File to Create (Test):** `src/tests/unit/helpers/nip90/event_creation.test.ts`

**3.A: Write Unit Test for `createNip90JobRequest`**

- **In `src/tests/unit/helpers/nip90/event_creation.test.ts`:**

  ```typescript
  import { describe, it, expect } from "vitest";
  import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
  import { createNip90JobRequest } from "@/helpers/nip90/event_creation"; // Adjust path as needed
  import type { NostrEvent } from "@/services/nostr"; // Assuming NostrEvent type is available

  describe("createNip90JobRequest", () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    it("should create a valid NIP-90 job request event", () => {
      const inputs: Array<[string, string, string?, string?, string?]> = [
        ["Test input data", "text"],
      ];
      const outputMimeType = "text/plain";
      const bidMillisats = 1000;
      const jobKind = 5100;

      const event = createNip90JobRequest(
        sk,
        inputs,
        outputMimeType,
        bidMillisats,
        jobKind,
      );

      expect(event.kind).toBe(jobKind);
      expect(event.pubkey).toBe(pk);
      expect(event.content).toBe("Job request content placeholder"); // Or make content configurable
      expect(event.tags).toEqual(
        expect.arrayContaining([
          ["i", "Test input data", "text"],
          ["output", "text/plain"],
          ["bid", "1000"],
        ]),
      );
      expect(event.id).toBeDefined();
      expect(event.sig).toBeDefined();
      expect(typeof event.created_at).toBe("number");
    });

    it("should create an event without a bid if not provided", () => {
      const inputs: Array<[string, string]> = [["Another input", "url"]];
      const event = createNip90JobRequest(
        sk,
        inputs,
        "application/json",
        undefined,
        5002,
      );

      expect(event.tags.some((tag) => tag[0] === "bid")).toBe(false);
      expect(event.tags).toEqual(
        expect.arrayContaining([
          ["i", "Another input", "url"],
          ["output", "application/json"],
        ]),
      );
    });
  });
  ```

**3.B: Implement `createNip90JobRequest` Function**

- **Create `src/helpers/nip90/event_creation.ts`:**

  ```typescript
  import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
  import type { NostrEvent } from "@/services/nostr"; // Your NostrEvent type

  export function createNip90JobRequest(
    sk: Uint8Array,
    inputs: Array<[string, string, string?, string?, string?]>,
    outputMimeType: string = "text/plain",
    bidMillisats?: number,
    jobKind: number = 5100, // Default to Text Generation
  ): NostrEvent {
    const template: EventTemplate = {
      kind: jobKind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ...inputs.map(
          (inputParams) =>
            ["i", ...inputParams.filter((p) => p !== undefined)] as [
              string,
              ...string[],
            ],
        ),
        ["output", outputMimeType],
      ],
      content: "Job request content placeholder", // You might want to make this configurable
    };

    if (bidMillisats !== undefined && bidMillisats > 0) {
      template.tags.push(["bid", bidMillisats.toString()]);
    }

    // finalizeEvent will add pubkey, id, and sig
    return finalizeEvent(template, sk) as NostrEvent;
  }
  ```

- **Action:** Create these files. Run `pnpm test "event_creation"` and `pnpm t`. The tests should pass.

---

**Step 4: Implement Form Submission Logic (with Mocked Service)**

- **File to Modify (Test):** `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`
- **File to Modify:** `src/components/nip90/Nip90RequestForm.tsx`
- **Helper File to Reference:** `src/helpers/nip90/event_creation.ts`

**4.A: Write Test for Form Submission**

- **In `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`, add a new test case:**
  We'll mock `nostr-tools/pure` for key generation and `NostrService` for publishing.

  ```typescript
  // ... (existing imports) ...
  import { vi } from 'vitest';
  import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer } from '@/services/nostr'; // For mocking
  import * as nostrToolsPure from 'nostr-tools/pure';
  import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
  import { Effect, Layer } from 'effect';

  // Mock nostr-tools/pure
  vi.mock('nostr-tools/pure', async (importOriginal) => {
    const original = await importOriginal<typeof nostrToolsPure>();
    return {
      ...original,
      generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Mocked SK
      getPublicKey: vi.fn((sk) => original.getPublicKey(sk)), // Can use original or mock
      finalizeEvent: vi.fn((template, sk) => {
          // A simplified mock for finalizeEvent, good enough for this test
          const pk = original.getPublicKey(sk);
          return {
              ...template,
              id: 'mockEventId' + Date.now(),
              pubkey: pk,
              sig: 'mockSignature' + Date.now(),
              tags: template.tags || [],
              content: template.content || '',
          } as NostrEvent;
      }),
    };
  });

  // Mock the NostrService
  const mockPublishEvent = vi.fn(() => Effect.succeed(undefined));
  const MockNostrServiceLive = Layer.succeed(NostrService, {
    getPool: vi.fn(() => Effect.fail(new Error("getPool not implemented in mock"))), // Not used here
    listEvents: vi.fn(() => Effect.fail(new Error("listEvents not implemented in mock"))), // Not used here
    publishEvent: mockPublishEvent,
    cleanupPool: vi.fn(() => Effect.fail(new Error("cleanupPool not implemented in mock"))), // Not used here
  });

  const TestFormLayer = Layer.provide(
      MockNostrServiceLive,
      DefaultNostrServiceConfigLayer // NostrServiceLive usually needs this
  );


  // ... (existing describe and other tests) ...

  it('should call helper functions and NostrService on submit', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        {/* Provide the mocked NostrService layer to the component */}
        <Effect.Provider effect={TestFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Generate a poem.' } });
    fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/markdown' } });
    fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '2000' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));

    // Wait for async operations in submission logic if any (e.g., Effect.runPromise)
    // For this test structure with mockPublishEvent being synchronous Effect.succeed, direct check is fine.
    // If it were Effect.promise, you might need await screen.findByText(...) for feedback.

    expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);

    // Since finalizeEvent is mocked, createNip90JobRequest will use the mocked version.
    // We can check that the service's publishEvent was called with an event that has the expected kind and tags.
    expect(mockPublishEvent).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublishEvent.mock.calls[0][0] as NostrEvent;
    expect(publishedEvent.kind).toBe(5100);
    expect(publishedEvent.tags).toEqual(expect.arrayContaining([
      ['i', 'Generate a poem.', 'text'],
      ['output', 'text/markdown'],
      ['bid', '2000'],
    ]));
  });
  ```

**4.B: Implement Submission Logic in `Nip90RequestForm.tsx`**

- **In `src/components/nip90/Nip90RequestForm.tsx`, update `handlePublishRequest`:**

  ```typescript
  import React, { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Textarea } from '@/components/ui/textarea';
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
  import { generateSecretKey, getPublicKey as getPkFromSk } from 'nostr-tools/pure'; // For ephemeral keys
  import { createNip90JobRequest } from '@/helpers/nip90/event_creation'; // Your helper
  import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer } from '@/services/nostr';
  import type { NostrEvent } from '@/services/nostr';
  import { Effect, Layer, Exit, Cause } from 'effect'; // Import Effect primitives

  export default function Nip90RequestForm() {
    const [jobKind, setJobKind] = useState<string>("5100");
    const [inputData, setInputData] = useState<string>("");
    const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
    const [bidAmount, setBidAmount] = useState<string>("");

    // UI Feedback state
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

    const { run } = Effect.useRunSync(); // Get the run function from the context (if Provider is at root)
                                       // OR, we will provide the layer directly when running the effect.

    const handlePublishRequest = async () => {
      setIsPublishing(true);
      setPublishError(null);
      setPublishedEventId(null);

      try {
        const kind = parseInt(jobKind, 10);
        if (isNaN(kind) || kind < 5000 || kind > 5999) {
          setPublishError("Invalid Job Kind. Must be between 5000 and 5999.");
          setIsPublishing(false);
          return;
        }

        if (!inputData.trim()) {
          setPublishError("Input Data cannot be empty.");
          setIsPublishing(false);
          return;
        }

        if (!outputMimeType.trim()) {
          setOutputMimeType("text/plain"); // Default if empty, or add validation
        }

        const bid = bidAmount ? parseInt(bidAmount, 10) : undefined;
        if (bidAmount && (isNaN(bid) || bid < 0)) {
          setPublishError("Invalid Bid Amount. Must be a non-negative number.");
          setIsPublishing(false);
          return;
        }

        // 1. Generate ephemeral keys
        const requesterSk = generateSecretKey();
        // const requesterPk = getPkFromSk(requesterSk); // Not directly needed for createNip90JobRequest

        // 2. Construct the NIP-90 Job Request Event
        // Assuming a single input for now. Adapt if multiple inputs are needed.
        const inputs: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];
        const requestEvent: NostrEvent = createNip90JobRequest(
          requesterSk,
          inputs,
          outputMimeType.trim(),
          bid,
          kind
        );

        console.log("Generated NIP-90 Request Event:", JSON.stringify(requestEvent, null, 2));

        // 3. Publish the Event using NostrService via Effect
        const program = Effect.gen(function* (_) {
          const nostrService = yield* _(NostrService);
          yield* _(nostrService.publishEvent(requestEvent));
          return requestEvent.id;
        });

        // Provide the necessary layers directly for this operation
        const fullLayer = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);
        const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

        if (Exit.isSuccess(exit)) {
          console.log('Successfully published NIP-90 request. Event ID:', exit.value);
          setPublishedEventId(exit.value);
        } else {
          console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
          const underlyingError = Cause.failureOption(exit.cause);
          const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                               underlyingError.value.message : "Unknown error during publishing.";
          setPublishError(`Publishing failed: ${errorMessage}`);
        }

      } catch (error) {
        console.error("Error during request preparation:", error);
        setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
      } finally {
        setIsPublishing(false);
      }
    };

    return (
      <Card className="w-full max-w-lg mx-auto">
        {/* ... CardHeader and CardContent with inputs ... */}
        <CardHeader>
          <CardTitle>Create NIP-90 Job Request</CardTitle>
          <CardDescription>Define and publish a new job request to the Nostr network.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="jobKind">Job Kind (e.g., 5100 for Text Gen)</Label>
            <Input
              id="jobKind"
              type="number"
              value={jobKind}
              onChange={(e) => setJobKind(e.target.value)}
              placeholder="e.g., 5100"
              disabled={isPublishing}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inputData">Input Data</Label>
            <Textarea
              id="inputData"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Enter the data for the job (e.g., a prompt for text generation)"
              rows={3}
              disabled={isPublishing}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outputMimeType">Output MIME Type</Label>
            <Input
              id="outputMimeType"
              value={outputMimeType}
              onChange={(e) => setOutputMimeType(e.target.value)}
              placeholder="e.g., text/plain, image/jpeg"
              disabled={isPublishing}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bidAmount">Bid Amount (msats)</Label>
            <Input
              id="bidAmount"
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Optional: e.g., 1000 for 1 sat"
              disabled={isPublishing}
            />
          </div>
           {/* UI Feedback */}
          {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
          {publishError && <p className="text-sm text-red-500">Error: {publishError}</p>}
          {publishedEventId && <p className="text-sm text-green-500">Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>}
        </CardContent>
        <CardFooter>
          <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish Job Request'}
          </Button>
        </CardFooter>
      </Card>
    );
  }
  ```

- **Action:** Create/update these files. Add the `Effect.Provider` at a higher level in your app if you haven't already (e.g., in `App.tsx` or `renderer.ts` wrapping your main app content) to provide the `TestFormLayer` (or rather, the real `NostrServiceLive` layers) to the component tree. For the test, providing `TestFormLayer` specifically to `Nip90RequestForm` is fine.
- **Note on `Effect.Provider` for the test:** The test setup shows providing `Effect.Provider` directly in the test render. For the actual application, you'd provide the real layers (like `NostrServiceLive` combined with `DefaultNostrServiceConfigLayer`) higher up in your component tree, typically in `App.tsx`. The `Nip90RequestForm` will then consume `NostrService` from this context. The example above in `handlePublishRequest` shows how to provide layers directly to `Effect.runPromiseExit` if you don't have a global provider.
- Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The test for submission should pass.

---

**Step 5: Add UI Feedback (Already Included in Step 4.B)**

The implementation in Step 4.B already includes basic state and display for "Publishing...", error messages, and success message with the event ID.

**5.A: Write Test for UI Feedback**

- **In `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`, extend the submission test or add new ones:**

  ```typescript
  // ... (modify the 'should call helper functions and NostrService on submit' test
  // or add a new one focusing on UI feedback) ...

  it('should display loading, success, and error messages', async () => {
      // Test for "Publishing..."
      mockPublishEvent.mockImplementationOnce(() =>
        Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 50)))
      );
      render(
        <QueryClientProvider client={queryClient}>
          <Effect.Provider effect={TestFormLayer}><Nip90RequestForm /></Effect.Provider>
        </QueryClientProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
      expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
      expect(await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200})).toBeInTheDocument();

      // Test for Error
      mockPublishEvent.mockImplementationOnce(() => Effect.fail(new Error("Relay connection failed")));
       render( // Re-render for clean state or use cleanup from RTL
        <QueryClientProvider client={queryClient}>
          <Effect.Provider effect={TestFormLayer}><Nip90RequestForm /></Effect.Provider>
        </QueryClientProvider>
      );
      fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt' } }); // Ensure form is valid
      fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
      expect(await screen.findByText(/Error: Publishing failed: Relay connection failed/i)).toBeInTheDocument();
    });
  ```

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The UI feedback tests should pass based on the implementation from 4.B.

---

**Step 6: Integrate `Nip90RequestForm` into `HomePage.tsx`**

- **File to Modify:** `src/pages/HomePage.tsx`
- **New File (if needed):** `src/components/nip90/index.ts` to export `Nip90RequestForm`.

**6.A: Export `Nip90RequestForm`**

- **If you haven't already, create/update `src/components/nip90/index.ts`:**
  ```typescript
  export { default as Nip90EventList } from "./Nip90EventList";
  export { default as Nip90RequestForm } from "./Nip90RequestForm"; // Add this line
  ```

**6.B: Add `Nip90RequestForm` to `HomePage.tsx`**

- **In `src/pages/HomePage.tsx`:** Import and render the form. For example, you can add it to the right panel, perhaps above the `Nip90EventList`.

  ```typescript
  // src/pages/HomePage.tsx
  // ... other imports ...
  import { Nip90EventList, Nip90RequestForm } from "@/components/nip90"; // Updated import
  // ... QueryClient, QueryClientProvider if not already at a higher level ...

  export default function HomePage() {
    // ... existing state and hooks ...

    return (
      <QueryClientProvider client={queryClient}> {/* Ensure QueryClientProvider is here or higher */}
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
          {/* ... existing canvas and hand tracking UI ... */}

          {/* Pinnable chat window can be one element */}
          {/* <PinnableChatWindow ... /> */}

          {/* Example: Add NIP-90 list next to or below chat */}
          <div className="absolute top-16 left-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20" style={{ pointerEvents: 'auto' }}>
            {/* Chat Window */}
            <div className="h-full border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden">
               <ChatContainer
                  className="bg-transparent !h-full"
                  systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
                  model="gemma3:1b"
                />
            </div>
          </div>

          <div className="absolute top-16 right-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20 flex flex-col gap-4" style={{ pointerEvents: 'auto' }}>
            {/* NIP-90 Request Form */}
            <div className="border rounded-md shadow-lg bg-background/80 backdrop-blur-sm text-foreground p-4">
              <Nip90RequestForm />
            </div>
            {/* NIP-90 Event List */}
            <div className="flex-grow border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden text-foreground">
              <Nip90EventList />
            </div>
          </div>

          {/* ... existing test buttons ... */}
        </div>
      </QueryClientProvider>
    );
  }
  ```

**6.C: Manual Test**

- **Action:** Run `pnpm start`.
- Navigate to the `HomePage`.
- The `Nip90RequestForm` should be visible.
- Fill out the form and click "Publish Job Request".
- Check the developer console for logs from the `handlePublishRequest` function (event details, success/error from `NostrService`).
- You can use a Nostr relay inspector (like `nostr.watch` or `noscl.com`) to see if your event (kind 5xxx, with your ephemeral pubkey) appears on the public relays.

---

This completes the initial implementation for the NIP-90 requester UI. The "Tracking My Published Requests" part can be a follow-up to keep these steps focused. Remember to ensure `Effect.Provider` is set up correctly in your main application if you are not providing layers directly to `Effect.runPromiseExit` in every component that uses Effect services.Okay, agent, let's get the NIP-90 job request creation UI implemented. We'll follow a simpler, step-by-step TDD (Test-Driven Development) approach: write a small test, then write the code to make it pass.

**Overall Goal:** Allow the Commander user to fill out a form, create a NIP-90 job request event using an ephemeral key, and publish it to Nostr relays via the existing `NostrService`.

---

**Step 1: Basic UI Form Component (`Nip90RequestForm.tsx`)**

**1.A: Test - Basic Form Rendering**
Create `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Mock NostrService for this component's tests
vi.mock('@/services/nostr', async () => {
  const originalModule = await vi.importActual('@/services/nostr');
  return {
    ...originalModule,
    NostrService: {
      ...originalModule.NostrService,
      publishEvent: vi.fn(() => Effect.succeed(undefined)), // Mock implementation
    },
    // Mock layers if needed by the component, though direct Effect.provide is used in component
    NostrServiceLive: originalModule.NostrServiceLive,
    DefaultNostrServiceConfigLayer: originalModule.DefaultNostrServiceConfigLayer,
  };
});

// Mock nostr-tools/pure for key generation
vi.mock('nostr-tools/pure', async (importOriginal) => {
    const original = await importOriginal<typeof import('nostr-tools/pure')>();
    return {
        ...original,
        generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Mocked SK
        getPublicKey: vi.fn((sk) => original.getPublicKey(sk)),
        finalizeEvent: vi.fn((template, sk) => {
            const pk = original.getPublicKey(sk);
            return {
                ...template,
                id: 'mockEventId' + Date.now(),
                pubkey: pk,
                sig: 'mockSignature' + Date.now(),
                tags: template.tags || [],
                content: template.content || '',
            } as any; // Using 'any' for NostrEvent from service for simplicity in mock
        }),
    };
});


describe('Nip90RequestForm', () => {
  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90RequestForm />
      </QueryClientProvider>
    );

  it('should render the form with initial fields and a submit button', () => {
    renderComponent();

    expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Input Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output MIME Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bid Amount \(msats\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Job Request/i })).toBeInTheDocument();
  });
});
```

**1.B: Implementation - Basic Form Structure**
Create `src/components/nip90/Nip90RequestForm.tsx`:

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateSecretKey } from 'nostr-tools/pure';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer, type NostrEvent } from '@/services/nostr';
import { Effect, Layer, Exit, Cause } from 'effect';

export default function Nip90RequestForm() {
  const [jobKind, setJobKind] = useState<string>("5100");
  const [inputData, setInputData] = useState<string>("");
  const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
  const [bidAmount, setBidAmount] = useState<string>("");

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

  const handlePublishRequest = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setPublishedEventId(null);

    try {
      const kind = parseInt(jobKind, 10);
      if (isNaN(kind) || kind < 5000 || kind > 5999) {
        setPublishError("Invalid Job Kind. Must be between 5000 and 5999.");
        setIsPublishing(false);
        return;
      }
      if (!inputData.trim()) {
        setPublishError("Input Data cannot be empty.");
        setIsPublishing(false);
        return;
      }
      if (!outputMimeType.trim()) setOutputMimeType("text/plain");

      const bid = bidAmount ? parseInt(bidAmount, 10) : undefined;
      if (bidAmount && (isNaN(bid) || bid < 0)) {
        setPublishError("Invalid Bid Amount. Must be a non-negative number.");
        setIsPublishing(false);
        return;
      }

      const requesterSk = generateSecretKey();
      const inputs: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];
      const requestEvent: NostrEvent = createNip90JobRequest(
        requesterSk,
        inputs,
        outputMimeType.trim(),
        bid,
        kind
      );

      const program = Effect.gen(function* (_) {
        const nostrService = yield* _(NostrService);
        yield* _(nostrService.publishEvent(requestEvent));
        return requestEvent.id;
      });

      const fullLayer = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);
      const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

      if (Exit.isSuccess(exit)) {
        setPublishedEventId(exit.value);
      } else {
        const underlyingError = Cause.failureOption(exit.cause);
        const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                             underlyingError.value.message : "Unknown error during publishing.";
        setPublishError(`Publishing failed: ${errorMessage}`);
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create NIP-90 Job Request</CardTitle>
        <CardDescription>Define and publish a new job request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="jobKind">Job Kind</Label>
          <Input id="jobKind" type="number" value={jobKind} onChange={(e) => setJobKind(e.target.value)} placeholder="e.g., 5100" disabled={isPublishing} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inputData">Input Data</Label>
          <Textarea id="inputData" value={inputData} onChange={(e) => setInputData(e.target.value)} placeholder="Prompt or data for the job" rows={3} disabled={isPublishing} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="outputMimeType">Output MIME Type</Label>
          <Input id="outputMimeType" value={outputMimeType} onChange={(e) => setOutputMimeType(e.target.value)} placeholder="e.g., text/plain" disabled={isPublishing} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bidAmount">Bid Amount (msats)</Label>
          <Input id="bidAmount" type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Optional: e.g., 1000" disabled={isPublishing} />
        </div>
        {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
        {publishError && <p className="text-sm text-destructive">Error: {publishError}</p>}
        {publishedEventId && <p className="text-sm text-green-500">Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
          {isPublishing ? 'Publishing...' : 'Publish Job Request'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

Also create `src/components/nip90/index.ts`:

```typescript
export { default as Nip90EventList } from "./Nip90EventList";
export { default as Nip90RequestForm } from "./Nip90RequestForm";
```

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The test should pass.

---

**Step 2: Form State Management**

**2.A: Test - Form State Updates**
Add this test to `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:

```typescript
import { fireEvent } from "@testing-library/react"; // Add this if not already there

// ... (inside describe block) ...
it("should update state when input fields are changed", () => {
  renderComponent();

  const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
  fireEvent.change(jobKindInput, { target: { value: "5001" } });
  expect(jobKindInput.value).toBe("5001");

  const inputDataTextarea = screen.getByLabelText(
    /Input Data/i,
  ) as HTMLTextAreaElement;
  fireEvent.change(inputDataTextarea, { target: { value: "Test prompt" } });
  expect(inputDataTextarea.value).toBe("Test prompt");

  const outputMimeInput = screen.getByLabelText(
    /Output MIME Type/i,
  ) as HTMLInputElement;
  fireEvent.change(outputMimeInput, { target: { value: "application/json" } });
  expect(outputMimeInput.value).toBe("application/json");

  const bidAmountInput = screen.getByLabelText(
    /Bid Amount \(msats\)/i,
  ) as HTMLInputElement;
  fireEvent.change(bidAmountInput, { target: { value: "500" } });
  expect(bidAmountInput.value).toBe("500");
});
```

**2.B: Implementation - State Hooks**
The implementation in `src/components/nip90/Nip90RequestForm.tsx` from Step 1.B already includes `useState` hooks and connects them to the input fields. This test verifies that functionality.

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The new test should pass.

---

**Step 3: NIP-90 Event Creation Helper**

**3.A: Test - Unit Test `createNip90JobRequest`**
Create `src/tests/unit/helpers/nip90/event_creation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
import type { NostrEvent } from "@/services/nostr";

describe("createNip90JobRequest", () => {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);

  it("should create a valid NIP-90 job request event", () => {
    const inputs: Array<[string, string, string?, string?, string?]> = [
      ["Test input data", "text"],
    ];
    const outputMimeType = "text/plain";
    const bidMillisats = 1000;
    const jobKind = 5100;

    const event = createNip90JobRequest(
      sk,
      inputs,
      outputMimeType,
      bidMillisats,
      jobKind,
    );

    expect(event.kind).toBe(jobKind);
    expect(event.pubkey).toBe(pk);
    expect(event.content).toBe("Job request content placeholder");
    expect(event.tags).toEqual(
      expect.arrayContaining([
        ["i", "Test input data", "text"],
        ["output", "text/plain"],
        ["bid", "1000"],
      ]),
    );
    expect(event.id).toBeDefined();
    expect(event.sig).toBeDefined();
    expect(typeof event.created_at).toBe("number");
  });

  it("should create an event without a bid if not provided or zero", () => {
    const inputs: Array<[string, string]> = [["Another input", "url"]];
    const eventNoBid = createNip90JobRequest(
      sk,
      inputs,
      "application/json",
      undefined,
      5002,
    );
    expect(eventNoBid.tags.some((tag) => tag[0] === "bid")).toBe(false);

    const eventZeroBid = createNip90JobRequest(
      sk,
      inputs,
      "application/json",
      0,
      5002,
    );
    expect(eventZeroBid.tags.some((tag) => tag[0] === "bid")).toBe(false);
  });
});
```

**3.B: Implementation - `createNip90JobRequest`**
Create `src/helpers/nip90/event_creation.ts`:

```typescript
import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import type { NostrEvent } from "@/services/nostr";

export function createNip90JobRequest(
  sk: Uint8Array,
  inputs: Array<[string, string, string?, string?, string?]>,
  outputMimeType: string = "text/plain",
  bidMillisats?: number,
  jobKind: number = 5100,
): NostrEvent {
  const template: EventTemplate = {
    kind: jobKind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ...inputs.map(
        (inputParams) =>
          ["i", ...inputParams.filter((p) => p !== undefined)] as [
            string,
            ...string[],
          ],
      ),
      ["output", outputMimeType],
    ],
    content: "Job request content placeholder",
  };

  if (bidMillisats !== undefined && bidMillisats > 0) {
    template.tags.push(["bid", bidMillisats.toString()]);
  }

  return finalizeEvent(template, sk) as NostrEvent;
}
```

- **Action:** Create these files. Run `pnpm test "event_creation"` and `pnpm t`.

---

**Step 4: Form Submission Logic (Mocked Service)**

**4.A: Test - Form Submission with Mocks**
Add this test case to `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:
Make sure the mock `NostrService.publishEvent` is accessible in this test scope (it was defined at the top of the test file).

```typescript
// ... (At the top of src/tests/unit/components/nip90/Nip90RequestForm.test.tsx)
import * as nostrToolsPure from 'nostr-tools/pure'; // Already mocked
import { NostrService as NostrServiceTag } from '@/services/nostr'; // Import the Tag
import { createNip90JobRequest as actualCreateNip90JobRequest } from '@/helpers/nip90/event_creation';
// ... other imports

// Mock NostrService
const mockPublishEventActual = vi.fn(() => Effect.succeed(undefined));
const MockNostrServiceLiveActual = Layer.succeed(NostrServiceTag, {
  getPool: vi.fn(() => Effect.fail(new Error("getPool not implemented in mock"))),
  listEvents: vi.fn(() => Effect.fail(new Error("listEvents not implemented in mock"))),
  publishEvent: mockPublishEventActual,
  cleanupPool: vi.fn(() => Effect.fail(new Error("cleanupPool not implemented in mock"))),
});

const TestFormLayerActual = Layer.provide(
    MockNostrServiceLiveActual,
    DefaultNostrServiceConfigLayer
);
// ... (rest of the test file) ...

// Inside describe('Nip90RequestForm', () => { ... });
    it('should call helper functions and NostrService on submit', async () => {
      // Use the actual mock for this test
      const mockPublishEventForThisTest = vi.fn(() => Effect.succeed(undefined));
      const testSpecificNostrServiceLayer = Layer.succeed(NostrServiceTag, {
        getPool: vi.fn(),
        listEvents: vi.fn(),
        publishEvent: mockPublishEventForThisTest,
        cleanupPool: vi.fn(),
      });
      const fullTestLayerForSubmit = Layer.provide(testSpecificNostrServiceLayer, DefaultNostrServiceConfigLayer);

      render(
        <QueryClientProvider client={queryClient}>
          <Effect.Provider effect={fullTestLayerForSubmit}>
            <Nip90RequestForm />
          </Effect.Provider>
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
      fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Generate a poem.' } });
      fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/markdown' } });
      fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '2000' } });

      fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));

      await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200}); // Wait for async submission to complete

      expect(nostrToolsPure.generateSecretKey).toHaveBeenCalled();

      expect(mockPublishEventForThisTest).toHaveBeenCalledTimes(1);
      const publishedEvent = mockPublishEventForThisTest.mock.calls[0][0] as NostrEvent;
      expect(publishedEvent.kind).toBe(5100);
      expect(publishedEvent.tags).toEqual(expect.arrayContaining([
        ['i', 'Generate a poem.', 'text'],
        ['output', 'text/markdown'],
        ['bid', '2000'],
      ]));
    });
```

**4.B: Implementation - Submission Logic**
This was mostly done in Step 1.B. The test in 4.A verifies that the `handlePublishRequest` function calls `generateSecretKey`, `createNip90JobRequest` (which uses the mocked `finalizeEvent`), and the (mocked) `NostrService.publishEvent`.

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. The new test should pass.

---

**Step 5: UI Feedback (Loading, Success, Error)**

**5.A: Test - UI Feedback States**
Add this test case to `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:

```typescript
// ... (inside describe block) ...
    it('should display loading, success, and error messages correctly', async () => {
      const mockPublishEventForFeedbackTest = vi.fn();
      const feedbackTestLayer = Layer.provide(
        Layer.succeed(NostrServiceTag, {
          getPool: vi.fn(), listEvents: vi.fn(), publishEvent: mockPublishEventForFeedbackTest, cleanupPool: vi.fn()
        }),
        DefaultNostrServiceConfigLayer
      );

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <Effect.Provider effect={feedbackTestLayer}><Nip90RequestForm /></Effect.Provider>
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test Feedback' } });

      // Test Loading State
      mockPublishEventForFeedbackTest.mockImplementationOnce(() =>
        Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 100)))
      );
      fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
      expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Publishing.../i})).toBeDisabled();

      // Test Success State (wait for the timeout above to resolve)
      await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200}); // Check for success message

      // Test Error State
      mockPublishEventForFeedbackTest.mockImplementationOnce(() => Effect.fail(new Error("Custom Relay Error")));
      // Re-render or re-trigger submission if state doesn't reset automatically in form.
      // For simplicity, we'll assume a new interaction or re-render would reset:
       rerender(
        <QueryClientProvider client={queryClient}>
          <Effect.Provider effect={feedbackTestLayer}><Nip90RequestForm /></Effect.Provider>
        </QueryClientProvider>
      );
      fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt for error' } });
      fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
      expect(await screen.findByText(/Error: Publishing failed: Custom Relay Error/i)).toBeInTheDocument();
    });
```

**5.B: Implementation - UI Feedback**
The implementation in `src/components/nip90/Nip90RequestForm.tsx` from Step 1.B already includes the necessary `useState` hooks and conditional rendering for these feedback messages.

- **Action:** Run `pnpm test "Nip90RequestForm"` and `pnpm t`. This test should pass.

---

**Step 6: Integrate Form into `HomePage.tsx`**

**6.A: Implementation - Add Form to HomePage**
Modify `src/pages/HomePage.tsx`:

```typescript
// src/pages/HomePage.tsx
// ... other imports ...
import { Nip90EventList, Nip90RequestForm } from "@/components/nip90"; // Use the index export
// ... QueryClient, QueryClientProvider if not already at a higher level ...

// ... (PinnableChatWindow component if it's in this file) ...

export default function HomePage() {
  // ... existing state and hooks ...

  return (
    <QueryClientProvider client={queryClient}> {/* Ensure QueryClientProvider is here or higher */}
      <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
        {/* ... existing canvas and hand tracking UI ... */}
        {/* <PinnableChatWindow ... /> */}

        <div className="absolute top-16 left-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20" style={{ pointerEvents: 'auto' }}>
          <div className="h-full border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden">
             <ChatContainer
                className="bg-transparent !h-full"
                systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
                model="gemma3:1b"
              />
          </div>
        </div>

        <div className="absolute top-16 right-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20 flex flex-col gap-4" style={{ pointerEvents: 'auto' }}>
          {/* NIP-90 Request Form */}
          <div className="border rounded-md shadow-lg bg-background/80 backdrop-blur-sm text-foreground p-4">
            <Nip90RequestForm />
          </div>
          {/* NIP-90 Event List */}
          <div className="flex-grow border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden text-foreground min-h-0"> {/* Added min-h-0 for flex-grow */}
            <Nip90EventList />
          </div>
        </div>

        {/* ... existing test buttons ... */}
      </div>
    </QueryClientProvider>
  );
}
```

**6.B: Manual Test**

- **Action:** Run `pnpm start`.
- Go to the home page. The `Nip90RequestForm` should appear.
- Fill it out and submit. Check the console for logs from `handlePublishRequest` and the UI for feedback.
- Verify on a Nostr relay explorer (e.g., `nostr.watch`) if the event was published.

---

This completes the implementation of the UI for creating NIP-90 job requests. The next phase would be to implement UI for tracking "My Published Requests" and their results, but this current set of instructions should give you a working requester form. Remember that for the `NostrService` to function correctly in the actual application, the real `NostrServiceLive` and `DefaultNostrServiceConfigLayer` must be provided higher up in your `App.tsx` or `renderer.ts` component tree via `Effect.Provider` if you're not providing them directly like in the form's `handlePublishRequest`.
