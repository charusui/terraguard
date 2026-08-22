import type { Metadata } from "next";
import "./globals.css";
import GlobalNav from "@/components/GlobalNav";

export const metadata: Metadata = {
  title: "TerraGuard",
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
  // data-scroll-behavior tells the App Router to suspend the smooth scroll-behavior
  // set in globals.css while it scrolls to the top on a route change. Without it,
  // Next 16 leaves it on and every navigation animates its way up the page.
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}
