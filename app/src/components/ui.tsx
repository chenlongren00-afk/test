import { Link, type Href } from "expo-router";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight, MapPin, ShieldCheck } from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  type ViewStyle,
  type TextInputProps,
  View
} from "react-native";

import { colors, radii } from "@/theme/colors";
import { scaleFont, scaleSpace } from "@/theme/text-size";
import type { FeeBreakdown, HelperProfile, HelperTask, UserProfile } from "@/types/marketplace";
import { fallbackFeeBreakdown } from "@/utils/fees";
import { compactDate, money, taskStatusLabel } from "@/utils/format";
import { useAppStore } from "@/state/app-store";

export function Card({ children, tone = "default", style }: { children: React.ReactNode; tone?: "default" | "warm" | "teal"; style?: ViewStyle }) {
  const textScale = useAppStore().textScale;
  return (
    <View
      style={{
        ...style,
        backgroundColor: tone === "teal" ? colors.primary : tone === "warm" ? colors.surfaceWarm : colors.surface,
        borderColor: tone === "teal" ? colors.primaryDark : colors.border,
        borderRadius: radii.card,
        borderWidth: 1,
        padding: scaleSpace(18, textScale),
        gap: scaleSpace(12, textScale),
        shadowColor: colors.text,
        shadowOffset: { height: 6, width: 0 },
        shadowOpacity: 0.11,
        shadowRadius: 14,
        elevation: 3
      }}
    >
      {children}
    </View>
  );
}

