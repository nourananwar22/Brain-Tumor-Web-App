import { useSyncExternalStore } from "react";
import { getUser, isAuthenticated, login, logout, subscribe, type AuthUser } from "@/lib/auth";

export function useAuth(): {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: typeof login;
  logout: typeof logout;
} {
  const authed = useSyncExternalStore(
    subscribe,
    () => isAuthenticated(),
    () => false,
  );
  const user = useSyncExternalStore(
    subscribe,
    () => getUser(),
    () => null,
  );
  return { isAuthenticated: authed, user, login, logout };
}
