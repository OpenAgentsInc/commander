import React, { useState, useEffect } from 'react';
import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";

interface CoderProseMirrorInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  focusKey?: number; // To trigger re-focus
}

// ProseMirror Editor component that's loaded after the dynamic import
const ProseMirrorEditor: React.FC<{ onSubmit: (text: string) => void, disabled?: boolean, focusKey?: number }> = ({ onSubmit, disabled, focusKey }) => {
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    // Load ProseMirror components
    import("@handlewithcare/react-prosemirror").then(module => {
      setComponents({
        ProseMirror: module.ProseMirror,
        ProseMirrorDoc: module.ProseMirrorDoc,
        reactKeys: module.reactKeys,
        useEditorEffect: module.useEditorEffect,
        useEditorEventListener: module.useEditorEventListener,
        useEditorState: module.useEditorState,
      });
    });
  }, []);

  if (!components) {
    return null;
  }

  const { ProseMirror, ProseMirrorDoc, reactKeys } = components;

  // Create custom keymap for handling Enter and Shift+Enter
  const customKeymap = keymap({
    "Enter": (state, dispatch, view) => {
      // Plain Enter submits
      return false; // Let our event listener handle it
    },
    "Shift-Enter": (state, dispatch) => {
      // Shift+Enter inserts a line break
      if (dispatch) {
        const br = schema.nodes.hard_break.create();
        const tr = state.tr.replaceSelectionWith(br).scrollIntoView();
        dispatch(tr);
      }
      return true;
    }
  });

  return (
    <ProseMirror
      defaultState={EditorState.create({
        schema,
        plugins: [
          history(),
          keymap(baseKeymap),
          customKeymap,
          reactKeys(),
        ],
      })}
    >
      <AutoFocusEditor
        onSubmit={onSubmit}
        disabled={disabled}
        components={components}
        focusKey={focusKey}
      />
    </ProseMirror>
  );
};

// Component that autofocuses the editor and fills container
const AutoFocusEditor: React.FC<{
  onSubmit: (text: string) => void,
  disabled?: boolean,
  components: any,
  focusKey?: number
}> = ({ onSubmit, disabled, components, focusKey }) => {
  const { useEditorState, useEditorEffect, useEditorEventListener, ProseMirrorDoc } = components;
  const editorState = useEditorState();

  useEditorEffect((view: any) => {
    if (view && !disabled) {
      view.focus();
    }
  }, [disabled]);

  // Re-focus when focusKey changes (e.g., after clicking New Chat or loading history)
  useEditorEffect((view: any) => {
    if (view && focusKey !== undefined && !disabled) {
      // Use requestAnimationFrame to ensure focus happens after any pending updates
      requestAnimationFrame(() => {
        if (view && view.focus) {
          view.focus();
          // Also ensure the view is scrolled into view if needed
          view.dom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }, [focusKey, disabled]);

  // Function to serialize document to text with line breaks
  const serializeDocToText = (doc: any) => {
    let text = "";
    let isFirstParagraph = true;

    doc.forEach((node: any, offset: number, index: number) => {
      if (node.type.name === "paragraph") {
        if (!isFirstParagraph) {
          text += "\n";
        }
        isFirstParagraph = false;

        node.forEach((child: any) => {
          if (child.isText) {
            text += child.text;
          } else if (child.type.name === "hard_break") {
            text += "\n";
          }
        });
      }
    });

    return text;
  };

  // Handle Enter (submit) - Shift+Enter is handled by the keymap
  useEditorEventListener("keydown", (view: any, event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();

      // Get the text content from the editor, preserving line breaks
      const text = serializeDocToText(view.state.doc);

      if (text.trim()) {
        // Submit the message
        onSubmit(text);

        // Clear the editor
        const tr = view.state.tr.delete(0, view.state.doc.content.size);
        view.dispatch(tr);
      }

      return true;
    }
    return false;
  });

  return (
    <ProseMirrorDoc
      as={
        <div
          className="p-4 prose prose-invert h-full w-full outline-none text-white box-border"
          spellCheck={false}
          style={{
            minHeight: '100%',
            padding: '12px',
            opacity: disabled ? 0.5 : 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem', // 14px - equivalent to text-sm
            lineHeight: '1.25rem' // 20px - matching text-sm line height
          }}
        />
      }
    />
  );
};

const CoderProseMirrorInput: React.FC<CoderProseMirrorInputProps> = ({ onSubmit, disabled, focusKey }) => {
  return <ProseMirrorEditor onSubmit={onSubmit} disabled={disabled} focusKey={focusKey} />;
};

export default CoderProseMirrorInput;