import type { Metadata } from "next";
import { Geist, Geist_Mono, Crimson_Text } from "next/font/google";
import "./globals.css";
import ToasterClient from "../components/ui/toaster-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "CRM Pro - Sales Tracker",
  description: "Professional CRM and Sales Management System",
};

// Google Analytics Script Component
function GoogleAnalyticsScript() {
  return (
    <>
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-MXYR2TFBXL"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MXYR2TFBXL');
          `,
        }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleAnalyticsScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${crimsonText.variable} antialiased bg-gray-50`}
      >
        {/* <CRMNav/> */}
        {children}
        <ToasterClient />
      </body>
    </html>
  );
}
