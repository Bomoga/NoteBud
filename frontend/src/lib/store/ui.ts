import { create } from 'zustand';

type UiState = {
  isFocusMode: boolean;
  setIsFocusMode: (value: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isFocusMode: false,
  setIsFocusMode: (value) => set({ isFocusMode: value }),
}));

