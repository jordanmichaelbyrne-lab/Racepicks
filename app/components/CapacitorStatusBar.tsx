"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Matches the native status bar to Racepicks' black theme.
 *
 * Modern Android (edge-to-edge enforcement, increasingly the default
 * from Android 15/API 35 onward) largely ignores a solid status bar
 * background color set via setBackgroundColor — the bar becomes
 * transparent by default instead, and the app's own content is meant
 * to show through it. So instead of fighting that, we lean into it:
 * make the status bar overlay the WebView (transparent), and since
 * the app's background is already black, it reads as a black bar
 * automatically. Style.Dark still controls the status bar icon/text
 * color (light icons, correct for a dark background).
 */
export default function CapacitorStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    StatusBar.setStyle({ style: Style.Dark }).catch((err) => {
      console.error("StatusBar.setStyle failed:", err);
    });

    // Transparent overlay — lets the app's own black background show
    // through, which is the reliable approach on modern edge-to-edge
    // Android versions where setBackgroundColor is often ignored.
    StatusBar.setOverlaysWebView({ overlay: true }).catch((err) => {
      console.error("StatusBar.setOverlaysWebView failed:", err);
    });

    // Still attempted for older Android versions (pre-edge-to-edge
    // enforcement) where this call still works correctly — harmless
    // no-op on versions/platforms where it's ignored.
    StatusBar.setBackgroundColor({ color: "#000000" }).catch((err) => {
      console.error("StatusBar.setBackgroundColor failed:", err);
    });
  }, []);

  return null;
}