import React from "react";
import GemmaChat from "./GemmaChat";

export const GemmaPane: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <GemmaChat />
    </div>
  );
};

export default GemmaPane;