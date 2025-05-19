import { Pane } from '@/types/pane';
import { PANE_OFFSET, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT, PANE_MARGIN } from '../constants';

export function calculateNewPanePosition(
  existingPanes: Pane[],
  lastPanePosition: { x: number; y: number; width: number; height: number } | null
): { x: number; y: number; width: number; height: number } {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  if (lastPanePosition) {
    let newX = lastPanePosition.x + PANE_OFFSET;
    let newY = lastPanePosition.y + PANE_OFFSET;

    if (newX + DEFAULT_PANE_WIDTH > screenWidth - PANE_MARGIN) {
      newX = PANE_MARGIN * 2;
    }
    if (newY + DEFAULT_PANE_HEIGHT > screenHeight - PANE_MARGIN) {
      newY = PANE_MARGIN * 2;
    }
    return { x: newX, y: newY, width: DEFAULT_PANE_WIDTH, height: DEFAULT_PANE_HEIGHT };
  }

  return {
    x: PANE_MARGIN,
    y: PANE_MARGIN,
    width: DEFAULT_PANE_WIDTH,
    height: DEFAULT_PANE_HEIGHT,
  };
}