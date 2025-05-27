import React from 'react';
import { Terminal, Loader2 } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  args?: any;
  isLoading?: boolean;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ 
  toolName, 
  args,
  isLoading = true 
}) => {
  // Special handling for Task tool to show description and prompt
  if (toolName === 'Task' && args) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Terminal className="h-4 w-4" />
          <span>
            Running Task: <span className="font-semibold">{args.description || 'Task'}</span>
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
        </div>
        {args.prompt && (
          <div className="text-xs text-muted-foreground/80 pl-6 whitespace-pre-wrap">
            {args.prompt}
          </div>
        )}
      </div>
    );
  }

  // Default display for other tools
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <Terminal className="h-4 w-4" />
      <span>
        Calling{" "}
        <span className="font-mono">
          {"`"}
          {toolName}
          {"`"}
        </span>
        ...
      </span>
      {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
    </div>
  );
};