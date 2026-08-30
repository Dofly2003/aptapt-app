// src/hooks/useContent.js
// React hooks that wrap the content service and expose { data, loading, error, refetch }.
// Includes a tiny in-memory cache so navigating around the site doesn't refetch every time.

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getActiveSlides,
  getActiveServices,
  getActiveProjects,
  getActiveTestimonials,
  getSettings,
} from '../services/contentService';

const cache = new Map();
const TTL_MS = 60_000; // 1 minute soft cache

function useFetch(key, fetcher) {
  const [data, setData] = useState(() => {
    const c = cache.get(key);
    return c && Date.now() - c.ts < TTL_MS ? c.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (force = false) => {
      const c = cache.get(key);
      if (!force && c && Date.now() - c.ts < TTL_MS) {
        setData(c.data);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const result = await fetcher();
        cache.set(key, { data: result, ts: Date.now() });
        if (mounted.current) setData(result);
      } catch (err) {
        console.error(`[useContent:${key}]`, err);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [key, fetcher]
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return { data, loading, error, refetch: () => load(true) };
}

export const useSlides = () => useFetch('slides', getActiveSlides);
export const useServices = () => useFetch('services', getActiveServices);
export const useProjects = () => useFetch('projects', getActiveProjects);
export const useTestimonials = () => useFetch('testimonials', getActiveTestimonials);
export const useSettings = () => useFetch('settings', getSettings);

/** Manually invalidate the cache after mutations from the admin panel. */
export function invalidateContent(key) {
  if (!key) cache.clear();
  else cache.delete(key);
}