// src/components/hud/Nip90DashboardButton.tsx
import React from "react";
import { Cpu } from "lucide-react"; // Using Cpu icon to represent computational services
import { Button } from "@/components/ui/button";
import { usePaneStore } from "@/stores/pane";

/**
 * Button component that opens the NIP-90 DVM Dashboard pane when clicked.
 * Positioned in the HUD for easy access.
 */
const Nip90DashboardButton: React.FC = () => {
  const openNip90Dashboard = usePaneStore(
    (state) => state.openNip90DashboardPane,
  );

  return (
    <Button
      onClick={openNip90Dashboard}
      variant="outline"
      size="icon"
      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border fixed bottom-4 left-[10rem] z-[10000] !rounded-full p-2 shadow-lg"
      aria-label="Open NIP-90 Dashboard"
      title="NIP-90 DVM Dashboard"
    >
      <Cpu className="text-muted-foreground h-4 w-4" />
    </Button>
  );
};

export default Nip90DashboardButton;
