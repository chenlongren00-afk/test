import * as React from "react";
import { Link, type Href, useRouter } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Image, Linking, Pressable, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import {
  Banknote,
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ClipboardList,
  Image as ImageIcon,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  PersonStanding,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserCircle,
  X
} from "lucide-react-native";

import { StatRow } from "@/components/ParityScreen";
import { AHButton, BrandHeader, Card, Pill, SectionTitle, StatusBanner, TextField } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";
import type { HelperTask, NotificationPreferences, ProfileMedia, UserProfile, UserRole } from "@/types/marketplace";
import { money } from "@/utils/format";

type DashboardTab = "overview" | "tasks" | "setup" | "more";
const MAX_PROFILE_MEDIA = 10;
const MAX_PROFILE_IMAGE_BYTES = 5_000_000;

export default function DashboardRoute() {
  const store = useAppStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<DashboardTab>("overview");
  const postedTasks = store.myPostedTasks;
  const acceptedTasks = store.myAcceptedTasks;
  const appliedTasks = store.myAppliedTasks;
  const postedCompleted = store.taskerCompletedTasks.length;
  const helperCompletedTasks = store.helperCompletedTasks;
  const helperEarnings = store.helperEarnings;
  const membershipTitle = membershipLabel(store.currentUser, store.translate);
  const payoutStatus = payoutSetupStatus(store.currentUser, store.translate);
  const unreadNotifications = store.state.notifications.filter((item) => !item.read && dashboardActionPriority(item) > 0).length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
    >
      <BrandHeader
        eyebrow={store.translate("accountDashboardSubtitle")}
        title={store.translate("account")}
        notificationCount={unreadNotifications}
        onPressNotifications={() => router.push("/notifications")}
      />
      {store.error ? <StatusBanner tone="error" message={store.error} /> : null}

      <DashboardHeaderCard />

      <Card tone="warm">
        <SectionTitle title={store.translate("account")} subtitle={store.translate("accountDashboardSubtitle")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <AccountHubTile
            href="/profile-edit"
            icon={<UserCircle color={colors.primary} size={24} strokeWidth={3} />}
            title={store.translate("profile")}
            status={profileStatus(store.currentUser, store.translate)}
          />
          <AccountHubTile
            href={{ pathname: "/profile-edit", params: { focus: "identity" } }}
            icon={<ShieldCheck color={colors.primary} size={24} strokeWidth={3} />}
            title={store.translate("verification")}
            status={trustCheckSummary(store.currentUser, store.translate)}
          />
          <AccountHubTile
            href="/payout"
            icon={<Banknote color={colors.primary} size={24} strokeWidth={3} />}
            title={store.translate("payout")}
            status={payoutStatus}
          />
          <AccountHubTile
            href="/notifications"
            icon={<Bell color={colors.primary} size={24} strokeWidth={3} />}
            title={store.translate("actionCentre")}
            status={unreadNotifications > 0 ? `${unreadNotifications} ${store.translate("actionsWaiting")}` : store.translate("noActionsWaiting")}
          />
        </View>
      </Card>

      <SectionTitle title={store.translate("snapshot")} subtitle={store.translate("snapshotSubtitle")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.gap }}>
        <MetricCard href="/my-posted-tasks" label={store.translate("postedTasks")} value={postedTasks.length} />
        <MetricCard href="/my-accepted-tasks" label={store.translate("acceptedJobs")} value={acceptedTasks.length} />
        <MetricCard href="/earnings" label={store.translate("earned")} value={money(helperEarnings)} />
        <MetricCard href="/reward-program" label={store.translate("helperPoints")} value={store.currentUser?.rewardPoints || 0} />
      </View>

      <DashboardSection title={store.translate("accountTools")}>
        <DashboardRow href="/settings" title={store.translate("settings")} subtitle={store.translate("settingsSubtitle")} icon={<Settings color={colors.primary} size={22} />} />
        <DashboardRow href="/ratings" title={store.translate("ratingsReviews")} subtitle={store.translate("ratingsReviewsSubtitle")} icon={<Star color={colors.primary} size={22} />} />
        <DashboardRow href="/feedback" title={store.translate("feedbackBox")} subtitle={store.translate("feedbackBoxSubtitle")} icon={<MessageSquareText color={colors.primary} size={22} />} />
      </DashboardSection>

      {store.currentUser ? (
        <AHButton
          label={store.translate("logout")}
          tone="secondary"
          icon={<LogOut color={colors.primary} size={18} />}
          onPress={store.logout}
        />
      ) : null}
    </ScrollView>
  );
}

function dashboardActionPriority(item: { type?: string; title?: string; body?: string }) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (normalized.includes("payment") || normalized.includes("release") || normalized.includes("payout")) return 6;
  if (normalized.includes("counter")) return 5;
  if (normalized.includes("offer")) return 4;
  if (normalized.includes("message")) return 3;
  if (normalized.includes("review") || normalized.includes("approve") || normalized.includes("verification")) return 2;
  return 0;
}

