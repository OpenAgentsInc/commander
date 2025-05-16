import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIElementsStore, UIPosition } from '@/stores/uiElementsStore';

describe('useUIElementsStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state
    useUIElementsStore.setState({
      elements: {
        chatWindow: {
          id: 'chatWindow',
          position: { x: 16, y: 450 },
          isPinned: false,
        },
      },
    });
    
    // Clear localStorage
    localStorage.clear();
  });

  it('should have an initial state with chatWindow element', () => {
    const state = useUIElementsStore.getState();
    expect(state.elements.chatWindow).toBeDefined();
    expect(state.elements.chatWindow.position).toEqual({ x: 16, y: 450 });
    expect(state.elements.chatWindow.isPinned).toBe(false);
  });

  it('should set element position via setElementPosition', () => {
    const store = useUIElementsStore.getState();
    store.setElementPosition('chatWindow', { x: 100, y: 200 });
    expect(store.elements.chatWindow.position).toEqual({ x: 100, y: 200 });
  });

  it('should create a new element if id does not exist on setElementPosition', () => {
    const store = useUIElementsStore.getState();
    store.setElementPosition('newElement', { x: 50, y: 50 });
    expect(store.elements.newElement).toBeDefined();
    expect(store.elements.newElement.position).toEqual({ x: 50, y: 50 });
    expect(store.elements.newElement.isPinned).toBe(false);
  });

  it('should pin an element and set its position via pinElement', () => {
    const store = useUIElementsStore.getState();
    store.pinElement('chatWindow', { x: 10, y: 20 });
    expect(store.elements.chatWindow.isPinned).toBe(true);
    expect(store.elements.chatWindow.position).toEqual({ x: 10, y: 20 });
  });

  it('should pin an element using its current position if no initial position is provided', () => {
    const store = useUIElementsStore.getState();
    store.setElementPosition('chatWindow', { x: 123, y: 456 });
    store.pinElement('chatWindow');
    expect(store.elements.chatWindow.isPinned).toBe(true);
    expect(store.elements.chatWindow.position).toEqual({ x: 123, y: 456 });
  });

  it('should unpin an element via unpinElement', () => {
    const store = useUIElementsStore.getState();
    store.pinElement('chatWindow');
    store.unpinElement('chatWindow');
    expect(store.elements.chatWindow.isPinned).toBe(false);
  });

  it('should get an element via getElement', () => {
    const store = useUIElementsStore.getState();
    const chatWindow = store.getElement('chatWindow');
    expect(chatWindow).toBeDefined();
    expect(chatWindow?.position).toEqual({ x: 16, y: 450 });
  });

  it('should return undefined for a non-existent element with getElement', () => {
    const store = useUIElementsStore.getState();
    const nonExistent = store.getElement('nonExistent');
    expect(nonExistent).toBeUndefined();
  });

  it('should create an element with default position via ensureElement if it does not exist', () => {
    const store = useUIElementsStore.getState();
    store.ensureElement('testElement', { x: 1, y: 1 });
    const testElement = store.getElement('testElement');
    expect(testElement).toBeDefined();
    expect(testElement?.position).toEqual({ x: 1, y: 1 });
  });

  it('should not change existing element via ensureElement', () => {
    const store = useUIElementsStore.getState();
    store.setElementPosition('testElement', { x: 1, y: 1 });
    store.ensureElement('testElement', { x: 2, y: 2 });
    const testElement = store.getElement('testElement');
    expect(testElement?.position).toEqual({ x: 1, y: 1 });
  });
});