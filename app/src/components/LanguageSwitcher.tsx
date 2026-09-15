import * as React from "react";
import { Pressable, Text, View } from "react-native";

import { languageOptions } from "@/i18n/translations";
import { useAppStore } from "@/state/app-store";
import { colors, radii } from "@/theme/colors";

type LanguageSwitcherProps = {
  variant?: "dark" | "light";
};

export function LanguageSwitcher({ variant = "light" }: LanguageSwitcherProps) {
  const store = useAppStore();
  const dark = variant === "dark";

  return (
    <View
      style={{
        alignSelf: "center",
        backgroundColor: dark ? "rgba(255,255,255,0.14)" : colors.surfaceAlt,
        borderColor: dark ? "rgba(255,255,255,0.26)" : colors.border,
        borderRadius: radii.pill,
        borderWidth: 1,
        flexDirection: "row",
        gap: 4,
        padding: 4
      }}
    >
      {languageOptions.map((option) => {
        const selected = store.language === option.code;
        return (
          <Pressable
            key={option.code}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            onPress={() => void store.setLanguage(option.code)}
            style={{
              alignItems: "center",
              backgroundColor: selected ? colors.surface : "transparent",
              borderRadius: radii.pill,
              justifyContent: "center",
              minHeight: 34,
              minWidth: 44,
              paddingHorizontal: 8
            }}
          >
            <Text
              selectable
              style={{
                color: selected ? colors.primaryDark : dark ? colors.surface : colors.muted,
                fontSize: 13,
                fontWeight: "900"
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
