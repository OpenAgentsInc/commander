import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react'; // Pencil for Edit, X for potential close
import { useNavigate } from '@tanstack/react-router';
import { Effect } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';

const CoderView: React.FC = () => {
  const navigate = useNavigate();
  const runtime = getMainRuntime(); // For telemetry

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
    navigate({ to: '/' });
  }, [navigate, runtime]);

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
    <div className="fixed inset-0 z-[9998] flex h-screen w-screen flex-col items-center bg-black p-4">
      {/* Top bar for Edit button and potential future controls */}
      <div className="absolute top-0 left-0 right-0 flex justify-center p-3">
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
    </div>
  );
};

export default CoderView;