import type { Metadata } from "next";
import "./globals.css";
import "./onboarding-mobile.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgentHub",
  description: "Onchain trading infrastructure for autonomous agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
