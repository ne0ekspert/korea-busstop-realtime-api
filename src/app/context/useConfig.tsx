'use client';

import { create } from "zustand";

interface ConfigState {
  cityID: string | null;
  stationID: string | null;
  setCityID: (cityID: string | null) => void;
  setStationID: (stationID: string | null) => void;
}

// Create the Zustand store with types
const useConfig = create<ConfigState>((set) => ({
  cityID: null,
  stationID: null,
  setCityID: (cityID) => set({ cityID }),
  setStationID: (stationID) => set({ stationID }),
}));

export default useConfig;