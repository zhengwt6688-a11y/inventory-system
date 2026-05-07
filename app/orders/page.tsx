"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
  Input,
  DatePicker,
  Modal,
  Form,
} from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

const { RangePicker } = DatePicker;

type OrderItem = {
  id: number;
  inventory_item_id: number;
  product_name: string;
  brand_name: string;
  flavor_name: string;
  qty: number;
  created_at: string;
};

type Order = {
  id: number;
  order_no: string;
  customer_info: string;
  remark?: string;
  created_by: string;
  updated_by?: string;
  total_qty: number;
  created_at: string;
  updated_at?: string;
  tracking_no?: string;
  status?: "processing" | "completed";
  order_items: OrderItem[];
};

export default function OrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderNoKeyword, setOrderNoKeyword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [exportRange, setExportRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(),
    dayjs(),
  ]);

  const [trackingOpen, setTrackingOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [trackingForm] = Form.useForm();

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      router.replace("/login");
      return;
    }

    setRole(data.role || "user");
  }

  async function loadOrders() {
    try {
      setLoading(true);
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) router.replace("/login");
        return;
      }

      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(orderId: number) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "删除失败");
        return;
      }

      message.success(data.message || "删除成功");
      loadOrders();
    } catch {
      message.error("删除失败");
    }
  }

  function openTrackingModal(order: Order) {
    setCurrentOrder(order);
    trackingForm.setFieldsValue({
      tracking_no: order.tracking_no || "",
    });
    setTrackingOpen(true);
  }

  async function handleSaveTracking(values: { tracking_no: string }) {
    if (!currentOrder) return;

    const res = await fetch(`/api/orders/${currentOrder.id}/tracking`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracking_no: values.tracking_no || "",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      message.error(data.error || "保存失败");
      return;
    }

    message.success(data.message || "保存成功");
    setTrackingOpen(false);
    setCurrentOrder(null);
    trackingForm.resetFields();
    loadOrders();
  }

  useEffect(() => {
    loadMe();
    loadOrders();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = orderNoKeyword.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter((item) =>
      String(item.order_no || "").toLowerCase().includes(keyword)
    );
  }, [rows, orderNoKeyword]);

  const isAdmin = role === "admin";
  const startDate = exportRange[0].format("YYYY-MM-DD");
  const endDate = exportRange[1].format("YYYY-MM-DD");

  return (
    <DashboardShell>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
        订单列表
      </h1>

      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          {isAdmin ? (
            <Button type="primary" href="/orders/new">
              添加订单
            </Button>
          ) : (
            <Tag color="blue">当前为供应商权限</Tag>
          )}

          <RangePicker
            value={exportRange}
            allowClear={false}
            onChange={(values) => {
              if (!values || !values[0] || !values[1]) return;
              setExportRange([values[0], values[1]]);
            }}
          />

          <Button
            href={`/api/export/today-orders/csv?start=${startDate}&end=${endDate}`}
          >
            导出区间 CSV
          </Button>

          <Button
            href={`/api/export/today-orders/excel?start=${startDate}&end=${endDate}`}
          >
            导出区间 Excel
          </Button>
        </Space>
      </Card>

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600 }}>订单数据</div>

          <div style={{ width: 320 }}>
            <Input
              placeholder="搜索订单号，例如 #59102"
              value={orderNoKeyword}
              onChange={(e) => setOrderNoKeyword(e.target.value)}
              allowClear
            />
          </div>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: 8 }}>
                <div style={{ marginBottom: 12 }}>
                  <strong>客户信息：</strong>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                    {record.customer_info}
                  </div>
                </div>

                {record.remark ? (
                  <div style={{ marginBottom: 12 }}>
                    <strong>备注：</strong>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                      {record.remark}
                    </div>
                  </div>
                ) : null}

                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={record.order_items || []}
                  columns={[
                    { title: "产品", dataIndex: "product_name" },
                    { title: "品牌", dataIndex: "brand_name" },
                    { title: "口味", dataIndex: "flavor_name" },
                    { title: "数量", dataIndex: "qty" },
                  ]}
                />
              </div>
            ),
          }}
          columns={[
            {
              title: "订单号",
              dataIndex: "order_no",
            },
            {
              title: "状态",
              dataIndex: "status",
              render: (_, record) =>
                record.tracking_no ? (
                  <Tag color="green">已完成</Tag>
                ) : (
                  <Tag color="orange">处理中</Tag>
                ),
            },
            {
              title: "追踪号",
              dataIndex: "tracking_no",
              render: (value: string) => value || "-",
            },
            {
              title: "客户信息",
              dataIndex: "customer_info",
              render: (value: string) => (
                <div
                  style={{
                    maxWidth: 260,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </div>
              ),
            },
            {
              title: "商品数",
              dataIndex: "order_items",
              render: (items: OrderItem[]) => (
                <Tag>{items?.length || 0} 个商品</Tag>
              ),
            },
            {
              title: "总数量",
              dataIndex: "total_qty",
            },
            {
              title: "创建人",
              dataIndex: "created_by",
            },
            {
              title: "最后修改人",
              dataIndex: "updated_by",
              render: (v: string) => v || "-",
            },
            {
              title: "创建时间",
              dataIndex: "created_at",
              render: (value: string) => new Date(value).toLocaleString(),
            },
            {
              title: "修改时间",
              dataIndex: "updated_at",
              render: (value: string) =>
                value ? new Date(value).toLocaleString() : "-",
            },
            {
              title: "操作",
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openTrackingModal(record)}>
                    {record.tracking_no ? "编辑追踪号" : "上传追踪号"}
                  </Button>

                  {isAdmin ? (
                    <>
                      <Button type="link" href={`/orders/${record.id}/edit`}>
                        编辑
                      </Button>

                      <Popconfirm
                        title="确认删除这个订单吗？"
                        description="删除后会自动把库存加回去"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确认"
                        cancelText="取消"
                      >
                        <Button type="link" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    </>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={currentOrder?.tracking_no ? "编辑追踪号" : "上传追踪号"}
        open={trackingOpen}
        onCancel={() => {
          setTrackingOpen(false);
          setCurrentOrder(null);
          trackingForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={trackingForm} layout="vertical" onFinish={handleSaveTracking}>
          <Form.Item label="订单号">
            <Input value={currentOrder?.order_no || ""} disabled />
          </Form.Item>

          <Form.Item
            label="追踪号"
            name="tracking_no"
            extra="如果追踪号填错，可以再次打开编辑修改。清空追踪号后订单会恢复为处理中。"
          >
            <Input.TextArea rows={3} placeholder="请输入物流追踪号" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            保存追踪号
          </Button>
        </Form>
      </Modal>
    </DashboardShell>
  );
}