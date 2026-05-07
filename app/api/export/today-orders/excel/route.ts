import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import {
  getAccessibleBrands,
  filterOrderItemsByBrands,
} from "@/lib/brandAccess";
import * as XLSX from "xlsx";

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

  const sheetData = visibleOrders.map((order: any) => ({
    时间: new Date(order.created_at).toLocaleDateString("zh-CN"),
    订单编号: order.order_no,
    客户信息: order.customer_info,
    产品信息: formatProductInfo(order.order_items || []),
    数量: order.total_qty,
    备注: order.remark || "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 40 },
    { wch: 10 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orders-${startLabel}-to-${endLabel}.xlsx"`,
    },
  });
}