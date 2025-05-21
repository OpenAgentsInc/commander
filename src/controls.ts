import { type KeyboardControlsEntry } from '@react-three/drei';

export enum AppControls {
  HOTBAR_1 = 'HOTBAR_1',
  HOTBAR_2 = 'HOTBAR_2',
  HOTBAR_3 = 'HOTBAR_3',
  // Slots 4-9 are empty
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.HOTBAR_1, keys: ['Digit1', 'Numpad1'] },
  { name: AppControls.HOTBAR_2, keys: ['Digit2', 'Numpad2'] },
  { name: AppControls.HOTBAR_3, keys: ['Digit3', 'Numpad3'] },
  // Slots 4-9 are empty
];