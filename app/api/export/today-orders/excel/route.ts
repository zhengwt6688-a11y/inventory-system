import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";

type OrderItem = {
  id: number;
  product_name: string;
  brand_name: string;
  flavor_name: string;
  qty: number;
};

type OrderRow = {
  id: number;
  order_no: string;
  customer_info: string;
  remark?: string;
  created_by?: string;
  total_qty: number;
  created_at: string;
  order_items: OrderItem[];
};

// 品牌名称映射：你可以以后继续加
function normalizeBrandName(brandName: string) {
  const name = String(brandName || "").trim().toLowerCase();

  const brandMap: Record<string, string> = {
    alibarbar: "ali",
    "iget one": "one",
    igetone: "one",
    one: "one",
  };

  return brandMap[name] || name;
}

// 把订单明细整理成你要的“产品信息”格式
function formatProductInfo(items: OrderItem[]) {
  const grouped = new Map<string, string[]>();

  for (const item of items || []) {
    const brand = normalizeBrandName(item.brand_name);
    const flavorLine = `${item.flavor_name}*${item.qty}`;

    if (!grouped.has(brand)) {
      grouped.set(brand, []);
    }

    grouped.get(brand)!.push(flavorLine);
  }

  const lines: string[] = [];

  for (const [brand, flavors] of grouped.entries()) {
    lines.push(`${brand}:`);
    lines.push(...flavors);
  }

  return lines.join("\n");
}

// 时间格式：导出成 4月11日 这种样式
function formatDateToChinese(dateString: string) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

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
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("当天订单");

  worksheet.columns = [
    { header: "A (时间)", key: "time", width: 14 },
    { header: "B (订单编号)", key: "order_no", width: 18 },
    { header: "C (客户信息)", key: "customer_info", width: 34 },
    { header: "D (产品信息)", key: "product_info", width: 42 },
    { header: "E (数量)", key: "total_qty", width: 10 },
    { header: "F (备注)", key: "remark", width: 24 },
  ];

  for (const order of (data || []) as OrderRow[]) {
    worksheet.addRow({
      time: formatDateToChinese(order.created_at),
      order_no: order.order_no,
      customer_info: order.customer_info || "",
      product_info: formatProductInfo(order.order_items || []),
      total_qty: order.total_qty ?? 0,
      remark: order.remark || "",
    });
  }

  // 表头样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // 全表自动换行、垂直居中
  worksheet.eachRow((row, rowNumber) => {
    row.alignment = {
      vertical: "middle",
      wrapText: true,
    };

    // 数据行根据内容自动给高一点
    if (rowNumber > 1) {
      row.height = 42;
    }
  });

  // 指定几列居中
  ["A", "B", "E"].forEach((col) => {
    worksheet.getColumn(col).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });

  // 边框
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="today-orders.xlsx"`,
    },
  });
}