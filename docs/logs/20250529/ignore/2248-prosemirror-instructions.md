Okay, I've analyzed the problem description and the provided codebase structure. The issue where ProseMirror input fields become unresponsive after sending a message from one of multiple panes, until an app refresh, strongly points to a state management problem within the ProseMirror React integration, likely related to how `EditorState` is handled during re-renders triggered by message sending.

The core of the issue seems to be in `src/components/coder/CoderProseMirrorInput.tsx`. The `ProseMirror` component from `@handlewithcare/react-prosemirror` is likely being re-initialized with a new `defaultState` on re-renders. This happens because `EditorState.create(...)` is called within the `ProseMirrorEditor` functional component, which itself is defined inside `CoderProseMirrorInput`. When `CoderProseMirrorInput` re-renders (e.g., due to its `disabled` prop changing when `isLoading` toggles after sending a message), the `ProseMirrorEditor` function component effectively re-runs, creating a brand new `EditorState` instance. Passing a new `defaultState` to the `<ProseMirror>` component can cause its internal `EditorView` to reset or re-initialize, leading to a loss of interactivity.

The fix involves ensuring that each ProseMirror editor instance maintains a stable `EditorState` that is created once and then updated via transactions. This means switching from an "uncontrolled" mode (using `defaultState`) to a "controlled" mode (using `state` and `dispatchTransaction` props) for the `<ProseMirror>` component.

Here are the specific instructions for a coding agent to fix this:

**Objective:** Stabilize `EditorState` management in `CoderProseMirrorInput.tsx` to prevent ProseMirror editors from becoming unresponsive after message sending in a multi-pane setup.

**File to Modify:** `src/components/coder/CoderProseMirrorInput.tsx`

**Instructions:**

1.  **Import necessary types:**
    Ensure `EditorState` and `Transaction` from `prosemirror-state`, and `Plugin` from `prosemirror-state` (if not already for `keymap`) are imported at the top of the file.
    ```typescript
    import { EditorState, Transaction, Plugin } from "prosemirror-state";
    // ... other imports like schema, history, keymap, baseKeymap ...
    ```

2.  **Memoize Plugin Creation:**
    Move the creation of ProseMirror plugins (history, baseKeymap, customKeymap) outside the main component function or memoize them to ensure they are stable references. `reactKeys` will be added after dynamic import.

    ```typescript
    // At the top level of the file, or memoized within the component
    import { history } from "prosemirror-history";
    import { keymap } from "prosemirror-keymap";
    import { baseKeymap } from "prosemirror-commands";
    import { schema } from "../prosemirror/schema"; // Assuming this path is correct

    const createCustomKeymapPlugin = () => keymap({
      "Enter": (state, dispatch, view) => {
        // This keymap handler will be overridden by the useEditorEventListener
        // if that listener returns true. For submission, the event listener is preferred.
        return false;
      },
      "Shift-Enter": (state, dispatch) => {
        if (dispatch) {
          const br = schema.nodes.hard_break.create();
          const tr = state.tr.replaceSelectionWith(br).scrollIntoView();
          dispatch(tr);
        }
        return true;
      }
    });

    // This function will be called once the dynamic import is complete
    const initializePlugins = (customKeymapPlugin: Plugin, reactKeysPlugin: () => Plugin) => [
      history(),
      keymap(baseKeymap),
      customKeymapPlugin,
      reactKeysPlugin(), // reactKeys needs to be called
    ];
    ```

3.  **Refactor `CoderProseMirrorInput` to manage `EditorState`:**
    *   Initialize `editorState` using `useState` and create it only once after the dynamic import of `@handlewithcare/react-prosemirror` components completes.
    *   Pass this `editorState` to the `<ProseMirror>` component via its `state` prop.
    *   Implement a `dispatchTransaction` function to update the `editorState` and pass it to the `<ProseMirror>` component.

    ```typescript
    // Inside CoderProseMirrorInput.tsx

    // ... (CoderProseMirrorInputProps interface remains the same) ...

    const CoderProseMirrorInput: React.FC<CoderProseMirrorInputProps> = ({ onSubmit, disabled, focusKey, paneId }) => {
      const [components, setComponents] = useState<any>(null);
      const [editorState, setEditorState] = useState<EditorState | null>(null);

      // Memoize customKeymapPlugin to ensure stable reference for useEffect
      const customKeymapPlugin = useMemo(() => createCustomKeymapPlugin(), []);

      useEffect(() => {
        import("@handlewithcare/react-prosemirror").then(module => {
          setComponents({
            ProseMirror: module.ProseMirror,
            ProseMirrorDoc: module.ProseMirrorDoc,
            useEditorEffect: module.useEditorEffect,
            useEditorEventListener: module.useEditorEventListener,
            // useEditorState is used by InnerEditorLogic, not directly here for state management
          });

          const plugins = initializePlugins(customKeymapPlugin, module.reactKeys);
          const initialState = EditorState.create({
            schema, // Ensure schema is imported
            plugins,
          });
          setEditorState(initialState);
        });
      }, [customKeymapPlugin]); // customKeymapPlugin is stable

      if (!components || !editorState) {
        return <div className="p-4" style={{ minHeight: '44px' }}>Loading editor...</div>;
      }

      const { ProseMirror } = components;

      const dispatchTransaction = (transaction: Transaction) => {
        // It's important to apply the transaction to the *current* state.
        // Using the functional update form of setState ensures this.
        setEditorState((prevState) => {
          if (!prevState) return null; // Should not happen if editorState is initialized
          return prevState.apply(transaction);
        });
      };

      return (
        <ProseMirror
          state={editorState} // Controlled mode
          dispatchTransaction={dispatchTransaction} // Provide dispatcher
        >
          <InnerEditorLogic
            onSubmit={onSubmit}
            disabled={disabled}
            components={components} // Pass dynamically loaded components
            focusKey={focusKey}
            paneId={paneId}
            // editorState is now managed by ProseMirror's context, consumed by InnerEditorLogic's hooks
          />
        </ProseMirror>
      );
    };
    ```

