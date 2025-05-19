import React, { useState, useEffect, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { X as IconX } from 'lucide-react';
import { Pane as PaneType } from '@/types/pane';
import { usePaneStore } from "@/stores/pane";

type PaneProps = PaneType & {
  children?: React.ReactNode;
  titleBarButtons?: React.ReactNode;
};

const useResizeHandlers = (
  id: string,
  initialPosition: { x: number; y: number },
  initialSize: { width: number; height: number },
  updatePanePosition: (id: string, x: number, y: number) => void,
  updatePaneSize: (id: string, width: number, height: number) => void
) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  useEffect(() => {
    setSize(initialSize);
  }, [initialSize.width, initialSize.height]);

  const minWidth = 200;
  const minHeight = 100;

  const resizeHandlers = {
    topleft: useDrag(({ movement: [deltaX, deltaY], memo = { x: position.x, y: position.y, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { x: position.x, y: position.y, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newX = memo.x + (memo.width - newWidth);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ x: newX, y: newY });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, newX, newY);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { x: newX, y: newY, width: newWidth, height: newHeight }; // Return memo for next event
    }),
    top: useDrag(({ movement: [, deltaY], memo = { y: position.y, height: size.height }, first, last }) => {
      if (first) memo = { y: position.y, height: size.height };
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ ...position, y: newY });
      setSize({ ...size, height: newHeight });
       if (last) {
          updatePanePosition(id, position.x, newY);
          updatePaneSize(id, size.width, newHeight);
      }
      return { y: newY, height: newHeight };
    }),
    topright: useDrag(({ movement: [deltaX, deltaY], memo = { y: position.y, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { y: position.y, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ ...position, y: newY });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, position.x, newY);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { y: newY, width: newWidth, height: newHeight };
    }),
    right: useDrag(({ movement: [deltaX], memo = { width: size.width }, first, last }) => {
      if (first) memo = { width: size.width };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      setSize({ ...size, width: newWidth });
      if (last) updatePaneSize(id, newWidth, size.height);
      return { width: newWidth };
    }),
    bottomright: useDrag(({ movement: [deltaX, deltaY], memo = { width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      const newHeight = Math.max(minHeight, memo.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
      if (last) updatePaneSize(id, newWidth, newHeight);
      return { width: newWidth, height: newHeight };
    }),
    bottom: useDrag(({ movement: [, deltaY], memo = { height: size.height }, first, last }) => {
      if (first) memo = { height: size.height };
      const newHeight = Math.max(minHeight, memo.height + deltaY);
      setSize({ ...size, height: newHeight });
      if (last) updatePaneSize(id, size.width, newHeight);
      return { height: newHeight };
    }),
    bottomleft: useDrag(({ movement: [deltaX, deltaY], memo = { x: position.x, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { x: position.x, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newX = memo.x + (memo.width - newWidth);
      const newHeight = Math.max(minHeight, memo.height + deltaY);

      setPosition({ ...position, x: newX });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, newX, position.y);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { x: newX, width: newWidth, height: newHeight };
    }),
    left: useDrag(({ movement: [deltaX], memo = { x: position.x, width: size.width }, first, last }) => {
      if (first) memo = { x: position.x, width: size.width };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newX = memo.x + (memo.width - newWidth);

      setPosition({ ...position, x: newX });
      setSize({ ...size, width: newWidth });
      if (last) {
          updatePanePosition(id, newX, position.y);
          updatePaneSize(id, newWidth, size.height);
      }
      return { x: newX, width: newWidth };
    }),
  };

  return { position, size, setPosition, resizeHandlers };
};

export const Pane: React.FC<PaneProps> = ({
  id,
  title,
  x: initialX,
  y: initialY,
  width: initialWidth,
  height: initialHeight,
  type,
  isActive,
  children,
  titleBarButtons,
  dismissable = true
}) => {
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const updatePanePosition = usePaneStore(state => state.updatePanePosition);
  const updatePaneSize = usePaneStore(state => state.updatePaneSize);
  const removePane = usePaneStore(state => state.removePane);
  const bringPaneToFront = usePaneStore(state => state.bringPaneToFront);
  const setActivePane = usePaneStore(state => state.setActivePane);

  const { position, size, setPosition, resizeHandlers } = useResizeHandlers(
    id,
    { x: initialX, y: initialY },
    { width: initialWidth, height: initialHeight },
    updatePanePosition,
    updatePaneSize
  );

  useEffect(() => {
    const updateBounds = () => {
      const handleSize = 50;
      setBounds({
        left: -size.width + handleSize,
        top: 0,
        right: window.innerWidth - handleSize,
        bottom: window.innerHeight - handleSize,
      });
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [size.width, size.height]);

  const bindDrag = useDrag(({ offset: [ox, oy], first, last, event }) => {
    event.stopPropagation();
    if (first) {
      bringPaneToFront(id);
      setActivePane(id);
    }
    const newX = Math.max(bounds.left, Math.min(ox, bounds.right));
    const newY = Math.max(bounds.top, Math.min(oy, bounds.bottom));
    setPosition({ x: newX, y: newY });
    if (last) {
      updatePanePosition(id, newX, newY);
    }
  }, {
    from: () => [position.x, position.y],
    bounds: bounds,
  });

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePane(id);
  };

  const handlePaneMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.title-bar-button-container')) {
        return;
    }
    bringPaneToFront(id);
    setActivePane(id);
  };

  const resizeHandleClasses = "absolute bg-transparent pointer-events-auto";
  const resizeHandleSize = '8px';
  const resizeHandleOffset = '-4px';

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 50 : 49,
      }}
      className={`pane-container pointer-events-auto flex flex-col bg-black/90 border rounded-lg overflow-hidden shadow-lg transition-all duration-100 ease-out ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border/20'}`}
      onMouseDownCapture={handlePaneMouseDown}
    >
      <div
        {...bindDrag()}
        className="pane-title-bar select-none touch-none bg-black text-white/90 border-b border-border/20 font-bold py-1.5 px-3 cursor-grab active:cursor-grabbing flex justify-between items-center h-8"
      >
        <span className="text-xs truncate">{title}</span>
        <div className="flex items-center space-x-1 title-bar-button-container">
          {titleBarButtons}
          {dismissable && (
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="ml-1 p-0.5 text-white/70 hover:text-destructive focus:outline-none rounded hover:bg-white/10"
              aria-label="Close pane"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="pane-content flex-grow text-white h-[calc(100%-2rem)] overflow-auto p-1">
        {children}
      </div>
      <div {...resizeHandlers.topleft()} style={{ top: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.top()} style={{ top: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.topright()} style={{ top: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.right()} style={{ top: resizeHandleSize, right: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomright()} style={{ bottom: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottom()} style={{ bottom: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomleft()} style={{ bottom: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.left()} style={{ top: resizeHandleSize, left: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
    </div>
  );
};