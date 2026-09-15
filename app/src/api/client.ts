import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  AppConfigPayload,
  AuthProfilePayload,
  AuthSessionPayload,
  GooglePlayProPurchasePayload,
  GooglePlayProPurchaseResponse,
  MarketplaceState,
  MessageCreateResponse,
  MessageDraft,
  NotificationsReadResponse,
  OfferCreateResponse,
  OfferDraft,
  ProfileMediaReportResponse,
  TaskActionResponse,
  TaskCheckoutSessionResponse,
  TaskCreateResponse,
  TaskDeleteResponse,
  TaskPaymentConfirmResponse,
  TaskDraft,
  TaskReviewCreateResponse,
  TaskReviewTargetRole,
  UserProfile
} from "@/types/marketplace";

const TOKEN_KEY = "ah_auth_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getDevelopmentApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : "";
  return host && host !== "localhost" && host !== "127.0.0.1" ? `http://${host}:4242` : "http://localhost:4242";
}

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_AH_BACKEND_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  (__DEV__ ? getDevelopmentApiUrl() : "https://api.australianhelper.com");

export async function getAuthToken() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveAuthToken(token: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function parseError(response: Response) {
  const payload = await readJSONResponse(response).catch(() => ({}));
  const errors = payload?.errors && typeof payload.errors === "object" ? payload.errors : undefined;
  const message =
    payload?.error ||
    payload?.message ||
    errors?.form ||
    Object.values(errors || {})[0] ||
    `Request failed with HTTP ${response.status}`;
  return new ApiError(String(message), response.status, errors, typeof payload?.code === "string" ? payload.code : undefined);
}

async function readJSONResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get("content-type") || "unknown content";
    const preview = text.replace(/\s+/g, " ").slice(0, 120);
    throw new ApiError(`Backend returned ${contentType} instead of JSON: ${preview}`, response.status);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return readJSONResponse(response) as Promise<T>;
}

