import { useEffect, useState } from "react";
import { apiFetch, getCachedApiData } from "./client";

export function useCachedApi(path, fallbackData) {
  const cached = getCachedApiData(path);
  const [data, setData] = useState(cached !== undefined ? cached : fallbackData);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const cachedData = getCachedApiData(path);

    if (cachedData !== undefined) {
      setData(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");

    async function load() {
      try {
        const fresh = await apiFetch(path);
        if (!cancelled) setData(fresh);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, setData, loading, error, setError };
}
