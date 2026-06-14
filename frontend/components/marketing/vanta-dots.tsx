"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    VANTA: any;
    THREE: any;
  }
}

export function VantaDots() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Three.js r134 exposes window.THREE; Vanta needs it loaded first
      if (!window.THREE) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "/assets/scripts/three.r134.min.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }
      if (!window.VANTA) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "/assets/scripts/vanta.dots.min.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      if (cancelled || !vantaRef.current || vantaEffect.current) return;

      vantaEffect.current = window.VANTA.DOTS({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        color: 0x7c3aed, // purple accent matching brand
        color2: 0x0a0a0a, // deep dark
        backgroundColor: 0x080808,
        size: 2.6,
        spacing: 30.0,
        showLines: false,
      });
    }

    init();

    return () => {
      cancelled = true;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}
