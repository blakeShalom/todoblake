import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./config";

const googleProvider = new GoogleAuthProvider();

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (isMobile()) {
    await signInWithRedirect(auth, googleProvider);
  } else {
    const result = await signInWithPopup(auth, googleProvider);
    await createOrUpdateUserProfile(result.user.uid, {
      email: result.user.email!,
      displayName: result.user.displayName!,
      photoURL: result.user.photoURL,
    });
    return result.user;
  }
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
}

export async function createOrUpdateUserProfile(
  uid: string,
  data: { email: string; displayName: string; photoURL: string | null }
) {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      uid,
      ...data,
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