function DashboardTabs({
  activeTab,
  onChange
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const store = useAppStore();
  const tabs: { value: DashboardTab; label: string }[] = [
    { value: "overview", label: store.translate("overview") },
    { value: "tasks", label: store.translate("tasks") },
    { value: "setup", label: store.translate("helperSetup") },
    { value: "more", label: store.translate("resources") }
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {tabs.map((tab) => (
        <Pill
          key={tab.value}
          label={tab.label}
          selected={activeTab === tab.value}
          onPress={() => onChange(tab.value)}
        />
      ))}
    </ScrollView>
  );
}

function DashboardHeaderCard() {
  const store = useAppStore();
  const idVerified = String(store.currentUser?.idVerificationStatus || "").toLowerCase() === "verified";

  return (
    <Card tone="teal">
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
        <ProfileAvatarPreview name={store.currentUser?.name || "AH"} source={store.currentUser?.avatarURL} size={48} />
        <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
          <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Text selectable style={{ color: colors.surface, flexShrink: 1, fontSize: 21, fontWeight: "900", lineHeight: 26, minWidth: 0 }} numberOfLines={2}>
              {store.translate("hi")}, {store.currentUser?.name || store.translate("helper")}
            </Text>
            {idVerified ? (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "#EAF2FF",
                  borderRadius: 999,
                  flexDirection: "row",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3
                }}
              >
                <BadgeCheck color="#2F6FE4" size={14} />
                <Text selectable style={{ color: "#2F6FE4", fontSize: 12, fontWeight: "900" }}>
                  ID
                </Text>
              </View>
            ) : null}
          </View>
          <Text selectable style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {store.currentUser?.suburb || "-"} · {roleLabel(store.currentUser?.role, store.translate)}
          </Text>
          <Text selectable style={{ color: colors.accent, fontSize: 12, fontWeight: "900", lineHeight: 17 }} numberOfLines={2}>
            {store.currentUser?.email}
          </Text>
        </View>
        <Link href="/profile-edit" asChild>
          <Pressable
            accessibilityLabel={store.translate("profileEdit")}
            accessibilityRole="button"
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
              borderRadius: 14,
              height: 42,
              justifyContent: "center",
              width: 42
            }}
          >
            <Pencil color={colors.surface} size={18} />
          </Pressable>
        </Link>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pill label={store.currentUser?.phoneVerified ? store.translate("phoneVerified") : store.translate("phonePending")} />
        <Pill label={store.currentUser?.bankVerified ? store.translate("bankReady") : store.translate("payoutPending")} />
      </View>
    </Card>
  );
}

function ProfileAvatarPreview({ name, source, size = 68 }: { name: string; source?: string | null; size?: number }) {
  const initials = String(name || "AH")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const cleanedSource = String(source || "").trim();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderRadius: size / 2,
        borderWidth: 1,
        height: size,
        justifyContent: "center",
        overflow: "hidden",
        width: size
      }}
    >
      {cleanedSource ? (
        <Image source={{ uri: cleanedSource }} style={{ height: "100%", width: "100%" }} />
      ) : (
        <Text selectable style={{ color: colors.primary, fontSize: 20, fontWeight: "900" }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

function ProfileMediaGallery({
  media,
  onMove,
  onRemove,
  translate
}: {
  media: ProfileMedia[];
  onMove: (id: string, offset: number) => void;
  onRemove: (id: string) => void;
  translate: (key: string) => string;
}) {
  if (!media.length) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderRadius: 14,
          borderWidth: 1,
          minHeight: 96,
          justifyContent: "center",
          padding: 12
        }}
      >
        <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
          {translate("noProfileMediaYet")}
        </Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
      {media.slice(0, MAX_PROFILE_MEDIA).map((item, index) => {
        const source = String(item.source || "").trim();
        return (
          <View
            key={item.id || `${source}-${index}`}
            style={{
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: 14,
              borderWidth: 1,
              height: 104,
              overflow: "hidden",
              width: 104
            }}
          >
            {source ? (
              <Image source={{ uri: source }} style={{ height: "100%", width: "100%" }} />
            ) : (
              <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
                <ImageIcon color={colors.primary} size={28} />
              </View>
            )}
            <Pressable
              accessibilityLabel={translate("remove")}
              accessibilityRole="button"
              onPress={() => onRemove(item.id)}
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.9)",
                borderRadius: 999,
                height: 28,
                justifyContent: "center",
                position: "absolute",
                right: 6,
                top: 6,
                width: 28
              }}
            >
              <X color={colors.text} size={16} />
            </Pressable>
            <View
              style={{
                alignItems: "center",
                bottom: 6,
                flexDirection: "row",
                gap: 6,
                justifyContent: "center",
                left: 0,
                position: "absolute",
                right: 0
              }}
            >
              <GalleryIconButton disabled={index === 0} label={translate("moveLeft")} onPress={() => onMove(item.id, -1)}>
                <ChevronLeft color={colors.primary} size={16} />
              </GalleryIconButton>
              <GalleryIconButton disabled={index === media.length - 1} label={translate("moveRight")} onPress={() => onMove(item.id, 1)}>
                <ChevronRight color={colors.primary} size={16} />
              </GalleryIconButton>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function GalleryIconButton({ children, disabled, label, onPress }: { children: React.ReactNode; disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 999,
        height: 28,
        justifyContent: "center",
        opacity: disabled ? 0.45 : 1,
        width: 28
      }}
    >
      {children}
    </Pressable>
  );
}

function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "900", textTransform: "uppercase" }}>
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          overflow: "hidden"
        }}
      >
        {children}
      </View>
    </View>
  );
}

function DashboardRow({
  href,
  title,
  subtitle,
  icon,
  badge,
  status
}: {
  href: Href;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  status?: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        style={{
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          gap: 12,
          minHeight: 68,
          padding: 14
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceWarm,
            borderRadius: 999,
            height: 40,
            justifyContent: "center",
            width: 40
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
            {title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            {subtitle}
          </Text>
        </View>
        {badge || status ? <Pill label={badge || status || ""} selected={Boolean(status)} /> : null}
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>
    </Link>
  );
}

function TrustCheckActionRow({
  href,
  label,
  value
}: {
  href: Href;
  label: string;
  value: string | number;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          opacity: pressed ? 0.72 : 1,
          paddingVertical: 12
        })}
      >
        <Text selectable style={{ color: colors.muted, flex: 1, fontSize: 16, fontWeight: "800" }}>
          {label}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {value}
          </Text>
          <ChevronRight color={colors.muted} size={18} />
        </View>
      </Pressable>
    </Link>
  );
}

function MetricCard({ href, label, value }: { href?: Href; label: string; value: string | number }) {
  const content = (
    <Card>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Text selectable style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>
            {value}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
            {label}
          </Text>
        </View>
        {href ? <ChevronRight color={colors.muted} size={18} /> : null}
      </View>
    </Card>
  );
  return (
    <View style={{ minWidth: "46%", flex: 1 }}>
      {href ? (
        <Link href={href} asChild>
          <Pressable accessibilityRole="button">{content}</Pressable>
        </Link>
      ) : (
        content
      )}
    </View>
  );
}

