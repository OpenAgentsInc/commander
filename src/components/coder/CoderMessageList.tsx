import React from 'react';
import { ChatMessage } from '@/hooks/coder/useCoderChat';
import CoderMessage from './CoderMessage';

interface CoderMessageListProps {
  messages: ChatMessage[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  handleTouchStart: () => void;
  isStreamingLastMessage: boolean; // To potentially show a global streaming indicator at the bottom
}

const CoderMessageList: React.FC<CoderMessageListProps> = ({
  messages,
  containerRef,
  handleScroll,
  handleTouchStart,
  isStreamingLastMessage
}) => {
  return (
    <div 
      ref={containerRef}
      className="flex-1 min-h-0 overflow-auto"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
    >
      <div
        className="p-4 min-h-full flex flex-col"
      >
        <div className="max-w-[750px] mx-auto w-full flex-1 flex flex-col justify-end">
          <div className="flex flex-col gap-4">
            {messages
              .filter(msg => msg.role !== 'system') // Don't show system messages
              .map((message, idx) => (
                <CoderMessage key={message.id || idx} message={message} index={idx} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CoderMessageList);