"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  message,
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

type AddInventoryFormValues = {
  product_name: string;
  brand_name: string;
  flavor_name: string;
  stock_qty: number;
};

type StockFormValues = {
  stock_qty: number;
};

/*
 * 默认品牌。
 * 即使某个品牌当前还没有库存，也会显示在输入建议中。
 *
 * 以后新增品牌不需要修改这里：
 * 管理员可以直接在品牌输入框输入新品牌。
 */
const DEFAULT_BRANDS = [
  "Alibarbar",
  "IGET ONE",
  "IGET BAR PRO",
  "国内Ali",
  "国内IGET ONE",
  "国内IGET BAR PRO",
  "Gunnpod",
  "Alfakher",
  "Uwin",
  "五叶神",
  "Swix",
  "IGET MOON",
];

const LOW_STOCK_THRESHOLD = 5;

function getStockLevel(stockQty: number) {
  if (stockQty <= 0) return "out";
  if (stockQty <= LOW_STOCK_THRESHOLD) return "low";
  return "normal";
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeBrandTab, setActiveBrandTab] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [role, setRole] = useState<"admin" | "user">("user");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] =
    useState<InventoryItem | null>(null);
  const [savingStock, setSavingStock] = useState(false);

  const [form] = Form.useForm<AddInventoryFormValues>();
  const [stockForm] = Form.useForm<StockFormValues>();

  const isAdmin = role === "admin";

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/me", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        return;
      }

      setRole(data.role || "user");
    } catch {
      // 用户信息读取失败时，不影响库存数据读取
    }
  }

  async function loadInventory() {
    try {
      setLoading(true);

      const res = await fetch("/api/inventory-items", {
        cache: "no-store",
      });

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

  async function handleAdd(values: AddInventoryFormValues) {
    const productName = cleanText(values.product_name);
    const brandName = cleanText(values.brand_name);
    const flavorName = cleanText(values.flavor_name);
    const stockQty = Number(values.stock_qty);

    if (!productName) {
      message.error("请输入产品名称");
      return;
    }

    if (!brandName) {
      message.error("请选择或输入品牌");
      return;
    }

    if (!flavorName) {
      message.error("请输入口味");
      return;
    }

    if (!Number.isInteger(stockQty) || stockQty < 0) {
      message.error("库存必须是大于或等于 0 的整数");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/inventory-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
          brand_name: brandName,
          flavor_name: flavorName,
          stock_qty: stockQty,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "添加失败");
        return;
      }

      message.success(data.message || "操作成功");

      form.resetFields();

      form.setFieldsValue({
        stock_qty: 0,
      });

      await loadInventory();

      /*
       * 新增成功后自动切换到刚刚添加的品牌。
       */
      setActiveBrandTab(brandName);
    } catch {
      message.error("添加失败");
    } finally {
      setSubmitting(false);
    }
  }

  function openStockModal(item: InventoryItem) {
    setEditingStockItem(item);

    stockForm.setFieldsValue({
      stock_qty: Number(item.stock_qty || 0),
    });

    setStockModalOpen(true);
  }

  function closeStockModal() {
    if (savingStock) {
      return;
    }

    setStockModalOpen(false);
    setEditingStockItem(null);
    stockForm.resetFields();
  }

  async function handleSaveStock(values: StockFormValues) {
    if (!editingStockItem) {
      return;
    }

    const newStockQty = Number(values.stock_qty);

    if (!Number.isInteger(newStockQty) || newStockQty < 0) {
      message.error("库存数量必须是大于或等于 0 的整数");
      return;
    }

    try {
      setSavingStock(true);

      const res = await fetch(
        `/api/inventory-items/${editingStockItem.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stock_qty: newStockQty,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "修改库存失败");
        return;
      }

      message.success(data.message || "库存修改成功");

      setStockModalOpen(false);
      setEditingStockItem(null);
      stockForm.resetFields();

      await loadInventory();
    } catch {
      message.error("修改库存失败");
    } finally {
      setSavingStock(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadInventory();
  }, []);

  /*
   * 当前数据库里已经存在的品牌。
   */
  const visibleBrands = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((item) => cleanText(item.brand_name))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  /*
   * 品牌输入建议：
   * 默认品牌 + 数据库现有品牌。
   *
   * 自动去重。
   */
  const brandOptions = useMemo(() => {
    const brandSet = new Set<string>();

    for (const brand of DEFAULT_BRANDS) {
      const cleanBrand = cleanText(brand);

      if (cleanBrand) {
        brandSet.add(cleanBrand);
      }
    }

    for (const brand of visibleBrands) {
      const cleanBrand = cleanText(brand);

      if (cleanBrand) {
        brandSet.add(cleanBrand);
      }
    }

    return Array.from(brandSet)
      .sort((a, b) => a.localeCompare(b))
      .map((brand) => ({
        label: brand,
        value: brand,
      }));
  }, [visibleBrands]);

  const tabItems = useMemo(() => {
    return [
      {
        key: "ALL",
        label: "全部",
      },
      ...visibleBrands.map((brand) => ({
        key: brand,
        label: brand,
      })),
    ];
  }, [visibleBrands]);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (activeBrandTab !== "ALL") {
      result = result.filter(
        (item) => item.brand_name === activeBrandTab
      );
    }

    const keyword = searchText.trim().toLowerCase();

    if (keyword) {
      result = result.filter((item) => {
        const product = cleanText(
          item.product_name
        ).toLowerCase();

        const brand = cleanText(
          item.brand_name
        ).toLowerCase();

        const flavor = cleanText(
          item.flavor_name
        ).toLowerCase();

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
      key: "product_name",
      width: 220,
    },
    {
      title: "品牌",
      dataIndex: "brand_name",
      key: "brand_name",
      width: 200,
    },
    {
      title: "口味",
      dataIndex: "flavor_name",
      key: "flavor_name",
      width: 350,
    },
    {
      title: "库存",
      dataIndex: "stock_qty",
      key: "stock_qty",
      width: 220,
      sorter: (a, b) =>
        Number(a.stock_qty || 0) - Number(b.stock_qty || 0),
      sortDirections: ["descend", "ascend"],
      render: (value: number) => {
        const stockQty = Number(value || 0);
        const level = getStockLevel(stockQty);

        if (level === "out") {
          return (
            <Space>
              <span
                style={{
                  color: "#cf1322",
                  fontWeight: 700,
                }}
              >
                {stockQty}
              </span>

              <Tag color="red">缺货</Tag>
            </Space>
          );
        }

        if (level === "low") {
          return (
            <Space>
              <span
                style={{
                  color: "#d46b08",
                  fontWeight: 700,
                }}
              >
                {stockQty}
              </span>

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
      key: "updated_at",
      width: 220,
      render: (value: string) =>
        value
          ? new Date(value).toLocaleString("zh-CN")
          : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 130,
      fixed: "right",
      render: (_, record: InventoryItem) =>
        isAdmin ? (
          <Button
            type="link"
            onClick={() => openStockModal(record)}
          >
            编辑库存
          </Button>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <DashboardShell>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        库存管理
      </h1>

      {isAdmin ? (
        <Card
          style={{
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 20,
              marginBottom: 16,
            }}
          >
            添加库存
          </h2>

          <Form<AddInventoryFormValues>
            form={form}
            layout="vertical"
            onFinish={handleAdd}
            initialValues={{
              stock_qty: 0,
            }}
          >
            <Space
              align="start"
              size={16}
              wrap
              style={{
                width: "100%",
              }}
            >
              <Form.Item
                label="产品"
                name="product_name"
                rules={[
                  {
                    required: true,
                    message: "请输入产品",
                  },
                ]}
                style={{
                  width: 220,
                }}
              >
                <Input placeholder="例如：Ali-Grape Ice" />
              </Form.Item>

              <Form.Item
                label="品牌"
                name="brand_name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "请选择或输入品牌",
                  },
                ]}
                extra="可以选择已有品牌，也可以直接输入一个新品牌。"
                style={{
                  width: 260,
                }}
              >
                <AutoComplete
                  allowClear
                  options={brandOptions}
                  placeholder="选择已有品牌或输入新品牌"
                  filterOption={(inputValue, option) =>
                    String(option?.value || "")
                      .toLowerCase()
                      .includes(inputValue.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item
                label="口味"
                name="flavor_name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "请输入口味",
                  },
                ]}
                style={{
                  width: 260,
                }}
              >
                <Input placeholder="例如：Grape Ice" />
              </Form.Item>

              <Form.Item
                label="库存"
                name="stock_qty"
                rules={[
                  {
                    required: true,
                    message: "请输入库存",
                  },
                  {
                    validator: async (_, value) => {
                      const qty = Number(value);

                      if (
                        !Number.isInteger(qty) ||
                        qty < 0
                      ) {
                        throw new Error(
                          "库存必须是大于或等于 0 的整数"
                        );
                      }
                    },
                  },
                ]}
                style={{
                  width: 160,
                }}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>

              <Form.Item
                label=" "
                style={{
                  width: 160,
                }}
              >
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                >
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
          <h2
            style={{
              fontSize: 20,
              margin: 0,
            }}
          >
            {isAdmin ? "库存列表" : "我的库存"}
          </h2>

          <Space wrap>
            <Tag color="blue">
              记录数：{totalCount}
            </Tag>

            <Tag color="green">
              库存总数：{totalStockQty}
            </Tag>

            <Tag color="orange">
              低库存：{lowStockCount}
            </Tag>

            <Tag color="red">
              缺货：{outOfStockCount}
            </Tag>
          </Space>
        </div>

        <Tabs
          activeKey={activeBrandTab}
          onChange={setActiveBrandTab}
          items={tabItems}
          style={{
            marginBottom: 12,
          }}
        />

        <div
          style={{
            marginBottom: 16,
            maxWidth: 420,
          }}
        >
          <Input
            placeholder="搜索产品 / 品牌 / 口味"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            allowClear
          />
        </div>

        <Table<InventoryItem>
          rowKey="id"
          loading={loading}
          dataSource={filteredRows}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [
              "10",
              "20",
              "50",
              "100",
            ],
            showTotal: (total) => `共 ${total} 条`,
          }}
          columns={columns}
          scroll={{
            x: 1350,
          }}
          rowClassName={(record) => {
            const level = getStockLevel(
              Number(record.stock_qty || 0)
            );

            if (level === "out") {
              return "inventory-row-out";
            }

            if (level === "low") {
              return "inventory-row-low";
            }

            return "";
          }}
        />
      </Card>

      <Modal
        title="编辑库存"
        open={stockModalOpen}
        onCancel={closeStockModal}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Form<StockFormValues>
          form={stockForm}
          layout="vertical"
          onFinish={handleSaveStock}
        >
          <Form.Item label="产品">
            <Input
              value={editingStockItem?.product_name || ""}
              disabled
            />
          </Form.Item>

          <Form.Item label="品牌">
            <Input
              value={editingStockItem?.brand_name || ""}
              disabled
            />
          </Form.Item>

          <Form.Item label="口味">
            <Input
              value={editingStockItem?.flavor_name || ""}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="当前库存"
            name="stock_qty"
            rules={[
              {
                required: true,
                message: "请输入库存数量",
              },
              {
                validator: async (_, value) => {
                  const qty = Number(value);

                  if (
                    !Number.isInteger(qty) ||
                    qty < 0
                  ) {
                    throw new Error(
                      "库存必须是大于或等于 0 的整数"
                    );
                  }
                },
              },
            ]}
            extra="这里填写修改后的实际库存总数，不是增加或减少的数量。"
          >
            <InputNumber
              min={0}
              precision={0}
              style={{
                width: "100%",
              }}
              placeholder="请输入当前实际库存数量"
            />
          </Form.Item>

          <div
            style={{
              marginBottom: 20,
              padding: 12,
              background: "#fafafa",
              borderRadius: 6,
            }}
          >
            原库存：
            <strong>
              {editingStockItem?.stock_qty ?? 0}
            </strong>
          </div>

          <Space
            style={{
              width: "100%",
              justifyContent: "flex-end",
            }}
          >
            <Button
              onClick={closeStockModal}
              disabled={savingStock}
            >
              取消
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={savingStock}
            >
              保存库存
            </Button>
          </Space>
        </Form>
      </Modal>

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