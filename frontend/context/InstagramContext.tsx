'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getInstagramAccounts, selectInstagramAccount } from '@/lib/api';

export interface IgAccount {
  instagram_account_id: string;
  instagram_username: string;
  is_selected: boolean;
}

interface InstagramCtxValue {
  accounts: IgAccount[];
  selectedAccount: IgAccount | null;
  connected: boolean | null; // null = yuklanmoqda
  refresh: () => void;
  selectAccount: (igId: string) => Promise<void>;
}

const InstagramCtx = createContext<InstagramCtxValue>({
  accounts: [],
  selectedAccount: null,
  connected: null,
  refresh: () => {},
  selectAccount: async () => {},
});

export function InstagramProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<IgAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getInstagramAccounts()
      .then(list => setAccounts(list ?? []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectAccount = useCallback(async (igId: string) => {
    await selectInstagramAccount(igId);
    setAccounts(prev => prev.map(a => ({ ...a, is_selected: a.instagram_account_id === igId })));
  }, []);

  const selectedAccount = accounts.find(a => a.is_selected) ?? accounts[0] ?? null;
  const connected = loading ? null : accounts.length > 0;

  return (
    <InstagramCtx.Provider value={{ accounts, selectedAccount, connected, refresh, selectAccount }}>
      {children}
    </InstagramCtx.Provider>
  );
}

export const useInstagram       = () => useContext(InstagramCtx);
export const useInstagramStatus = () => useContext(InstagramCtx).connected;
export const useInstagramRefresh = () => useContext(InstagramCtx).refresh;
