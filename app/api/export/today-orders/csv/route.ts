import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_no,
      customer_info,
      remark,
      created_by,
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

  const rows: string[] = [];

  rows.push([
    "订单号",
    "客户信息",
    "备注",
    "录入人",
    "总数",
    "创建时间",
    "产品",
    "品牌",
    "口味",
    "数量",
  ].join(","));

  for (const order of data || []) {
    const items = order.order_items || [];

    if (!items.length) {
      rows.push([
        order.order_no,
        order.customer_info || "",
        order.remark || "",
        order.created_by || "",
        String(order.total_qty ?? 0),
        order.created_at || "",
        "",
        "",
        "",
        "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      continue;
    }

    for (const item of items) {
      rows.push([
        order.order_no,
        order.customer_info || "",
        order.remark || "",
        order.created_by || "",
        String(order.total_qty ?? 0),
        order.created_at || "",
        item.product_name || "",
        item.brand_name || "",
        item.flavor_name || "",
        String(item.qty ?? 0),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
  }

  const csvContent = "\uFEFF" + rows.join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="today-orders.csv"`,
    },
  });
}