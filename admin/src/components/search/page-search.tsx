"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type PageSearchValue = {
  query: string;
  setQuery: (value: string) => void;
};

const PageSearchContext = createContext<PageSearchValue | null>(null);

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return <PageSearchContext.Provider value={{ query, setQuery }}>{children}</PageSearchContext.Provider>;
}

export function usePageSearch() {
  const value = useContext(PageSearchContext);
  if (!value) {
    throw new Error("PageSearchProvider kerak");
  }
  return value;
}

export function matchesQuery(query: string, parts: Array<string | number | null | undefined>) {
  const needle = query.trim().toLocaleLowerCase("uz");
  if (!needle) return true;
  return parts.some((part) => String(part ?? "").toLocaleLowerCase("uz").includes(needle));
}
