import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PTCG 简中卡牌数据库",
  description: "支持搜索、筛选、图片 API 与 60 张牌组编辑的 PTCG 简中数据库。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
