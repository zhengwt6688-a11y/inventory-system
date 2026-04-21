import "antd/dist/reset.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "库存管理系统",
  description: "库存与订单管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}