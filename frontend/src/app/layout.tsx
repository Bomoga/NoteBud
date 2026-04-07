import { type ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/providers";
import NavBar from "../components/NavBar";
import PageTransition from "../components/PageTransition";
import ThemeApplier from "../components/ThemeApplier";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NoteBud",
  description: "AI-Powered Study Companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('notebud-theme')||'{}');if(t.state&&t.state.theme==='notion-dark')document.documentElement.dataset.theme='notion-dark';}catch(e){}` }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeApplier />
          <NavBar />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
};