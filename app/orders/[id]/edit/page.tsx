"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  message,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import AuthHeader from "@/components/AuthHeader";

type InventoryOption = {
  id: number;
  product_name: string;
  brand_name: string;
  flavor_name: string;
  stock_qty: number;
  updated_at: string;
};

type DraftItem = {
  row_id: string;
  inventory_item_id?: number;
  product_name?: string;
  brand_name?: string;
  flavor_name?: string;
  stock_qty?: number;
  qty?: number;
};

export default function EditOrderPage() {
  const [form] = Form.useForm();
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState("...");
  const [role, setRole] = useState<"admin" | "user" | null>(null);

  const rowCounterRef = useRef(1);

  function createRowFromItem(item?: Partial<DraftItem>): DraftItem {
    const rowId = String(rowCounterRef.current++);
    return {
      row_id: rowId,
      qty: 1,
      ...item,
    };
  }

  async function loadCurrentUser() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (!res.ok) {
      router.push("/login");
      return;
    }

    setDisplayName(data.displayName || "unknown");
    setRole(data.role);

    if (data.role !== "admin") {
      router.push("/inventory");
    }
  }

  async function loadInventoryOptions() {
    const res = await fetch("/api/inventory-options");
    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "读取库存商品失败");
      return;
    }

    setInventoryOptions(data || []);
  }

  async function loadOrder() {
    if (!orderId) return;

    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "读取订单失败");
      return;
    }

    form.setFieldsValue({
      order_no: data.order_no,
      customer_info: data.customer_info,
      remark: data.remark,
    });

    const mappedItems =
      (data.order_items || []).map((item: any) =>
        createRowFromItem({
          inventory_item_id: item.inventory_item_id,
          product_name: item.product_name,
          brand_name: item.brand_name,
          flavor_name: item.flavor_name,
          qty: item.qty,
          stock_qty: undefined,
        })
      ) || [];

    setItems(mappedItems.length ? mappedItems : [createRowFromItem()]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadCurrentUser();
      await loadInventoryOptions();
      await loadOrder();
      setLoading(false);
    }
    init();
  }, [orderId]);

  useEffect(() => {
    if (!inventoryOptions.length || !items.length) return;

    setItems((prev) =>
      prev.map((item) => {
        const selected = inventoryOptions.find((x) => x.id === item.inventory_item_id);
        if (!selected) return item;

        return {
          ...item,
          product_name: selected.product_name,
          brand_name: selected.brand_name,
          flavor_name: selected.flavor_name,
          stock_qty: selected.stock_qty,
        };
      })
    );
  }, [inventoryOptions]);

  function addRow() {
    setItems((prev) => [...prev, createRowFromItem()]);
  }

  function removeRow(rowId: string) {
    setItems((prev) => {
      if (prev.length === 1) {
        message.warning("至少保留一行商品");
        return prev;
      }
      return prev.filter((item) => item.row_id !== rowId);
    });
  }

  function handleSelectInventory(rowId: string, inventoryItemId: number) {
    const selected = inventoryOptions.find((x) => x.id === inventoryItemId);
    if (!selected) return;

    setItems((prev) =>
      prev.map((item) =>
        item.row_id === rowId
          ? {
              ...item,
              inventory_item_id: selected.id,
              product_name: selected.product_name,
              brand_name: selected.brand_name,
              flavor_name: selected.flavor_name,
              stock_qty: selected.stock_qty,
              qty: item.qty || 1,
            }
          : item
      )
    );
  }

  function handleQtyChange(rowId: string, qty: number | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.row_id === rowId
          ? {
              ...item,
              qty: qty || 1,
            }
          : item
      )
    );
  }

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [items]);

  const selectOptions = inventoryOptions.map((item) => ({
    label: `${item.product_name} / ${item.brand_name} / ${item.flavor_name}（库存:${item.stock_qty}）`,
    value: item.id,
  }));

  async function handleSubmit(values: any) {
    const invalidRow = items.find(
      (item) => !item.inventory_item_id || !item.qty || item.qty <= 0
    );

    if (invalidRow) {
      message.error("请检查商品选择和数量");
      return;
    }

    const payload = {
      order_no: values.order_no,
      customer_info: values.customer_info,
      remark: values.remark || "",
      items: items.map((item) => ({
        inventory_item_id: item.inventory_item_id,
        qty: item.qty,
      })),
    };

    try {
      setSubmitting(true);

      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "修改失败");
        return;
      }

      message.success(data.message || "订单修改成功");
      router.push("/orders");
      router.refresh();
    } catch {
      message.error("修改失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!role) return null;

  return (
    <main style={{ padding: 24 }}>
      <AuthHeader displayName={displayName} role={role} />

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>编辑订单</h1>

      <Card loading={loading}>
        <div style={{ marginBottom: 16 }}>当前操作人：{displayName}</div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="订单号"
            name="order_no"
            rules={[{ required: true, message: "请输入订单号" }]}
            style={{ width: 320 }}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="客户信息"
            name="customer_info"
            rules={[{ required: true, message: "请输入客户信息" }]}
          >
            <Input.TextArea rows={5} />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Card
            title="商品信息"
            extra={
              <Button type="primary" ghost onClick={addRow}>
                添加商品
              </Button>
            }
            style={{ marginTop: 16 }}
          >
            <Table
              rowKey="row_id"
              pagination={false}
              dataSource={items}
              columns={[
                {
                  title: "商品信息",
                  dataIndex: "inventory_item_id",
                  render: (_, record) => (
                    <Select
                      style={{ width: "100%" }}
                      placeholder="请选择商品"
                      value={record.inventory_item_id}
                      options={selectOptions}
                      onChange={(value) => handleSelectInventory(record.row_id, value)}
                    />
                  ),
                },
                {
                  title: "品牌",
                  dataIndex: "brand_name",
                  render: (value) => value || "-",
                },
                {
                  title: "口味",
                  dataIndex: "flavor_name",
                  render: (value) => value || "-",
                },
                {
                  title: "当前库存",
                  dataIndex: "stock_qty",
                  render: (value) => value ?? "-",
                },
                {
                  title: "商品数量",
                  dataIndex: "qty",
                  render: (_, record) => (
                    <InputNumber
                      min={1}
                      value={record.qty}
                      onChange={(value) => handleQtyChange(record.row_id, value)}
                    />
                  ),
                },
                {
                  title: "操作",
                  render: (_, record) => (
                    <Button danger onClick={() => removeRow(record.row_id)}>
                      删除
                    </Button>
                  ),
                },
              ]}
            />
          </Card>

          <div style={{ marginTop: 16, marginBottom: 16, fontSize: 16 }}>
            订单明细（总数：{totalQty}）
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存修改
            </Button>
            <Button onClick={() => router.push("/orders")}>返回订单列表</Button>
          </div>
        </Form>
      </Card>
    </main>
  );
}