import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ToolResultDisplayProps {
  toolName?: string;
  toolCallId?: string;
  result: any;
  isError?: boolean;
}

const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolName, toolCallId, result, isError }) => {
  const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const borderColor = isError ? "border-red-500/50" : "border-green-500/50";
  const bgColor = isError ? "bg-red-900/20" : "bg-green-900/20";
  const textColor = isError ? "text-red-300" : "text-green-300";
  const contentTextColor = isError ? "text-red-200" : "text-green-200";

  return (
    <Card className={`my-2 ${borderColor} ${bgColor} text-white`}>
      <CardHeader className="p-2">
        <CardTitle className={`text-xs font-semibold ${textColor}`}>
          Tool Result {toolName && `for ${toolName}`} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
          {isError && " (Error)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
         <ScrollArea className="max-h-60">
          <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-1 rounded`}>
            {resultString}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ToolResultDisplay;