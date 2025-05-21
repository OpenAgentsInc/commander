import React from 'react';
import { cn } from '@/utils/tailwind';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isMacOs } from '@/utils/os';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  isGhost?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  isGhost,
  className,
}) => {
  const modifierPrefix = isMacOs() ? '⌘' : 'Ctrl+';
  const shortcutText = `${modifierPrefix}${slotNumber}`;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={title || `Hotbar slot ${slotNumber}`}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            isActive && "bg-primary/20 border-primary ring-1 ring-primary",
            isGhost && "opacity-30 hover:opacity-50 cursor-default",
            className
          )}
          disabled={isGhost}
        >
          {children}
          {!isGhost && (
            <div className="absolute bottom-0.5 right-0.5 flex items-center text-[0.6rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm leading-none">
              <span className="font-sans">{modifierPrefix}</span>
              <span>{slotNumber}</span>
            </div>
          )}
        </button>
      </TooltipTrigger>
      {!isGhost && (
        <TooltipContent side="top" sideOffset={5}>
          <p>{title || `Slot ${slotNumber}`} ({shortcutText})</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};