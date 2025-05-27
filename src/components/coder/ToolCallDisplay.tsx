import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ToolCallDisplayProps {
  toolName: string;
  toolCallId?: string;
  args: Record<string, any>;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolName, toolCallId, args }) => {
  return (
    <Card className="my-2 border-blue-500/50 bg-black text-blue-300">
      <CardHeader className="p-2">
        <CardTitle className="text-xs font-semibold">
          Tool Call: {toolName} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="max-h-40">
          <pre className="text-xs text-blue-200 whitespace-pre-wrap bg-gray-900/50 p-1 rounded">
            Args: {JSON.stringify(args, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ToolCallDisplay;