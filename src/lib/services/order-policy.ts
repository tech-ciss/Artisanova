import type { OrderStatus } from "@/generated/prisma/client";
export const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"], PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [],
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => orderTransitions[from].includes(to);
export const revenueStatuses: OrderStatus[] = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
