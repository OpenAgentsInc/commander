// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Effect } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import {
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
} from "@handlewithcare/react-prosemirror";

const CoderPane: React.FC = () => {
  const runtime = getMainRuntime(); // For telemetry
  const removePane = usePaneStore((state) => state.removePane);

  const handleEditClick = () => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'edit_button_click',
        }),
      ).pipe(Effect.provide(runtime)),
    );
    // TODO: Define actual "Edit" functionality.
    // For now, it could log or be a placeholder.
    console.log("Coder Mode: Edit button clicked.");
  };

  const handleExitCoderMode = React.useCallback(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'exit_coder_mode_escape',
        }),
      ).pipe(Effect.provide(runtime)),
    );
    // Close the coder pane
    removePane('coder_pane');
  }, [removePane, runtime]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleExitCoderMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExitCoderMode]);

  // Track Coder Mode open event
  React.useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'coder_mode_opened',
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);

  return (
    <div className="h-full w-full flex flex-col bg-black">
      {/* Top bar for Edit button and potential future controls */}
      <div className="flex justify-center p-3">
        <Button
          variant="outline"
          className="border-gray-700 bg-black text-gray-400 hover:border-gray-500 hover:bg-gray-900 hover:text-gray-200"
          onClick={handleEditClick}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>
      {/*
        Coder Mode Content Area:
        This is where the main content for Coder Mode will go.
        For now, it's just a black screen.
        Example: A large text editor or code display area.
      */}
      <div className="flex-1 bg-black">
        {/* Future content will go here */}
      </div>
      {/* ProseMirror editor at the bottom */}
      <div className="flex items-center justify-center pb-4">
        <div className="h-[100px] w-[750px] overflow-auto rounded border border-white bg-black p-2">
          <ProseMirror
            defaultState={EditorState.create({
              schema,
              plugins: [reactKeys()],
            })}
          >
            <ProseMirrorDoc as={<div className="prose prose-invert min-h-full outline-none text-white" />} />
          </ProseMirror>
        </div>
      </div>
    </div>
  );
};

export default CoderPane;
