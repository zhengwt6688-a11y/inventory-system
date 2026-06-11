import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import {
  getAccessibleBrands,
  filterOrderItemsByBrands,
} from "@/lib/brandAccess";

export async function GET() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const access = await getAccessibleBrands(operator);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        customer_info,
        remark,
        created_by,
        created_user_id,
        updated_by,
        updated_user_id,
        updated_at,
        total_qty,
        created_at,
        tracking_no,
        status,
        order_items (
          id,
          inventory_item_id,
          product_name,
          brand_name,
          flavor_name,
          qty,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (access.isAdmin) {
      return NextResponse.json(data || []);
    }

    if (!access.brands.length) {
      return NextResponse.json([]);
    }

    const filteredOrders = (data || [])
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

    return NextResponse.json(filteredOrders);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "读取订单失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const order_no = String(body.order_no || "").trim();
    const customer_info = String(body.customer_info || "").trim();
    const remark = String(body.remark || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!order_no) {
      return NextResponse.json({ error: "订单号不能为空" }, { status: 400 });
    }

    if (!customer_info) {
      return NextResponse.json({ error: "客户信息不能为空" }, { status: 400 });
    }

    if (!items.length) {
      return NextResponse.json({ error: "请至少添加一个商品" }, { status: 400 });
    }

    const access = await getAccessibleBrands(operator);

    if (!access.isAdmin) {
      if (!access.brands.length) {
        return NextResponse.json(
          { error: "该供应商没有绑定任何品牌，不能添加订单" },
          { status: 403 }
        );
      }

      const inventoryIds = items
        .map((item: any) => Number(item.inventory_item_id))
        .filter(Boolean);

      const { data: inventoryRows, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, brand_name")
        .in("id", inventoryIds);

      if (inventoryError) {
        return NextResponse.json(
          { error: inventoryError.message },
          { status: 500 }
        );
      }

      const invalidItem = (inventoryRows || []).find(
        (item: any) => !access.brands.includes(item.brand_name)
      );

      if (invalidItem) {
        return NextResponse.json(
          { error: "供应商只能添加自己绑定品牌的商品" },
          { status: 403 }
        );
      }

      if ((inventoryRows || []).length !== inventoryIds.length) {
        return NextResponse.json(
          { error: "存在无效商品，不能添加订单" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase.rpc("create_order_with_inventory_items", {
      p_order_no: order_no,
      p_customer_info: customer_info,
      p_remark: remark || null,
      p_created_by: operator.displayName,
      p_items: items,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    await supabase
      .from("orders")
      .update({
        created_user_id: operator.userId,
        updated_by: operator.displayName,
        updated_user_id: operator.userId,
      })
      .eq("id", data);

    return NextResponse.json({
      message: "订单创建成功，库存已实时扣减",
      order_id: data,
    });
  } catch {
    return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
  }
}