function AccountHubTile({
  href,
  icon,
  title,
  status
}: {
  href: Href;
  icon: React.ReactNode;
  title: string;
  status: string | number;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          flexBasis: "47%",
          flexGrow: 1,
          gap: 11,
          minHeight: 164,
          opacity: pressed ? 0.72 : 1,
          padding: 14
        })}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceAlt,
              borderRadius: 8,
              height: 42,
              justifyContent: "center",
              width: 42
            }}
          >
            {icon}
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </View>
        <Text selectable numberOfLines={3} style={{ color: colors.text, fontSize: 15, fontWeight: "900", lineHeight: 20 }}>
          {title}
        </Text>
        <View style={{ alignSelf: "flex-start", backgroundColor: colors.surfaceWarm, borderRadius: 999, maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text selectable numberOfLines={2} style={{ color: colors.primary, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
            {status}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function taskAmount(task: HelperTask) {
  return Number(task.budget || 0);
}

function membershipLabel(user: UserProfile | null, translate: (key: string) => string) {
  if (user?.membershipType === "pro" || user?.proStatus === "active") return translate("proUpgrade");
  return translate("standard");
}

function payoutSetupStatus(user: UserProfile | null, translate: (key: string) => string) {
  if (user?.bankVerified) return translate("completed");
  return translate("required");
}

function profileStatus(user: UserProfile | null, translate: (key: string) => string) {
  const count = user?.skills?.length || 0;
  if (!count) return translate("addSkills");
  return `${count} ${translate("skills")}`;
}

function trustCheckSummary(user: UserProfile | null, translate: (key: string) => string) {
  const checks = [
    Boolean(user?.phoneVerified),
    normalizedStatus(user?.idVerificationStatus) === "verified",
    normalizedStatus(user?.policeCheckStatus) === "verified",
    normalizedStatus(user?.workingWithChildrenCheckStatus) === "verified"
  ];
  const completed = checks.filter(Boolean).length;
  if (completed === checks.length) return translate("completed");
  return `${completed}/${checks.length}`;
}

export type VerificationFocus = "phone" | "identity" | "police" | "wwcc";
export type ProfileSetupArea = "profile" | "verification" | "payout" | "notifications";
type NotificationPreferenceKind = "jobAlerts" | "offerUpdates" | "messages" | "payments";
type NotificationPreferenceChannel = "push" | "email" | "sms";

const defaultNotificationPreferences: NotificationPreferences = {
  jobAlerts: { push: true, email: true, sms: false },
  offerUpdates: { push: true, email: true, sms: false },
  messages: { push: true, email: true, sms: true },
  payments: { push: true, email: true, sms: false },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
    timezone: "Australia/Melbourne",
    allowCritical: true
  }
};

function normalizeNotificationPreferences(preferences?: NotificationPreferences | null): NotificationPreferences {
  return {
    jobAlerts: { ...defaultNotificationPreferences.jobAlerts, ...(preferences?.jobAlerts || {}) },
    offerUpdates: { ...defaultNotificationPreferences.offerUpdates, ...(preferences?.offerUpdates || {}) },
    messages: { ...defaultNotificationPreferences.messages, ...(preferences?.messages || {}) },
    payments: { ...defaultNotificationPreferences.payments, ...(preferences?.payments || {}) },
    quietHours: { ...defaultNotificationPreferences.quietHours, ...(preferences?.quietHours || {}) }
  };
}

export function ProfileEditor({ user, onSaved, initialFocus, initialArea }: { user: UserProfile; onSaved: () => void; initialFocus?: VerificationFocus; initialArea?: ProfileSetupArea }) {
  const store = useAppStore();
  const [selectedArea, setSelectedArea] = React.useState<ProfileSetupArea>(initialArea || (initialFocus ? "verification" : "profile"));
  const [profile, setProfile] = React.useState<UserProfile>({
    ...user,
    role: user.role || "both",
    marketRegion: user.marketRegion || "VIC",
    taskRadiusKm: user.taskRadiusKm || 25,
    taskAlertMode: user.taskAlertMode || "skills",
    notificationPreferences: normalizeNotificationPreferences(user.notificationPreferences),
    avatarURL: user.avatarURL || "",
    profileMedia: (user.profileMedia || []).slice(0, MAX_PROFILE_MEDIA),
    skills: user.skills || []
  });
  const [smsCode, setSmsCode] = React.useState("");
  const [verificationNotice, setVerificationNotice] = React.useState<string | null>(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);
  const [isPreparingProfileMedia, setIsPreparingProfileMedia] = React.useState(false);
  const skillSet = React.useMemo(() => new Set(profile.skills || []), [profile.skills]);
  const readinessItems = React.useMemo(
    () => [
      Boolean(profile.name?.trim()),
      Boolean(profile.suburb?.trim()),
      Boolean(profile.bio?.trim()),
      Boolean(profile.phone?.trim()),
      Boolean(profile.role),
      Boolean(profile.marketRegion),
      Boolean(String(profile.avatarURL || "").trim()),
      Boolean((profile.profileMedia || []).length),
      Boolean((profile.skills || []).length)
    ],
    [profile]
  );
  const completedReadiness = readinessItems.filter(Boolean).length;
  const verificationChecks = [
    true,
    normalizedStatus(profile.idVerificationStatus) === "verified",
    Boolean(profile.phoneVerified),
    Boolean(profile.bankVerified)
  ];
  const completedVerification = verificationChecks.filter(Boolean).length;

  async function saveProfile() {
    setProfileSaveError(null);
    const localPolicyError = profilePolicyError(profile, store.translate);
    if (localPolicyError) {
      setProfileSaveError(localPolicyError);
      return;
    }
    const error = await store.updateProfile({
      ...profile,
      profileMedia: (profile.profileMedia || []).slice(0, MAX_PROFILE_MEDIA)
    });
    if (error) {
      setProfileSaveError(error);
      return;
    }
    if (!error) onSaved();
  }

  async function pickProfileAvatar() {
    setProfileSaveError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileSaveError(store.translate("mediaPermissionRequired"));
      return;
    }
    setIsPreparingProfileMedia(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.82
      });
      if (result.canceled || !result.assets?.length) return;
      const source = await prepareProfileImageSource(result.assets[0], 1000, 0.72);
      if (!source) {
        setProfileSaveError(store.translate("profileMediaPrepareFailed"));
        return;
      }
      updateProfile("avatarURL", source);
    } finally {
      setIsPreparingProfileMedia(false);
    }
  }

  async function pickProfileMedia() {
    setProfileSaveError(null);
    const currentMedia = (profile.profileMedia || []).slice(0, MAX_PROFILE_MEDIA);
    const remaining = MAX_PROFILE_MEDIA - currentMedia.length;
    if (remaining <= 0) {
      setProfileSaveError(store.translate("profileMediaLimitReached"));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileSaveError(store.translate("mediaPermissionRequired"));
      return;
    }
    setIsPreparingProfileMedia(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        base64: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        quality: 0.82,
        selectionLimit: remaining
      });
      if (result.canceled || !result.assets?.length) return;
      const prepared: ProfileMedia[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        const source = await prepareProfileImageSource(asset, 1400, 0.72);
        if (source) {
          prepared.push({
            id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "image",
            source
          });
        }
      }
      if (!prepared.length) {
        setProfileSaveError(store.translate("profileMediaPrepareFailed"));
        return;
      }
      updateProfile("profileMedia", [...currentMedia, ...prepared].slice(0, MAX_PROFILE_MEDIA));
    } finally {
      setIsPreparingProfileMedia(false);
    }
  }

  function removeProfileMedia(id: string) {
    updateProfile("profileMedia", (profile.profileMedia || []).filter((item) => item.id !== id));
  }

  function moveProfileMedia(id: string, offset: number) {
    const media = [...(profile.profileMedia || [])];
    const currentIndex = media.findIndex((item) => item.id === id);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= media.length) return;
    [media[currentIndex], media[targetIndex]] = [media[targetIndex], media[currentIndex]];
    updateProfile("profileMedia", media);
  }

  async function sendSmsCode() {
    setVerificationNotice(null);
    setVerificationError(null);
    const phone = normalizePhoneForVerification(profile.phone || "");
    updateProfile("phone", phone);
    const error = await store.startPhoneVerification(phone);
    if (error) {
      setVerificationError(error);
      return;
    }
    updateProfile("phoneVerificationPending", new Date().toISOString());
    setVerificationNotice(store.translate("smsCodeSent"));
  }

  async function verifySmsCode() {
    setVerificationNotice(null);
    setVerificationError(null);
    const phone = normalizePhoneForVerification(profile.phone || "");
    updateProfile("phone", phone);
    const error = await store.confirmPhoneVerification(phone, smsCode);
    if (error) {
      setVerificationError(error);
      return;
    }
    setSmsCode("");
    updateProfile("phoneVerified", true);
    updateProfile("phoneVerificationPending", undefined);
    setVerificationNotice(store.translate("phoneVerificationCompleted"));
  }

  async function startIdentityVerification() {
    setVerificationNotice(store.translate("preparingSecureIdCheck"));
    setVerificationError(null);
    const result = await store.startIdentityVerification();
    if (result.error) {
      setVerificationError(result.error);
      return;
    }
    if (result.url) {
      updateProfile("idVerificationStatus", "pending");
      setVerificationNotice(store.translate("openingSecureIdCheck"));
      await Linking.openURL(result.url);
    }
  }

  async function refreshIdentityVerification() {
    setVerificationNotice(store.translate("refreshingIdStatus"));
    setVerificationError(null);
    const result = await store.refreshIdentityVerificationStatus();
    if (result.error) {
      setVerificationError(result.error);
      return;
    }
    if (result.url) {
      updateProfile("idVerificationStatus", "requires_input");
      setVerificationNotice(store.translate("idNeedsMoreDetails"));
      await Linking.openURL(result.url);
      return;
    }
    if (result.status) updateProfile("idVerificationStatus", result.status);
    setVerificationNotice(store.translate(result.status === "verified" ? "idCheckVerified" : "idStatusUpdated"));
  }

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleSkill(skill: string) {
    setProfile((current) => {
      const next = new Set(current.skills || []);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return { ...current, skills: Array.from(next).sort((a, b) => a.localeCompare(b)) };
    });
  }

  const phoneSection = (
    <React.Fragment key="phone">
      <SetupInfo
        icon={<ShieldCheck color={colors.primary} size={22} />}
        title={store.translate("phoneVerification")}
        body={phoneVerificationSubtitle(profile, store.translate)}
      />
      {profile.phoneVerified ? null : (
        <>
          <TextField label={store.translate("phone")} value={profile.phone || ""} onChangeText={(value) => updateProfile("phone", value)} />
          <AHButton label={store.translate("sendSmsCode")} tone="secondary" loading={store.isSubmitting} onPress={sendSmsCode} />
          <TextField label={store.translate("smsCode")} value={smsCode} onChangeText={setSmsCode} keyboardType="number-pad" placeholder="123456" />
          <AHButton label={store.translate("verifySmsCode")} tone="secondary" loading={store.isSubmitting} onPress={verifySmsCode} />
        </>
      )}
    </React.Fragment>
  );

  const identitySection = (
    <React.Fragment key="identity">
      <SetupInfo
        icon={<BadgeCheck color={colors.primary} size={22} />}
        title={store.translate("idVerification")}
        body={idVerificationSubtitle(profile, store.translate)}
      />
      <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {store.translate("acceptedIdentityDocuments")}
      </Text>
      <AHButton label={store.translate("startIdCheck")} tone="secondary" loading={store.isSubmitting} onPress={startIdentityVerification} />
      <AHButton label={store.translate("refreshIdStatus")} tone="secondary" loading={store.isSubmitting} onPress={refreshIdentityVerification} />
    </React.Fragment>
  );

  const policeSection = (
    <React.Fragment key="police">
      <SetupInfo
        icon={<ShieldCheck color={colors.primary} size={22} />}
        title={store.translate("policeCheck")}
        body={policeCheckSubtitle(profile, store.translate)}
      />
      <TextField label={store.translate("policeCheckReference")} value={profile.policeCheckReference || ""} onChangeText={(value) => updateProfile("policeCheckReference", value)} placeholder={store.translate("policeCheckReferencePlaceholder")} />
      <TextField label={store.translate("provider")} value={profile.policeCheckProvider || ""} onChangeText={(value) => updateProfile("policeCheckProvider", value)} placeholder={store.translate("policeProviderPlaceholder")} />
      <TextField label={store.translate("policeAcceptedUntil")} value={profile.policeCheckExpiresAt || ""} onChangeText={(value) => updateProfile("policeCheckExpiresAt", value)} placeholder="YYYY-MM-DD" />
      <TextField label={store.translate("documentLink")} value={profile.policeCheckDocumentURL || ""} onChangeText={(value) => updateProfile("policeCheckDocumentURL", value)} placeholder={store.translate("documentLinkPlaceholder")} />
      <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {store.translate("policeCheckAdminNote")}
      </Text>
    </React.Fragment>
  );

  const wwccSection = (
    <React.Fragment key="wwcc">
      <SetupInfo
        icon={<PersonStanding color={colors.primary} size={22} />}
        title={store.translate("workWithChildrenCheck")}
        body={wwccSubtitle(profile, store.translate)}
      />
      <TextField label={store.translate("wwccReference")} value={profile.workingWithChildrenCheckReference || ""} onChangeText={(value) => updateProfile("workingWithChildrenCheckReference", value)} placeholder={store.translate("wwccReferencePlaceholder")} />
      <TextField label={store.translate("provider")} value={profile.workingWithChildrenCheckProvider || ""} onChangeText={(value) => updateProfile("workingWithChildrenCheckProvider", value)} placeholder={store.translate("wwccProviderPlaceholder")} />
      <TextField label={store.translate("expiryDate")} value={profile.workingWithChildrenCheckExpiresAt || ""} onChangeText={(value) => updateProfile("workingWithChildrenCheckExpiresAt", value)} placeholder="YYYY-MM-DD" />
      <TextField label={store.translate("documentLink")} value={profile.workingWithChildrenCheckDocumentURL || ""} onChangeText={(value) => updateProfile("workingWithChildrenCheckDocumentURL", value)} placeholder={store.translate("documentLinkPlaceholder")} />
      <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {store.translate("wwccAdminNote")}
      </Text>
    </React.Fragment>
  );

  const trustSectionByFocus = { phone: phoneSection, identity: identitySection, police: policeSection, wwcc: wwccSection };
  const orderedTrustSections = initialFocus
    ? [trustSectionByFocus[initialFocus], phoneSection, identitySection, policeSection, wwccSection].filter((section, index, all) => all.indexOf(section) === index)
    : [phoneSection, identitySection, policeSection, wwccSection];

  const trustChecksCard = (
    <Card>
      <VerificationProgressCard
        completed={completedVerification}
        total={verificationChecks.length}
        idStatus={normalizedStatus(profile.idVerificationStatus) === "verified" ? store.translate("completed") : "In progress"}
        phoneStatus={profile.phoneVerified ? store.translate("completed") : "Action required"}
        bankStatus={profile.bankVerified ? store.translate("completed") : "Pending"}
        onStartIdCheck={startIdentityVerification}
        onRetryPhone={sendSmsCode}
      />
      <SectionTitle title={store.translate("trustChecks")} subtitle={store.translate("trustChecksBody")} />
      {initialFocus ? <StatusBanner message={store.translate("verificationShortcutNotice")} /> : null}
      {verificationNotice ? <StatusBanner tone="success" message={verificationNotice} /> : null}
      {verificationError ? <StatusBanner tone="error" message={verificationError} /> : null}
      {orderedTrustSections}
      <TrustCheckActionRow href="/payout" label={store.translate("payoutSetup")} value={profile.bankVerified ? store.translate("completed") : store.translate("required")} />
    </Card>
  );

  return (
    <>
      <ProfileSetupTabs activeArea={selectedArea} onChange={setSelectedArea} />

      {selectedArea === "verification" ? trustChecksCard : null}

      {selectedArea === "profile" ? (
        <>
      <Card>
        <SectionTitle title={store.translate("profileSettings")} subtitle={store.translate("profileReadinessBody")} />
        <StatRow label={store.translate("profileReadiness")} value={`${completedReadiness}/${readinessItems.length}`} />
        <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: "hidden" }}>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 999,
              height: "100%",
              width: `${Math.round((completedReadiness / readinessItems.length) * 100)}%`
            }}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle title={store.translate("helperStrengths")} subtitle={store.translate("helperStrengthsBody")} />
        <SegmentedControl<UserRole>
          value={profile.role}
          options={[
            { value: "poster", label: store.translate("taskerMode") },
            { value: "helper", label: store.translate("helperMode") },
            { value: "both", label: store.translate("both") }
          ]}
          onChange={(value) => updateProfile("role", value)}
        />
        <SetupInfo
          icon={<PersonStanding color={colors.primary} size={22} />}
          title={roleSummaryTitle(profile.role, store.translate)}
          body={roleSummaryBody(profile.role, store.translate)}
        />
        <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
          {store.translate("selectedSkillsCount")}: {(profile.skills || []).length}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {store.categories.map((category) => (
            <Pill
              key={category}
              label={store.localizedCategory(category)}
              selected={skillSet.has(category)}
              onPress={() => toggleSkill(category)}
            />
          ))}
        </View>
        {profile.skills?.length ? null : <StatusBanner message={store.translate("noSkillsSelected")} />}
      </Card>

      <Card>
        <SectionTitle title={store.translate("basicInfo")} subtitle={store.translate("basicInfoBody")} />
        <SetupInfo
          icon={<Mail color={colors.primary} size={22} />}
          title={store.translate("signedInEmail")}
          body={profile.email}
        />
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
          <ProfileAvatarPreview name={profile.name || profile.email} source={profile.avatarURL || undefined} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
              {store.translate("uploadProfilePhoto")}
            </Text>
            <AHButton
              label={store.translate("uploadProfilePhoto")}
              tone="secondary"
              loading={isPreparingProfileMedia}
              icon={<UserCircle color={colors.primary} size={18} />}
              onPress={pickProfileAvatar}
            />
          </View>
        </View>
        <TextField label={store.translate("name")} value={profile.name} onChangeText={(value) => updateProfile("name", value)} />
        <TextField label={store.translate("bio")} value={profile.bio || ""} onChangeText={(value) => updateProfile("bio", value)} multiline error={profileSaveError || undefined} />
        <SetupInfo
          icon={<ShieldCheck color={colors.primary} size={22} />}
          title={store.translate("publicProfileSafety")}
          body={store.translate("profileMediaPolicy")}
        />
        <View style={{ gap: 8 }}>
          <SectionTitle title={store.translate("profileIntroPhotos")} subtitle={store.translate("profileIntroPhotosBody")} />
          <ProfileMediaGallery
            media={profile.profileMedia || []}
            onMove={moveProfileMedia}
            onRemove={removeProfileMedia}
            translate={store.translate}
          />
          <AHButton
            label={store.translate("uploadProfileMedia")}
            tone="secondary"
            disabled={(profile.profileMedia || []).length >= MAX_PROFILE_MEDIA}
            loading={isPreparingProfileMedia}
            icon={<ImageIcon color={colors.primary} size={18} />}
            onPress={pickProfileMedia}
          />
          {(profile.profileMedia || []).length >= MAX_PROFILE_MEDIA ? <StatusBanner message={store.translate("profileMediaLimitReached")} /> : null}
          {normalizedStatus(profile.profileMediaModerationStatus || undefined) === "needs_review" || normalizedStatus(profile.avatarModerationStatus || undefined) === "needs_review" ? (
            <StatusBanner message={store.translate("profileMediaPendingReview")} />
          ) : null}
          {profileSaveError ? <StatusBanner tone="error" message={profileSaveError} /> : null}
        </View>
        <TextField label={store.translate("suburb")} value={profile.suburb} onChangeText={(value) => updateProfile("suburb", value)} />
        <TextField label={store.translate("phone")} value={profile.phone || ""} onChangeText={(value) => updateProfile("phone", value)} />
        <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
          {store.translate("homeRegion")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["VIC", "NSW", "QLD", "SA", "WA", "NT", "TAS"].map((region) => (
            <Pill
              key={region}
              label={region}
              selected={(profile.marketRegion || "VIC") === region}
              onPress={() => updateProfile("marketRegion", region)}
            />
          ))}
        </View>
        <SetupInfo
          icon={<MapPin color={colors.primary} size={22} />}
          title={profile.marketRegion || "VIC"}
          body={store.translate("regionPreferenceBody")}
        />
      </Card>
        </>
      ) : null}

      {selectedArea === "notifications" ? (
        <>
      <Card>
        <NotificationPreferenceMatrix
          preferences={normalizeNotificationPreferences(profile.notificationPreferences)}
          onChange={(preferences) => updateProfile("notificationPreferences", preferences)}
        />
        <SectionTitle title={store.translate("taskAlerts")} subtitle={store.translate("taskAlertsBody")} />
        <SegmentedControl
          value={profile.taskAlertMode || "skills"}
          options={[
            { value: "all", label: store.translate("alertAllTasks") },
            { value: "skills", label: store.translate("alertSelectedSkills") },
            { value: "none", label: store.translate("alertNone") }
          ]}
          onChange={(value) => updateProfile("taskAlertMode", value)}
        />
        <SetupInfo
          icon={<Bell color={colors.primary} size={22} />}
          title={alertSummaryTitle(profile.taskAlertMode || "skills", store.translate)}
          body={alertSummaryBody(profile.taskAlertMode || "skills", store.translate)}
        />
      </Card>

      <Card>
        <SectionTitle title={store.translate("nearbyTaskRadius")} subtitle={store.translate("nearbyTaskRadiusBody")} />
        <View style={{ alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {store.translate("aroundMySuburb")}
          </Text>
          <Text selectable style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>
            {profile.taskRadiusKm || 25} km
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[10, 25, 50, 100].map((radius) => (
            <Pill
              key={radius}
              label={`${radius} km`}
              selected={(profile.taskRadiusKm || 25) === radius}
              onPress={() => updateProfile("taskRadiusKm", radius)}
            />
          ))}
        </View>
        <SetupInfo
          icon={<Target color={colors.primary} size={22} />}
          title={store.translate("matchingRule")}
          body={store.translate("matchingRuleBody")}
        />
      </Card>
        </>
      ) : null}

      {selectedArea === "payout" ? (
        <Card>
          <SectionTitle title={store.translate("payoutSetup")} subtitle={store.translate("payoutSetupSubtitle")} />
          <TrustCheckActionRow href="/payout" label={store.translate("payoutSetup")} value={profile.bankVerified ? store.translate("completed") : store.translate("required")} />
          <SetupInfo
            icon={<Banknote color={colors.primary} size={22} />}
            title={profile.bankVerified ? store.translate("payoutSetupReady") : store.translate("payoutSetupNeedsAction")}
            body={store.translate("payoutSetupLegalNote")}
          />
        </Card>
      ) : null}

      <AHButton
        label={store.translate("saveProfile")}
        loading={store.isSubmitting}
        icon={<BadgeCheck color={colors.surface} size={18} />}
        onPress={saveProfile}
      />
    </>
  );
}

