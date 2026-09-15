export type TaskStatus =
  | "open"
  | "offer_received"
  | "awaiting_payment"
  | "payment_secured"
  | "assigned"
  | "in_progress"
  | "payment_requested"
  | "cancel_requested"
  | "completed"
  | "payment_released"
  | "cancelled"
  | "auto_cancelled"
  | "disputed"
  | "refunded"
  | "content_review"
  | "rejected_by_moderation";

export type OfferStatus = "pending" | "accepted" | "declined";
export type UserRole = "poster" | "helper" | "both";

export type ProfileMedia = {
  id: string;
  type: string;
  source: string;
  caption?: string;
  moderationStatus?: string | null;
  moderationFlags?: string[];
  moderationUpdatedAt?: string | null;
};

export type MessageAttachment = {
  id?: string;
  type: string;
  source: string;
  caption?: string;
  moderationStatus?: string | null;
  moderationFlags?: string[];
  moderationUpdatedAt?: string | null;
};

export type NotificationChannelPreference = {
  push: boolean;
  email: boolean;
  sms: boolean;
};

export type NotificationQuietHours = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  allowCritical: boolean;
};

export type NotificationPreferences = {
  jobAlerts: NotificationChannelPreference;
  offerUpdates: NotificationChannelPreference;
  messages: NotificationChannelPreference;
  payments: NotificationChannelPreference;
  quietHours: NotificationQuietHours;
};

export type Review = {
  id: string;
  taskId?: string;
  taskTitle?: string;
  authorName: string;
  authorRole?: string;
  targetRole?: string;
  targetName?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  suburb: string;
  bio: string;
  phone: string;
  skills: string[];
  marketRegion?: string | null;
  taskRadiusKm?: number | null;
  taskAlertMode?: string | null;
  notificationPreferences?: NotificationPreferences | null;
  avatarURL?: string | null;
  avatarModerationStatus?: string | null;
  avatarModerationFlags?: string[];
  avatarModerationUpdatedAt?: string | null;
  profileMedia?: ProfileMedia[];
  portfolio?: ProfileMedia[];
  profileMediaModerationStatus?: string | null;
  profileMediaModerationFlags?: string[];
  profileMediaModerationUpdatedAt?: string | null;
  profileTextModerationStatus?: string | null;
  profileTextModerationRisk?: string | null;
  profileTextModerationFlags?: string[];
  profileTextModerationUpdatedAt?: string | null;
  profileTextModerationReviewedAt?: string | null;
  profileTextModerationAdminNote?: string | null;
  phoneVerified?: boolean;
  phoneVerificationPending?: string;
  idVerificationStatus?: string;
  idVerificationProvider?: string;
  idVerificationSessionId?: string;
  idVerificationUpdatedAt?: string;
  idVerificationLastError?: string;
  idVerifiedAt?: string;
  idVerifiedName?: string;
  idVerifiedAddress?: string;
  idVerifiedPhone?: string;
  idVerifiedEmail?: string;
  identityDocumentType?: string;
  identityDateOfBirth?: string;
  identityAge?: number | null;
  identityAgeVerified?: boolean;
  identityAgeVerifiedAt?: string;
  policeCheckStatus?: string;
  policeCheckReference?: string;
  policeCheckProvider?: string;
  policeCheckSubmittedAt?: string;
  policeCheckVerifiedAt?: string;
  policeCheckRejectedAt?: string;
  policeCheckExpiresAt?: string;
  policeCheckDocumentURL?: string;
  policeCheckUpdatedAt?: string;
  policeCheckLastError?: string;
  policeCheckVerifiedBy?: string;
  policeCheckAdminNote?: string;
  workingWithChildrenCheckStatus?: string;
  workingWithChildrenCheckReference?: string;
  workingWithChildrenCheckProvider?: string;
  workingWithChildrenCheckSubmittedAt?: string;
  workingWithChildrenCheckVerifiedAt?: string;
  workingWithChildrenCheckRejectedAt?: string;
  workingWithChildrenCheckExpiresAt?: string;
  workingWithChildrenCheckDocumentURL?: string;
  workingWithChildrenCheckUpdatedAt?: string;
  workingWithChildrenCheckLastError?: string;
  workingWithChildrenCheckVerifiedBy?: string;
  workingWithChildrenCheckAdminNote?: string;
  bankVerified?: boolean;
  membershipType?: string;
  proStatus?: string;
  subscriptionProvider?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionRenewsAt?: string;
  subscriptionGooglePlayProductId?: string;
  subscriptionGooglePlayTransactionId?: string;
  subscriptionGooglePlayPackageName?: string;
  subscriptionGooglePlayState?: string;
  subscriptionGooglePlayLastVerifiedAt?: string;
  subscriptionGooglePlayVerificationMode?: string;
  subscriptionGooglePlayEnvironment?: string;
  rewardPoints?: number;
  rewardTier?: string;
  rewardTierTitle?: string;
  rewardNextTier?: string;
  rewardNextTierTitle?: string;
  rewardPointsToNextTier?: number;
  rewardProgress?: number;
  rewardUpdatedAt?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
  createdAt?: string;
  reliabilityScore?: number;
  canAcceptTasks?: boolean;
  activeTaskCount?: number;
};

