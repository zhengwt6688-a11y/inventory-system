"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  message,
  Card,
  Select,
  Tabs,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
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

const BRAND_OPTIONS = [
  { label: "Alibarbar", value: "Alibarbar" },
  { label: "IGET ONE", value: "IGET ONE" },
  { label: "IGET BAR PRO", value: "IGET BAR PRO" },
  { label: "国内Ali", value: "国内Ali" },
  { label: "国内IGET ONE", value: "国内IGET ONE" },
];

const LOW_STOCK_THRESHOLD = 5;

function getStockLevel(stockQty: number) {
  if (stockQty <= 0) return "out";
  if (stockQty <= LOW_STOCK_THRESHOLD) return "low";
  return "normal";
}

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeBrandTab, setActiveBrandTab] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [form] = Form.useForm();

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();

    if (res.ok) {
      setRole(data.role || "user");
    }
  }

  async function loadInventory() {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory-items", { cache: "no-store" });
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

      const payload = {
        product_name: String(values.product_name || "").trim(),
        brand_name: String(values.brand_name || "").trim(),
        flavor_name: String(values.flavor_name || "").trim(),
        stock_qty: Number(values.stock_qty || 0),
      };

      const res = await fetch("/api/inventory-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "添加失败");
        return;
      }

      message.success(data.message || "操作成功");
      form.resetFields();
      form.setFieldValue("stock_qty", 0);
      loadInventory();
    } catch {
      message.error("添加失败");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadInventory();
  }, []);

  const visibleBrands = useMemo(() => {
    return Array.from(new Set(rows.map((item) => item.brand_name))).filter(Boolean);
  }, [rows]);

  const tabItems = useMemo(() => {
    return [
      { key: "ALL", label: "全部" },
      ...visibleBrands.map((brand) => ({
        key: brand,
        label: brand,
      })),
    ];
  }, [visibleBrands]);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (activeBrandTab !== "ALL") {
      result = result.filter((item) => item.brand_name === activeBrandTab);
    }

    const keyword = searchText.trim().toLowerCase();

    if (keyword) {
      result = result.filter((item) => {
        const product = String(item.product_name || "").toLowerCase();
        const brand = String(item.brand_name || "").toLowerCase();
        const flavor = String(item.flavor_name || "").toLowerCase();

        return (
          product.includes(keyword) ||
          brand.includes(keyword) ||
          flavor.includes(keyword)
        );
      });
    }

    return result;
  }, [rows, activeBrandTab, searchText]);

  const totalCount = filteredRows.length;
  const totalStockQty = filteredRows.reduce(
    (sum, item) => sum + Number(item.stock_qty || 0),
    0
  );
  const lowStockCount = filteredRows.filter(
    (item) =>
      Number(item.stock_qty) > 0 &&
      Number(item.stock_qty) <= LOW_STOCK_THRESHOLD
  ).length;
  const outOfStockCount = filteredRows.filter(
    (item) => Number(item.stock_qty) <= 0
  ).length;

  const columns: ColumnsType<InventoryItem> = [
    {
      title: "产品",
      dataIndex: "product_name",
    },
    {
      title: "品牌",
      dataIndex: "brand_name",
    },
    {
      title: "口味",
      dataIndex: "flavor_name",
    },
    {
      title: "库存",
      dataIndex: "stock_qty",
      sorter: (a, b) => Number(a.stock_qty || 0) - Number(b.stock_qty || 0),
      sortDirections: ["descend", "ascend"],
      render: (value: number) => {
        const stockQty = Number(value || 0);
        const level = getStockLevel(stockQty);

        if (level === "out") {
          return (
            <Space>
              <span style={{ color: "#cf1322", fontWeight: 700 }}>{stockQty}</span>
              <Tag color="red">缺货</Tag>
            </Space>
          );
        }

        if (level === "low") {
          return (
            <Space>
              <span style={{ color: "#d46b08", fontWeight: 700 }}>{stockQty}</span>
              <Tag color="orange">低库存</Tag>
            </Space>
          );
        }

        return (
          <Space>
            <span>{stockQty}</span>
            <Tag color="green">正常</Tag>
          </Space>
        );
      },
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ];

  const isAdmin = role === "admin";

  return (
    <DashboardShell>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
        库存管理
      </h1>

      {isAdmin ? (
        <Card style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>添加库存</h2>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleAdd}
            initialValues={{ stock_qty: 0 }}
          >
            <Space align="start" size={16} wrap style={{ width: "100%" }}>
              <Form.Item
                label="产品"
                name="product_name"
                rules={[{ required: true, message: "请输入产品" }]}
                style={{ width: 220 }}
              >
                <Input placeholder="例如：Ali-Grape Ice" />
              </Form.Item>

              <Form.Item
                label="品牌"
                name="brand_name"
                rules={[{ required: true, message: "请选择品牌" }]}
                style={{ width: 220 }}
              >
                <Select placeholder="请选择品牌" options={BRAND_OPTIONS} />
              </Form.Item>

              <Form.Item
                label="口味"
                name="flavor_name"
                rules={[{ required: true, message: "请输入口味" }]}
                style={{ width: 220 }}
              >
                <Input placeholder="例如：Grape Ice" />
              </Form.Item>

              <Form.Item
                label="库存"
                name="stock_qty"
                rules={[{ required: true, message: "请输入库存" }]}
                style={{ width: 160 }}
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
      ) : null}

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: 20, margin: 0 }}>
            {isAdmin ? "库存列表" : "我的库存"}
          </h2>

          <Space wrap>
            <Tag color="blue">记录数：{totalCount}</Tag>
            <Tag color="green">库存总数：{totalStockQty}</Tag>
            <Tag color="orange">低库存：{lowStockCount}</Tag>
            <Tag color="red">缺货：{outOfStockCount}</Tag>
          </Space>
        </div>

        <Tabs
          activeKey={activeBrandTab}
          onChange={setActiveBrandTab}
          items={tabItems}
          style={{ marginBottom: 12 }}
        />

        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <Input
            placeholder="搜索产品 / 品牌 / 口味"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          pagination={{ pageSize: 10 }}
          columns={columns}
          rowClassName={(record) => {
            const level = getStockLevel(Number(record.stock_qty || 0));
            if (level === "out") return "inventory-row-out";
            if (level === "low") return "inventory-row-low";
            return "";
          }}
        />
      </Card>

      <style jsx global>{`
        .inventory-row-low td {
          background-color: #fff7e6 !important;
        }

        .inventory-row-out td {
          background-color: #fff1f0 !important;
        }
      `}</style>
    </DashboardShell>
  );
}