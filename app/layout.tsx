import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { DEFAULT_LOCALE, t } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/react";
import "./globals.css";

const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
});
const body = Figtree({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: t("common.appName"),
  description: t("common.description"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFBFD",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Static pages render en; LocaleProvider sets lang to the browser locale.
    <html
      lang={DEFAULT_LOCALE}
      className={`${heading.variable} ${body.variable} antialiased`}
    >
      <body className="min-h-dvh bg-paper text-ink font-body">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
