import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { useTurnstileChallenge } from "@/components/TurnstileChallenge";
import { AHButton, Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";
import type { HelperProfile, ProfileMedia, Review } from "@/types/marketplace";

export default function HelperProfileRoute() {
  const store = useAppStore();
  const router = useRouter();
  const { challenge, runChallenge } = useTurnstileChallenge();
  const { helperId, helperName, userId, taskId, offerId } = useLocalSearchParams<{
    helperId?: string | string[];
    helperName?: string | string[];
    userId?: string | string[];
    taskId?: string | string[];
    offerId?: string | string[];
  }>();
  const [reportNotice, setReportNotice] = React.useState<string | null>(null);
  const [isReporting, setIsReporting] = React.useState(false);
  const [isChoosing, setIsChoosing] = React.useState(false);
  const requestedHelperId = Array.isArray(helperId) ? helperId[0] : helperId;
  const requestedHelperName = String(Array.isArray(helperName) ? helperName[0] : helperName || "").trim();
  const requestedUserId = String(Array.isArray(userId) ? userId[0] : userId || "").trim();
  const requestedTaskId = String(Array.isArray(taskId) ? taskId[0] : taskId || "").trim();
  const requestedOfferId = String(Array.isArray(offerId) ? offerId[0] : offerId || "").trim();
  const helper = requestedHelperId
    ? store.state.helpers.find((item) => item.id === requestedHelperId || item.userId === requestedHelperId)
    : requestedUserId
      ? store.state.helpers.find((item) => item.userId === requestedUserId)
    : store.currentHelper;
  const helperUser = helper
    ? store.state.users.find((user) => user.id === helper.userId)
    : store.state.users.find((user) => user.id === requestedUserId || user.id === requestedHelperId) || null;
  const profileName = helper?.name || helperUser?.name || requestedHelperName || store.translate("profile");
  const rating = Number(helper?.rating ?? helperUser?.rating ?? 0);
  const reviews = helper?.reviews || helperUser?.reviews || [];
  const reviewCount = Number(helper?.reviewCount ?? helperUser?.reviewCount ?? reviews.length);
  const profileMedia = (helper?.portfolio || helper?.profileMedia || helperUser?.profileMedia || []).slice(0, 10);
  const targetUserId = helper?.userId || helperUser?.id || requestedUserId || "";
  const targetHelperId = helper?.id || "";
  const canChooseOffer = Boolean(helper && requestedTaskId && requestedOfferId);
  const userIdVerified = isVerified(helperUser?.idVerificationStatus);
  const statItems = helper
    ? [
        { label: "Completion Rate", value: percentText(helper.completionRate, helper.completedTasks ? "100%" : "-") },
        { label: "Cancellation Rate", value: percentText(helper.cancellationRate, "-") },
        { label: "Response Speed", value: helper.responseSpeedText || minutesText(helper.averageResponseMinutes ?? helper.responseSpeed) || (helper.responseRate ? `${helper.responseRate}%` : "-") },
        { label: "Tasks Completed", value: `${helper.completedTasks || 0}+` }
      ]
    : [
        { label: "Rating", value: rating > 0 ? rating.toFixed(1) : "-" },
        { label: "Reviews", value: `${reviewCount}` },
        { label: "Phone", value: helperUser?.phoneVerified ? "Yes" : "-" },
        { label: "Payment", value: helperUser?.bankVerified ? "Yes" : "-" }
      ];
  const badgeItems = helper
    ? normalizedBadges(helper)
    : [
        userIdVerified ? "ID Verified" : "ID pending",
        helperUser?.phoneVerified ? "Phone verified" : "Phone pending",
        helperUser?.bankVerified ? "Payment ready" : "Payment pending"
      ];
  const isOwnProfile = Boolean(
    targetUserId && store.currentAccountUserIds.includes(targetUserId)
  ) || Boolean(
    targetHelperId && store.currentHelperIds.includes(targetHelperId)
  );

  async function reportProfileMedia() {
    if (!targetUserId && !targetHelperId) return;
    setIsReporting(true);
    setReportNotice(null);
    const error = await store.reportProfileMedia({
      targetUserId,
      targetHelperId,
      mediaType: "profile",
      reason: "Inappropriate profile image"
    });
    setReportNotice(error || store.translate("profileMediaReportSent"));
    setIsReporting(false);
  }

  async function chooseOfferFromProfile() {
    if (!canChooseOffer || isChoosing) return;
    setIsChoosing(true);
    try {
      const antiRobotToken = await runChallenge("accept_offer");
      const error = await store.acceptOffer(requestedTaskId, requestedOfferId, antiRobotToken);
      if (error) {
        Alert.alert(store.translate("acceptOffer"), error, [{ text: store.translate("done") }]);
      } else {
        Alert.alert(store.translate("acceptOffer"), store.translate("offerAcceptedNotice"), [{ text: store.translate("done") }]);
        router.back();
      }
    } catch (error) {
      Alert.alert(store.translate("acceptOffer"), error instanceof Error ? error.message : "Security verification failed. Please try again.");
    } finally {
      setIsChoosing(false);
    }
  }

  return (
    <ParityScreen titleKey={helper ? "helperProfile" : "profile"} hideHeader>
      {!helper && !helperUser ? (
        <StatusBanner tone="error" message={`${store.translate("helperProfileNotFound")} ${requestedHelperId || requestedUserId ? `ID: ${requestedHelperId || requestedUserId}` : ""}`} />
      ) : null}
      <View
        style={{
          backgroundColor: colors.primaryDark,
          borderRadius: 0,
          gap: 14,
          marginHorizontal: -16,
          marginTop: -16,
          padding: 18,
          paddingTop: 14
        }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ padding: 8 }}>
            <Text selectable style={{ color: colors.surface, fontSize: 24, fontWeight: "900" }}>‹</Text>
          </Pressable>
          <Text selectable style={{ color: colors.surface, fontSize: 16, fontWeight: "900" }}>{helper ? "Helper Profile" : "Profile"}</Text>
          <Text selectable style={{ color: colors.surface, fontSize: 22, fontWeight: "900" }}>
            ⤴
          </Text>
        </View>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
          {helper?.avatarURL || helperUser?.avatarURL ? (
            <Image
              source={{ uri: String(helper?.avatarURL || helperUser?.avatarURL) }}
              style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.surface, borderRadius: 18, borderWidth: 2, height: 124, width: 124 }}
            />
          ) : (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 18,
                height: 124,
                justifyContent: "center",
                width: 124
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 26, fontWeight: "900" }}>
                {profileName.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: colors.surface, fontSize: 22, fontWeight: "900" }}>
              {profileName}
            </Text>
            <Text selectable style={{ color: colors.accent, fontSize: 14, fontWeight: "900" }}>
              {rating > 0 ? `★ ${rating.toFixed(1)} · ${reviewCount} ${reviewCount === 1 ? store.translate("review") : store.translate("reviews")}` : store.translate("notAvailable")}
            </Text>
            <Text selectable style={{ color: colors.surface, fontSize: 12, fontWeight: "800", opacity: 0.9 }}>
              📍 {helper?.suburb || helperUser?.suburb || "Australia"}
            </Text>
            <Text selectable style={{ color: colors.surface, fontSize: 12, fontWeight: "800", opacity: 0.9 }}>
              ▣ Member since {monthYearText(helper?.memberSince || helperUser?.createdAt)}
            </Text>
            <View style={{ alignSelf: "flex-start", borderColor: "rgba(255,255,255,0.34)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text selectable style={{ color: colors.surface, fontSize: 12, fontWeight: "900" }}>
                ✓ ID Verified
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Card>
        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21 }}>
          {helper?.bio || helper?.headline || helperUser?.bio || store.translate("helperProfileSubtitle")}
        </Text>
        <View style={{ borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", overflow: "hidden" }}>
          {statItems.map((item) => (
            <ProfileDecisionStat key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
        <ProfileSectionHeader title={store.translate("badges")} action="View all" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {badgeItems.slice(0, 6).map((badge) => (
            <View key={badge} style={{ backgroundColor: badge.includes("Top") ? colors.surfaceWarm : colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text selectable style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "900" }}>{badge}</Text>
            </View>
          ))}
        </ScrollView>
        <ProfileSectionHeader title={store.translate("portfolio")} action="View all" />
        <ProfileMediaShowcase media={profileMedia} emptyText={store.translate("noProfileMediaYet")} />
        {helper?.recentJobTypes?.length ? (
          <>
            <ProfileSectionHeader title="Recent job types" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {helper.recentJobTypes.slice(0, 6).map((jobType) => (
                <View key={jobType} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text selectable style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "900" }}>{store.localizedCategory(jobType)}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            Recent reviews ({reviewCount})
          </Text>
          <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            {rating > 0 ? rating.toFixed(1) : "-"} <Text style={{ color: colors.accent }}>★</Text>
          </Text>
        </View>
        <ReviewList reviews={reviews} emptyText={store.translate("noReviewsYet")} />
        {canChooseOffer ? (
          <AHButton
            label={`Choose ${profileName.split(" ")[0] || "Helper"}`}
            tone="accent"
            loading={isChoosing}
            onPress={chooseOfferFromProfile}
          />
        ) : null}
      </Card>
      {store.isAuthenticated && !isOwnProfile && (targetUserId || targetHelperId) ? (
        <Card tone="warm">
          <AHButton
            label={isReporting ? store.translate("reportingProfileMedia") : store.translate("reportProfileMedia")}
            loading={isReporting}
            tone="danger"
            onPress={reportProfileMedia}
          />
          {reportNotice ? (
            <StatusBanner
              tone={reportNotice === store.translate("profileMediaReportSent") ? "success" : "error"}
              message={reportNotice}
            />
          ) : null}
        </Card>
      ) : null}
      {challenge}
    </ParityScreen>
  );
}

function isVerified(status?: string | null) {
  return ["verified", "complete", "completed", "active", "ready"].includes(String(status || "").trim().toLowerCase());
}

function normalizedBadges(helper: HelperProfile) {
  const supplied = [...(helper.badges || []), ...(helper.verifiedBadges || [])].map((item) => String(item || "").trim()).filter(Boolean);
  const fallback = [
    helper.rating >= 4.8 ? "Top Rated" : "",
    Number(helper.reviewCount ?? helper.reviews?.length ?? 0) > 0 ? "Great Reviews" : "",
    (helper.averageResponseMinutes ?? helper.responseSpeed ?? 0) > 0 ? "Fast Response" : "",
    isVerified(helper.idVerificationStatus) ? "ID Verified" : ""
  ].filter(Boolean);
  return Array.from(new Set(supplied.length ? supplied : fallback.length ? fallback : ["New Helper"]));
}

function percentText(value: unknown, fallback: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return `${Math.round(numeric)}%`;
}

function minutesText(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric < 60) return `${Math.round(numeric)} min`;
  if (numeric < 1440) return `${Math.round(numeric / 60)} hr`;
  return `${Math.round(numeric / 1440)} day`;
}

function monthYearText(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "recently";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function ProfileDecisionStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRightColor: colors.border,
        borderRightWidth: 1,
        flex: 1,
        gap: 4,
        minHeight: 82,
        justifyContent: "center",
        paddingHorizontal: 4,
        paddingVertical: 8
      }}
    >
      <Text selectable allowFontScaling={false} numberOfLines={1} style={{ color: colors.primary, fontSize: 16, fontWeight: "900" }}>
        {value}
      </Text>
      <Text selectable allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={{ color: colors.muted, fontSize: 10, fontWeight: "800", lineHeight: 13, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function ProfileSectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
      <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{title}</Text>
      {action ? <Text selectable style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>{action}</Text> : null}
    </View>
  );
}

function ProfileMediaShowcase({ media, emptyText }: { media: ProfileMedia[]; emptyText: string }) {
  const [selectedMedia, setSelectedMedia] = React.useState<ProfileMedia | null>(null);

  return (
    <View>
      {media.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
          {media.map((item, index) => {
            const source = String(item.source || "").trim();
            return (
              <Pressable
                key={item.id || `${source}-${index}`}
                accessibilityLabel={item.caption || "Open portfolio photo"}
                accessibilityRole="imagebutton"
                onPress={() => setSelectedMedia(item)}
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  height: 116,
                  overflow: "hidden",
                  width: 116
                }}
              >
                {source ? <Image source={{ uri: source }} style={{ height: "100%", width: "100%" }} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
          {emptyText}
        </Text>
      )}
      <Modal animationType="fade" visible={Boolean(selectedMedia)} onRequestClose={() => setSelectedMedia(null)}>
        <View style={{ backgroundColor: "#000", flex: 1, justifyContent: "center" }}>
          <Pressable
            accessibilityLabel="Close portfolio preview"
            accessibilityRole="button"
            onPress={() => setSelectedMedia(null)}
            style={{ alignSelf: "flex-end", padding: 20, position: "absolute", right: 0, top: 24, zIndex: 2 }}
          >
            <Text style={{ color: colors.surface, fontSize: 18, fontWeight: "900" }}>Done</Text>
          </Pressable>
          {selectedMedia?.source ? (
            <Image source={{ uri: selectedMedia.source }} resizeMode="contain" style={{ height: "80%", width: "100%" }} />
          ) : null}
          {selectedMedia?.caption ? (
            <Text selectable style={{ color: colors.surface, fontSize: 14, fontWeight: "800", padding: 18, textAlign: "center" }}>
              {selectedMedia.caption}
            </Text>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ReviewList({ reviews, emptyText }: { reviews: Review[]; emptyText: string }) {
  return (
    <View style={{ gap: 10 }}>
      {reviews.length ? (
        reviews.slice(0, 2).map((review) => (
          <View key={review.id} style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
              <Text selectable numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: "900" }}>
                {review.authorName}
              </Text>
              <Text selectable style={{ color: colors.accent, fontSize: 13, fontWeight: "900" }}>
                {Number(review.rating || 0).toFixed(1)} ★
              </Text>
            </View>
            {review.comment ? (
              <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
          {emptyText}
        </Text>
      )}
    </View>
  );
}
