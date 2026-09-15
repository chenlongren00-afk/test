import type { NotificationItem } from "@/types/marketplace";

export type NotificationRouteInput = Pick<NotificationItem, "type" | "title" | "body" | "relatedTaskId" | "relatedOfferId" | "route"> & {
  notificationId?: string;
};

export function notificationRouteHref(input: NotificationRouteInput) {
  const relatedTaskId = String(input.relatedTaskId || "").trim();
  const route = String(input.route || "").toLowerCase();
  const normalized = `${input.type || ""} ${input.title || ""} ${input.body || ""}`.toLowerCase();

  if (relatedTaskId && (route === "thread" || normalized.includes("message") || normalized.includes("chat") || normalized.includes("reply"))) {
    return `/thread/${encodeURIComponent(relatedTaskId)}` as const;
  }
  if (relatedTaskId) {
    return `/task/${encodeURIComponent(relatedTaskId)}` as const;
  }
  if (route === "payout" || normalized.includes("payout")) return "/payout" as const;
  if (route === "ratings" || normalized.includes("review") || normalized.includes("rating")) return "/ratings" as const;
  if (route === "payment" || normalized.includes("payment")) return "/payment" as const;
  return "/notifications" as const;
}

export function notificationRouteData(input: Record<string, unknown>): NotificationRouteInput {
  return {
    notificationId: String(input.notificationId || "").trim(),
    type: String(input.type || "").trim(),
    title: String(input.title || "").trim(),
    body: String(input.body || "").trim(),
    relatedTaskId: String(input.relatedTaskId || "").trim(),
    relatedOfferId: String(input.relatedOfferId || "").trim(),
    route: String(input.route || "").trim()
  };
}
