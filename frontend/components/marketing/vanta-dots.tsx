"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    VANTA: any;
    THREE: any;
  }
}

export function VantaDots() {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Load Three.js if not already loaded
        if (!window.THREE) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/assets/scripts/three.r134.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Three.js"));
            document.head.appendChild(script);
          });
        }

        // Load Vanta.js if not already loaded
        if (!window.VANTA) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/assets/scripts/vanta.dots.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Vanta.js"));
            document.head.appendChild(script);
          });
        }

        if (cancelled || !vantaRef.current || vantaEffect.current) return;

        vantaEffect.current = window.VANTA.DOTS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          color: 0x7c3aed,
          color2: 0x0a0a0a,
          backgroundColor: 0x080808,
          size: 2.6,
          spacing: 30.0,
          showLines: false,
        });
      } catch (err) {
        console.warn("Vanta.js failed to initialize, using CSS fallback:", err);
        if (!cancelled) setFailed(true);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (vantaEffect.current) {
        try {
          vantaEffect.current.destroy();
        } catch (_) {
          // ignore destroy errors
        }
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={
        failed
          ? {
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%)",
            }
          : undefined
      }
    />
  );
}
