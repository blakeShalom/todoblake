"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { createOrUpdateUserProfile } from "@/lib/firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await createOrUpdateUserProfile(result.user.uid, {
          email: result.user.email!,
          displayName: result.user.displayName!,
          photoURL: result.user.photoURL,
        });
      }
    }).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await createOrUpdateUserProfile(user.uid, {
          email: user.email!,
          displayName: user.displayName!,
          photoURL: user.photoURL,
        });
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
