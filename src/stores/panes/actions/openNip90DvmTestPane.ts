import { type PaneInput } from '@/types/pane';
import { type PaneStoreType, type SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';
import { NIP90_DVM_TEST_PANE_ID, NIP90_DVM_TEST_PANE_TITLE } from '../constants';

export function openNip90DvmTestPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(p => p.id === NIP90_DVM_TEST_PANE_ID);
    if (existingPane) {
      // Logic to bring existing pane to front (similar to bringPaneToFrontAction)
      const newPanes = state.panes
        .map(p => ({ ...p, isActive: p.id === NIP90_DVM_TEST_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Active panes go to the end (higher z-index)
      
      return { 
        ...state, 
        panes: newPanes, 
        activePaneId: NIP90_DVM_TEST_PANE_ID, 
        lastPanePosition: { 
          x: existingPane.x, 
          y: existingPane.y, 
          width: existingPane.width, 
          height: existingPane.height 
        } 
      };
    }

    const newPaneInput: PaneInput = {
      id: NIP90_DVM_TEST_PANE_ID,
      type: 'nip90_dvm_test',
      title: NIP90_DVM_TEST_PANE_TITLE,
      dismissable: true,
    };
    
    const changes = addPaneActionLogic(state, newPaneInput, true);
    return { ...state, ...changes };
  });
}