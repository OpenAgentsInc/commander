import { type KeyboardControlsEntry } from '@react-three/drei';

export enum AppControls {
  HOTBAR_1 = 'HOTBAR_1',
  HOTBAR_2 = 'HOTBAR_2',
  HOTBAR_3 = 'HOTBAR_3',
  HOTBAR_4 = 'HOTBAR_4',
  HOTBAR_5 = 'HOTBAR_5',
  // Add HOTBAR_6 through HOTBAR_9 if needed for future expansion
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.HOTBAR_1, keys: ['Digit1', 'Numpad1'] },
  { name: AppControls.HOTBAR_2, keys: ['Digit2', 'Numpad2'] },
  { name: AppControls.HOTBAR_3, keys: ['Digit3', 'Numpad3'] },
  { name: AppControls.HOTBAR_4, keys: ['Digit4', 'Numpad4'] },
  { name: AppControls.HOTBAR_5, keys: ['Digit5', 'Numpad5'] },
  // Define for 6-9 as well if needed in the future
];