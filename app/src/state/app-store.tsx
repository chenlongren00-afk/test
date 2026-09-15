import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { api, ApiError, clearAuthToken, getAuthToken, saveAuthToken } from "@/api/client";
import { mergeCategories, taskCategories } from "@/constants/categories";
import { type AppLanguage, isAppLanguage, languageOptions, t } from "@/i18n/translations";
import { type AppTextSize, normalizeTextSize, textSizeOptions } from "@/theme/text-size";
import type {
  AppConfigPayload,
  AppRemoteConfig,
  HelperProfile,
  HelperTask,
  MarketplaceState,
  MessageDraft,
  MessageThread,
  NotificationItem,
  OfferDraft,
  TaskReviewTargetRole,
  TaskDraft,
  UserProfile,
  UserRole
} from "@/types/marketplace";

const fallbackConfig: AppRemoteConfig = {
  appName: "Australian Helper",
  environment: "local",
  maintenanceMode: false,
  minimumSupportedVersion: "1.0.0",
  latestVersion: "1.0.0",
  antiRobot: {
    provider: "cloudflare-turnstile",
    enabled: false,
    enforced: false,
    siteKey: "",
    challengeUrl: "",
    actions: []
  },
  theme: {
    primary: "#0F756D",
    primaryDark: "#0A544F",
    accent: "#F2A014",
    background: "#F5FAFA"
  },
  home: {
    eyebrow: "",
    title: "Helper",
    subtitle: "It's just one tap away",
    primaryButton: "Post a Task",
    secondaryButton: "Help",
    categoryTitle: "Popular categories",
    categorySubtitle: "Fast entry points for common Australian Helper jobs"
  },
  onboarding: {
    showOnboarding: true,
    title: "A cleaner way to get local help.",
    subtitle: "Post a task, compare offers, choose your Helper, then keep everything in one safe thread."
  },
  featureFlags: {},
  support: {
    email: "australianshelper@gmail.com",
    phone: "+61 400 000 000",
    hours: "Mon-Fri 9:00-17:00 AEST"
  }
};

const emptyState: MarketplaceState = {
  users: [],
  helpers: [],
  tasks: [],
  taskReviews: [],
  rewardLedger: [],
  notifications: [],
  threads: [],
  categories: taskCategories,
  updatedAt: ""
};

const LANGUAGE_KEY = "ah_app_language";
const TASK_LANGUAGE_FILTER_KEY = "ah_task_language_filters";
const TEXT_SIZE_KEY = "ah_text_size";
const STORAGE_TIMEOUT_MS = 2500;

