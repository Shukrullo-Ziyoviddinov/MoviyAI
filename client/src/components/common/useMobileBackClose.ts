"use client";

import { useEffect, useRef } from "react";

export function useMobileBackClose(active: boolean, onClose: () => void) {
  const owned = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    if (!owned.current) {
      window.history.pushState({ moviyModal: 1 }, "");
      owned.current = true;
    }

    function onPop() {
      if (!owned.current) return;
      owned.current = false;
      onCloseRef.current();
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [active]);

  useEffect(() => {
    if (active || !owned.current) return;
    owned.current = false;
    window.history.back();
  }, [active]);
}