export type HelperProfile = {
  id: string;
  userId: string;
  name: string;
  suburb: string;
  headline: string;
  bio: string;
  rating: number;
  completedTasks: number;
  responseRate: number;
  hourlyRate: number;
  skills: string[];
  verifiedBadges: string[];
  reviewCount?: number;
  reviews?: Review[];
  avatarURL?: string | null;
  avatarModerationStatus?: string | null;
  avatarModerationUpdatedAt?: string | null;
  profileMedia?: ProfileMedia[];
  portfolio?: ProfileMedia[];
  profileMediaModerationStatus?: string | null;
  profileMediaModerationFlags?: string[];
  profileMediaModerationUpdatedAt?: string | null;
  profileTextModerationStatus?: string | null;
  profileTextModerationRisk?: string | null;
  profileTextModerationFlags?: string[];
  profileTextModerationUpdatedAt?: string | null;
  profileTextModerationReviewedAt?: string | null;
  profileTextModerationAdminNote?: string | null;
  canAcceptTasks?: boolean;
  activeTaskCount?: number;
  payoutStatus?: string;
  membershipType?: string;
  proStatus?: string;
  phoneVerified?: boolean;
  idVerificationStatus?: string;
  policeCheckStatus?: string;
  workingWithChildrenCheckStatus?: string;
  completionRate?: number;
  cancellationRate?: number;
  cancelledTasks?: number;
  memberSince?: string;
  averageResponseMinutes?: number;
  responseSpeed?: number;
  responseSpeedText?: string;
  badges?: string[];
  recentJobTypes?: string[];
  rewardTier?: string;
  rewardTierTitle?: string;
  rewardNextTierTitle?: string;
  rewardPointsToNextTier?: number;
  rewardProgress?: number;
};

export type Offer = {
  id: string;
  taskId: string;
  helperId: string;
  helperName: string;
  amount: number;
  message: string;
  status: OfferStatus;
  createdAt?: string;
  helperPlatformFeeRate?: number;
  helperMembershipType?: string;
  helperProStatus?: string;
  helperIsPro?: boolean;
  originalAmount?: number | null;
  originalMessage?: string | null;
  taskerCounterAmount?: number | null;
  taskerCounterMessage?: string | null;
  taskerCounterAt?: string | null;
  helperCounterAmount?: number | null;
  helperCounterMessage?: string | null;
  helperCounterAt?: string | null;
  lastCounterBy?: string | null;
};