function ProfileSetupTabs({
  activeArea,
  onChange
}: {
  activeArea: ProfileSetupArea;
  onChange: (area: ProfileSetupArea) => void;
}) {
  const store = useAppStore();
  const items: { value: ProfileSetupArea; label: string }[] = [
    { value: "profile", label: store.translate("profile") },
    { value: "verification", label: store.translate("verification") },
    { value: "payout", label: store.translate("payout") },
    { value: "notifications", label: store.translate("notifications") }
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((item) => (
        <Pill
          key={item.value}
          label={item.label}
          selected={activeArea === item.value}
          onPress={() => onChange(item.value)}
        />
      ))}
    </ScrollView>
  );
}

function VerificationProgressCard({
  completed,
  total,
  idStatus,
  phoneStatus,
  bankStatus,
  onStartIdCheck,
  onRetryPhone
}: {
  completed: number;
  total: number;
  idStatus: string;
  phoneStatus: string;
  bankStatus: string;
  onStartIdCheck: () => void;
  onRetryPhone: () => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>Your progress</Text>
        <Text selectable style={{ color: colors.text, fontSize: 12, fontWeight: "900" }}>{completed} of {total} complete</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }).map((_, index) => (
          <View key={index} style={{ backgroundColor: index < completed ? colors.accent : colors.border, borderRadius: 999, flex: 1, height: 8 }} />
        ))}
      </View>
      <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>
        Complete all checks to unlock jobs and build trust with clients.
      </Text>
      <VerificationProgressRow icon={<ShieldCheck color={colors.success} size={20} />} iconTone="success" title="Anti-robot security check" subtitle="Completed" />
      <VerificationProgressRow icon={<BadgeCheck color={colors.primary} size={20} />} iconTone="warning" title="ID check" subtitle="Upload a clear photo of your ID" badge={idStatus} actionLabel="Continue" onPress={onStartIdCheck} />
      <VerificationProgressRow icon={<Bell color={colors.danger} size={20} />} iconTone="danger" title="Phone check" subtitle={phoneStatus === "Completed" ? "Phone verified." : "We couldn't verify your number. Please try again."} badge={phoneStatus} actionLabel={phoneStatus === "Completed" ? undefined : "Try again"} onPress={onRetryPhone} />
      <VerificationProgressRow icon={<Banknote color={colors.primaryDark} size={20} />} iconTone="neutral" title="Bank check" subtitle="Verify your bank account to enable payouts" badge={bankStatus} />
    </View>
  );
}

