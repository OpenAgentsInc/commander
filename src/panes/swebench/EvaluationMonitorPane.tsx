import React from "react";
import type { Pane } from "@/types/pane";

export const EvaluationMonitorPane: React.FC<Pane> = ({ id, title, content }) => {
  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p>Evaluation Monitor Pane Content - ID: {id}</p>
      {/* Progress bar, log output, stop button will go here */}
    </div>
  );
};