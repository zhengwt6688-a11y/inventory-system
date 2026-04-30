"use client";

import { Button, Space, message } from "antd";
import { createClient } from "@/utils/supabase/client";

export default function DashboardHeader({
  displayName,
  role,
}: {
  displayName: string;
  role: "admin" | "user";
}) {
  const supabase = createClient();

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        message.error("退出失败");
        return;
      }

      message.success("已退出登录");
      window.location.href = "/login";
    } catch {
      message.error("退出失败");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div style={{ fontSize: 14 }}>
        当前用户：{displayName}（{role}）
      </div>

      <Space>
        <Button href="/inventory">库存</Button>
        <Button href="/orders">订单</Button>
        {role === "admin" ? <Button href="/users">用户管理</Button> : null}
        <Button danger onClick={handleLogout}>
          退出登录
        </Button>
      </Space>
    </div>
  );
}