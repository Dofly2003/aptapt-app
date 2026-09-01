import { useAnalytics } from "../hooks/useAnalytics";

// Invisible component — mounts the analytics hook for the whole app.
// Place once inside BrowserRouter so useLocation is available.
export default function AnalyticsTracker() {
  useAnalytics();
  return null;
}
