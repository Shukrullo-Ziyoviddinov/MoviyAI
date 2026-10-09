"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { GlobalModal } from "@/components/GlobalModal";

export function ActorAbout({ text, name }: { text?: string; name: string }) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(text?.length ?? 0);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !text) return;

    const measure = () => {
      const textNode = body.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
      const limit = body.clientHeight;
      if (limit <= 0) return;
      const apply = (count: number) => {
        textNode.textContent =
          count >= text.length ? `${text} ` : `${text.slice(0, count).trimEnd()} `;
        return body.scrollHeight <= limit + 1;
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

  return (
    <>
      <p ref={bodyRef} className="min-h-0 flex-1 overflow-hidden text-sm leading-6 text-[#D1D5DB]">
        {preview}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-[#2A5FE0]"
        >
          Ko'proq
        </button>
      </p>
      <GlobalModal open={open} title={name} onClose={() => setOpen(false)}>
        <p className="text-sm leading-6 text-[#D1D5DB]">{text}</p>
      </GlobalModal>
    </>
  );
}
