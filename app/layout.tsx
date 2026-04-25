import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Term",
  description: "Run Codex CLI in your browser from any local directory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
