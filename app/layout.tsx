import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "汉语学堂 - Học tiếng Trung",
  description: "Luyện tiếng Trung miễn phí theo lộ trình HSK.",
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
