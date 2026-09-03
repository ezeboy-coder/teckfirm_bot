import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { toAbsoluteAppUrl } from "@/lib/utils/app-url";
import "./globals.css";

function appOriginUrl(): URL {
  const normalized = toAbsoluteAppUrl(siteConfig.url || process.env.NEXT_PUBLIC_APP_URL);
  try {
    return new URL(normalized);
  } catch {
    return new URL("https://teckfirm.org");
  }
}

const appOrigin = appOriginUrl();

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: appOrigin,
  title: {
    default: "TeckFirm WiFi | Buy WiFi Vouchers Online",
    template: "%s | TeckFirm WiFi",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: "TeckFirm", url: siteConfig.companyUrl }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: appOrigin.href,
    siteName: siteConfig.name,
    title: "TeckFirm WiFi | Buy WiFi Vouchers Online",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "TeckFirm WiFi | Buy WiFi Vouchers Online",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f7f6] text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
