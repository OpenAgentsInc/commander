import React from 'react';
import { ChatMessage } from '@/hooks/coder/useCoderChat';
import { ChatMessage as UIChatMessage } from '@/components/ui/chat-message';
import { ToolCallDisplay } from './ToolCallDisplay';
import { ToolResultDisplay } from './ToolResultDisplay';
import { Loader2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CoderMessageProps {
  message: ChatMessage;
  index: number; // For React key
}

const CoderMessage: React.FC<CoderMessageProps> = ({ message, index }) => {
  // Check for specific "no content" assistant message and replace with "Completed."
  const isNoContentMessage = message.role === 'assistant' &&
    message.parts &&
    message.parts.length === 1 &&
    message.parts[0].type === 'text' &&
    message.parts[0].text === '(no content)';

  // Extract text content for the content prop
  const textContent = React.useMemo(() => {
    // If this is a "no content" message, display "Completed." instead
    if (isNoContentMessage) {
      return 'Completed.';
    }
    if (!message.parts || message.parts.length === 0) return message.content;

    // When we have parts, only use text from the parts, not the accumulated content
    let textParts = message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');

    // Remove [Result: ...] sections to avoid duplication
    textParts = textParts.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();

    return textParts; // Don't fall back to message.content when we have parts
  }, [message.parts, message.content, isNoContentMessage]);

  // Get full message content for copying
  const fullMessageContent = React.useMemo(() => {
    // If this is a "no content" message, use "Completed." for copying too
    if (isNoContentMessage) {
      return 'Completed.';
    }
    if (!message.parts || message.parts.length === 0) return message.content;

    let fullContent = '';
    message.parts.forEach(part => {
      if (part.type === 'text') {
        fullContent += part.text;
      } else if (part.type === 'tool_call') {
        fullContent += `\n\n[Tool Call: ${part.name}]\nArguments: ${JSON.stringify(part.input, null, 2)}\n`;
      } else if (part.type === 'tool_result') {
        fullContent += `\n[Tool Result]\n${JSON.stringify(part.content, null, 2)}\n`;
      }
    });

    return fullContent.trim() || message.content;
  }, [message.parts, message.content, isNoContentMessage]);

  // Create parts array for UIChatMessage - it expects a specific format
  const messageParts = React.useMemo(() => {
    if (!message.parts || message.parts.length === 0) return undefined;

    const parts: any[] = [];
    const toolCalls = new Map<string, any>();
    const toolResults = new Map<string, any>();

    // First pass: collect tool calls and results
    message.parts.forEach(part => {
      if (part.type === 'tool_call') {
        toolCalls.set(part.id, part);
      } else if (part.type === 'tool_result') {
        toolResults.set(part.tool_use_id, part);
      }
    });

    // Second pass: build parts array
    message.parts.forEach(part => {
      if (part.type === 'text') {
        // Filter out [Result: ...] sections from text parts
        const cleanedText = part.text.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();
        if (cleanedText) {
          parts.push({ type: 'text' as const, text: cleanedText });
        }
      } else if (part.type === 'tool_call') {
        // Check if we have a result for this tool call
        const hasResult = toolResults.has(part.id);
        const result = toolResults.get(part.id);

        parts.push({
          type: 'tool-invocation' as const,
          toolInvocation: {
            state: hasResult ? 'result' as const : 'call' as const,
            toolName: part.name,
            toolCallId: part.id,
            args: part.input,
            result: hasResult ? result.content : undefined
          }
        });
      }
      // Skip tool_result parts as they're already handled above
    });

    return parts.length > 0 ? parts : undefined;
  }, [message.parts]);

  // Get tool results map
  const toolResults = React.useMemo(() => {
    const results = new Map<string, any>();
    if (message.parts) {
      message.parts.forEach(part => {
        if (part.type === 'tool_result') {
          results.set(part.tool_use_id, part);
        }
      });
    }
    return results;
  }, [message.parts]);

  // Function to extract a short status from tool result
  const getResultStatus = (result: any): string => {
    if (!result || !result.content) return '';
    
    let content = result.content;
    if (typeof content === 'object' && content !== null && 'content' in content) {
      content = content.content;
    }
    
    const str = String(content);
    
    // Look for common status patterns
    const patterns = [
      /Found (\d+) (?:files?|matches?|results?)/i,
      /No files? found/i,
      /No matches? found/i,
      /Created (\d+) files?/i,
      /Updated (\d+) files?/i,
      /Deleted (\d+) files?/i,
      /(\d+) files? (?:total|matched)/i,
      /Successfully .+/i,
      /Failed to .+/i,
      /Error: .+/i
    ];
    
    for (const pattern of patterns) {
      const match = str.match(pattern);
      if (match) {
        return match[0].substring(0, 30);
      }
    }
    
    // If no pattern matched, try to extract a short summary
    const lines = str.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length <= 30) {
        return firstLine;
      }
      return firstLine.substring(0, 27) + '...';
    }
    
    return '';
  };

  // Render custom tool displays for better UX
  const renderParts = () => {
    if (!message.parts || message.parts.length === 0) return null;

    return message.parts.map((part, idx) => {
      if (part.type === 'text' && part.text) {
        // Filter out [Result: ...] sections
        const cleanedText = part.text.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();
        if (!cleanedText) return null;

        return (
          <div key={`text-${idx}`} className={`w-full overflow-hidden ${message.role === 'user' ? 'flex justify-end' : ''}`}>
            <UIChatMessage
              id={`${message.id}-text-${idx}`}
              role={message.role === 'user' ? 'user' : 'assistant'}
              content={cleanedText}
              animation="none"
              showTimeStamp={false}
              showCopyButton={false}
            />
          </div>
        );
      } else if (part.type === 'tool_call') {
        const hasResult = toolResults.has(part.id);
        const result = toolResults.get(part.id);
        const isDone = hasResult && !result?.isLoading; // Tool call is "done" if it has a result and isn't loading

        return (
          <Collapsible key={`tool-${idx}`} defaultOpen={true} className="space-y-1 border border-muted/50 rounded-lg p-1 my-1">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer">
                <ToolCallDisplay
                  toolName={part.name}
                  args={part.input}
                  isLoading={!hasResult && !result} // Only loading if no result at all
                  resultStatus={hasResult && result ? getResultStatus(result) : undefined}
                />
              </div>
            </CollapsibleTrigger>
            {isDone && ( /* Only render CollapsibleContent if the tool call is done */
              <CollapsibleContent>
                {hasResult && result && (
                  <ToolResultDisplay
                    toolName={part.name}
                    result={result.content}
                    isError={result.isError}
                  />
                )}
              </CollapsibleContent>
            )}
            {!isDone && hasResult && result && ( /* If not done but has a result (e.g. result is loading), show it non-collapsible for now */
              <ToolResultDisplay
                toolName={part.name}
                result={result.content}
                isError={result.isError}
              />
            )}
          </Collapsible>
        );
      } else if (part.type === 'tool_result') {
        // Tool results are shown with their corresponding tool call
        return null;
      }
      return null;
    });
  };

  // Use custom rendering if we have parts, otherwise use standard UIChatMessage
  if (message.parts && message.parts.length > 0) {
    return (
      <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'} relative group space-y-2`}>
        {renderParts()}
        {message.isStreaming && message.role === 'assistant' && (
          <div className="flex items-center justify-center gap-2 mt-2 w-full">
            <span className="text-xs text-muted-foreground italic opacity-60">Claude Code is working</span>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}
        {/* Copy button in hover row beneath message */}
        {!message.isStreaming && (
          <div className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${message.role === 'user' ? 'mt-2 justify-end' : 'mt-0.5 justify-start'}`}>
            <CopyButton content={fullMessageContent} copyMessage="Copied message to clipboard" />
          </div>
        )}
      </div>
    );
  }

  // Fallback to standard display for messages without parts
  return (
    <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'} relative group`}>
      <UIChatMessage
        id={message.id}
        role={message.role === 'user' ? 'user' : 'assistant'}
        content={textContent}
        animation="none"
        showTimeStamp={false}
        showCopyButton={false}
      />
      {message.isStreaming && message.role === 'assistant' && (
        <div className="flex items-center justify-center gap-2 mt-2 w-full">
          <span className="text-xs text-muted-foreground italic opacity-60">Claude Code is working</span>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* Copy button in hover row beneath message */}
      {!message.isStreaming && (
        <div className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${message.role === 'user' ? 'mt-2 justify-end' : 'mt-0.5 justify-start'}`}>
          <CopyButton content={fullMessageContent} copyMessage="Copied message to clipboard" />
        </div>
      )}
    </div>
  );
};

export default CoderMessage;