import React from 'react';

interface ToolResultDisplayProps {
  toolName: string;
  result: any;
  isError?: boolean;
}

export const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ 
  toolName, 
  result,
  isError = false
}) => {
  // Convert result to string for display
  const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  
  // Determine text color based on error state
  const contentTextColor = isError ? 'text-red-400' : 'text-foreground';
  
  return (
    <div className="ml-4 rounded-lg border bg-muted/30 border-muted">
      <div className="p-1">
        <div className="max-h-60 overflow-y-auto overflow-x-auto">
          <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-transparent border border-white/10 p-2 break-all`}>
            {resultString}
          </pre>
        </div>
      </div>
    </div>
  );
};