'use client';

import { create } from "zustand";

interface ModalState {
    openWeather: boolean;
    openRoute: boolean;
    latitude: number | null;
    longitude: number | null;
    setOpenWeather: (state: boolean) => void;
    setOpenRoute: (state: boolean) => void;
    setDestination: (lat: number, long: number) => void;
}

const useModal = create<ModalState>((set) => ({
    openWeather: false,
    openRoute: false,
    latitude: null,
    longitude: null,
    setOpenWeather: (openWeather) => set({ openWeather }),
    setOpenRoute: (openRoute) => set({ openRoute }),
    setDestination: (lat, long) => set({ latitude: lat, longitude: long })
}));

export default useModal;