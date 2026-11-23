"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Auth restoration must not wait on Firestore. A suspended app may resume
      // offline, and setDoc can remain pending while the user is already known.
      setUser(user);
      setLoading(false);

      if (user) {
        void createOrUpdateUserProfile(user.uid, {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL,
        }).catch((error) => {
          console.error("Failed to update user profile", error);
        });
      }
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
