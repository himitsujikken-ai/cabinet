import type { Metadata } from "next";
import { Cinzel, Shippori_Mincho } from "next/font/google"; // ★フォント読み込み
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const shippori = Shippori_Mincho({
  weight: "400", // 必要な太さを指定
  variable: "--font-shippori",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THE CABINET",
  description: "Deep Wisdom Salon - 賢人参謀AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* 変数をbodyに注入 */}
      <body className={`${cinzel.variable} ${shippori.variable} min-h-screen bg-gradient-to-b from-cabinet-bg to-cabinet-mahogany text-cabinet-paper antialiased`}>
        {children}
      </body>
    </html>
  );
}
