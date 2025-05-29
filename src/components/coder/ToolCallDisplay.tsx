import React from 'react';
import { Loader2 } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  args?: any;
  isLoading?: boolean;
  resultStatus?: string;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ 
  toolName, 
  args,
  isLoading = true,
  resultStatus
}) => {
  // Function to get the most relevant parameter to display
  const getRelevantParam = () => {
    if (!args) return null;
    
    // Helper to convert absolute path to relative
    const toRelativePath = (path: string) => {
      if (!path) return path;
      const cwd = '/Users/christopherdavid/code/commander/';
      if (path.startsWith(cwd)) {
        return path.slice(cwd.length);
      }
      return path;
    };
    
    switch (toolName) {
      case 'Read':
        return args.file_path ? toRelativePath(args.file_path) : null;
      case 'Write':
        return args.file_path ? toRelativePath(args.file_path) : null;
      case 'Edit':
      case 'MultiEdit':
        return args.file_path ? toRelativePath(args.file_path) : null;
      case 'Glob':
        return args.pattern ? args.pattern : null;
      case 'Grep':
        return args.pattern ? args.pattern : null;
      case 'LS':
        return args.path ? toRelativePath(args.path) : null;
      case 'Bash':
        return args.command ? `${args.command.substring(0, 50)}${args.command.length > 50 ? '...' : ''}` : null;
      case 'WebFetch':
        return args.url ? args.url : null;
      case 'WebSearch':
        return args.query ? args.query : null;
      case 'Task':
        return args.description ? args.description : null;
      default:
        // For other tools, try common parameter names
        if (args.name) return args.name;
        if (args.path) return toRelativePath(args.path);
        if (args.query) return args.query;
        return null;
    }
  };

  // Special handling for Task tool to show description and prompt
  if (toolName === 'Task' && args) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-base">⏺</span>
          <span className="text-xs truncate flex-1 min-w-0">
            Task: <span className="font-semibold">{args.description || 'Task'}</span>
          </span>
          {resultStatus && !isLoading && (
            <span className="text-xs text-muted-foreground/80 flex-shrink-0 ml-auto">
              {resultStatus}
            </span>
          )}
          {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto flex-shrink-0" />}
        </div>
        {args.prompt && (
          <div className="text-xs text-muted-foreground/80 pl-5 whitespace-pre-wrap">
            {args.prompt}
          </div>
        )}
      </div>
    );
  }

  const relevantParam = getRelevantParam();

  // Default display for other tools
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-base">⏺</span>
      <span className="font-mono truncate flex-1 min-w-0">
        {toolName}
        {relevantParam && (
          <span className="text-foreground/80">({relevantParam})</span>
        )}
        {!isLoading && !relevantParam && '...'}
      </span>
      {resultStatus && !isLoading && (
        <span className="text-muted-foreground/80 flex-shrink-0 ml-auto">
          {resultStatus}
        </span>
      )}
      {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto flex-shrink-0" />}
    </div>
  );
};