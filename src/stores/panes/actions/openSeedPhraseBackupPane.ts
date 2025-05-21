import { type PaneInput } from '@/types/pane';
import { type PaneStoreType, type SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';
import { SEED_PHRASE_BACKUP_PANE_ID, SEED_PHRASE_BACKUP_PANE_TITLE } from '../constants';

export interface OpenSeedPhraseBackupPaneParams {
  seedPhrase: string;
}

export function openSeedPhraseBackupPaneAction(set: SetPaneStore, params: OpenSeedPhraseBackupPaneParams) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: SEED_PHRASE_BACKUP_PANE_ID,
      type: 'seed_phrase_backup_content',
      title: SEED_PHRASE_BACKUP_PANE_TITLE,
      content: { seedPhrase: params.seedPhrase },
      dismissable: false, // Not dismissable during backup process
      width: 500,
      height: 450,
    };
    return addPaneActionLogic(state, newPaneInput, true);
  });
}