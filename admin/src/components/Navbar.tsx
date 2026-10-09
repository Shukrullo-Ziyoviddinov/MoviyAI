"use client";

import { usePathname } from "next/navigation";
import { isNavActive, navItems } from "@/components/nav";
import { usePageSearch } from "@/components/search/page-search";

function NavSearch({ placeholder }: { placeholder: string }) {
  const { query, setQuery } = usePageSearch();

  return (
    <label className="relative block w-full">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6B7280]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-[#1E4FD6] bg-[#030308] pr-3 pl-10 text-sm text-[#F3F4F6] outline-none placeholder:text-[#6B7280]"
      />
    </label>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const current = navItems.find((item) => isNavActive(pathname, item.href));
  const searchPlaceholder = isNavActive(pathname, "/movies")
    ? "Kino qidirish"
    : isNavActive(pathname, "/actors")
      ? "Aktyor qidirish"
      : "";

  return (
    <header className="grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_minmax(16rem,32rem)_minmax(0,1fr)] items-center gap-4 border-b border-[rgba(40,70,130,0.35)] bg-[#070A12] px-6">
      <h1 className="truncate text-[20px] font-bold text-[#F3F4F6]">
        {current?.label ?? "Bosh sahifa"}
      </h1>
      {searchPlaceholder ? <NavSearch placeholder={searchPlaceholder} /> : <span />}
      <span className="flex w-fit items-center justify-self-end gap-2.5 rounded-full border border-[#1E4FD6] bg-[#101624] px-3 py-1.5 text-sm font-medium text-[#F3F4F6] shadow-[0_0_0_3px_rgba(30,79,214,0.18)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E4FD6] text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M5 19.5C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 19.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        Admin
      </span>
    </header>
  );
}
