import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const LEVELS = { none: 0, read: 1, write_approval: 2, write: 3 };

export function useGuestPermission(module, platform = "web") {
  const { role, guestPermissions } = useContext(AuthContext);
  if (role !== "guest") return "write";
  if (!guestPermissions) return "none";
  return guestPermissions[platform]?.[module] ?? "none";
}

export function useCanRead(module, platform = "web") {
  const perm = useGuestPermission(module, platform);
  return LEVELS[perm] >= LEVELS.read;
}

export function useCanWrite(module, platform = "web") {
  const perm = useGuestPermission(module, platform);
  return LEVELS[perm] >= LEVELS.write;
}

export function useNeedsApproval(module, platform = "web") {
  const perm = useGuestPermission(module, platform);
  return perm === "write_approval";
}

export function useGuestPermissionMap(platform = "web") {
  const { role, guestPermissions } = useContext(AuthContext);
  if (role !== "guest") return null;
  return guestPermissions?.[platform] ?? {};
}
