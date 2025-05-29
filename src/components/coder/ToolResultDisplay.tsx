import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Thresholds for when content should be collapsible
const MAX_CHARS_DIRECT_DISPLAY = 300; // Characters
const MAX_LINES_DIRECT_DISPLAY = 10;  // Lines

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
  const [isOpen, setIsOpen] = useState(false);
  
  // Convert result to string for display
  const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const numLines = resultString.split('\n').length;
  const isContentLong = resultString.length > MAX_CHARS_DIRECT_DISPLAY || numLines > MAX_LINES_DIRECT_DISPLAY;
  
  // Content should be collapsible if it's long AND not an error
  const useCollapsible = !isError && isContentLong;
  
  // Determine trigger label - just show line count, no tool name
  const triggerLabel = `${numLines} lines`;
  
  // Determine text color based on error state
  const contentTextColor = isError ? 'text-red-400' : 'text-foreground';
  
  return (
    <div className="ml-4 rounded-lg border bg-muted/30 border-muted">
      <div className="p-1">
        {useCollapsible ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-start w-full p-0.5 h-auto text-xs text-muted-foreground hover:text-foreground">
                {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {triggerLabel}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="max-h-60 mt-1">
                <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
                  {resultString}
                </pre>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          // Direct rendering for non-collapsible or error content
          <ScrollArea className="max-h-60">
            <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
              {resultString}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};