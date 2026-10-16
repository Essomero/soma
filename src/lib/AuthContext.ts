import { createContext, useContext } from "react";

export const AuthContext = createContext<{ isOwner: boolean }>({ isOwner: false });

export function useAuth() {
  return useContext(AuthContext);
}
