import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

function RoleGuard({ roleRequired, children }) {
  const { role, isReady } = useContext(AuthContext);

  if (!isReady) {
    return null; // atau loading
  }

  if (role !== roleRequired) {
    return <Navigate to="/app-mobile" replace />;
  }

  return children;
}

export default RoleGuard;