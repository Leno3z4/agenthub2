import type { Metadata } from "next";
import "./globals.css";
import "./onboarding-mobile.css";
import "./site-theme.css";
import { Providers } from "./providers";
import { AgentConnectionWatcher } from "../components/AgentConnectionWatcher";

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
        <Providers>
          <AgentConnectionWatcher />
          {children}
        </Providers>
      </body>
    </html>
  );
}