type AppStoreValue = {
  config: AppRemoteConfig;
  categories: string[];
  localizedCategory: (category: string) => string;
  state: MarketplaceState;
  currentUser: UserProfile | null;
  token: string | null;
  language: AppLanguage;
  textSize: AppTextSize;
  textScale: number;
  taskLanguageFilters: AppLanguage[];
  taskLanguageFilterLabel: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
  openTasks: HelperTask[];
  currentAccountUserIds: string[];
  currentHelper: HelperProfile | null;
  currentHelperIds: string[];
  myPostedTasks: HelperTask[];
  myAcceptedTasks: HelperTask[];
  myAppliedTasks: HelperTask[];
  taskerCompletedTasks: HelperTask[];
  helperCompletedTasks: HelperTask[];
  helperEarnings: number;
  threads: MessageThread[];
  refreshAll: () => Promise<void>;
  silentRefreshAll: () => Promise<void>;
  openNotification: (item: NotificationItem) => Promise<void>;
  markNotificationsRead: (ids: string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markThreadRead: (threadId: string) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setTextSize: (size: AppTextSize) => Promise<void>;
  setTaskLanguageFilters: (languages: AppLanguage[]) => Promise<void>;
  translate: (key: string) => string;
  completeOAuthLogin: (token: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  resetPassword: (input: { email: string; token: string; password: string }) => Promise<string | null>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    suburb: string;
    role: UserRole;
  }, antiRobotToken?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  createTask: (draft: TaskDraft, antiRobotToken?: string) => Promise<string | null>;
  deleteTask: (taskId: string) => Promise<string | null>;
  submitOffer: (taskId: string, draft: OfferDraft, antiRobotToken?: string) => Promise<string | null>;
  acceptOffer: (taskId: string, offerId: string, antiRobotToken?: string) => Promise<string | null>;
  counterOffer: (taskId: string, offerId: string, draft: OfferDraft, antiRobotToken?: string) => Promise<string | null>;
  startTask: (taskId: string) => Promise<string | null>;
  requestPaymentRelease: (taskId: string) => Promise<string | null>;
  confirmCompletionAndReleasePayment: (taskId: string) => Promise<string | null>;
  requestCancellation: (taskId: string, input: { reason: string; details?: string }) => Promise<string | null>;
  createTaskCheckoutSession: (taskId: string) => Promise<{ url?: string; sessionId?: string; error?: string }>;
  confirmTaskPayment: (taskId: string, input: { sessionId?: string; checkoutSessionId?: string; paymentIntentId?: string }) => Promise<string | null>;
  submitTaskReview: (taskId: string, targetRole: TaskReviewTargetRole, input: { rating: number; comment: string }) => Promise<string | null>;
  sendMessage: (taskId: string, draft: string | MessageDraft) => Promise<string | null>;
  reportProfileMedia: (input: {
    targetUserId?: string;
    targetHelperId?: string;
    mediaType?: string;
    mediaId?: string;
    reason?: string;
    details?: string;
  }) => Promise<string | null>;
  updateProfile: (user: UserProfile) => Promise<string | null>;
  startPhoneVerification: (phone: string) => Promise<string | null>;
  confirmPhoneVerification: (phone: string, code: string) => Promise<string | null>;
  startIdentityVerification: () => Promise<{ url?: string; error?: string }>;
  refreshIdentityVerificationStatus: () => Promise<{ status?: string; url?: string; error?: string }>;
  createPayoutAccountLink: () => Promise<{ url?: string; error?: string }>;
  createPayoutDashboardLink: () => Promise<{ url?: string; error?: string; requiresOnboarding?: boolean; message?: string }>;
  refreshPayoutStatus: () => Promise<string | null>;
};

const AppStoreContext = React.createContext<AppStoreValue | null>(null);

function messageFor(error: unknown, language: AppLanguage = "en") {
  if (error instanceof ApiError && error.code === "IDENTITY_AND_AGE_VERIFICATION_REQUIRED") {
    return t(language, "identityAgeVerificationRequired");
  }
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return t(language, "somethingWentWrong");
}

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function webStorage() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.localStorage || null;
}

async function withStorageTimeout<T>(operation: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), STORAGE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readStoredValue(key: string) {
  const storage = webStorage();
  if (storage) return storage.getItem(key);
  return withStorageTimeout(SecureStore.getItemAsync(key), null);
}

async function writeStoredValue(key: string, value: string) {
  const storage = webStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  await withStorageTimeout(SecureStore.setItemAsync(key, value), undefined);
}

function findSyncedCurrentUser(currentUser: UserProfile, payload: MarketplaceState) {
  const email = normalizeEmail(currentUser.email);
  const candidates = payload.users.filter((user) => (
    user.id === currentUser.id ||
    (email.length > 0 && normalizeEmail(user.email) === email)
  ));
  if (!candidates.length) return null;
  return candidates
    .slice()
    .sort((left, right) => (
      profileCompletenessScore(right) - profileCompletenessScore(left) ||
      (left.id === currentUser.id ? -1 : right.id === currentUser.id ? 1 : 0)
    ))[0] || null;
}

