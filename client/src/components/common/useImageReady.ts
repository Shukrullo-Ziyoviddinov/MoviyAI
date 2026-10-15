"use client";

import { useState } from "react";

export function useImageReady(src: string) {
  const [readySrc, setReadySrc] = useState("");
  const ready = !src || readySrc === src;

  function mark() {
    setReadySrc((current) => (current === src ? current : src));
  }

  return {
    ready,
    ref(node: HTMLImageElement | null) {
      if (node?.complete) mark();
    },
    onLoad: mark,
    onError: mark,
  };
}
