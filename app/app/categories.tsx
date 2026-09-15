import * as React from "react";
import { Text, View } from "react-native";

import { ParityScreen } from "@/components/ParityScreen";
import { Pill } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function CategoriesRoute() {
  const store = useAppStore();

  return (
    <ParityScreen titleKey="categories" subtitle={store.translate("categoriesRouteSubtitle")}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {store.categories.map((item) => (
          <Pill key={item} label={store.localizedCategory(item)} />
        ))}
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {store.translate("liveBackend")}
      </Text>
    </ParityScreen>
  );
}
