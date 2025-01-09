'use client';

import { create } from "zustand";

interface ConfigState {
  cityID: string | null;
  stationID: string | null;
  latitude: number | null;
  longitude: number | null;
  setCityID: (cityID: string | null) => void;
  setStationID: (stationID: string | null) => void;
  setLatLong: (lat: number | null, long: number | null) => void;
}

// Create the Zustand store with types
const useConfig = create<ConfigState>((set) => ({
  cityID: null,
  stationID: null,
  latitude: null,
  longitude: null,
  setCityID: (cityID) => set({ cityID }),
  setStationID: (stationID) => set({ stationID }),
  setLatLong: (lat, long) => set({ latitude: lat, longitude: long }),
}));

export default useConfig;
