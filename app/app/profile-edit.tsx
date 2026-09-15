import * as React from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";

import { ProfileEditor, type ProfileSetupArea, type VerificationFocus } from "./(tabs)/dashboard";
import { SectionTitle, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { spacing } from "@/theme/colors";

export default function ProfileEditRoute() {
  const store = useAppStore();
  const params = useLocalSearchParams<{ area?: string; focus?: string }>();
  const [notice, setNotice] = React.useState<string | null>(null);
  const focus = normalizeVerificationFocus(params.focus);
  const area = normalizeProfileSetupArea(params.area || params.focus);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
    >
      <SectionTitle title={store.translate("profileEdit")} subtitle={store.translate("editProfileSubtitle")} />
      {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
      {notice ? <StatusBanner tone="success" message={notice} /> : null}
      {store.currentUser ? (
        <ProfileEditor
          key={store.currentUser.id}
          user={store.currentUser}
          initialArea={area}
          initialFocus={focus}
          onSaved={() => setNotice(store.translate("profileSaved"))}
        />
      ) : (
        <StatusBanner message={store.translate("liveBackend")} />
      )}
    </ScrollView>
  );
}

function normalizeVerificationFocus(value: string | string[] | undefined): VerificationFocus | undefined {
  const focus = Array.isArray(value) ? value[0] : value;
  if (focus === "phone" || focus === "identity" || focus === "police" || focus === "wwcc") return focus;
  return undefined;
}

function normalizeProfileSetupArea(value: string | string[] | undefined): ProfileSetupArea | undefined {
  const area = Array.isArray(value) ? value[0] : value;
  if (area === "profile" || area === "verification" || area === "payout" || area === "notifications") return area;
  if (area === "phone" || area === "identity" || area === "police" || area === "wwcc") return "verification";
  return undefined;
}
