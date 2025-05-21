import React from "react";
import { usePaneStore } from "@/stores/pane";

// Placeholder for IconRefresh if not available
const IconRefresh = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path
      fillRule="evenodd"
      d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
    />
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
  </svg>
);

// Basic Button component (can be replaced by your UI library's Button)
const Button = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
}) => (
  <button
    {...props}
    className={`bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded px-3 py-1.5 text-xs ${props.className || ""}`}
  >
    {children}
  </button>
);

const ResetHUDButton: React.FC = () => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);

  const handleReset = () => {
    resetHUDState();
  };

  return (
    <Button
      onClick={handleReset}
      className="fixed bottom-4 left-4 z-[10000] !rounded-full p-2 shadow-lg" // Added !rounded-full for higher specificity
      aria-label="Reset HUD"
    >
      <IconRefresh />
    </Button>
  );
};

export default ResetHUDButton;
