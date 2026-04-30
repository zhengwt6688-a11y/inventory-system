import { supabase } from "@/lib/supabase";
import { CurrentOperator } from "@/lib/auth";

export async function getAccessibleBrands(operator: CurrentOperator) {
  if (operator.role === "admin") {
    return {
      isAdmin: true,
      brands: [] as string[],
    };
  }

  if (!operator.username) {
    return {
      isAdmin: false,
      brands: [] as string[],
    };
  }

  const { data, error } = await supabase
    .from("supplier_brand_access")
    .select("brand_name")
    .eq("username", operator.username);

  if (error) {
    throw new Error(error.message);
  }

  return {
    isAdmin: false,
    brands: (data || []).map((item) => item.brand_name),
  };
}

export function filterOrderItemsByBrands(orderItems: any[], brands: string[]) {
  return (orderItems || []).filter((item) => brands.includes(item.brand_name));
}