export type FeeBreakdown = {
  currency: string;
  taskPrice: number;
  taskerTotal: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  connectionFeeRate: number;
  connectionFeeAmount: number;
  stripeFeeAmount: number;
  helperNet: number;
  helperPayoutAmount: number;
  proSavingsAmount: number;
  feeTier: string;
};

export type HelperTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  suburb: string;
  state: string;
  budget: number;
  date: string;
  time: string;
  language?: string | null;
  status: TaskStatus;
  paymentStatus?: string;
  payoutStatus?: string;
  feeBreakdown?: FeeBreakdown | null;
  paymentAmount?: number | null;
  taskPrice?: number | null;
  platformFeeRate?: number | null;
  platformFeeAmount?: number | null;
  helperPayoutAmount?: number | null;
  createdBy: string;
  acceptedOfferId?: string | null;
  assignedHelperId?: string | null;
  pendingHelperId?: string | null;
  helperUserId?: string | null;
  paymentSecuredAt?: string | null;
  startedAt?: string | null;
  contactUnlocked?: boolean;
  taskerReviewId?: string | null;
  reviewedByTaskerAt?: string | null;
  helperReviewId?: string | null;
  reviewedByHelperAt?: string | null;
  photos?: string[];
  photoModerationStatus?: string | null;
  photoModerationFlags?: string[];
  photoModerationUpdatedAt?: string | null;
  textModerationStatus?: string | null;
  textModerationRisk?: string | null;
  textModerationFlags?: string[];
  textModerationUpdatedAt?: string | null;
  textModerationReviewedAt?: string | null;
  textModerationAdminNote?: string | null;
  offers: Offer[];
  createdAt?: string;
  receiptUrl?: string | null;
  receiptNumber?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  attachments?: MessageAttachment[];
  photos?: string[];
  mediaModerationStatus?: string | null;
  mediaModerationFlags?: string[];
  mediaModerationUpdatedAt?: string | null;
  mediaModerationReviewedAt?: string | null;
  mediaModerationAdminNote?: string | null;
  createdAt: string;
  readBy?: string[];
  textModerationStatus?: string | null;
  textModerationRisk?: string | null;
  textModerationFlags?: string[];
  textModerationUpdatedAt?: string | null;
  textModerationReviewedAt?: string | null;
  textModerationAdminNote?: string | null;
};

export type MessageDraft = {
  body: string;
  attachments?: MessageAttachment[];
};

export type MessageThread = {
  id: string;
  taskId: string;
  title: string;
  participantIds?: string[];
  participants?: string[];
  messages: ChatMessage[];
  unreadCount?: number;
  archived?: boolean;
  updatedAt?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  audience?: string;
  relatedTaskId?: string;
  relatedOfferId?: string;
  route?: string;
  createdAt: string;
};

export type AppRemoteConfig = {
  appName: string;
  environment: string;
  maintenanceMode: boolean;
  minimumSupportedVersion: string;
  latestVersion: string;
  antiRobot?: {
    provider: string;
    enabled: boolean;
    enforced: boolean;
    siteKey?: string;
    challengeUrl?: string;
    actions?: string[];
  };
  theme: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
  };
  home: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryButton: string;
    secondaryButton: string;
    categoryTitle: string;
    categorySubtitle: string;
  };
  onboarding: {
    showOnboarding: boolean;
    title: string;
    subtitle: string;
  };
  featureFlags: Record<string, boolean>;
  support: {
    email: string;
    phone: string;
    hours: string;
  };
};

export type AppConfigPayload = {
  appConfig: AppRemoteConfig;
  categories: string[];
  supportedLanguages?: AppLanguageOption[];
  categoryTranslations?: Record<string, Record<string, string>>;
  updatedAt: string;
};

export type AppLanguageOption = {
  code: string;
  appValue?: string;
  shortTitle: string;
  title: string;
  locale?: string;
};

