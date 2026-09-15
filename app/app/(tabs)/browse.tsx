import * as React from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Image, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Bell, Bookmark, BriefcaseBusiness, CalendarDays, ChevronDown, List, Map, MapPin, RefreshCw, Search, X } from "lucide-react-native";

import { CategoryPicker } from "@/components/CategoryPicker";
import { TaskLanguageFilterButton } from "@/components/TaskLanguageFilterButton";
import { TaskMapPreview } from "@/components/TaskMapPreview";
import { Card, Pill, StatusBanner } from "@/components/ui";
import { taskCategories } from "@/constants/categories";
import { taskMatchesLanguageFilters, useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";
import type { HelperTask } from "@/types/marketplace";
import { compactDate, money } from "@/utils/format";

export default function BrowseRoute() {
  const store = useAppStore();
  const [query, setQuery] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [selectedRegion, setSelectedRegion] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"list" | "map">("list");
  const [sortMode, setSortMode] = React.useState<"newest" | "budget">("newest");
  const hasHydratedPreferences = React.useRef(false);
  const availableCategories = store.categories.length ? store.categories : taskCategories;
  const isMapMode = viewMode === "map";

  const tasksMatchingBrowseFilters = store.openTasks.filter((task) => {
    const taskCategoryText = String(task.category || "").toLowerCase();
    const taskCategoryItems = taskCategoryText.split(",").map((item) => item.trim()).filter(Boolean);
    const matchesCategory = !selectedCategories.length || selectedCategories.some((category) => {
      const needle = category.toLowerCase();
      return taskCategoryItems.includes(needle) || taskCategoryText.includes(needle);
    });
    const matchesRegion = selectedRegion === "all" || String(task.state || "").toUpperCase() === selectedRegion;
    const text = `${task.title} ${task.description} ${task.suburb} ${task.state}`.toLowerCase();
    return matchesCategory && matchesRegion && text.includes(query.trim().toLowerCase());
  });
  const tasksMatchingLanguageFilters = tasksMatchingBrowseFilters.filter((task) => (
    taskMatchesLanguageFilters(task, store.taskLanguageFilters)
  ));
  const unsortedTasks = tasksMatchingLanguageFilters.length || !tasksMatchingBrowseFilters.length
    ? tasksMatchingLanguageFilters
    : tasksMatchingBrowseFilters;
  const tasks = [...unsortedTasks].sort((left, right) => {
    if (sortMode === "budget") return Number(right.budget || 0) - Number(left.budget || 0);
    return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
  });

  const categoryLabel = selectedCategories.length === 0
    ? store.translate("allCategories")
    : selectedCategories.length === 1
      ? store.localizedCategory(selectedCategories[0])
      : `${selectedCategories.length} ${store.translate("categoriesSelected")}`;

  function toggleCategory(category: string) {
    setSelectedCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  }

  React.useEffect(() => {
    let active = true;
    async function hydrateBrowsePreferences() {
      const raw = await readBrowsePreference();
      if (!active || !raw) {
        hasHydratedPreferences.current = true;
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.selectedCategories)) setSelectedCategories(parsed.selectedCategories.filter((item: unknown) => typeof item === "string"));
        if (typeof parsed.selectedRegion === "string") setSelectedRegion(parsed.selectedRegion || "all");
        if (parsed.viewMode === "map" || parsed.viewMode === "list") setViewMode(parsed.viewMode);
        if (parsed.sortMode === "budget" || parsed.sortMode === "newest") setSortMode(parsed.sortMode);
      } catch {
        // Ignore older preference payloads.
      } finally {
        hasHydratedPreferences.current = true;
      }
    }
    void hydrateBrowsePreferences();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hasHydratedPreferences.current) return;
    void writeBrowsePreference(JSON.stringify({ selectedCategories, selectedRegion, viewMode, sortMode }));
  }, [selectedCategories, selectedRegion, viewMode, sortMode]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={store.isRefreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />}
    >
      <View
        style={{
          backgroundColor: colors.primaryDark,
          gap: 14,
          marginHorizontal: -spacing.screen,
          marginTop: -spacing.screen,
          paddingHorizontal: spacing.screen,
          paddingBottom: 18,
          paddingTop: 14
        }}
      >
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
          <Image
            accessibilityIgnoresInvertColors
            source={require("../../assets/brand-icon.png")}
            style={{ borderRadius: 12, height: 44, width: 44 }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable numberOfLines={1} style={{ color: colors.surface, fontSize: 18, fontWeight: "900", lineHeight: 23 }}>
              {store.translate("browseTasks")}
            </Text>
            <Text selectable numberOfLines={1} style={{ color: colors.accent, fontSize: 12, fontStyle: "italic", fontWeight: "900", lineHeight: 16 }}>
              {"It's just one tap away."}
            </Text>
          </View>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: 999,
              height: 38,
              justifyContent: "center",
              width: 38
            }}
          >
            <Bell color={colors.surface} size={19} />
          </View>
        </View>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 14,
                flexDirection: "row",
                gap: 10,
                minHeight: 52,
                paddingHorizontal: 14
              }}
            >
              <Search color={colors.muted} size={20} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={store.translate("searchTasksPlaceholder")}
                placeholderTextColor="#8995A7"
                style={{ color: colors.text, flex: 1, fontSize: 16, fontWeight: "700", minHeight: 52 }}
              />
            </View>
          </View>
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Pressable
              accessibilityLabel={selectedRegion === "all" ? store.translate("allRegions") : selectedRegion}
              accessibilityRole="button"
              onPress={() => setSelectedRegion(selectedRegion === "all" ? "VIC" : "all")}
              style={{
                alignItems: "center",
                backgroundColor: colors.surfaceAlt,
                borderRadius: 8,
                flexDirection: "row",
                gap: 8,
                justifyContent: "center",
                minHeight: 44,
                paddingHorizontal: 12
              }}
            >
              <Map color={colors.primary} size={17} />
              <Text selectable numberOfLines={1} style={{ color: colors.primaryDark, flexShrink: 1, fontSize: 13, fontWeight: "900" }}>
                {selectedRegion === "all" ? store.translate("allRegions") : selectedRegion}
              </Text>
              <ChevronDown color={colors.primaryDark} size={16} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <TaskLanguageFilterButton compact />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill label={store.translate("all")} selected={!selectedCategories.length} onPress={() => setSelectedCategories([])} />
          {["Gardening", "Cleaning", "Furniture", "Moving"].map((category) => (
            <Pill
              key={category}
              label={store.localizedCategory(category)}
              selected={selectedCategories.includes(category)}
              onPress={() => toggleCategory(category)}
            />
          ))}
        </ScrollView>

        <View style={{ backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 12, flexDirection: "row", gap: 4, padding: 4 }}>
          {(["list", "map"] as const).map((mode) => {
            const selected = viewMode === mode;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={mode}
                onPress={() => setViewMode(mode)}
                style={{
                  alignItems: "center",
                  backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                  borderColor: selected ? colors.primary : colors.border,
                  borderWidth: 1,
                  borderRadius: 9,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 40,
                  paddingHorizontal: 12
                }}
              >
                <Text selectable style={{ color: selected ? colors.surface : colors.primaryDark, fontSize: 14, fontWeight: "900" }}>
                  {store.translate(mode)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          accessibilityLabel={categoryLabel}
          accessibilityRole="button"
          onPress={() => setShowCategoryPicker(true)}
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceAlt,
            borderRadius: 8,
            flex: 1,
            flexDirection: "row",
            gap: 8,
            justifyContent: "center",
            minHeight: 48,
            paddingHorizontal: 12
          }}
        >
          <List color={colors.primaryDark} size={18} />
          <Text selectable numberOfLines={1} style={{ color: colors.primaryDark, flexShrink: 1, fontSize: 15, fontWeight: "900" }}>
            {categoryLabel}
          </Text>
          <ChevronDown color={colors.primaryDark} size={18} />
        </Pressable>
        {selectedCategories.length || query ? (
          <Pressable
            accessibilityLabel={store.translate("reset")}
            accessibilityRole="button"
            onPress={() => {
              setSelectedCategories([]);
              setQuery("");
            }}
            style={{
              alignItems: "center",
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              height: 48,
              justifyContent: "center",
              width: 48
            }}
          >
            <X color={colors.primary} size={20} strokeWidth={3} />
          </Pressable>
        ) : null}
      </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
          {tasks.length} {store.translate(tasks.length === 1 ? "openTaskFound" : "openTasksFound")}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          {(["newest", "budget"] as const).map((mode) => (
            <Pill
              key={mode}
              label={store.translate(mode === "newest" ? "newestFirst" : "highestBudget")}
              selected={sortMode === mode}
              onPress={() => setSortMode(mode)}
            />
          ))}
          <Pressable accessibilityLabel={store.translate("refresh")} accessibilityRole="button" onPress={() => void store.refreshAll()} style={{ padding: 8 }}>
            <RefreshCw color={colors.primary} size={20} />
          </Pressable>
        </View>
      </View>

      {isMapMode ? (
        <TaskMapPreview tasks={tasks} expanded onExpand={() => {}} />
      ) : (
        <View style={{ gap: spacing.gap }}>
          {tasks.length ? (
            tasks.map((task) => <BrowseTaskRow key={task.id} task={task} />)
          ) : (
            <StatusBanner message={store.translate("noOpenTasksMatch")} />
          )}
        </View>
      )}

      <CategoryPicker
        visible={showCategoryPicker}
        categories={availableCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onReset={() => setSelectedCategories([])}
        onClose={() => setShowCategoryPicker(false)}
      />
    </ScrollView>
  );
}

function BrowseTaskRow({ task }: { task: HelperTask }) {
  const store = useAppStore();
  const photo = Array.isArray(task.photos) ? task.photos.find((item) => String(item || "").trim()) : undefined;
  const category = task.category
    ? task.category.split(",").map((item) => store.localizedCategory(item.trim())).join(", ")
    : store.translate("postTask");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/task/${task.id}`)}
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        padding: 12,
        shadowColor: colors.text,
        shadowOffset: { height: 2, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2
      }}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, height: 76, width: 76 }} />
      ) : (
        <View style={{ alignItems: "center", backgroundColor: colors.surfaceWarm, borderRadius: 10, height: 76, justifyContent: "center", width: 76 }}>
          <BriefcaseBusiness color={colors.accentDark} size={24} />
        </View>
      )}
      <View style={{ flex: 1, gap: 5 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
          {category}
        </Text>
        <Text selectable numberOfLines={2} style={{ color: colors.text, fontSize: 16, fontWeight: "900", lineHeight: 21 }}>
          {task.title}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 5 }}>
          <MapPin color={colors.muted} size={13} />
          <Text selectable numberOfLines={1} style={{ color: colors.muted, flex: 1, fontSize: 12, fontWeight: "700" }}>
            {task.suburb}, {task.state}
          </Text>
        </View>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 5 }}>
          <CalendarDays color={colors.muted} size={13} />
          <Text selectable numberOfLines={1} style={{ color: colors.muted, flex: 1, fontSize: 12, fontWeight: "700" }}>
            {compactDate(task.date, task.time)}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text selectable style={{ color: colors.primary, fontSize: 17, fontWeight: "900" }}>
          {money(task.budget)}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
          {store.translate("Fixed")}
        </Text>
        <Bookmark color={colors.muted} size={18} />
      </View>
    </Pressable>
  );
}

const BROWSE_PREFERENCE_KEY = "ah_browse_preferences";

function browseStorage() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.localStorage || null;
}

async function readBrowsePreference() {
  const storage = browseStorage();
  if (storage) return storage.getItem(BROWSE_PREFERENCE_KEY);
  return SecureStore.getItemAsync(BROWSE_PREFERENCE_KEY);
}

async function writeBrowsePreference(value: string) {
  const storage = browseStorage();
  if (storage) {
    storage.setItem(BROWSE_PREFERENCE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(BROWSE_PREFERENCE_KEY, value);
}
