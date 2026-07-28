import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyMeadow",
  description: "MyMeadow Rental Management System",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "MyMeadow",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <NextTopLoader color="#f97316" height={3} showSpinner={false} />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
