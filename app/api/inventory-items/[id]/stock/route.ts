import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import { getAccessibleBrands } from "@/lib/brandAccess";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseInventoryId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function parseStockQty(value: unknown) {
  const stockQty = Number(value);

  if (!Number.isInteger(stockQty) || stockQty < 0) {
    return null;
  }

  return stockQty;
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json(
      { error: "未登录" },
      { status: 401 }
    );
  }

  const access = await getAccessibleBrands(operator);

  if (!access.isAdmin) {
    return NextResponse.json(
      { error: "只有管理员可以修改库存数量" },
      { status: 403 }
    );
  }

  const params = await context.params;
  const inventoryId = parseInventoryId(params.id);

  if (!inventoryId) {
    return NextResponse.json(
      { error: "无效的库存 ID" },
      { status: 400 }
    );
  }

  let body: {
    stock_qty?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求数据格式错误" },
      { status: 400 }
    );
  }

  const stockQty = parseStockQty(body.stock_qty);

  if (stockQty === null) {
    return NextResponse.json(
      {
        error: "库存数量必须是大于或等于 0 的整数",
      },
      { status: 400 }
    );
  }

  const { data: currentItem, error: currentError } =
    await supabase
      .from("inventory_items")
      .select(`
        id,
        product_name,
        brand_name,
        flavor_name,
        stock_qty,
        updated_at
      `)
      .eq("id", inventoryId)
      .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      { error: currentError.message },
      { status: 500 }
    );
  }

  if (!currentItem) {
    return NextResponse.json(
      { error: "该库存产品不存在" },
      { status: 404 }
    );
  }

  const { data: updatedItem, error: updateError } =
    await supabase
      .from("inventory_items")
      .update({
        stock_qty: stockQty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventoryId)
      .select(`
        id,
        product_name,
        brand_name,
        flavor_name,
        stock_qty,
        created_at,
        updated_at
      `)
      .single();

  if (updateError || !updatedItem) {
    return NextResponse.json(
      {
        error:
          updateError?.message ||
          "修改库存失败",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: `库存已从 ${currentItem.stock_qty} 修改为 ${stockQty}`,
    item: updatedItem,
  });
}