export type MarketplaceState = {
  users: UserProfile[];
  helpers: HelperProfile[];
  tasks: HelperTask[];
  taskReviews: TaskReview[];
  rewardLedger?: RewardLedgerEntry[];
  notifications: NotificationItem[];
  threads: MessageThread[];
  categories: string[];
  supportedLanguages?: AppLanguageOption[];
  categoryTranslations?: Record<string, Record<string, string>>;
  updatedAt: string;
};

export type RewardLedgerEntry = {
  id: string;
  userId?: string;
  points: number;
  reason?: string;
  source?: string;
  taskId?: string;
  createdAt?: string;
};

export type AuthSessionPayload = {
  user: UserProfile;
  token?: string;
  expiresAt?: string;
  state?: MarketplaceState | null;
};

export type AuthProfilePayload = {
  user: UserProfile;
  state?: MarketplaceState | null;
};

export type TaskDraft = {
  title: string;
  description: string;
  category: string;
  suburb: string;
  state: string;
  budget: string;
  date: string;
  time: string;
  language?: string;
  photos?: string[];
};

export type OfferDraft = {
  amount: string;
  message: string;
};

export type TaskReviewTargetRole = "helper" | "tasker";

export type TaskReview = {
  id: string;
  taskId: string;
  taskTitle: string;
  authorUserId: string;
  authorName: string;
  authorEmail?: string;
  authorRole: string;
  targetRole: TaskReviewTargetRole;
  targetUserId?: string | null;
  targetHelperId?: string | null;
  targetName?: string | null;
  targetEmail?: string | null;
  rating: number;
  comment: string;
  status?: string;
  textModerationStatus?: string | null;
  textModerationRisk?: string | null;
  textModerationFlags?: string[];
  textModerationUpdatedAt?: string | null;
  textModerationReviewedAt?: string | null;
  textModerationAdminNote?: string | null;
  createdAt: string;
};

export type TaskCreateResponse = {
  task: HelperTask;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type OfferCreateResponse = {
  offer?: Offer;
  task: HelperTask;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type TaskActionResponse = {
  task: HelperTask;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type TaskCheckoutSessionResponse = {
  mode?: string;
  sessionId: string;
  url: string;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  task: HelperTask;
  state?: MarketplaceState;
};

export type TaskPaymentConfirmResponse = {
  task: HelperTask;
  payment?: Record<string, unknown>;
  notifications: NotificationItem[];
  state?: MarketplaceState;
  requiresWebhookConfirmation?: boolean;
  message?: string;
};

export type TaskDeleteResponse = {
  taskId: string;
  deleted: boolean;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type TaskReviewCreateResponse = {
  review: TaskReview;
  task: HelperTask;
  helper?: HelperProfile | null;
  user?: UserProfile | null;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type GooglePlayProPurchasePayload = {
  productId: string;
  purchaseToken: string;
  transactionId?: string | null;
  packageName?: string | null;
  purchaseState?: string | null;
  isAutoRenewing?: boolean | null;
};

export type GooglePlayProPurchaseResponse = {
  user: UserProfile;
  notifications?: NotificationItem[];
  state?: MarketplaceState;
};

export type MessageCreateResponse = {
  message: ChatMessage;
  thread: MessageThread;
  notifications: NotificationItem[];
  state?: MarketplaceState;
};

export type NotificationsReadResponse = {
  ok?: boolean;
  updated?: number;
  state?: MarketplaceState;
};

export type ProfileMediaReport = {
  id: string;
  reporterUserId?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterRole?: string;
  targetUserId?: string;
  targetHelperId?: string;
  targetName?: string;
  targetEmail?: string;
  mediaType?: string;
  mediaId?: string;
  mediaSource?: string;
  reason?: string;
  details?: string;
  status?: string;
  source?: string;
  adminNote?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileMediaReportResponse = {
  ok?: boolean;
  duplicate?: boolean;
  report: ProfileMediaReport;
  target?: UserProfile;
  helper?: HelperProfile | null;
  state?: MarketplaceState | null;
};
