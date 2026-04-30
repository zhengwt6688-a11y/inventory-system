"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import DashboardShell from "@/components/DashboardShell";

type UserRow = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "读取用户失败");
        return;
      }

      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(values: any) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "创建失败");
      return;
    }

    message.success(data.message || "创建成功");
    setCreateOpen(false);
    createForm.resetFields();
    loadUsers();
  }

  function openEdit(row: UserRow) {
    setCurrentUser(row);
    editForm.setFieldsValue({
      role: row.role,
      password: "",
    });
    setEditOpen(true);
  }

  async function handleUpdate(values: any) {
    if (!currentUser) return;

    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "更新失败");
      return;
    }

    message.success(data.message || "更新成功");
    setEditOpen(false);
    setCurrentUser(null);
    editForm.resetFields();
    loadUsers();
  }

  async function handleDelete(row: UserRow) {
    const res = await fetch(`/api/users/${row.id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "删除失败");
      return;
    }

    message.success(data.message || "删除成功");
    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardShell adminOnly>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
        用户管理
      </h1>

      <Card style={{ marginBottom: 24 }}>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新增用户
        </Button>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "用户名",
              dataIndex: "username",
            },
            {
              title: "邮箱",
              dataIndex: "email",
            },
            {
              title: "角色",
              dataIndex: "role",
              render: (role: string) =>
                role === "admin" ? (
                  <Tag color="red">admin</Tag>
                ) : (
                  <Tag color="blue">user</Tag>
                ),
            },
            {
              title: "创建时间",
              dataIndex: "created_at",
              render: (value: string) =>
                value ? new Date(value).toLocaleString() : "-",
            },
            {
              title: "操作",
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openEdit(record)}>
                    编辑
                  </Button>

                  <Popconfirm
                    title="确认删除这个用户吗？"
                    description="删除后该用户无法再登录"
                    onConfirm={() => handleDelete(record)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="新增用户"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ role: "user" }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="例如：winnie" />
          </Form.Item>

          <Form.Item label="邮箱（可选）" name="email">
            <Input placeholder="不填则自动生成 username@internal.local" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select
              options={[
                { label: "普通用户 user", value: "user" },
                { label: "管理员 admin", value: "admin" },
              ]}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            创建用户
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`编辑用户：${currentUser?.username || ""}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select
              options={[
                { label: "普通用户 user", value: "user" },
                { label: "管理员 admin", value: "admin" },
              ]}
            />
          </Form.Item>

          <Form.Item label="新密码（不修改可留空）" name="password">
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            保存修改
          </Button>
        </Form>
      </Modal>
    </DashboardShell>
  );
}