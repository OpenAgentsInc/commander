import { Moon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
// No need for theme_helpers here anymore if it's just an indicator

export default function ToggleTheme() {
  return (
    <Button
      size="icon"
      title="Dark Mode (Forced)"
      aria-disabled="true"
      className="cursor-default opacity-75" // Style to look non-interactive
      onClick={(e) => e.preventDefault()} // Prevent any action
    >
      <Moon size={16} />
    </Button>
  );
}
