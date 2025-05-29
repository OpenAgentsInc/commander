import React, { useState, useEffect, useMemo } from 'react';
import { EditorState, Transaction, Plugin } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { usePaneStore } from '@/stores/pane';

interface CoderProseMirrorInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  focusKey?: number; // To trigger re-focus
  paneId?: string; // The pane's ID to check if it's active
}

// Create custom keymap plugin - stable reference
const createCustomKeymapPlugin = () => keymap({
  "Enter": () => {
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

      const plugins: Plugin<any>[] = [
        history(),
        keymap(baseKeymap),
        customKeymapPlugin,
        module.reactKeys() as unknown as Plugin<any>,
      ];
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
    doc.forEach((node) => {
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

export default CoderProseMirrorInput;