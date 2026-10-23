import { createContext, useContext, useState, type ReactNode } from "react";

const SearchCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SearchCtx.Provider value={{ open, setOpen }}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  return useContext(SearchCtx);
}
