import { Link, type Href } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import * as React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Card, Pill, SectionTitle, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";

export function ParityScreen({
  titleKey,
  subtitle,
  hideHeader = false,
  children
}: {
  titleKey: string;
  subtitle?: string;
  hideHeader?: boolean;
  children?: React.ReactNode;
}) {
  const store = useAppStore();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
    >
      {hideHeader ? null : <SectionTitle title={store.translate(titleKey)} subtitle={subtitle || store.translate("liveBackend")} />}
      {children || <StatusBanner message={store.translate("parityNote")} />}
    </ScrollView>
  );
}

export function MenuLink({
  href,
  title,
  subtitle,
  icon
}: {
  href: Href;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={title} accessibilityRole="button">
        <Card>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
            {icon ? (
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: 8,
                  height: 40,
                  justifyContent: "center",
                  width: 40
                }}
              >
                {icon}
              </View>
            ) : null}
            <View style={{ flex: 1, gap: 3 }}>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                {title}
              </Text>
              {subtitle ? (
                <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <ChevronRight color={colors.muted} size={20} />
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        alignItems: "center",
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10
      }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}

export function BadgeGrid({ items }: { items: string[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <Pill key={item} label={item} />
      ))}
    </View>
  );
}
