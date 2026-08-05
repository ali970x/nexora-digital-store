'use client';

import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

type CurrencyState = {
  currency: string;
  setCurrency: (currency: string) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'USD',
      setCurrency: (currency) => set({currency})
    }),
    {name: 'nexora-currency', storage: createJSONStorage(() => localStorage)}
  )
);
