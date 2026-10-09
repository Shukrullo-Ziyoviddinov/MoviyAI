"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(text?.length ?? 0);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !text) return;

    const measure = () => {
      const textNode = body.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
      const line = parseFloat(getComputedStyle(body).lineHeight) || 24;
      const limit = line * 2 + 1;
      const apply = (count: number) => {
        textNode.textContent =
          count >= text.length ? `${text} ` : `${text.slice(0, count).trimEnd()} `;
        return body.scrollHeight <= limit;
      };

      if (apply(text.length)) {
        setCut(text.length);
        return;
      }

      let low = 0;
      let high = text.length;
      let best = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (apply(mid)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      apply(best);
      setCut(best);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [text]);

  if (!text) return null;

  const preview = cut >= text.length ? `${text} ` : `${text.slice(0, cut).trimEnd()} `;

  const rows = [
    { label: "Yil", value: year ? String(year) : "" },
    { label: "Davlat", value: country ?? "" },
    { label: "Davomiylik", value: duration ? `${duration} daqiqa` : "" },
    { label: "Rejissyor", value: director ?? "" },
  ].filter((row) => row.value);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-[#F3F4F6]">Film haqida</h3>
      <p ref={bodyRef} className="text-sm leading-6 text-[#D1D5DB]">
        {preview}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-[#2A5FE0]"
        >
          Ko'proq
        </button>
      </p>
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