export const api = {
  appConfig() {
    return apiFetch<AppConfigPayload>("/api/app/config");
  },

  marketplaceState(token?: string | null) {
    return apiFetch<MarketplaceState>("/api/app/state", {}, token);
  },

  markNotificationsRead(token: string, input: { ids?: string[]; all?: boolean; relatedTaskId?: string; threadId?: string; messages?: boolean }) {
    return apiFetch<NotificationsReadResponse>("/api/app/notifications/read", {
      method: "POST",
      body: JSON.stringify({
        ids: input.ids || [],
        all: Boolean(input.all),
        relatedTaskId: input.relatedTaskId || "",
        threadId: input.threadId || "",
        messages: Boolean(input.messages)
      })
    }, token);
  },

  reportProfileMedia(token: string, input: {
    targetUserId?: string;
    targetHelperId?: string;
    mediaType?: string;
    mediaId?: string;
    reason?: string;
    details?: string;
  }) {
    return apiFetch<ProfileMediaReportResponse>("/api/app/profile-media/report", {
      method: "POST",
      body: JSON.stringify({
        targetUserId: input.targetUserId || "",
        targetHelperId: input.targetHelperId || "",
        mediaType: input.mediaType || "profile",
        mediaId: input.mediaId || "",
        reason: input.reason || "Inappropriate profile image",
        details: input.details || "",
        source: "android"
      })
    }, token);
  },

  registerPushToken(token: string, input: { token: string; platform: string; environment?: string; bundleId?: string; appVersion?: string }) {
    return apiFetch<{
      ok: boolean;
      pushConfigured?: boolean;
      expoPushConfigured?: boolean | null;
      expoPushCredentialStatus?: string;
      expoPushCredentialMessage?: string;
    }>("/api/app/device-tokens", {
      method: "POST",
      body: JSON.stringify(input)
    }, token);
  },

  pushDiagnostics(token: string) {
    return apiFetch<Record<string, unknown>>("/api/app/notifications/diagnostics", {}, token);
  },

  sendPushTest(token: string) {
    return apiFetch<Record<string, unknown>>("/api/app/notifications/test", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  login(email: string, password: string) {
    return apiFetch<AuthSessionPayload>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  requestPasswordReset(email: string) {
    return apiFetch<{ ok: boolean; message?: string }>("/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },

  resetPassword(email: string, token: string, password: string) {
    return apiFetch<AuthSessionPayload & { ok?: boolean; message?: string }>("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ email, token, password })
    });
  },

  register(name: string, email: string, password: string, suburb: string, role: string, antiRobotToken?: string) {
    return apiFetch<AuthSessionPayload>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, suburb, role, antiRobotToken: antiRobotToken || "" })
    });
  },

  me(token: string) {
    return apiFetch<AuthProfilePayload>("/api/auth/me", {}, token);
  },

  updateProfile(token: string, user: UserProfile) {
    return apiFetch<AuthProfilePayload>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: user.name,
        suburb: user.suburb,
        bio: user.bio,
        phone: user.phone,
        role: user.role,
        skills: user.skills,
        marketRegion: user.marketRegion,
        taskRadiusKm: user.taskRadiusKm,
        taskAlertMode: user.taskAlertMode,
        notificationPreferences: user.notificationPreferences,
        avatarURL: user.avatarURL,
        profileMedia: user.profileMedia,
        policeCheckReference: user.policeCheckReference,
        policeCheckProvider: user.policeCheckProvider,
        policeCheckExpiresAt: user.policeCheckExpiresAt,
        policeCheckDocumentURL: user.policeCheckDocumentURL,
        workingWithChildrenCheckReference: user.workingWithChildrenCheckReference,
        workingWithChildrenCheckProvider: user.workingWithChildrenCheckProvider,
        workingWithChildrenCheckExpiresAt: user.workingWithChildrenCheckExpiresAt,
        workingWithChildrenCheckDocumentURL: user.workingWithChildrenCheckDocumentURL
      })
    }, token);
  },

  startPhoneVerification(token: string, phone: string) {
    return apiFetch<AuthProfilePayload>("/api/auth/phone/start", {
      method: "POST",
      body: JSON.stringify({ phone })
    }, token);
  },

  confirmPhoneVerification(token: string, phone: string, code: string) {
    return apiFetch<AuthProfilePayload>("/api/auth/phone/check", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    }, token);
  },

  activateGooglePlayPro(token: string, purchase: GooglePlayProPurchasePayload) {
    return apiFetch<GooglePlayProPurchaseResponse>("/api/app/membership/pro/google-play", {
      method: "POST",
      body: JSON.stringify(purchase)
    }, token);
  },

  startIdentityVerification(token: string) {
    return apiFetch<{ url?: string; sessionId?: string; status?: string }>("/api/auth/identity/start", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  refreshIdentityVerificationStatus(token: string) {
    return apiFetch<{ user?: UserProfile; state?: MarketplaceState | null; sessionId?: string; status?: string; url?: string }>("/api/auth/identity/refresh", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  createTask(token: string, draft: TaskDraft, antiRobotToken?: string) {
    return apiFetch<TaskCreateResponse>("/api/app/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...draft,
        budget: Number(draft.budget || 0),
        photos: draft.photos || [],
        antiRobotToken: antiRobotToken || ""
      })
    }, token);
  },

  deleteTask(token: string, taskId: string) {
    return apiFetch<TaskDeleteResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE"
    }, token);
  },

  submitOffer(token: string, taskId: string, draft: OfferDraft, antiRobotToken?: string) {
    return apiFetch<OfferCreateResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/offers`, {
      method: "POST",
      body: JSON.stringify({ ...draft, antiRobotToken: antiRobotToken || "" })
    }, token);
  },

  acceptOffer(token: string, taskId: string, offerId: string, antiRobotToken?: string) {
    return apiFetch<OfferCreateResponse>(
      `/api/app/tasks/${encodeURIComponent(taskId)}/offers/${encodeURIComponent(offerId)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ antiRobotToken: antiRobotToken || "" })
      },
      token
    );
  },

  counterOffer(token: string, taskId: string, offerId: string, draft: OfferDraft, antiRobotToken?: string) {
    return apiFetch<OfferCreateResponse>(
      `/api/app/tasks/${encodeURIComponent(taskId)}/offers/${encodeURIComponent(offerId)}/counter`,
      {
        method: "POST",
        body: JSON.stringify({ ...draft, antiRobotToken: antiRobotToken || "" })
      },
      token
    );
  },

  startTask(token: string, taskId: string) {
    return apiFetch<TaskActionResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/start`, {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  requestPaymentRelease(token: string, taskId: string) {
    return apiFetch<TaskActionResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/payment/request`, {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  confirmCompletionAndReleasePayment(token: string, taskId: string) {
    return apiFetch<TaskActionResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/payment/release`, {
      method: "POST",
      body: JSON.stringify({ confirmedRelease: true })
    }, token);
  },

  requestCancellation(token: string, taskId: string, input: { reason: string; details?: string }) {
    return apiFetch<TaskActionResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/cancellation/request`, {
      method: "POST",
      body: JSON.stringify({
        reason: input.reason,
        details: input.details || ""
      })
    }, token);
  },

  createTaskCheckoutSession(token: string, taskId: string) {
    return apiFetch<TaskCheckoutSessionResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/checkout-session`, {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  confirmTaskPayment(token: string, taskId: string, input: { sessionId?: string; checkoutSessionId?: string; paymentIntentId?: string }) {
    return apiFetch<TaskPaymentConfirmResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/payment/confirm`, {
      method: "POST",
      body: JSON.stringify({
        sessionId: input.sessionId || input.checkoutSessionId || "",
        checkoutSessionId: input.checkoutSessionId || input.sessionId || "",
        paymentIntentId: input.paymentIntentId || ""
      })
    }, token);
  },

  submitTaskReview(token: string, taskId: string, targetRole: TaskReviewTargetRole, input: { rating: number; comment: string }) {
    return apiFetch<TaskReviewCreateResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        targetRole,
        rating: Number(input.rating || 0),
        comment: input.comment || ""
      })
    }, token);
  },

  sendMessage(token: string, taskId: string, draft: string | MessageDraft) {
    const payload = typeof draft === "string" ? { body: draft } : draft;
    return apiFetch<MessageCreateResponse>(`/api/app/tasks/${encodeURIComponent(taskId)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        body: payload.body || "",
        attachments: payload.attachments || []
      })
    }, token);
  },

  createPayoutAccountLink(token: string) {
    return apiFetch<{ mode: string; accountId: string; url: string; expiresAt?: number }>("/api/stripe/connect/account-link", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  createPayoutDashboardLink(token: string) {
    return apiFetch<{ mode: string; url: string; requiresOnboarding?: boolean; message?: string }>("/api/stripe/connect/dashboard-link", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  },

  refreshPayoutStatus(token: string) {
    return apiFetch<{
      ok?: boolean;
      account?: {
        id?: string;
        payoutStatus?: string;
        bankVerified?: boolean;
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        currentlyDueCount?: number;
        pendingVerificationCount?: number;
      };
      user?: UserProfile;
      state?: MarketplaceState;
    }>("/api/app/payout/refresh", {
      method: "POST",
      body: JSON.stringify({})
    }, token);
  }
};
