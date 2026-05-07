import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import { getAccessibleBrands } from "@/lib/brandAccess";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number(id);

  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: "无效订单ID" }, { status: 400 });
  }

  try {
    const access = await getAccessibleBrands(operator);

    if (!access.isAdmin) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          order_items (
            id,
            brand_name
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      const hasPermission = (order.order_items || []).some((item: any) =>
        access.brands.includes(item.brand_name)
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: "没有权限修改该订单追踪号" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const tracking_no = String(body.tracking_no || "").trim();
    const status = tracking_no ? "completed" : "processing";

    const { error } = await supabase
      .from("orders")
      .update({
        tracking_no,
        status,
        updated_by: operator.displayName,
        updated_user_id: operator.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: tracking_no
        ? "追踪号已保存，订单已完成"
        : "追踪号已清空，订单恢复处理中",
    });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}