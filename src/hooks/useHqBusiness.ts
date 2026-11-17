import { useEffect, useState } from "react";
const KEY = "liftor_hq_business";
/** Selected business for Liftor HQ (null = all businesses). Stored locally so it survives page changes. */
export function useHqBusiness() {
  const [id, setId] = useState<string | null>(() => localStorage.getItem(KEY) || null);
  useEffect(() => { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); }, [id]);
  return [id, setId] as const;
}