4.  **Adapt `InnerEditorLogic` (previously `AutoFocusEditor`):**
    This internal component will now correctly use hooks that consume the context provided by the controlled `<ProseMirror>` parent. No major changes are needed here if it's already using `useEditorEffect` and `useEditorEventListener` correctly, as these hooks derive `EditorView` and `EditorState` from the context. Ensure `schema` is available for `serializeDocToText`.

    ```typescript
    // Rename AutoFocusEditor to InnerEditorLogic for clarity and define it
    const InnerEditorLogic: React.FC<{
      onSubmit: (text: string) => void;
      disabled?: boolean;
      components: any; // Type for dynamically imported components
      focusKey?: number;
      paneId?: string;
    }> = ({ onSubmit, disabled, components, focusKey, paneId }) => {
      const { useEditorEffect, useEditorEventListener, ProseMirrorDoc } = components;
      const activePaneId = usePaneStore((state) => state.activePaneId);
      const isThisPaneActive = paneId ? paneId === activePaneId : true;

      // useEditorState hook from @handlewithcare/react-prosemirror will provide the correct state
      // const currentEditorState = useEditorState(); // Optional, if direct state access is needed.

      useEditorEffect((view: import("prosemirror-view").EditorView | null) => {
        if (view && !disabled && isThisPaneActive) {
          view.focus();
        }
      }, [disabled, isThisPaneActive, components]);

      useEditorEffect((view: import("prosemirror-view").EditorView | null) => {
        if (view && focusKey !== undefined && !disabled && isThisPaneActive) {
          requestAnimationFrame(() => {
            if (view && view.focus) {
              view.focus();
              view.dom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });
        }
      }, [focusKey, disabled, isThisPaneActive, components]);

      const serializeDocToText = (doc: import("prosemirror-model").Node) => {
        let text = "";
        let isFirstParagraph = true;
        doc.forEach((node, offset, index) => {
          if (node.type.name === "paragraph") {
            if (!isFirstParagraph) {
              text += "\n";
            }
            isFirstParagraph = false;
            node.forEach((child) => {
              if (child.isText) {
                text += child.text;
              } else if (child.type.name === "hard_break") {
                text += "\n";
              }
            });
          } else if (node.type.name === "text" && node.text) { // Handle cases where doc might be just text
            text += node.text;
          }
        });
        return text;
      };

      useEditorEventListener("keydown", (view: import("prosemirror-view").EditorView, event: KeyboardEvent) => {
        if (event.key === "Enter" && !event.shiftKey && !disabled) {
          event.preventDefault();
          const text = serializeDocToText(view.state.doc);
          if (text.trim()) {
            onSubmit(text);
            const tr = view.state.tr.delete(0, view.state.doc.content.size);
            view.dispatch(tr);
          }
          return true; // Event handled
        }
        return false; // Event not handled
      }, components); // Pass components if hooks depend on it

      return (
        <ProseMirrorDoc
          as={ // The 'as' prop allows specifying the root element type
            <div
              className="p-4 prose prose-invert w-full outline-none text-white box-border" // Keep existing styling
              spellCheck={false}
              style={{
                minHeight: '44px',
                maxHeight: '124px',
                overflowY: 'auto',
                padding: '12px', // Ensure consistent padding
                opacity: disabled ? 0.5 : 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.875rem',
                lineHeight: '1.25rem'
              }}
            />
          }
        />
      );
    };
    ```

5.  **Export `CoderProseMirrorInput` as default.**

**Explanation of Fix:**

By changing `CoderProseMirrorInput` to manage its own `EditorState` with `useState` and passing this state (along with `dispatchTransaction`) to the `<ProseMirror>` component's `state` prop, we switch to a controlled component pattern.
The `EditorState` is now created only once when the component (and its dynamic imports) are ready. Subsequent re-renders of `CoderProseMirrorInput` will pass the *same stable* `editorState` object (or its updated version via transactions) to `<ProseMirror>`. This prevents the `<ProseMirror>` component from re-initializing its internal `EditorView` unnecessarily, thus preserving its interactive state and event handlers.

Each instance of `CoderProseMirrorInput` (one per Coder pane) will now correctly manage its own independent, stable ProseMirror editor state. This should resolve the issue of editors locking up after a message is sent from one pane, as the state integrity of each editor instance will be maintained across re-renders.

**Important Note for the Agent:**
Make sure that `schema` is correctly imported or defined in `src/components/coder/CoderProseMirrorInput.tsx`. It's referenced from `src/components/prosemirror/schema.ts` in the `CodeBlock.tsx` example, so a similar import will be needed. The current provided `CoderProseMirrorInput.tsx` already imports `schema` from `prosemirror-schema-basic`, which should be fine for basic text editing.

```typescript
// At the top of src/components/coder/CoderProseMirrorInput.tsx
import { schema } from "prosemirror-schema-basic"; // Or your custom schema
```
