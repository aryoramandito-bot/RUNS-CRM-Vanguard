import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: AuthUser | null;
  isChecking: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TURSO_URL = 'libsql://runs-vanguard-crm-aryoramandito.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI3OTg0MzAsImlkIjoiMDE5ZjE2MjUtYTQwMS03MzY4LWIwNTEtNGNkNGZiZDA4ZjU2Iiwia2lkIjoiN1ROMUFUclFnTGtiRDAxUzVRQUsyS1QxZXQ4cHZjLVd4bkJhUEN3UTdlbyIsInJpZCI6IjUxN2I0Yzg5LWNkMjEtNDZiNi05ODY1LWE3NTI0YzU0NmEwYiJ9.XVYu41CGLIYW5LvdMohufmfKmzRC798WyGmJYi8S7oRXzqC7J16zHR7chFNSkKeHR_uX4cTI8ASLVVl6ZO10Bg';
const SESSION_KEY = 'vanguard_session';

// SHA-256 hash using Web Crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function queryTurso(sql: string, args: (string | number | null)[] = []) {
  const response = await fetch(`${TURSO_URL.replace('libsql://', 'https://')}/v3/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt: { sql, args: args.map(v => ({ type: 'text', value: String(v ?? '') })) } }, { type: 'close' }]
    }),
  });
  if (!response.ok) throw new Error(`Turso error: ${response.status}`);
  return response.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Restore session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        if (parsed.id && parsed.email && parsed.name && parsed.role) {
          setUser(parsed);
        }
      }
    } catch { /* ignore */ }
    setIsChecking(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const hash = await sha256(normalizedEmail + ':' + password);

      const result = await queryTurso(
        'SELECT id, email, name, role FROM users WHERE email = ? AND password_hash = ? LIMIT 1',
        [normalizedEmail, hash]
      );

      const rows = result?.results?.[0]?.response?.result?.rows ?? [];
      if (rows.length === 0) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const row = rows[0];
      const loggedInUser: AuthUser = {
        id: row[0]?.value ?? '',
        email: row[1]?.value ?? '',
        name: row[2]?.value ?? '',
        role: (row[3]?.value === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return { success: true, message: 'Login successful.' };
    } catch (err: any) {
      return { success: false, message: `Authentication error: ${err.message}` };
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isChecking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