function VerificationProgressRow({
  icon,
  iconTone,
  title,
  subtitle,
  badge,
  actionLabel,
  onPress
}: {
  icon: React.ReactNode;
  iconTone: "success" | "warning" | "danger" | "neutral";
  title: string;
  subtitle: string;
  badge?: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const toneColor = iconTone === "danger" ? colors.danger : iconTone === "warning" ? colors.accent : iconTone === "success" ? colors.success : colors.border;
  const surface = iconTone === "danger" ? "#FFF3F3" : iconTone === "warning" ? "#FFF8E6" : iconTone === "success" ? "#EFFCEB" : colors.surfaceAlt;
  return (
    <View style={{ backgroundColor: colors.surface, borderColor: toneColor, borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 }}>
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
        <View style={{ alignItems: "center", backgroundColor: surface, borderRadius: 999, height: 38, justifyContent: "center", width: 38 }}>{icon}</View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
            <Text selectable style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: "900" }}>{title}</Text>
            {badge ? (
              <Text selectable style={{ backgroundColor: surface, borderRadius: 999, color: iconTone === "danger" ? colors.danger : colors.primaryDark, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 }}>{badge}</Text>
            ) : (
              <ChevronRight color={colors.muted} size={18} />
            )}
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>{subtitle}</Text>
        </View>
      </View>
      {actionLabel && onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={{ alignItems: "center", backgroundColor: actionLabel === "Try again" ? colors.surface : colors.primary, borderColor: actionLabel === "Try again" ? colors.danger : colors.primary, borderRadius: 8, borderWidth: 1, justifyContent: "center", marginLeft: 50, minHeight: 42 }}>
          <Text selectable style={{ color: actionLabel === "Try again" ? colors.danger : colors.surface, fontSize: 14, fontWeight: "900" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NotificationPreferenceMatrix({
  preferences,
  onChange
}: {
  preferences: NotificationPreferences;
  onChange: (preferences: NotificationPreferences) => void;
}) {
  const rows = [
    { key: "jobAlerts" as const, icon: <ClipboardList color={colors.primaryDark} size={18} />, title: "Job alerts", subtitle: "New jobs that match your preferences" },
    { key: "offerUpdates" as const, icon: <Trophy color={colors.primaryDark} size={18} />, title: "Offer updates", subtitle: "Updates on offers you've received" },
    { key: "messages" as const, icon: <MessageSquareText color={colors.primaryDark} size={18} />, title: "Messages", subtitle: "New messages from clients and support" },
    { key: "payments" as const, icon: <Banknote color={colors.primaryDark} size={18} />, title: "Payments", subtitle: "Payouts, receipts and payment updates" }
  ];

  function toggle(kind: NotificationPreferenceKind, field: NotificationPreferenceChannel) {
    onChange({
      ...preferences,
      [kind]: {
        ...preferences[kind],
        [field]: !preferences[kind][field]
      }
    });
  }

  function updateQuietHours(patch: Partial<NotificationPreferences["quietHours"]>) {
    onChange({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        ...patch
      }
    });
  }

  return (
    <View style={{ gap: 12 }}>
      <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Choose how you want to be notified.</Text>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "flex-end", gap: 17 }}>
        {["Push", "Email", "SMS"].map((label) => (
          <Text selectable key={label} style={{ color: colors.muted, fontSize: 11, fontWeight: "900", textAlign: "center", width: 43 }}>{label}</Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.key} style={{ alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingBottom: 10 }}>
          <View style={{ alignItems: "center", backgroundColor: "#FFF0C2", borderRadius: 999, height: 38, justifyContent: "center", width: 38 }}>{row.icon}</View>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{row.title}</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 17 }}>{row.subtitle}</Text>
          </View>
          {(["push", "email", "sms"] as const).map((field) => (
            <Switch key={field} value={preferences[row.key][field]} onValueChange={() => toggle(row.key, field)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} ios_backgroundColor={colors.border} />
          ))}
        </View>
      ))}
      <View style={{ borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: 12, padding: 12 }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>Quiet hours</Text>
            <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Pause push notifications during these hours</Text>
          </View>
          <Switch
            value={preferences.quietHours.enabled}
            onValueChange={(enabled) => updateQuietHours({ enabled })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Start"
              value={preferences.quietHours.start}
              onChangeText={(start) => updateQuietHours({ start })}
              placeholder="22:00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="End"
              value={preferences.quietHours.end}
              onChangeText={(end) => updateQuietHours({ end })}
              placeholder="07:00"
            />
          </View>
        </View>
      </View>
      <SetupInfo icon={<Bell color={colors.primary} size={22} />} title="Tip" body="You can still receive important updates during quiet hours." />
    </View>
  );
}

