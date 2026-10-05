import localFont from "next/font/local";

export const sans = localFont({
  src: [{ path: "./fonts/schibsted-grotesk-latin-wght-normal.woff2", style: "normal", weight: "400 900" }],
  variable: "--font-sans-ui",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const mono = localFont({
  src: [{ path: "./fonts/spline-sans-mono-latin-wght-normal.woff2", style: "normal", weight: "300 700" }],
  variable: "--font-formula",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});
