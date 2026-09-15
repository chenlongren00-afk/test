import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Check, ChevronDown, Globe2, X } from "lucide-react-native";

import { languageOptions, type AppLanguage } from "@/i18n/translations";
import { useAppStore } from "@/state/app-store";
import { colors, radii, spacing } from "@/theme/colors";

export function TaskLanguageFilterButton({ compact = false }: { compact?: boolean }) {
  const store = useAppStore();
  const [visible, setVisible] = React.useState(false);
  const [draftLanguages, setDraftLanguages] = React.useState<AppLanguage[]>(store.taskLanguageFilters);

  function toggleLanguage(language: AppLanguage) {
    setDraftLanguages((current) => (
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    ));
  }

  async function apply() {
    await store.setTaskLanguageFilters(draftLanguages);
    setVisible(false);
  }

  async function reset() {
    setDraftLanguages([]);
    await store.setTaskLanguageFilters([]);
    setVisible(false);
  }

  const compactLabel = store.taskLanguageFilters.length === 0
    ? "English"
    : store.taskLanguageFilterLabel;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDraftLanguages(store.taskLanguageFilters);
          setVisible(true);
        }}
        style={{
          alignItems: "center",
          backgroundColor: compact ? colors.surface : colors.surfaceAlt,
          borderColor: colors.border,
          borderRadius: radii.control,
          borderWidth: compact ? 1 : 0,
          flexDirection: "row",
          gap: 10,
          minHeight: 48,
          paddingHorizontal: 14
        }}
      >
        <Globe2 color={colors.primary} size={19} strokeWidth={2.6} />
        {compact ? (
          <Text selectable numberOfLines={1} style={{ color: colors.primaryDark, flex: 1, fontSize: 14, fontWeight: "900" }}>
            {compactLabel}
          </Text>
        ) : (
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
              {store.translate("taskLanguageSettings")}
            </Text>
            <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
              {store.taskLanguageFilterLabel}
            </Text>
          </View>
        )}
        <ChevronDown color={colors.primaryDark} size={18} />
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <View style={{ backgroundColor: "rgba(5, 20, 24, 0.42)", flex: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              gap: spacing.gap,
              maxHeight: "78%",
              padding: spacing.screen
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
                  {store.translate("taskLanguageModalTitle")}
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                  {store.translate("taskLanguageModalSubtitle")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setVisible(false)}
                style={{ alignItems: "center", height: 42, justifyContent: "center", width: 42 }}
              >
                <X color={colors.primaryDark} size={24} strokeWidth={3} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 8 }} style={{ maxHeight: 330 }}>
              {languageOptions.map((option) => {
                const selected = draftLanguages.includes(option.code);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={option.code}
                    onPress={() => toggleLanguage(option.code)}
                    style={{
                      alignItems: "center",
                      backgroundColor: selected ? colors.surfaceAlt : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderRadius: radii.control,
                      borderWidth: 1,
                      flexDirection: "row",
                      gap: 12,
                      minHeight: 56,
                      paddingHorizontal: 14
                    }}
                  >
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: 999,
                        borderWidth: 1,
                        height: 28,
                        justifyContent: "center",
                        width: 28
                      }}
                    >
                      {selected ? <Check color={colors.surface} size={18} strokeWidth={3.2} /> : null}
                    </View>
                    <Text selectable style={{ color: colors.text, flex: 1, fontSize: 15, fontWeight: "900" }}>
                      {option.label} · {option.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                onPress={reset}
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.control,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 52
                }}
              >
                <Text selectable style={{ color: colors.primary, fontSize: 15, fontWeight: "900" }}>
                  {store.translate("resetTaskLanguageFilter")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={apply}
                style={{
                  alignItems: "center",
                  backgroundColor: colors.primary,
                  borderRadius: radii.control,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 52
                }}
              >
                <Text selectable style={{ color: colors.surface, fontSize: 15, fontWeight: "900" }}>
                  {store.translate("applyTaskLanguageFilter")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
