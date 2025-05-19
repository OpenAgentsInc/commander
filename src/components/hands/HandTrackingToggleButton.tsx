import React from 'react';
import { Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HandTrackingToggleButtonProps {
  isHandTrackingActive: boolean;
  onToggle: () => void;
  className?: string;
}

const HandTrackingToggleButton: React.FC<HandTrackingToggleButtonProps> = ({
  isHandTrackingActive,
  onToggle,
  className = '',
}) => {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="icon"
      className={`fixed bottom-4 left-16 z-[10000] p-2 !rounded-full shadow-lg transition-colors duration-200 ease-in-out ${
        isHandTrackingActive ? 'bg-primary/90 text-primary-foreground border-primary hover:bg-primary' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border'
      } ${className}`}
      aria-label={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
      title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
    >
      <Hand className="h-4 w-4 text-foreground" />
    </Button>
  );
};

export default HandTrackingToggleButton;