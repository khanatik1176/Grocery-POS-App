import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiError } from "../api/client";

/**
 * Loads data for a screen, reloads whenever the screen regains focus, and
 * exposes pull-to-refresh state. `loading` is true only until the first
 * result arrives, so later reloads keep the current content on screen while
 * `pending` reports that a newer request is in flight.
 */
export function useLoad<T>(load: () => Promise<{ data: T }>, deps: unknown[], { refocus = true } = {}) {
  const key = JSON.stringify(deps);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(load);
  const request = useRef(0);

  useEffect(() => {
    latest.current = load;
  });

  const fetch = useCallback(async (requestKey: string) => {
    const id = ++request.current;
    try {
      const response = await latest.current();
      if (id === request.current) {
        setData(response.data);
        setError(null);
      }
    } catch (err) {
      if (id === request.current) {
        setError(apiError(err));
      }
    } finally {
      if (id === request.current) {
        setSettledKey(requestKey);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetch(key);
  }, [fetch, key]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (refocus) {
        void fetch(key);
      }
    }, [fetch, key, refocus]),
  );

  return {
    data,
    setData,
    error,
    setError,
    loading: data === null && settledKey === null,
    pending: settledKey !== key,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      return fetch(key);
    },
    reload: () => fetch(key),
  };
}