export function BrandHeader({
  eyebrow,
  title,
  subtitle,
  notificationCount,
  onPressNotifications
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
}) {
  const store = useAppStore();
  const textScale = store.textScale;
  const count = Number(notificationCount || 0);

  return (
    <View
      style={{
        backgroundColor: colors.primaryDark,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: radii.card,
        borderWidth: 1,
        gap: scaleSpace(14, textScale),
        overflow: "hidden",
        padding: scaleSpace(18, textScale),
        shadowColor: colors.text,
        shadowOffset: { height: 3, width: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(12, textScale) }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.primaryDark,
            borderColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            borderRadius: 16,
            height: scaleSpace(62, textScale),
            justifyContent: "center",
            width: scaleSpace(62, textScale)
          }}
        >
          <Image source={require("../../assets/brand-icon.png")} resizeMode="contain" style={{ height: scaleSpace(54, textScale), width: scaleSpace(54, textScale) }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text selectable style={{ color: colors.surface, fontSize: scaleFont(24, textScale), fontWeight: "900", lineHeight: scaleFont(29, textScale) }}>
            {title || "Australian Helper"}
          </Text>
          <Text selectable style={{ color: colors.accent, fontSize: scaleFont(13, textScale), fontWeight: "900" }}>
            {subtitle || store.translate("slogan")}
          </Text>
          {eyebrow ? (
            <Text selectable style={{ color: colors.surface, fontSize: scaleFont(12, textScale), fontWeight: "800", marginTop: scaleSpace(6, textScale), opacity: 0.84 }}>
              {eyebrow}
            </Text>
          ) : null}
        </View>
        {onPressNotifications ? (
          <Pressable
            accessibilityLabel={store.translate("actionCentre")}
            accessibilityRole="button"
            onPress={onPressNotifications}
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
              borderColor: "rgba(255,255,255,0.22)",
              borderRadius: 18,
              borderWidth: 1,
              height: scaleSpace(48, textScale),
              justifyContent: "center",
              width: scaleSpace(48, textScale)
            }}
          >
            <Bell color={colors.surface} size={22} />
            {count > 0 ? (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: colors.accent,
                  borderRadius: 999,
                  minWidth: 20,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                  position: "absolute",
                  right: -2,
                  top: -4
                }}
              >
                <Text style={{ color: colors.text, fontSize: scaleFont(11, textScale), fontWeight: "900" }}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ActionMetric({
  label,
  value,
  icon,
  onPress
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  onPress?: () => void;
}) {
  const textScale = useAppStore().textScale;
  const content = (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        gap: scaleSpace(6, textScale),
        minHeight: scaleSpace(92, textScale),
        justifyContent: "center",
        padding: scaleSpace(10, textScale)
      }}
    >
      {icon || <CheckCircle2 color={colors.primary} size={20} />}
      <Text selectable style={{ color: colors.primary, fontSize: scaleFont(22, textScale), fontWeight: "900" }}>
        {value}
      </Text>
      <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: scaleFont(11, textScale), fontWeight: "800", lineHeight: scaleFont(14, textScale), textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {content}
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const textScale = useAppStore().textScale;
  return (
    <View style={{ gap: 3 }}>
      <Text selectable style={{ color: colors.text, fontSize: scaleFont(20, textScale), fontWeight: "900" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text selectable style={{ color: colors.muted, fontSize: scaleFont(14, textScale), lineHeight: scaleFont(20, textScale) }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Pill({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const textScale = useAppStore().textScale;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: selected ? colors.primary : colors.surface,
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: radii.pill,
        borderWidth: 1,
        justifyContent: "center",
        minHeight: scaleSpace(36, textScale),
        paddingHorizontal: scaleSpace(14, textScale)
      }}
    >
      <Text
        selectable
        style={{
          color: selected ? colors.surface : colors.text,
          fontSize: scaleFont(13, textScale),
          fontWeight: "800"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AHButton({
  label,
  onPress,
  disabled,
  loading,
  tone = "primary",
  icon
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger" | "accent";
  icon?: React.ReactNode;
}) {
  const isPrimary = tone === "primary";
  const textScale = useAppStore().textScale;
  const isAccent = tone === "accent";
  const backgroundColor = tone === "danger" ? "#FFF1F0" : isAccent ? colors.accent : isPrimary ? colors.primary : colors.surface;
  const textColor = tone === "danger" ? colors.danger : isAccent ? colors.text : isPrimary ? colors.surface : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: Boolean(loading), disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor,
        borderColor: tone === "secondary" || tone === "danger" ? colors.border : backgroundColor,
        borderRadius: radii.control,
        borderWidth: 1,
        flexDirection: "row",
        gap: scaleSpace(8, textScale),
        justifyContent: "center",
        minHeight: scaleSpace(50, textScale),
        opacity: disabled ? 0.58 : 1,
        paddingHorizontal: scaleSpace(16, textScale)
      }}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      {!loading && icon ? icon : null}
        <Text style={{ color: textColor, flexShrink: 1, fontSize: scaleFont(15, textScale), fontWeight: "900", textAlign: "center" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({
  label,
  multiline,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const textScale = useAppStore().textScale;
  return (
    <View style={{ gap: scaleSpace(6, textScale) }}>
      <Text selectable style={{ color: colors.text, fontSize: scaleFont(13, textScale), fontWeight: "800" }}>
        {label}
      </Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#8995A7"
        style={{
          backgroundColor: colors.surface,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radii.control,
          borderWidth: 1,
          color: colors.text,
          fontSize: scaleFont(15, textScale),
          minHeight: multiline ? scaleSpace(104, textScale) : scaleSpace(46, textScale),
          paddingHorizontal: scaleSpace(12, textScale),
          paddingVertical: multiline ? scaleSpace(12, textScale) : 0,
          textAlignVertical: multiline ? "top" : "center"
        }}
      />
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: scaleFont(12, textScale), fontWeight: "800", lineHeight: scaleFont(17, textScale) }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function StatusBanner({ message, tone = "info" }: { message: string; tone?: "info" | "error" | "success" }) {
  const textScale = useAppStore().textScale;
  const backgroundColor = tone === "error" ? "#FFF1F0" : tone === "success" ? "#ECFDF3" : colors.surfaceAlt;
  const textColor = tone === "error" ? colors.danger : tone === "success" ? colors.success : colors.primaryDark;
  return (
    <View
      style={{
        backgroundColor,
        borderColor: tone === "error" ? "#FFDAD6" : colors.border,
        borderRadius: radii.card,
        borderWidth: 1,
        padding: scaleSpace(12, textScale)
      }}
    >
      <Text selectable style={{ color: textColor, fontSize: scaleFont(13, textScale), fontWeight: "800", lineHeight: scaleFont(18, textScale) }}>
        {message}
      </Text>
    </View>
  );
}

function InfoRow({ label, value, emphasized }: { label: string; value: string | number; emphasized?: boolean }) {
  const textScale = useAppStore().textScale;
  return (
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: scaleSpace(12, textScale) }}>
      <Text selectable style={{ color: colors.muted, flex: 1, fontSize: scaleFont(13, textScale), fontWeight: "800" }}>
        {label}
      </Text>
        <Text selectable numberOfLines={2} style={{ color: emphasized ? colors.primary : colors.text, flexShrink: 1, fontSize: scaleFont(14, textScale), fontWeight: "900", textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

export function FeeBreakdownCard({
  amount,
  breakdown,
  title,
  compact
}: {
  amount?: number | string | null;
  breakdown?: FeeBreakdown | null;
  title?: string;
  compact?: boolean;
}) {
  const store = useAppStore();
  const textScale = store.textScale;
  const fee = breakdown || fallbackFeeBreakdown(amount);
  const platformFeePercent = `${Math.round(Number(fee.platformFeeRate || 0) * 100)}%`;
  const taskPrice = Number(fee.taskPrice || 0);

  return (
    <Card tone={compact ? "warm" : "default"}>
      <Text selectable style={{ color: colors.text, fontSize: scaleFont(compact ? 15 : 18, textScale), fontWeight: "900" }}>
        {title || store.translate("feeBreakdown")}
      </Text>
      <InfoRow label={store.translate("taskPrice")} value={money(fee.taskPrice)} />
      <InfoRow label={`${store.translate("platformFee")} (${platformFeePercent})`} value={money(fee.platformFeeAmount)} />
      <InfoRow label={store.translate("totalPaidByTasker")} value={money(taskPrice)} emphasized />
      <InfoRow label={store.translate("helperReceives")} value={money(fee.helperPayoutAmount || fee.helperNet)} emphasized />
      {!compact ? (
        <>
          <StatusBanner tone="success" message={store.translate("paymentHeldSecurely")} />
          <StatusBanner message={store.translate("releaseRules")} />
        </>
      ) : null}
    </Card>
  );
}

function verifiedText(value: unknown, translate: (key: string) => string) {
  const normalized = String(value || "").toLowerCase();
  if (value === true || ["verified", "approved", "completed", "passed"].includes(normalized)) {
    return translate("verified");
  }
  return translate("notVerified");
}

export function HelperTrustCard({ helper, user }: { helper?: HelperProfile | null; user?: UserProfile | null }) {
  const store = useAppStore();
  const textScale = store.textScale;
  const helperStats = helper as (HelperProfile & { cancelledTasks?: number; cancelledTaskCount?: number; averageResponseMinutes?: number }) | null | undefined;
  const completionRate = Number(helper?.completionRate ?? 0);
  const completed = Number(helper?.completedTasks || 0);
  const cancelled = Number(helperStats?.cancelledTasks ?? helperStats?.cancelledTaskCount ?? 0);
  const totalFinished = completed + cancelled;
  const cancellationRate = Number(helper?.cancellationRate ?? (totalFinished > 0 ? Math.round((cancelled / totalFinished) * 100) : 0));
  const portfolioCount = (helper?.portfolio || helper?.profileMedia || user?.profileMedia || []).length;
  const rating = Number(helper?.rating || 0);
  const reviewCount = Number(helper?.reviewCount ?? helper?.reviews?.length ?? 0);
  const responseRate = Number(helper?.responseRate || 0);
  const responseMinutes = Number(helperStats?.averageResponseMinutes ?? helper?.responseSpeed ?? 0);
  const badges = [
    ...(helper?.badges || []),
    ...(helper?.verifiedBadges || []),
    helper?.phoneVerified || user?.phoneVerified ? store.translate("phoneVerified") : "",
    verifiedText(helper?.idVerificationStatus || user?.idVerificationStatus, store.translate) === store.translate("verified") ? store.translate("idVerified") : "",
    verifiedText(helper?.policeCheckStatus || user?.policeCheckStatus, store.translate) === store.translate("verified") ? store.translate("policeCheck") : "",
    verifiedText(helper?.workingWithChildrenCheckStatus || user?.workingWithChildrenCheckStatus, store.translate) === store.translate("verified") ? store.translate("wwcc") : ""
  ].filter(Boolean);
  const ratingText = rating > 0
    ? `${rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? store.translate("review") : store.translate("reviews")})`
    : store.translate("notAvailable");
  const responseText = helper?.responseSpeedText ||
    (responseMinutes > 0
    ? `${responseMinutes} min`
    : responseRate > 0 ? `${responseRate}%` : store.translate("notAvailable"));
  const visibleBadges = badges.length ? Array.from(new Set(badges)).slice(0, 4) : [store.translate("verified"), store.translate("onTime")].filter(Boolean);

  return (
    <Card tone="warm" style={{ gap: scaleSpace(10, textScale), padding: scaleSpace(14, textScale) }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(8, textScale) }}>
        <ShieldCheck color={colors.primary} size={20} />
        <Text selectable style={{ color: colors.text, flex: 1, fontSize: scaleFont(15, textScale), fontWeight: "900" }}>
          {store.translate("trustSignals")}
        </Text>
        <Text selectable style={{ color: colors.primary, fontSize: scaleFont(12, textScale), fontWeight: "900" }}>
          {ratingText}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: scaleSpace(6, textScale) }}>
        <OfferMiniMetric label={store.translate("completionRate")} value={completionRate > 0 ? `${Math.round(completionRate)}%` : completed > 0 ? "100%" : "-"} />
        <OfferMiniMetric label={store.translate("responseSpeed")} value={responseText} />
        <OfferMiniMetric label={store.translate("jobsCompleted")} value={completed} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleSpace(6, textScale) }}>
        {visibleBadges.map((badge) => (
          <View key={badge} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: scaleSpace(10, textScale), paddingVertical: scaleSpace(6, textScale) }}>
            <Text numberOfLines={1} style={{ color: colors.primaryDark, fontSize: scaleFont(11, textScale), fontWeight: "900" }}>
              {badge}
            </Text>
          </View>
        ))}
        {portfolioCount ? (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: scaleSpace(10, textScale), paddingVertical: scaleSpace(6, textScale) }}>
            <Text numberOfLines={1} style={{ color: colors.primaryDark, fontSize: scaleFont(11, textScale), fontWeight: "900" }}>
              {portfolioCount} {store.translate("portfolio")}
            </Text>
          </View>
        ) : null}
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: scaleFont(12, textScale), lineHeight: scaleFont(17, textScale) }}>
        {`${store.translate("cancellationRate")}: ${Number.isFinite(cancellationRate) && (totalFinished > 0 || helper?.cancellationRate !== undefined) ? `${Math.round(cancellationRate)}%` : store.translate("notAvailable")}`}
      </Text>
    </Card>
  );
}

function OfferMiniMetric({ label, value }: { label: string; value: string | number }) {
  const textScale = useAppStore().textScale;
  return (
    <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, flex: 1, minHeight: scaleSpace(54, textScale), padding: scaleSpace(8, textScale) }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={{ color: colors.primaryDark, fontSize: scaleFont(13, textScale), fontWeight: "900", textAlign: "center" }}>
        {value}
      </Text>
      <Text numberOfLines={2} style={{ color: colors.muted, fontSize: scaleFont(10, textScale), fontWeight: "800", lineHeight: scaleFont(12, textScale), textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

export function TaskCard({ task, href }: { task: HelperTask; href?: Href }) {
  const store = useAppStore();
  const textScale = store.textScale;
  const status = taskStatusLabel(task.status);
  const primaryPhoto = firstTaskPhoto(task.photos);
  const body = (
    <Card>
      <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(10, textScale), justifyContent: "space-between" }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#F1F0EC",
            borderRadius: 999,
            flexDirection: "row",
            gap: scaleSpace(6, textScale),
            maxWidth: "72%",
            paddingHorizontal: scaleSpace(10, textScale),
            paddingVertical: scaleSpace(6, textScale)
          }}
        >
          <BriefcaseBusiness color={colors.accentDark} size={14} />
          <Text numberOfLines={1} style={{ color: colors.text, flexShrink: 1, fontSize: scaleFont(12, textScale), fontWeight: "900", textTransform: "uppercase" }}>
            {task.category ? task.category.split(",").map((item) => store.localizedCategory(item.trim())).join(", ") : store.translate("postTask")}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#ECFFF4",
            borderColor: "#9AF5C4",
            borderRadius: 999,
            borderWidth: 1,
            flexShrink: 1,
            maxWidth: "45%",
            paddingHorizontal: scaleSpace(12, textScale),
            paddingVertical: scaleSpace(5, textScale)
          }}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={{ color: colors.success, fontSize: scaleFont(12, textScale), fontWeight: "900" }}>
            {store.translate(status) === status ? status : store.translate(status)}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: scaleSpace(12, textScale) }}>
        {primaryPhoto ? (
          <Image
            accessibilityLabel={`${task.title} photo`}
            resizeMode="cover"
            source={{ uri: primaryPhoto }}
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, height: scaleSpace(92, textScale), width: scaleSpace(92, textScale) }}
          />
        ) : null}
        <View style={{ flex: 1, gap: scaleSpace(9, textScale) }}>
          <Text selectable style={{ color: colors.text, fontSize: scaleFont(17, textScale), fontWeight: "900", lineHeight: scaleFont(22, textScale) }} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={{ gap: scaleSpace(6, textScale) }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(6, textScale) }}>
              <MapPin color={colors.accentDark} size={14} />
              <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.muted, flex: 1, fontSize: scaleFont(13, textScale), fontWeight: "700" }}>
                {task.suburb}, {task.state}
              </Text>
            </View>
            <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(6, textScale) }}>
              <CalendarDays color={colors.accentDark} size={14} />
              <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.muted, flex: 1, fontSize: scaleFont(13, textScale), fontWeight: "700" }}>
                {compactDate(task.date, task.time)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: scaleSpace(8, textScale), justifyContent: "space-between", paddingTop: scaleSpace(10, textScale) }}>
        <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.muted, flex: 1, fontSize: scaleFont(12, textScale), fontWeight: "800" }}>
          {task.photos?.length ? `${task.photos.length} photos` : store.translate("tapForDetails")}
        </Text>
        <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.text, flexShrink: 0, fontSize: scaleFont(20, textScale), fontWeight: "900" }}>
          {money(task.budget)}
        </Text>
        {href ? <ChevronRight color={colors.muted} size={18} /> : null}
      </View>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button">{body}</Pressable>
    </Link>
  );
}

function firstTaskPhoto(photos?: string[] | null) {
  return (photos || []).map((item) => String(item || "").trim()).find(Boolean) || "";
}
