import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://antabuse.run"),
  title: "Antabuse — the AI circuit breaker for Web3 payments",
  description:
    "Authorize recurring crypto payments with confidence. Antabuse's AI firewall trips before wallet drainers can touch your funds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#f9723f",
          colorForeground: "#16120f",
          borderRadius: "0.9rem",
          fontFamily: "var(--font-jakarta)",
        },
      }}
    >
      <html
        lang="en"
        className={`${jakarta.variable} ${mono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
