import React, { useState, useEffect } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Add keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Check if result is an object with just a "content" property
  let displayContent: string;
  if (typeof result === 'object' && result !== null && 'content' in result && Object.keys(result).length === 1) {
    // Extract and display just the content value
    displayContent = String(result.content);
  } else {
    // Convert result to string for display
    displayContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  }
  
  // Count lines in the result
  const lines = displayContent.split('\n');
  const lineCount = lines.length;
  
  // Determine text color based on error state
  const contentTextColor = isError ? 'text-red-400' : 'text-muted-foreground';
  
  // Get a summary for specific tool types
  const getSummary = () => {
    switch (toolName) {
      case 'Read':
        return `Read ${lineCount} lines`;
      case 'Write':
        return `Wrote ${lineCount} lines`;
      case 'Edit':
      case 'MultiEdit':
        return `Edited file`;
      case 'Bash':
        return `Command output (${lineCount} lines)`;
      case 'LS':
        return `Listed ${lineCount} items`;
      case 'Glob':
        return `Found ${lineCount} matches`;
      case 'Grep':
        return `Found results`;
      default:
        return `${lineCount} lines`;
    }
  };
  
  if (!isExpanded) {
    return (
      <div className="ml-5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-base">⎿</span>
        <span>
          {getSummary()}{' '}
          <button 
            onClick={() => setIsExpanded(true)}
            className="text-foreground hover:text-foreground/80 hover:underline"
          >
            (expand)
          </button>
        </span>
      </div>
    );
  }
  
  return (
    <div className="ml-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span className="text-base">⎿</span>
        <span>
          {getSummary()}{' '}
          <button 
            onClick={() => setIsExpanded(false)}
            className="text-foreground hover:text-foreground/80 hover:underline"
          >
            (collapse)
          </button>
        </span>
      </div>
      <div className="ml-4 rounded-lg border bg-muted/30 border-muted max-w-full overflow-hidden">
        <div className="p-1">
          <div className="max-h-60 overflow-auto">
            <pre className={`text-xs ${contentTextColor} whitespace-pre bg-transparent border border-white/15 p-2 overflow-x-auto`}>
              {displayContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};