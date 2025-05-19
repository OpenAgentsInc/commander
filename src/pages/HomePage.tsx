import React from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import ResetHUDButton from "@/components/ResetHUDButton";

export default function HomePage() {
  return (
    // This container ensures the pane system uses the available space within the main layout.
    // It's relative for absolute positioning of panes and grid.
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <ResetHUDButton /> {/* Add the reset button to the HUD */}
    </div>
  );
}