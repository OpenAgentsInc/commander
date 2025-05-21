export const isMacOs = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }
  // Fallback for non-browser environments if window.electronAPI.platform is available from preload
  if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
    return (window as any).electronAPI.platform === 'darwin';
  }
  // Default if platform cannot be determined, assuming non-Mac for Ctrl key display
  return false;
};