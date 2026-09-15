import { Check, Search, X } from "lucide-react-native";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AHButton } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, radii, spacing } from "@/theme/colors";

type CategoryPickerProps = {
  visible: boolean;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onReset: () => void;
  onClose: () => void;
  allowCustom?: boolean;
  customCategory?: string;
  onChangeCustomCategory?: (value: string) => void;
  onAddCustomCategory?: () => void;
};

export function CategoryPicker({
  visible,
  categories,
  selectedCategories,
  onToggleCategory,
  onReset,
  onClose,
  allowCustom,
  customCategory = "",
  onChangeCustomCategory,
  onAddCustomCategory
}: CategoryPickerProps) {
  const store = useAppStore();
  const [query, setQuery] = React.useState("");

  const sortedCategories = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...categories]
      .filter((category) => {
        if (!needle) return true;
        return (
          category.toLowerCase().includes(needle) ||
          store.localizedCategory(category).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => store.localizedCategory(a).localeCompare(store.localizedCategory(b)));
  }, [categories, query, store]);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom"]} style={{ backgroundColor: colors.background, flex: 1 }}>
        <View style={{ flex: 1, gap: spacing.gap, padding: spacing.screen }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ width: 42 }} />
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
              {store.translate("categories")}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 8 }}>
              <X color={colors.text} size={28} />
            </Pressable>
          </View>

          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.control,
              flexDirection: "row",
              gap: 10,
              minHeight: 50,
              paddingHorizontal: 14
            }}
          >
            <Search color={colors.muted} size={22} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={store.translate("searchCategories")}
              placeholderTextColor="#8995A7"
              style={{ color: colors.text, flex: 1, fontSize: 15, fontWeight: "700" }}
            />
          </View>

          <Text selectable style={{ color: colors.muted, fontSize: 14, fontWeight: "900" }}>
            {store.translate("allCategories")}
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
            {sortedCategories.map((category) => {
              const selected = selectedCategories.includes(category);
              return (
                <Pressable
                  key={category}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => onToggleCategory(category)}
                  style={{
                    alignItems: "center",
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    minHeight: 52,
                    paddingVertical: 9
                  }}
                >
                  <Text style={{ color: colors.primaryDark, flex: 1, fontSize: 15, fontWeight: "800", lineHeight: 20 }}>
                    {store.localizedCategory(category)}
                  </Text>
                  <View
                    style={{
                      alignItems: "center",
                      borderColor: selected ? colors.primary : "#708099",
                      borderRadius: 4,
                      borderWidth: 2,
                      height: 24,
                      justifyContent: "center",
                      width: 24
                    }}
                  >
                    {selected ? <Check color={colors.primary} size={16} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}

            {allowCustom ? (
              <View style={{ gap: 10, paddingTop: 16 }}>
                <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
                  {store.translate("customCategory")}
                </Text>
                <TextInput
                  value={customCategory}
                  onChangeText={onChangeCustomCategory}
                  placeholder={store.translate("customCategoryPlaceholder")}
                  placeholderTextColor="#8995A7"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.control,
                    borderWidth: 1,
                    color: colors.text,
                    fontSize: 15,
                    minHeight: 50,
                    paddingHorizontal: 14
                  }}
                />
                <AHButton label={store.translate("addCustomCategory")} tone="secondary" onPress={onAddCustomCategory} />
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              backgroundColor: colors.background,
              bottom: 0,
              flexDirection: "row",
              gap: 12,
              left: 0,
              padding: spacing.screen,
              position: "absolute",
              right: 0
            }}
          >
            <View style={{ flex: 1 }}>
              <AHButton label={store.translate("reset")} tone="secondary" onPress={onReset} />
            </View>
            <View style={{ flex: 1 }}>
              <AHButton label={store.translate("apply")} onPress={onClose} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
