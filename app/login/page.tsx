"use client";

import { Button, Card, Form, Input, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: { username: string; password: string }) {
    try {
      setLoading(true);

      // 先用用户名查邮箱
      const usernameRes = await fetch("/api/auth/username-to-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: values.username }),
      });

      const usernameData = await usernameRes.json();

      if (!usernameRes.ok) {
        message.error(usernameData.error || "用户名不存在");
        return;
      }

      // 再在浏览器端直接登录，确保会话写入浏览器
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameData.email,
        password: values.password,
      });

      if (error) {
        message.error(error.message || "登录失败");
        return;
      }

      message.success("登录成功");

      // 根据角色跳转
      if (usernameData.role === "admin") {
        router.push("/orders");
      } else {
        router.push("/inventory");
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card title="登录系统" style={{ width: 420 }}>
        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}