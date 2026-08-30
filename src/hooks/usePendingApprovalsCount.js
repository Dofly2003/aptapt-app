import { useEffect, useState, useContext, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { AuthContext } from "../context/AuthContext";

export function usePendingApprovalsCount() {
  const { role } = useContext(AuthContext);
  const [count, setCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const prevCountRef = useRef(null);

  useEffect(() => {
    if (role !== "admin" && role !== "superadmin") return;

    const q = query(
      collection(db, "pending_approvals"),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      const newCount = snap.size;
      if (prevCountRef.current !== null && newCount > prevCountRef.current) {
        setHasNew(true);
      }
      prevCountRef.current = newCount;
      setCount(newCount);
    });
    return unsub;
  }, [role]);

  const clearNew = () => setHasNew(false);
  return { count, hasNew, clearNew };
}
