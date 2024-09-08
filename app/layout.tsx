import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import clsx from "clsx";
import "./globals.css";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--sans" });

function Link({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-400"
    >
      {children}
    </a>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
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
        <div className="container max-w-lg mx-auto p-9 flex flex-col gap-6">
          <main>{children}</main>
          <footer className="text-sm text-neutral-500">
            Built by <Link href="https://github.com/joulev">@joulev</Link> with{" "}
            <Link href="https://nextjs.org">Next.js</Link>. Source{" "}
            <Link href="https://github.com/joulev/waveplates">on GitHub</Link>.
          </footer>
        </div>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "Waveplates",
  description: "Calculate how many stamina you have in your gacha accounts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Waveplates",
  },
};
