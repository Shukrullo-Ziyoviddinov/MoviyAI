"use client";

import { useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";

type MovieAboutProps = {
  text?: string;
  year?: number;
  country?: string;
  duration?: number;
  director?: string;
};

export function MovieAbout({
  text,
  year,
  country,
  duration,
  director,
}: MovieAboutProps) {
  const [open, setOpen] = useState(false);

  if (!text) return null;

  const rows = [
    { label: "Yil", value: year ? String(year) : "" },
    { label: "Davlat", value: country ?? "" },
    { label: "Davomiylik", value: duration ? `${duration} daqiqa` : "" },
    { label: "Rejissyor", value: director ?? "" },
  ].filter((row) => row.value);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-[#F3F4F6]">Film haqida</h3>
      <div className="relative">
        <p className="line-clamp-2 pr-16 text-sm leading-6 text-[#D1D5DB]">{text}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-0 bottom-0 bg-[#070A12] pl-2 text-sm leading-6 font-medium text-[#2A5FE0]"
        >
          Ko'proq
        </button>
      </div>
      <GlobalModal open={open} title="Film haqida" onClose={() => setOpen(false)}>
        <p className="text-sm leading-6 text-[#D1D5DB]">{text}</p>
        {rows.length > 0 ? (
          <dl className="mt-4 overflow-hidden rounded-lg border border-[rgba(40,70,130,0.35)]">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 border-b border-[rgba(40,70,130,0.28)] px-3 py-2 last:border-b-0"
              >
                <dt className="text-sm text-[#6B7280]">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-[#F3F4F6]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </GlobalModal>
    </div>
  );
}
