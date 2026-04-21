"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Space, Table, message, Card } from "antd";
import DashboardShell from "@/components/DashboardShell";

type InventoryItem = {
  id: number;
  product_name: string;
  brand_name: string;
  flavor_name: string;
  stock_qty: number;
  created_at: string;
  updated_at: string;
};

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  async function loadInventory() {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory-items");
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "读取库存失败");
        return;
      }

      setRows(data || []);
    } catch {
      message.error("读取库存失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(values: {
    product_name: string;
    brand_name: string;
    flavor_name: string;
    stock_qty: number;
  }) {
    try {
      setSubmitting(true);

      const res = await fetch("/api/inventory-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "添加失败");
        return;
      }

      message.success(data.message || "操作成功");
      form.resetFields();
      loadInventory();
    } catch {
      message.error("添加失败");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <DashboardShell>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>库存管理</h1>

      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>添加库存</h2>

        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Space align="start" size={16} wrap style={{ width: "100%" }}>
            <Form.Item
              label="产品"
              name="product_name"
              rules={[{ required: true, message: "请输入产品" }]}
              style={{ width: 220 }}
            >
              <Input placeholder="例如：9000" />
            </Form.Item>

            <Form.Item
              label="品牌"
              name="brand_name"
              rules={[{ required: true, message: "请输入品牌" }]}
              style={{ width: 220 }}
            >
              <Input placeholder="例如：Alibarbar" />
            </Form.Item>

            <Form.Item
              label="口味"
              name="flavor_name"
              rules={[{ required: true, message: "请输入口味" }]}
              style={{ width: 220 }}
            >
              <Input placeholder="例如：Mango" />
            </Form.Item>

            <Form.Item
              label="库存"
              name="stock_qty"
              initialValue={0}
              rules={[{ required: true, message: "请输入库存" }]}
              style={{ width: 180 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label=" " style={{ width: 160 }}>
              <Button type="primary" htmlType="submit" loading={submitting} block>
                添加库存
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>库存列表</h2>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "产品", dataIndex: "product_name" },
            { title: "品牌", dataIndex: "brand_name" },
            { title: "口味", dataIndex: "flavor_name" },
            { title: "库存", dataIndex: "stock_qty" },
            {
              title: "更新时间",
              dataIndex: "updated_at",
              render: (value: string) => new Date(value).toLocaleString(),
            },
          ]}
        />
      </Card>
    </DashboardShell>
  );
}