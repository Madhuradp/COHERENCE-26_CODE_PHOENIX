import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";

export const metadata: Metadata = {
  title: "TrailMatch — Clinical Trial Matching Platform",
  description:
    "Intelligent patient-trial matching platform for clinicians, pharma companies, and researchers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