function profileCompletenessScore(user: UserProfile) {
  let score = 0;
  for (const field of [user.name, user.suburb, user.bio, user.phone, user.avatarURL, user.marketRegion]) {
    if (String(field || "").trim()) score += 2;
  }
  if ((user.skills || []).length) score += 4;
  if ((user.profileMedia || []).length) score += 4;
  if (user.phoneVerified) score += 8;
  if (user.bankVerified) score += 8;
  if (String(user.idVerificationStatus || "").toLowerCase() === "verified") score += 10;
  if (String(user.policeCheckStatus || "").toLowerCase() === "verified") score += 6;
  if (String(user.workingWithChildrenCheckStatus || "").toLowerCase() === "verified") score += 6;
  if (String(user.membershipType || "").toLowerCase() === "pro" || String(user.proStatus || "").toLowerCase() === "active") score += 5;
  if (Number(user.rewardPoints || 0) > 0) score += 3;
  return score;
}

function completedTask(task: HelperTask) {
  return ["completed", "payment_released"].includes(task.status);
}

function taskEarningAmount(task: HelperTask) {
  const candidates = [
    task.helperPayoutAmount,
    task.feeBreakdown?.helperPayoutAmount,
    task.taskPrice,
    task.paymentAmount,
    task.budget
  ];
  const amount = candidates.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  return Number(amount || 0);
}

function normalizeTaskLanguageCode(value?: string | null): AppLanguage | null {
  const normalized = String(value || "").trim();
  if (isAppLanguage(normalized)) return normalized;
  const legacyMap: Record<string, AppLanguage> = {
    english: "en",
    simplifiedChinese: "zh-Hans",
    traditionalChinese: "zh-Hant",
    vietnamese: "vi"
  };
  return legacyMap[normalized] || null;
}

function normalizeTaskLanguageFilters(value: unknown): AppLanguage[] {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = value.split(",");
    }
  }
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((item) => normalizeTaskLanguageCode(String(item))).filter(Boolean))) as AppLanguage[];
}

function inferTaskLanguage(task: HelperTask): AppLanguage {
  const direct = normalizeTaskLanguageCode(task.language);
  if (direct) return direct;
  const text = `${task.title || ""} ${task.description || ""}`.trim();
  if (/[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text)) {
    return "vi";
  }
  if (/[\u3400-\u9fff]/.test(text)) {
    if (/[简体汉语这项任务请门车东乐爱]/.test(text)) return "zh-Hans";
    return "zh-Hant";
  }
  return "en";
}

