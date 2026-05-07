import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import {
  getAccessibleBrands,
  filterOrderItemsByBrands,
} from "@/lib/brandAccess";

function formatProductInfo(items: any[]) {
  const grouped: Record<string, string[]> = {};

  for (const item of items || []) {
    const brand = item.brand_name || "未知品牌";
    if (!grouped[brand]) grouped[brand] = [];
    grouped[brand].push(`${item.flavor_name}*${item.qty}`);
  }

  return Object.entries(grouped)
    .map(([brand, lines]) => `${brand}:\n${lines.join("\n")}`)
    .join("\n");
}

function csvEscape(value: any) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getDateRange(startStr: string | null, endStr: string | null) {
  const startTarget = startStr ? new Date(`${startStr}T00:00:00`) : new Date();
  const endTarget = endStr ? new Date(`${endStr}T00:00:00`) : startTarget;

  const start = new Date(startTarget);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endTarget);
  end.setHours(23, 59, 59, 999);

  const startLabel = start.toISOString().slice(0, 10);
  const endLabel = end.toISOString().slice(0, 10);

  return { start, end, startLabel, endLabel };
}

export async function GET(req: NextRequest) {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");
  const { start, end, startLabel, endLabel } = getDateRange(
    startParam,
    endParam
  );

  const access = await getAccessibleBrands(operator);

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_no,
      customer_info,
      remark,
      total_qty,
      created_at,
      order_items (
        id,
        product_name,
        brand_name,
        flavor_name,
        qty
      )
    `)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const visibleOrders = access.isAdmin
    ? data || []
    : (data || [])
        .map((order: any) => {
          const visibleItems = filterOrderItemsByBrands(
            order.order_items || [],
            access.brands
          );

          return {
            ...order,
            order_items: visibleItems,
            total_qty: visibleItems.reduce(
              (sum: number, item: any) => sum + Number(item.qty || 0),
              0
            ),
          };
        })
        .filter((order: any) => order.order_items.length > 0);

  const headers = ["时间", "订单编号", "客户信息", "产品信息", "数量", "备注"];

  const rows = visibleOrders.map((order: any) => [
    new Date(order.created_at).toLocaleDateString("zh-CN"),
    order.order_no,
    order.customer_info,
    formatProductInfo(order.order_items || []),
    order.total_qty,
    order.remark || "",
  ]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${startLabel}-to-${endLabel}.csv"`,
    },
  });
}