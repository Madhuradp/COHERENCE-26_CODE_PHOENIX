"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserResponse } from "./api";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  patientId: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: UserResponse) => void;
  logout: () => void;
  setPatientId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    patientId: null,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    const patientId = localStorage.getItem("patientId");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as UserResponse;
        setState({ token, user, patientId });
      } catch {
        // corrupted storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  function login(token: string, user: UserResponse) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setState((prev) => ({ ...prev, token, user }));
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("patientId");
    setState({ token: null, user: null, patientId: null });
    router.push("/login");
  }

  function setPatientId(id: string) {
    localStorage.setItem("patientId", id);
    setState((prev) => ({ ...prev, patientId: id }));
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setPatientId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