function phoneVerificationSubtitle(user: UserProfile, translate: (key: string) => string) {
  if (user.phoneVerified) return translate("phoneVerificationCompleted");
  if (!String(user.phone || "").trim()) return translate("addMobileBeforeVerification");
  if (String(user.phoneVerificationPending || "").trim()) return translate("smsCodeSent");
  return translate("phoneVerificationBody");
}

function idVerificationSubtitle(user: UserProfile, translate: (key: string) => string) {
  const status = normalizedStatus(user.idVerificationStatus);
  if (status === "verified") return translate("idCheckVerified");
  if (status === "processing" || status === "pending") return translate("idCheckProcessing");
  if (status === "requires_input") return translate("idNeedsMoreDetails");
  if (status === "canceled" || status === "cancelled") return translate("idCheckCancelled");
  return translate("idVerificationBody");
}

function policeCheckSubtitle(user: UserProfile, translate: (key: string) => string) {
  const status = normalizedStatus(user.policeCheckStatus);
  if (status === "verified" || status === "approved") return translate("policeCheckVerified");
  if (status === "submitted") return translate("submittedForAdminReview");
  if (status === "rejected") return translate("policeCheckRejected");
  return translate("policeCheckBody");
}

function wwccSubtitle(user: UserProfile, translate: (key: string) => string) {
  const status = normalizedStatus(user.workingWithChildrenCheckStatus);
  if (status === "verified" || status === "approved") return translate("wwccVerified");
  if (status === "submitted") return translate("submittedForAdminReview");
  if (status === "rejected") return translate("wwccRejected");
  return translate("wwccBody");
}

