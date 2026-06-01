import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResilientCare AI | Self-Healing Customer Support",
  description: "Enterprise-grade AI customer support with dual-agent validation and self-healing architecture",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
