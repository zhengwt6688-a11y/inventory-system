"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  message,
  Card,
} from "antd";
import DashboardShell from "@/components/DashboardShell";

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

type SelectOption = {
  label: string;
  value: number;
  searchText: string;
};

export default function NewOrderPage() {
  const [form] = Form.useForm();
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rowCounterRef = useRef(1);

  function createEmptyRow(): DraftItem {
    const rowId = String(rowCounterRef.current++);
    return { row_id: rowId, qty: 1 };
  }

  async function loadInventoryOptions() {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory-options", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "读取商品库存失败");
        return;
      }

      setInventoryOptions(data || []);
    } catch {
      message.error("读取商品库存失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventoryOptions();
    setItems([createEmptyRow()]);
  }, []);

  function addRow() {
    setItems((prev) => [...prev, createEmptyRow()]);
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
        item.row_id === rowId ? { ...item, qty: qty || 1 } : item
      )
    );
  }

  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [items]
  );

  const selectOptions: SelectOption[] = useMemo(() => {
    return inventoryOptions.map((item) => ({
      label: `${item.product_name} / ${item.brand_name} / ${item.flavor_name}（库存:${item.stock_qty}）`,
      value: item.id,
      searchText: [
        item.product_name,
        item.brand_name,
        item.flavor_name,
        String(item.stock_qty),
      ]
        .join(" ")
        .toLowerCase(),
    }));
  }, [inventoryOptions]);

  async function submitOrder(values: {
    order_no: string;
    customer_info: string;
    remark?: string;
  }) {
    const invalidRow = items.find(
      (item) =>
        !item.inventory_item_id ||
        !item.qty ||
        item.qty <= 0 ||
        Number(item.qty) > Number(item.stock_qty || 0)
    );

    if (invalidRow) {
      message.error("请检查商品选择和数量，数量不能超过库存");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_no: values.order_no,
          customer_info: values.customer_info,
          remark: values.remark || "",
          items: items.map((item) => ({
            inventory_item_id: item.inventory_item_id,
            qty: item.qty,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "提交失败");
        return;
      }

      message.success(data.message || "订单创建成功");
      form.resetFields();
      rowCounterRef.current = 1;
      setItems([createEmptyRow()]);
      loadInventoryOptions();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>添加订单</h1>

      <Card style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={submitOrder}>
          <Form.Item
            label="订单号"
            name="order_no"
            rules={[{ required: true, message: "请输入订单号" }]}
            style={{ width: 320 }}
          >
            <Input placeholder="例如：#1001" />
          </Form.Item>

          <Form.Item
            label="客户信息"
            name="customer_info"
            rules={[{ required: true, message: "请输入客户信息" }]}
            extra="可把姓名、电话、地址一起输入，导出 Excel 时会保存在同一个单元格"
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
              loading={loading}
              pagination={false}
              dataSource={items}
              columns={[
                {
                  title: "商品信息",
                  dataIndex: "inventory_item_id",
                  render: (_, record) => (
                    <Select
                      showSearch
                      allowClear
                      style={{ width: "100%" }}
                      placeholder="请输入产品/品牌/口味搜索"
                      value={record.inventory_item_id}
                      options={selectOptions}
                      optionFilterProp="label"
                      filterOption={(input, option) => {
                        const keyword = String(input || "").trim().toLowerCase();
                        if (!keyword) return true;
                        return String((option as SelectOption)?.searchText || "").includes(keyword);
                      }}
                      onChange={(value) => {
                        if (!value) return;
                        handleSelectInventory(record.row_id, value);
                      }}
                    />
                  ),
                },
                { title: "品牌", dataIndex: "brand_name", render: (v) => v || "-" },
                { title: "口味", dataIndex: "flavor_name", render: (v) => v || "-" },
                { title: "可用库存", dataIndex: "stock_qty", render: (v) => v ?? "-" },
                {
                  title: "商品数量",
                  dataIndex: "qty",
                  render: (_, record) => (
                    <InputNumber
                      min={1}
                      max={record.stock_qty || 1}
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

          <Button type="primary" htmlType="submit" loading={submitting}>
            提交订单
          </Button>
        </Form>
      </Card>
    </DashboardShell>
  );
}