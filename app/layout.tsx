import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "汉语学堂 - Học tiếng Trung",
    template: "%s | 汉语学堂",
  },
  description: "Luyện tiếng Trung miễn phí theo lộ trình HSK.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "汉语学堂 - Học tiếng Trung",
    description: "Luyện tiếng Trung miễn phí theo lộ trình HSK.",
    locale: "vi_VN",
    type: "website",
    images: [{ url: "/images/miu-cat.png", alt: "汉语学堂" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