function normalizedStatus(status: string | undefined) {
  return String(status || "").trim().toLowerCase();
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        gap: 4,
        padding: 4
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              alignItems: "center",
              backgroundColor: selected ? colors.surface : "transparent",
              borderRadius: 999,
              flex: 1,
              minHeight: 38,
              justifyContent: "center",
              paddingHorizontal: 8
            }}
          >
            <Text selectable style={{ color: selected ? colors.text : colors.muted, fontSize: 13, fontWeight: "900" }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SetupInfo({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surfaceAlt,
        borderRadius: 8,
        flexDirection: "row",
        gap: 12,
        padding: 12
      }}
    >
      {icon}
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function roleSummaryTitle(role: UserRole, translate: (key: string) => string) {
  if (role === "poster") return translate("taskerModeOnly");
  if (role === "helper") return translate("helperMode");
  return translate("taskerAndHelperMode");
}

function roleSummaryBody(role: UserRole, translate: (key: string) => string) {
  if (role === "poster") return translate("taskerModeBody");
  if (role === "helper") return translate("helperModeBody");
  return translate("bothModeBody");
}

function alertSummaryTitle(mode: string, translate: (key: string) => string) {
  if (mode === "all") return translate("alertAllTasks");
  if (mode === "none") return translate("alertNone");
  return translate("alertSelectedSkills");
}

function alertSummaryBody(mode: string, translate: (key: string) => string) {
  if (mode === "all") return translate("alertAllTasksBody");
  if (mode === "none") return translate("alertNoneBody");
  return translate("alertSelectedSkillsBody");
}

function verificationLabel(status: string | undefined, translate: (key: string) => string) {
  return status === "verified" || status === "approved" ? translate("completed") : translate("required");
}

function roleLabel(role: UserRole | undefined, translate: (key: string) => string) {
  if (role === "poster") return translate("poster");
  if (role === "helper") return translate("helperRole");
  return translate("both");
}

function normalizePhoneForVerification(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let compact = raw.replace(/[\s().-]+/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (compact.startsWith("+")) {
    compact = `+${compact.slice(1).replace(/\D+/g, "")}`;
    if (/^\+6104\d{8}$/.test(compact)) return `+61${compact.slice(4)}`;
    return compact;
  }
  compact = compact.replace(/\D+/g, "");
  if (/^04\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^4\d{8}$/.test(compact)) return `+61${compact}`;
  if (/^0[2378]\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^61\d{8,10}$/.test(compact)) return `+${compact}`;
  return compact;
}

async function prepareProfileImageSource(asset: ImagePicker.ImagePickerAsset, width: number, compress: number) {
  const firstPass = await encodeProfileImage(asset, width, compress);
  const encoded = firstPass && profileBase64ByteLength(firstPass.base64) <= MAX_PROFILE_IMAGE_BYTES
    ? firstPass
    : await encodeProfileImage(asset, 1000, 0.58);
  if (!encoded || profileBase64ByteLength(encoded.base64) > MAX_PROFILE_IMAGE_BYTES) return null;
  return `data:image/jpeg;base64,${encoded.base64}`;
}

async function encodeProfileImage(asset: ImagePicker.ImagePickerAsset, width: number, compress: number) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width || width, width) } }],
      { base64: true, compress, format: ImageManipulator.SaveFormat.JPEG }
    );
    const base64 = result.base64 || asset.base64 || "";
    return base64 ? { base64 } : null;
  } catch {
    return null;
  }
}

function profileBase64ByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function profilePolicyError(profile: UserProfile, translate: (key: string) => string) {
  if ((profile.profileMedia || []).length > MAX_PROFILE_MEDIA) return translate("profileMediaLimitReached");
  const values = [profile.bio || "", ...(profile.profileMedia || []).map((item) => item.caption || "")].join(" ");
  return textHasContactOrUnsafeContent(values) ? translate("profileIntroPolicyError") : null;
}

function textHasContactOrUnsafeContent(value: string) {
  const text = String(value || "").trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  if (/(https?:\/\/|www\.|\.com\b|\.com\.au\b)/i.test(text)) return true;
  if (/(instagram|facebook|whatsapp|wechat|telegram|tiktok|snapchat)/i.test(text)) return true;
  if (/(drug|cocaine|meth|porn|sex|escort|weapon|stolen)/i.test(lower)) return true;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return true;
  if (/\+?\d[\d\s().-]{7,}\d/.test(text)) return true;
  if (/\b\d{1,5}\s+[A-Za-z][A-Za-z\s]{2,}\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Parade|Pde|Boulevard|Blvd)\b/i.test(text)) return true;
  return false;
}
