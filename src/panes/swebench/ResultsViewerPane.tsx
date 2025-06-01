import React from "react";
import type { Pane } from "@/types/pane";

export const ResultsViewerPane: React.FC<Pane> = ({ id, title, content }) => {
  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p>Results Viewer Pane Content - ID: {id}</p>
      {/* Run selection dropdown, results table, patch viewer will go here */}
    </div>
  );
};