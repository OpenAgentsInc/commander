import React, { useState } from "react";
import { HandTracking } from "@/components/hands";
import { ChatContainer } from "@/components/chat";

export default function HomePage() {
  const [showHandTracking, setShowHandTracking] = useState(false);

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Hand tracking component */}
      <HandTracking
        showHandTracking={showHandTracking}
        setShowHandTracking={setShowHandTracking}
      />

      {/* UI Overlay with pointer events disabled except for UI elements */}
      <div className="relative w-full h-full flex" style={{ pointerEvents: 'none' }}>
        {/* Chat container positioned at bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-[32rem] p-1"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="h-80">
            <ChatContainer
              systemMessage="You are an AI agent inside an app used by a human called Commander. When asked, identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences."
              model="gemma3:1b"
            />
          </div>
        </div>
      </div>
    </div>
  );
}