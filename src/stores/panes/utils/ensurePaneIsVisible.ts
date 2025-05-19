import { Pane } from '@/types/pane';
import { PANE_MARGIN } from '../constants';

export function ensurePaneIsVisible(pane: Pane): Pane {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  let { x, y, width, height } = pane;

  width = Math.max(width, 200);
  height = Math.max(height, 100);

  if (x + width > screenWidth - PANE_MARGIN) {
    x = screenWidth - width - PANE_MARGIN;
  }
  if (y + height > screenHeight - PANE_MARGIN) {
    y = screenHeight - height - PANE_MARGIN;
  }

  x = Math.max(x, PANE_MARGIN);
  y = Math.max(y, PANE_MARGIN);

  width = Math.min(width, screenWidth - x - PANE_MARGIN);
  height = Math.min(height, screenHeight - y - PANE_MARGIN);

  return { ...pane, x, y, width, height };
}