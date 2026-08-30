import { useGuestPermission } from "../hooks/useGuestPermission";

const LEVELS = { none: 0, read: 1, write_approval: 2, write: 3 };

/**
 * Renders children only when guest permission meets the required level.
 * Non-guest users always pass (they have full write access).
 *
 * @param {string} module - e.g. "rab", "keuangan"
 * @param {"read"|"write"|"write_approval"} require - minimum level required
 * @param {"web"|"mobile"} platform
 * @param {React.ReactNode} fallback - shown when access denied
 */
export function PermissionGate({ module, require = "read", platform = "web", fallback = null, children }) {
  const permission = useGuestPermission(module, platform);
  const hasAccess = LEVELS[permission] >= LEVELS[require];
  return hasAccess ? children : fallback;
}

export default PermissionGate;
