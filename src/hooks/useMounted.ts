"use client";

import { useEffect, useState } from "react";

/**
 * True after first client render. Gates localStorage-backed state so the
 * server-rendered markup never mismatches the hydrated markup.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
