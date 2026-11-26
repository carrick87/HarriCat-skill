"use client";

import { useEffect, useState } from "react";
import styles from "./harricat.module.css";

const STORAGE_KEY = "harricat-hidden";

declare global {
  interface Window {
    KUROCAT_ASSET_BASE?: string;
    KuroWebPet?: unknown;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kuro-src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.kuroLoaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(src)),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.kuroSrc = src;
    script.onload = () => {
      script.dataset.kuroLoaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(src));
    document.body.appendChild(script);
  });
}

export function HarriCat() {
  const [booted, setBooted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted || reduced) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      if (!alive || window.KuroWebPet) return;
      window.KUROCAT_ASSET_BASE = "/kurocat/";
      void (async () => {
        try {
          await loadScript("/kurocat/pet/spec.js");
          if (!alive || window.KuroWebPet) return;
          await loadScript("/kurocat/pet/renderer.js");
          if (!alive || window.KuroWebPet) return;
          await loadScript("/kurocat/pet/web-pet.js");
        } catch {
          /* Decorative overlay; the page stays usable if a script fails. */
        }
      })();
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [booted, reduced]);

  if (!booted || reduced) return null;

  function hideCat() {
    setHidden(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  function showCat() {
    setHidden(false);
    window.localStorage.setItem(STORAGE_KEY, "0");
  }

  return (
    <div className={hidden ? `${styles.dock} ${styles.hidden}` : styles.dock}>
      {hidden ? (
        <button type="button" className={styles.toggle} onClick={showCat}>
          Come back, cat
        </button>
      ) : null}
      <canvas
        id="livePetCanvas"
        className={styles.canvas}
        aria-hidden="true"
        onDoubleClick={hideCat}
      />
    </div>
  );
}
