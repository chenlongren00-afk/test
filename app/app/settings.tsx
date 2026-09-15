import * as React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, CreditCard, ShieldCheck, UserCircle } from "lucide-react-native";

import { BadgeGrid, ParityScreen } from "@/components/ParityScreen";
import { AHButton, Card, SectionTitle } from "@/components/ui";
import { languageOptions } from "@/i18n/translations";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";
import { scaleFont, scaleSpace, textSizeOptions } from "@/theme/text-size";

export default function SettingsRoute() {
  const store = useAppStore();
  const router = useRouter();
  const helper = store.currentHelper;
  const profileName = helper?.name || store.currentUser?.name || store.translate("profile");
  const avatarURL = helper?.avatarURL || store.currentUser?.avatarURL || "";
  const rating = Number(helper?.rating ?? store.currentUser?.rating ?? 0);
  const reviewCount = Number(helper?.reviewCount ?? store.currentUser?.reviewCount ?? store.currentUser?.reviews?.length ?? 0);
  const profileBio = helper?.bio || helper?.headline || store.currentUser?.bio || store.translate("helperProfileSubtitle");
  const notificationCount = store.state.notifications.filter((item) => !item.read).length;
  const textScale = store.textScale;

  function openOwnProfile() {
    if (helper?.id) {
      router.push({ pathname: "/helper-profile", params: { helperId: helper.id } });
      return;
    }
    if (store.currentUser?.id) {
      router.push({ pathname: "/helper-profile", params: { userId: store.currentUser.id } });
    }
  }

  return (
    <ParityScreen titleKey="settings" subtitle={store.translate("dashboardSubtitle")}>
      {store.currentUser ? (
        <Pressable accessibilityRole="link" onPress={openOwnProfile}>
          <View style={{ backgroundColor: colors.primaryDark, borderRadius: 18, gap: scaleSpace(12, textScale), padding: scaleSpace(16, textScale) }}>
            <View style={{ alignItems: "center", flexDirection: "row", gap: scaleSpace(12, textScale) }}>
              {avatarURL ? (
                <Image source={{ uri: avatarURL }} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14, height: scaleSpace(64, textScale), width: scaleSpace(64, textScale) }} />
              ) : (
                <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, height: scaleSpace(64, textScale), justifyContent: "center", width: scaleSpace(64, textScale) }}>
                  <Text style={{ color: colors.accentDark, fontSize: scaleFont(22, textScale), fontWeight: "900" }}>{profileName.trim().charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: scaleSpace(4, textScale) }}>
                <Text selectable style={{ color: colors.accent, fontSize: scaleFont(12, textScale), fontWeight: "900" }}>{store.translate("profile")} preview</Text>
                <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.surface, fontSize: scaleFont(19, textScale), fontWeight: "900" }}>{profileName}</Text>
                <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.surface, fontSize: scaleFont(12, textScale), fontWeight: "800", opacity: 0.86 }}>
                  ★ {rating > 0 ? rating.toFixed(1) : "-"} · {reviewCount} {store.translate("reviews")} · {store.currentUser.suburb || "Australia"}
                </Text>
              </View>
              <Text style={{ color: colors.surface, fontSize: scaleFont(24, textScale), fontWeight: "900" }}>›</Text>
            </View>
            <Text selectable numberOfLines={3} style={{ color: colors.surface, fontSize: scaleFont(13, textScale), fontWeight: "700", lineHeight: scaleFont(19, textScale), opacity: 0.88 }}>
              {profileBio}
            </Text>
          </View>
        </Pressable>
      ) : null}
      <SectionTitle title="Account" subtitle="Profile, verification, payout and notification controls." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <SettingsHubTile
          title={store.translate("profile")}
          subtitle={store.translate("profileEdit")}
          icon={<UserCircle color={colors.primary} size={24} />}
          onPress={() => router.push({ pathname: "/profile-edit", params: { area: "profile" } })}
        />
        <SettingsHubTile
          title={store.translate("verification")}
          subtitle={store.translate("idVerification")}
          icon={<ShieldCheck color={colors.primary} size={24} />}
          onPress={() => router.push({ pathname: "/profile-edit", params: { area: "verification", focus: "identity" } })}
        />
        <SettingsHubTile
          title={store.translate("payout")}
          subtitle={store.translate("payoutSetup")}
          icon={<CreditCard color={colors.primary} size={24} />}
          onPress={() => router.push("/payout")}
        />
        <SettingsHubTile
          title={store.translate("notifications")}
          subtitle={notificationCount ? `${notificationCount} ${store.translate("notificationsNeedAttention")}` : store.translate("jobOfferMessagePaymentUpdates")}
          icon={<Bell color={colors.primary} size={24} />}
          onPress={() => router.push({ pathname: "/profile-edit", params: { area: "notifications" } })}
        />
      </View>
      <SectionTitle title={store.translate("language")} />
      <Card>
        <BadgeGrid items={languageOptions.map((option) => option.label)} />
        {languageOptions.map((option) => (
          <AHButton
            key={option.code}
            label={`${option.label} · ${option.title}`}
            tone={store.language === option.code ? "primary" : "secondary"}
            onPress={() => void store.setLanguage(option.code)}
          />
        ))}
      </Card>
      <SectionTitle title={store.translate("displaySettings")} />
      <Card>
        <Text selectable style={{ color: colors.text, fontSize: scaleFont(16, textScale), fontWeight: "900" }}>
          {store.translate("textSize")}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: scaleFont(13, textScale), fontWeight: "700", lineHeight: scaleFont(19, textScale) }}>
          {store.translate("textSizeBody")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scaleSpace(8, textScale) }}>
          {textSizeOptions.map((option) => (
            <Pressable
              key={option.value}
              accessibilityLabel={store.translate(option.translationKey)}
              accessibilityRole="button"
              accessibilityState={{ selected: store.textSize === option.value }}
              onPress={() => void store.setTextSize(option.value)}
              style={{
                backgroundColor: store.textSize === option.value ? colors.primary : colors.surface,
                borderColor: store.textSize === option.value ? colors.primary : colors.border,
                borderRadius: 999,
                borderWidth: 1,
                minHeight: scaleSpace(40, textScale),
                paddingHorizontal: scaleSpace(14, textScale),
                paddingVertical: scaleSpace(8, textScale)
              }}
            >
              <Text style={{ color: store.textSize === option.value ? colors.surface : colors.text, fontSize: scaleFont(13, option.scale), fontWeight: "900" }}>
                {store.translate(option.translationKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <SectionTitle title={store.translate("accountTools")} />
      <Card>
        <Text selectable style={{ color: colors.muted, fontSize: scaleFont(14, textScale), lineHeight: scaleFont(20, textScale) }}>
          {store.currentUser?.email}
        </Text>
        <AHButton label={store.translate("logout")} tone="danger" onPress={store.logout} />
      </Card>
    </ParityScreen>
  );
}

function SettingsHubTile({
  title,
  subtitle,
  icon,
  onPress
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const textScale = useAppStore().textScale;
  return (
    <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={onPress} style={{ flexBasis: "47%", flexGrow: 1 }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          gap: scaleSpace(10, textScale),
          minHeight: scaleSpace(136, textScale),
          padding: scaleSpace(14, textScale),
          shadowColor: colors.text,
          shadowOffset: { height: 4, width: 0 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceAlt,
              borderRadius: 999,
              height: scaleSpace(42, textScale),
              justifyContent: "center",
              width: scaleSpace(42, textScale)
            }}
          >
            {icon}
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </View>
        <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: colors.text, fontSize: scaleFont(16, textScale), fontWeight: "900" }}>
          {title}
        </Text>
        <Text selectable numberOfLines={3} style={{ color: colors.muted, fontSize: scaleFont(12, textScale), fontWeight: "700", lineHeight: scaleFont(17, textScale) }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
