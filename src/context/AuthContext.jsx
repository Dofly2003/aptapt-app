import { createContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [role, setRole]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [needsSetup, setNeedsSetup]       = useState(false);
  const [authError, setAuthError]         = useState(false);
  const [guestPermissions, setGuestPermissions] = useState(null);
  const [guestExpired, setGuestExpired]   = useState(false);

  const isReady = !loading && (user
    ? (role !== null || needsSetup || authError || guestExpired)
    : true
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setNeedsSetup(false);
      setAuthError(false);
      setGuestExpired(false);
      setGuestPermissions(null);

      if (currentUser) {
        setUser(currentUser);

        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));

          if (snap.exists()) {
            const data = snap.data();

            // Paksa logout jika akun dinonaktifkan
            if (data.disabled === true) {
              await signOut(auth);
              setUser(null);
              setRole(null);
              setProfile(null);
              setLoading(false);
              return;
            }

            setProfile(data);
            setRole(data.role ?? null);

            if (data.role === "guest") {
              // Baca dari users doc langsung (permissions disimpan saat createGuestAccount)
              const isActive  = data.guestIsActive !== false;
              const expiry    = data.guestExpiresAt;
              const isExpired = expiry
                ? (expiry.toDate ? expiry.toDate() : new Date(expiry)) < new Date()
                : false;

              if (!isActive || isExpired) {
                await signOut(auth);
                setUser(null);
                setRole(null);
                setProfile(null);
                setGuestExpired(true);
                setLoading(false);
                return;
              }

              setGuestPermissions(data.guestPermissions ?? null);
            }
          } else {
            setProfile(null);
            setRole(null);
            setNeedsSetup(true);
          }
        } catch (error) {
          console.error("[AuthContext] gagal fetch profil:", error);
          setProfile(null);
          setRole(null);
          setAuthError(true);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      role,
      profile,
      loading,
      isReady,
      needsSetup,
      authError,
      guestPermissions,
      guestExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
