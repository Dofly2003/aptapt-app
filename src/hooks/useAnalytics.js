import { useEffect, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  initSession,
  setAnalyticsUser,
  logPageView,
  logAction,
  logDownload,
  logSearch,
  getPageName,
  getGeoInfo,
} from "../services/analyticsService";

export function useAnalytics() {
  const location = useLocation();
  const { user, role } = useContext(AuthContext);
  const enterTimeRef = useRef(null);
  const prevPathRef  = useRef(null);
  const initedRef    = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    initSession();
    // pre-fetch geo so first page_view has city data
    getGeoInfo();
  }, []);

  // Sync user identity whenever it changes
  useEffect(() => {
    setAnalyticsUser(user?.uid || null, role || null);
  }, [user?.uid, role]);

  // Track every route change
  useEffect(() => {
    const path = location.pathname;
    const name = getPageName(path);
    const now  = Date.now();

    const duration =
      prevPathRef.current !== null
        ? Math.round((now - enterTimeRef.current) / 1000)
        : null;

    logPageView(path, name, duration);

    prevPathRef.current  = path;
    enterTimeRef.current = now;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return {
    logAction:   (name, meta) => logAction(name, meta),
    logDownload: (type, fmt)  => logDownload(type, fmt),
    logSearch:   (q, page)   => logSearch(q, page),
  };
}