export function taskMatchesLanguageFilters(task: HelperTask, filters: AppLanguage[]) {
  if (!filters.length) return true;
  return filters.includes(inferTaskLanguage(task));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<AppRemoteConfig>(fallbackConfig);
  const [categories, setCategories] = React.useState<string[]>(taskCategories);
  const [categoryTranslations, setCategoryTranslations] = React.useState<Record<string, Record<string, string>>>({});
  const [state, setState] = React.useState<MarketplaceState>(emptyState);
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [language, setLanguageState] = React.useState<AppLanguage>("en");
  const [textSize, setTextSizeState] = React.useState<AppTextSize>("default");
  const [taskLanguageFilters, setTaskLanguageFiltersState] = React.useState<AppLanguage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const refreshPromiseRef = React.useRef<Promise<void> | null>(null);

  const applyConfig = React.useCallback((payload: AppConfigPayload) => {
    setConfig(payload.appConfig);
    setCategories(mergeCategories(payload.categories));
    if (payload.categoryTranslations && Object.keys(payload.categoryTranslations).length) {
      setCategoryTranslations(payload.categoryTranslations);
    }
  }, []);

  const applyState = React.useCallback((payload: MarketplaceState) => {
    setState(payload);
    setCategories((current) => payload.categories?.length ? mergeCategories(payload.categories) : current);
    if (payload.categoryTranslations && Object.keys(payload.categoryTranslations).length) {
      setCategoryTranslations(payload.categoryTranslations);
    }
    setCurrentUser((user) => {
      if (!user) return user;
      return findSyncedCurrentUser(user, payload) || user;
    });
  }, []);

  const refreshAll = React.useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const operation = (async () => {
      setIsRefreshing(true);
      setError(null);
      try {
        const activeToken = token || await getAuthToken();
        const [configPayload, statePayload] = await Promise.all([
          api.appConfig(),
          api.marketplaceState(activeToken)
        ]);
        applyConfig(configPayload);
        applyState(statePayload);
      } catch (caught) {
        setError(messageFor(caught, language));
      } finally {
        setIsRefreshing(false);
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = operation;
    return operation;
  }, [applyConfig, applyState, language, token]);

  const silentRefreshAll = React.useCallback(async () => {
    try {
      const activeToken = token || await getAuthToken();
      const statePayload = await api.marketplaceState(activeToken);
      applyState(statePayload);
    } catch {
      return;
    }
  }, [applyState, token]);

  React.useEffect(() => {
    let active = true;

	    async function boot() {
	      setIsLoading(true);
	      let messageLanguage: AppLanguage = "en";
	      try {
	        const storedLanguage = await readStoredValue(LANGUAGE_KEY);
	        if (active && isAppLanguage(storedLanguage)) {
	          messageLanguage = storedLanguage;
	          setLanguageState(storedLanguage);
	        }

        const storedTextSize = await readStoredValue(TEXT_SIZE_KEY);
        if (active) {
          setTextSizeState(normalizeTextSize(storedTextSize));
        }

        const storedTaskLanguageFilters = await readStoredValue(TASK_LANGUAGE_FILTER_KEY);
        if (active) {
          setTaskLanguageFiltersState(normalizeTaskLanguageFilters(storedTaskLanguageFilters));
        }

        const storedToken = await getAuthToken();
        let activeToken: string | null = storedToken;
        if (storedToken) {
          try {
            const profile = await api.me(storedToken);
            if (active) {
              setToken(storedToken);
              setCurrentUser(profile.user);
            }
          } catch {
            await clearAuthToken();
            activeToken = null;
          }
        }

        const [configPayload, statePayload] = await Promise.all([
          api.appConfig(),
          api.marketplaceState(activeToken)
        ]);

        if (active) {
          applyConfig(configPayload);
	          applyState(statePayload);
	        }
	      } catch (caught) {
	        if (active) setError(messageFor(caught, messageLanguage));
	      } finally {
	        if (active) setIsLoading(false);
	      }
    }

    boot();
    return () => {
      active = false;
    };
	  }, [applyConfig, applyState]);

  const runMutation = React.useCallback(async function runMutation<T>(action: () => Promise<T>, onSuccess?: (payload: T) => void) {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = await action();
      onSuccess?.(payload);
      return null;
    } catch (caught) {
      const message = messageFor(caught, language);
      setError(message);
      return message;
    } finally {
      setIsSubmitting(false);
    }
  }, [language]);

  const value = React.useMemo<AppStoreValue>(() => {
    const openTasks = state.tasks.filter((task) => (
      ["open", "offer_received"].includes(task.status)
    ));
    const taskLanguageFilterLabel = taskLanguageFilters.length === 0
      ? t(language, "allTaskLanguages")
      : taskLanguageFilters.length === 1
        ? languageOptions.find((option) => option.code === taskLanguageFilters[0])?.label || taskLanguageFilters[0]
        : `${taskLanguageFilters.length} ${t(language, "taskLanguagesSelected")}`;
    const textScale = textSizeOptions.find((option) => option.value === textSize)?.scale || 1;
    const sortedThreads = [...state.threads].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const currentEmail = normalizeEmail(currentUser?.email);
    const accountUsers = currentUser
      ? [
          ...state.users.filter((user) => (
            user.id === currentUser.id ||
            (currentEmail.length > 0 && normalizeEmail(user.email) === currentEmail)
          )),
          ...(state.users.some((user) => user.id === currentUser.id) ? [] : [currentUser])
        ]
      : [];
    const currentAccountUserIds = Array.from(new Set(accountUsers.map((user) => user.id).filter(Boolean)));
    const currentAccountUserIdSet = new Set(currentAccountUserIds);
    const accountHelpers = state.helpers.filter((helper) => currentAccountUserIdSet.has(helper.userId));
    const currentHelper = accountHelpers[0] || null;
    const currentHelperIds = Array.from(new Set(accountHelpers.map((helper) => helper.id).filter(Boolean)));
    const currentHelperIdSet = new Set(currentHelperIds);
    const taskCreatedByCurrentAccount = (task: HelperTask) => currentAccountUserIdSet.has(task.createdBy);
    const taskAssignedToCurrentAccount = (task: HelperTask) => (
      Boolean(task.assignedHelperId && currentHelperIdSet.has(task.assignedHelperId)) ||
      Boolean(task.pendingHelperId && currentHelperIdSet.has(task.pendingHelperId)) ||
      Boolean(task.acceptedOfferId && (task.offers || []).some((offer) => offer.id === task.acceptedOfferId && currentHelperIdSet.has(offer.helperId))) ||
      Boolean(task.helperUserId && currentAccountUserIdSet.has(task.helperUserId))
    );
    const taskAppliedByCurrentAccount = (task: HelperTask) => (
      !taskAssignedToCurrentAccount(task) &&
      (task.offers || []).some((offer) => currentHelperIdSet.has(offer.helperId))
    );
    const myPostedTasks = state.tasks.filter(taskCreatedByCurrentAccount);
    const myAcceptedTasks = state.tasks.filter(taskAssignedToCurrentAccount);
    const myAppliedTasks = state.tasks.filter(taskAppliedByCurrentAccount);
    const taskerCompletedTasks = myPostedTasks.filter(completedTask);
    const helperCompletedTasks = myAcceptedTasks.filter(completedTask);
    const helperEarnings = helperCompletedTasks.reduce((total, task) => total + taskEarningAmount(task), 0);

    return {
      config,
      categories,
      localizedCategory(category) {
        const key = category.trim();
        if (!key) return category;
        const translated = categoryTranslations[key]?.[language];
        if (translated) return translated;
        const english = categoryTranslations[key]?.en;
        if (language === "en" && english) return english;
        return t(language, key);
      },
      state,
      currentUser,
      token,
      language,
      textSize,
      textScale,
      taskLanguageFilters,
      taskLanguageFilterLabel,
      isAuthenticated: Boolean(token && currentUser),
      isLoading,
      isRefreshing,
      isSubmitting,
      error,
      openTasks,
      currentAccountUserIds,
      currentHelper,
      currentHelperIds,
      myPostedTasks,
      myAcceptedTasks,
      myAppliedTasks,
      taskerCompletedTasks,
      helperCompletedTasks,
      helperEarnings,
      threads: sortedThreads,
      refreshAll,
      silentRefreshAll,
      async openNotification(item) {
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((notification) => (
            notification.id === item.id ? { ...notification, read: true } : notification
          )),
          threads: String(item.type || "").toLowerCase().includes("message") && item.relatedTaskId
            ? current.threads.map((thread) => (
              thread.taskId === item.relatedTaskId || thread.id === `thread-${item.relatedTaskId}`
                ? { ...thread, unreadCount: 0 }
                : thread
            ))
            : current.threads
        }));
        if (!token) return;
        try {
          const payload = await api.markNotificationsRead(token, { ids: [item.id] });
          if (payload.state) applyState(payload.state);
        } catch {
          return;
        }
      },
      async markNotificationsRead(ids) {
        const readableIds = ids.filter(Boolean);
        if (!readableIds.length) return;
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((notification) => (
            readableIds.includes(notification.id) ? { ...notification, read: true } : notification
          )),
          threads: current.threads.map((thread) => {
            const hasReadMessageNotification = current.notifications.some((notification) => (
              readableIds.includes(notification.id) &&
              String(notification.type || notification.title || "").toLowerCase().includes("message") &&
              String(notification.relatedTaskId || "") === String(thread.taskId || "")
            ));
            return hasReadMessageNotification ? { ...thread, unreadCount: 0 } : thread;
          })
        }));
        if (!token) return;
        try {
          const payload = await api.markNotificationsRead(token, { ids: readableIds });
          if (payload.state) applyState(payload.state);
        } catch {
          return;
        }
      },
      async markAllNotificationsRead() {
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
          threads: current.threads.map((thread) => ({ ...thread, unreadCount: 0 }))
        }));
        if (!token) return;
        try {
          const payload = await api.markNotificationsRead(token, { all: true });
          if (payload.state) applyState(payload.state);
        } catch {
          return;
        }
      },
      async markThreadRead(threadId) {
        const thread = state.threads.find((item) => item.id === threadId || item.taskId === threadId);
        const relatedTaskId = thread?.taskId || (threadId.startsWith("thread-") ? threadId.slice("thread-".length) : threadId);
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((notification) => (
            String(notification.relatedTaskId || "") === String(relatedTaskId || "") &&
            String(notification.type || notification.title || "").toLowerCase().includes("message")
              ? { ...notification, read: true }
              : notification
          )),
          threads: current.threads.map((item) => (
            item.id === threadId || String(item.taskId || "") === String(relatedTaskId || "")
              ? { ...item, unreadCount: 0 }
              : item
          ))
        }));
        if (!token || !relatedTaskId) return;
        try {
          const payload = await api.markNotificationsRead(token, { relatedTaskId, threadId, messages: true });
          if (payload.state) applyState(payload.state);
        } catch {
          return;
        }
      },
      async setLanguage(nextLanguage) {
        setLanguageState(nextLanguage);
        await writeStoredValue(LANGUAGE_KEY, nextLanguage);
      },
      async setTextSize(nextTextSize) {
        const normalized = normalizeTextSize(nextTextSize);
        setTextSizeState(normalized);
        await writeStoredValue(TEXT_SIZE_KEY, normalized);
      },
      async setTaskLanguageFilters(nextLanguages) {
        const normalized = normalizeTaskLanguageFilters(nextLanguages);
        setTaskLanguageFiltersState(normalized);
        await writeStoredValue(TASK_LANGUAGE_FILTER_KEY, JSON.stringify(normalized));
      },
      translate(key) {
        return t(language, key);
      },
      async completeOAuthLogin(oauthToken) {
        return runMutation(async () => {
          await saveAuthToken(oauthToken);
          const [profile, syncedState] = await Promise.all([
            api.me(oauthToken),
            api.marketplaceState(oauthToken)
          ]);
          return { oauthToken, profile, syncedState };
        }, ({ oauthToken, profile, syncedState }) => {
          setToken(oauthToken);
          setCurrentUser(profile.user);
          applyState(syncedState);
        });
      },
      async login(email, password) {
        return runMutation(async () => {
          const payload = await api.login(email, password);
          if (payload.token) await saveAuthToken(payload.token);
          const syncedState = payload.token ? await api.marketplaceState(payload.token) : null;
          return { payload, syncedState };
        }, (payload) => {
          setToken(payload.payload.token || null);
          setCurrentUser(payload.payload.user);
          if (payload.syncedState) applyState(payload.syncedState);
        });
      },
      async requestPasswordReset(email) {
        return runMutation(async () => {
          const payload = await api.requestPasswordReset(email);
          return payload.message || t(language, "passwordResetEmailSent");
        }, () => undefined);
      },
      async resetPassword(input) {
        return runMutation(async () => {
          const payload = await api.resetPassword(input.email, input.token, input.password);
          if (payload.token) await saveAuthToken(payload.token);
          const syncedState = payload.token ? await api.marketplaceState(payload.token) : null;
          return { payload, syncedState };
        }, (payload) => {
          setToken(payload.payload.token || null);
          setCurrentUser(payload.payload.user);
          if (payload.syncedState) applyState(payload.syncedState);
        });
      },
      async register(input, antiRobotToken) {
        return runMutation(async () => {
          const payload = await api.register(input.name, input.email, input.password, input.suburb, input.role, antiRobotToken);
          if (payload.token) await saveAuthToken(payload.token);
          const syncedState = payload.token ? await api.marketplaceState(payload.token) : null;
          return { payload, syncedState };
        }, (payload) => {
          setToken(payload.payload.token || null);
          setCurrentUser(payload.payload.user);
          if (payload.syncedState) applyState(payload.syncedState);
        });
      },
      async logout() {
        await clearAuthToken();
        setToken(null);
        setCurrentUser(null);
      },
      async createTask(draft, antiRobotToken) {
        if (!token) return t(language, "loginBeforePosting");
        return runMutation(
          () => api.createTask(token, draft, antiRobotToken),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: [payload.task, ...current.tasks.filter((task) => task.id !== payload.task.id)],
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async deleteTask(taskId) {
        if (!token) return t(language, "loginBeforeDeleteTask");
        return runMutation(
          () => api.deleteTask(token, taskId),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.filter((task) => task.id !== payload.taskId),
            notifications: current.notifications.filter((item) => item.relatedTaskId !== payload.taskId),
            threads: current.threads.filter((thread) => thread.taskId !== payload.taskId)
          }))
        );
      },
      async submitOffer(taskId, draft, antiRobotToken) {
        if (!token) return t(language, "logInBeforeOffer");
        return runMutation(
          () => api.submitOffer(token, taskId, draft, antiRobotToken),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async acceptOffer(taskId, offerId, antiRobotToken) {
        if (!token) return t(language, "loginBeforeAcceptOffer");
        return runMutation(
          () => api.acceptOffer(token, taskId, offerId, antiRobotToken),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async counterOffer(taskId, offerId, draft, antiRobotToken) {
        if (!token) return t(language, "logInBeforeOffer");
        return runMutation(
          () => api.counterOffer(token, taskId, offerId, draft, antiRobotToken),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async startTask(taskId) {
        if (!token) return t(language, "loginBeforeReleasePayment");
        return runMutation(
          () => api.startTask(token, taskId),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async requestPaymentRelease(taskId) {
        if (!token) return t(language, "loginBeforeReleasePayment");
        return runMutation(
          () => api.requestPaymentRelease(token, taskId),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async confirmCompletionAndReleasePayment(taskId) {
        if (!token) return t(language, "loginBeforeReleasePayment");
        return runMutation(
          () => api.confirmCompletionAndReleasePayment(token, taskId),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async requestCancellation(taskId, input) {
        if (!token) return t(language, "loginBeforeReleasePayment");
        return runMutation(
          () => api.requestCancellation(token, taskId, input),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async createTaskCheckoutSession(taskId) {
        if (!token) return { error: t(language, "loginBeforePayment") };
        setIsSubmitting(true);
        setError(null);
        try {
          const payload = await api.createTaskCheckoutSession(token, taskId);
          setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task)
          }));
          if (payload.state) applyState(payload.state);
          return { url: payload.url, sessionId: payload.sessionId };
        } catch (caught) {
          const message = messageFor(caught, language);
          setError(message);
          return { error: message };
        } finally {
          setIsSubmitting(false);
        }
      },
      async confirmTaskPayment(taskId, input) {
        if (!token) return t(language, "loginBeforePayment");
        return runMutation(
          () => api.confirmTaskPayment(token, taskId, input),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
            notifications: [...payload.notifications, ...current.notifications]
          }))
        );
      },
      async submitTaskReview(taskId, targetRole, input) {
        if (!token) return t(language, "loginBeforeUpdateProfile");
        return runMutation(
          () => api.submitTaskReview(token, taskId, targetRole, input),
          (payload) => {
            if (payload.state) {
              applyState(payload.state);
              return;
            }
            setState((current) => ({
              ...current,
              taskReviews: [payload.review, ...(current.taskReviews || []).filter((review) => review.id !== payload.review.id)],
              tasks: current.tasks.map((task) => task.id === payload.task.id ? payload.task : task),
              helpers: payload.helper
                ? current.helpers.map((helper) => helper.id === payload.helper?.id ? payload.helper : helper)
                : current.helpers,
              users: payload.user
                ? current.users.map((user) => user.id === payload.user?.id ? payload.user : user)
                : current.users,
              notifications: [...payload.notifications, ...current.notifications]
            }));
          }
        );
      },
      async sendMessage(taskId, draft) {
        if (!token) return t(language, "loginBeforeMessages");
        return runMutation(
          () => api.sendMessage(token, taskId, draft),
          (payload) => payload.state ? applyState(payload.state) : setState((current) => ({
            ...current,
            threads: [payload.thread, ...current.threads.filter((thread) => thread.id !== payload.thread.id)]
          }))
        );
      },
      async reportProfileMedia(input) {
        if (!token) return t(language, "loginBeforeReportProfileMedia");
        return runMutation(
          () => api.reportProfileMedia(token, input),
          (payload) => {
            if (payload.state) applyState(payload.state);
          }
        );
      },
      async updateProfile(user) {
        if (!token) return t(language, "loginBeforeUpdateProfile");
        return runMutation(() => api.updateProfile(token, user), (payload) => {
          setCurrentUser(payload.user);
          if (payload.state) applyState(payload.state);
        });
      },
      async startPhoneVerification(phone) {
        if (!token) return t(language, "loginBeforeUpdateProfile");
        return runMutation(() => api.startPhoneVerification(token, phone), (payload) => {
          setCurrentUser(payload.user);
          if (payload.state) applyState(payload.state);
        });
      },
      async confirmPhoneVerification(phone, code) {
        if (!token) return t(language, "loginBeforeUpdateProfile");
        return runMutation(() => api.confirmPhoneVerification(token, phone, code), (payload) => {
          setCurrentUser(payload.user);
          if (payload.state) applyState(payload.state);
        });
      },
      async startIdentityVerification() {
        if (!token) return { error: t(language, "loginBeforeUpdateProfile") };
        setIsSubmitting(true);
        setError(null);
        try {
          const payload = await api.startIdentityVerification(token);
          return { url: payload.url };
        } catch (caught) {
          const message = messageFor(caught, language);
          setError(message);
          return { error: message };
        } finally {
          setIsSubmitting(false);
        }
      },
      async refreshIdentityVerificationStatus() {
        if (!token) return { error: t(language, "loginBeforeUpdateProfile") };
        setIsSubmitting(true);
        setError(null);
        try {
          const payload = await api.refreshIdentityVerificationStatus(token);
          if (payload.user) setCurrentUser(payload.user);
          if (payload.state) applyState(payload.state);
          return { status: payload.status, url: payload.url };
        } catch (caught) {
          const message = messageFor(caught, language);
          setError(message);
          return { error: message };
        } finally {
          setIsSubmitting(false);
        }
      },
      async createPayoutAccountLink() {
        if (!token) return { error: t(language, "loginBeforePayoutSetup") };
        setIsSubmitting(true);
        setError(null);
        try {
          const payload = await api.createPayoutAccountLink(token);
          return { url: payload.url };
        } catch (caught) {
          const message = messageFor(caught, language);
          setError(message);
          return { error: message };
        } finally {
          setIsSubmitting(false);
        }
      },
      async createPayoutDashboardLink() {
        if (!token) return { error: t(language, "loginBeforePayoutSetup") };
        setIsSubmitting(true);
        setError(null);
        try {
          const payload = await api.createPayoutDashboardLink(token);
          return {
            url: payload.url,
            requiresOnboarding: payload.requiresOnboarding,
            message: payload.message
          };
        } catch (caught) {
          const message = messageFor(caught, language);
          setError(message);
          return { error: message };
        } finally {
          setIsSubmitting(false);
        }
      },
      async refreshPayoutStatus() {
        if (!token) return t(language, "loginBeforePayoutSetup");
        return runMutation(() => api.refreshPayoutStatus(token), (payload) => {
          if (payload.user) setCurrentUser(payload.user);
          if (payload.state) applyState(payload.state);
        });
      }
    };
  }, [
    applyState,
    categories,
    categoryTranslations,
    config,
    currentUser,
    error,
    isLoading,
    isRefreshing,
    isSubmitting,
    language,
    refreshAll,
    runMutation,
    silentRefreshAll,
    state,
    textSize,
    taskLanguageFilters,
    token
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const value = React.use(AppStoreContext);
  if (!value) throw new Error("useAppStore must be used within AppProvider");
  return value;
}
