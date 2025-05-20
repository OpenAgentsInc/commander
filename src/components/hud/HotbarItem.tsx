import React from 'react';
import { cn } from '@/utils/tailwind';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title || `Hotbar slot ${slotNumber}`}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        isActive && "bg-primary/20 border-primary ring-1 ring-primary",
        className
      )}
    >
      {children}
      <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
        {slotNumber}
      </span>
    </button>
  );
};