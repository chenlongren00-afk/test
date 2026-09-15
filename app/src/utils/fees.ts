import type { FeeBreakdown, HelperTask, Offer } from "@/types/marketplace";

export const HELPER_PLATFORM_FEE_RATE = 0.15;
export const TASKER_CONNECTION_FEE_RATE = 0;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountFrom(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fallbackFeeBreakdown(amount: number | string | null | undefined): FeeBreakdown {
  const taskPrice = Math.max(0, amountFrom(amount));
  const platformFeeAmount = roundMoney(taskPrice * HELPER_PLATFORM_FEE_RATE);
  const helperPayoutAmount = roundMoney(Math.max(0, taskPrice - platformFeeAmount));
  return {
    currency: "AUD",
    taskPrice,
    taskerTotal: taskPrice,
    platformFeeRate: HELPER_PLATFORM_FEE_RATE,
    platformFeeAmount,
    connectionFeeRate: TASKER_CONNECTION_FEE_RATE,
    connectionFeeAmount: 0,
    stripeFeeAmount: 0,
    helperNet: helperPayoutAmount,
    helperPayoutAmount,
    proSavingsAmount: 0,
    feeTier: "standard_15"
  };
}

export function taskFeeBreakdown(task: HelperTask | null | undefined): FeeBreakdown {
  return task?.feeBreakdown || fallbackFeeBreakdown(task?.paymentAmount ?? task?.taskPrice ?? task?.budget);
}

export function offerFeeBreakdown(offer: Offer | null | undefined): FeeBreakdown {
  const rate = Number(offer?.helperPlatformFeeRate || HELPER_PLATFORM_FEE_RATE);
  const base = fallbackFeeBreakdown(offer?.amount);
  const platformFeeAmount = roundMoney(base.taskPrice * (Number.isFinite(rate) && rate > 0 ? rate : HELPER_PLATFORM_FEE_RATE));
  return {
    ...base,
    platformFeeRate: rate,
    platformFeeAmount,
    helperNet: roundMoney(Math.max(0, base.taskPrice - platformFeeAmount)),
    helperPayoutAmount: roundMoney(Math.max(0, base.taskPrice - platformFeeAmount)),
    feeTier: rate < HELPER_PLATFORM_FEE_RATE ? "pro_10" : "standard_15"
  };
}
