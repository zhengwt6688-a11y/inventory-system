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
      order_no,
      customer_name,
      customer_phone,
      customer_address,
      remark,
      total_qty,
      created_by,
      created_at,
      order_items (
        product_name_snapshot,
        flavor_name_snapshot,
        qty
      )
    `)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lines = [
    [
      "订单号",
      "客户姓名",
      "电话",
      "地址",
      "备注",
      "总数",
      "录入人",
      "创建时间",
      "产品",
      "口味",
      "数量",
    ].join(","),
  ];

  for (const order of data || []) {
    for (const item of order.order_items || []) {
      const row = [
        order.order_no,
        order.customer_name,
        order.customer_phone || "",
        order.customer_address || "",
        order.remark || "",
        order.total_qty,
        order.created_by,
        order.created_at,
        item.product_name_snapshot,
        item.flavor_name_snapshot,
        item.qty,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",");

      lines.push(row);
    }
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="today-orders.csv"`,
    },
  });
}