// Modular auth service — swap the internals for a real API later
// without changing the UI. Public surface: login/logout/isAuthenticated/getUser/subscribe.

const STORAGE_KEY = "neuroscan_auth";

export type Role = "doctor" | "head";

export interface AuthUser {
  username: string;
  displayName: string;
  role: Role;
  /** Full physician name as it appears in patient records. Only for role="doctor". */
  physicianName?: string;
}

interface StoredAuth {
  user: AuthUser;
  loggedInAt: number;
  remember: boolean;
}

// Registered accounts (frontend-only demo). Passwords are hardcoded for demo.
interface Account {
  username: string;
  password: string;
  user: AuthUser;
}

const ACCOUNTS: Account[] = [
  {
    username: "doctor",
    password: "123456",
    user: {
      username: "doctor",
      displayName: "Dr. R. Okafor",
      role: "doctor",
      physicianName: "Dr. R. Okafor",
    },
  },
  {
    username: "nakamura",
    password: "123456",
    user: {
      username: "nakamura",
      displayName: "Dr. L. Nakamura",
      role: "doctor",
      physicianName: "Dr. L. Nakamura",
    },
  },
  {
    username: "bianchi",
    password: "123456",
    user: {
      username: "bianchi",
      displayName: "Dr. E. Bianchi",
      role: "doctor",
      physicianName: "Dr. E. Bianchi",
    },
  },
  {
    username: "head",
    password: "123456",
    user: {
      username: "head",
      displayName: "Dr. M. Ibrahim",
      role: "head",
    },
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: StoredAuth | null = null;
let hydrated = false;

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const s = safeStorage();
  if (!s) return;
  const raw = s.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    cache = JSON.parse(raw) as StoredAuth;
  } catch {
    cache = null;
  }
}

function persist(data: StoredAuth | null) {
  cache = data;
  const s = safeStorage();
  if (s) {
    if (data) s.setItem(STORAGE_KEY, JSON.stringify(data));
    else s.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

export function isAuthenticated(): boolean {
  hydrate();
  return cache !== null;
}

export function getUser(): AuthUser | null {
  hydrate();
  return cache?.user ?? null;
}

export async function login(
  username: string,
  password: string,
  remember = false,
): Promise<AuthUser> {
  await new Promise((r) => setTimeout(r, 400));

  const account = ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase(),
  );
  if (!account || account.password !== password) {
    throw new Error("Invalid username or password.");
  }

  persist({ user: account.user, loggedInAt: Date.now(), remember });
  return account.user;
}

export function logout(): void {
  persist(null);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
