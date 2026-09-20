"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Matches the native status bar to Racepicks' black theme. Only does
 * anything when actually running inside the Capacitor app — on the
 * normal website (a regular browser tab), Capacitor.isNativePlatform()
 * is false and this silently does nothing, so it's safe to render on
 * every page without affecting the web experience at all.
 */
export default function CapacitorStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Style.Dark = light (white) status bar icons/text, correct for
    // a dark app background. Style.Light would be the opposite —
    // dark icons for a light background, which isn't what we want.
    StatusBar.setStyle({ style: Style.Dark }).catch((err) => {
      console.error("StatusBar.setStyle failed:", err);
    });

    // Android-only API — sets the actual bar color, not just the
    // icon/text style. Capacitor no-ops this harmlessly on iOS rather
    // than erroring, so no platform check needed here.
    StatusBar.setBackgroundColor({ color: "#000000" }).catch((err) => {
      console.error("StatusBar.setBackgroundColor failed:", err);
    });
  }, []);

  return null;
}