import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import clsx from "clsx";
import "./globals.css";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--sans" });

export const metadata: Metadata = {
  title: "Waveplates",
  description: "Calculate how many stamina you have in your gacha accounts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Waveplates",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <meta name="msapplication-TileColor" content="#603cba" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body
        className={clsx(
          sans.variable,
          "font-sans bg-neutral-950 text-neutral-300"
        )}
      >
        <main className="container max-w-lg mx-auto p-9">{children}</main>
      </body>
    </html>
  );
}
