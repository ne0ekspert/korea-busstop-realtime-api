'use client';

import { create } from "zustand";

interface ModalState {
    openWeather: boolean;
    openRoute: boolean;
    setOpenWeather: (state: boolean) => void;
    setOpenRoute: (state: boolean) => void;
}

const useModal = create<ModalState>((set) => ({
    openWeather: false,
    openRoute: false,
    setOpenWeather: (openWeather) => set({ openWeather }),
    setOpenRoute: (openRoute) => set({ openRoute })
}));

export default useModal;