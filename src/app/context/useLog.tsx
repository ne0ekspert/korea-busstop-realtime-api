'use client';

import { create } from "zustand";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client";

interface LogState {
    items: ItemType[],
    setItems: (items: ItemType[]) => void;
};

const useLog = create<LogState>((set) => ({
    items: [],
    setItems: (items) => set({ items })
}));

export default useLog;