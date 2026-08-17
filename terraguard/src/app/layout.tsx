import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraGuard — Satellite Infrastructure Fraud Detector",
  description:
    "TerraGuard uses Sentinel-1 SAR backscatter analysis and Bayesian change point detection to detect infrastructure fraud in DPWH projects by comparing satellite-detected construction dates against contract Notice-to-Proceed dates.",
  keywords: ["SAR", "Sentinel-1", "fraud detection", "DPWH", "Philippines", "infrastructure", "COA"],
  openGraph: {
    title: "TerraGuard — Satellite Infrastructure Fraud Detector",
    description: "Catch ghost billing and pre-existing structure fraud using satellite data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
