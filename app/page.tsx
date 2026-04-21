import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";

export default async function HomePage() {
  const operator = await getCurrentOperator();

  if (!operator) {
    redirect("/login");
  }

  if (operator.role === "admin") {
    redirect("/orders");
  }

  redirect("/inventory");
}