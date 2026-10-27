import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiError } from "../api/client";
import type { PageMeta } from "../api/pos";

/**
 * Infinite-scroll loader for a paged endpoint. `fetchPage(page)` returns one
 * page; `pick` pulls that page's rows out of the response. Changing `deps`
 * restarts from page 1 while the previous rows stay visible (`stale`).
 */
export function usePaged<R extends PageMeta, T>(
  fetchPage: (page: number) => Promise<{ data: R }>,
  pick: (response: R) => T[],
  deps: unknown[],
  { refocus = true } = {},
) {
  const key = JSON.stringify(deps);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<R | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ fetchPage, pick });
  const request = useRef(0);

  useEffect(() => {
    latest.current = { fetchPage, pick };
  });

  const loadFirst = useCallback(async (requestKey: string) => {
    const id = ++request.current;
    try {
      const response = await latest.current.fetchPage(1);
      if (id === request.current) {
        setMeta(response.data);
        setItems(latest.current.pick(response.data));
        setError(null);
      }
    } catch (err) {
      if (id === request.current) setError(apiError(err));
    } finally {
      if (id === request.current) {
        setLoadedKey(requestKey);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadFirst(key);
  }, [loadFirst, key]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (refocus) void loadFirst(key);
    }, [loadFirst, key, refocus]),
  );

  const stale = loadedKey !== key;
  const hasMore = !!meta && meta.page < meta.pages && !stale;

  async function loadMore() {
    if (!meta || !hasMore || loadingMore) return;
    const id = request.current;
    setLoadingMore(true);
    try {
      const response = await latest.current.fetchPage(meta.page + 1);
      if (id === request.current) {
        setMeta(response.data);
        setItems((current) => [...current, ...latest.current.pick(response.data)]);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    items,
    meta,
    error,
    loading: loadedKey === null,
    stale,
    hasMore,
    loadingMore,
    loadMore,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      return loadFirst(key);
    },
    reload: () => loadFirst(key),
  };
}

/** Client-side paging for lists that already arrived in full: show `size` more at a time. */
export function useShowMore<T>(items: T[], size = 10) {
  const [limit, setLimit] = useState(size);
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
    showMore: () => setLimit((current) => current + size),
    reset: () => setLimit(size),
  };
}
