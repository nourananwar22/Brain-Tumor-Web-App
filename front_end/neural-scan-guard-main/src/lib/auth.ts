// Modular auth service — now backed by the real /login endpoint in app.py.
// Public surface unchanged: login/logout/isAuthenticated/getUser/subscribe.

const STORAGE_KEY = "neuroscan_auth";
const API_BASE = "http://127.0.0.1:8000";

export type Role = "doctor" | "head";

export interface AuthUser {
  username: string;
  displayName: string;
  role: Role;
  /** Full physician name as it appears in patient records. */
  physicianName?: string;
  /** Real DoctorID from MindScanDB — used to filter patients/diagnoses. */
  doctorId?: number;
}

interface StoredAuth {
  user: AuthUser;
  loggedInAt: number;
  remember: boolean;
}

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
  const formData = new FormData();
  formData.append("username", username.trim());
  formData.append("password", password);

  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail?.message || "Invalid username or password.");
  }

  const data = await response.json();

  const user: AuthUser = {
    username: data.username,
    displayName: data.display_name,
    role: data.role,
    physicianName: data.physician_name,
    doctorId: data.doctor_id,
  };

  persist({ user, loggedInAt: Date.now(), remember });
  return user;
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