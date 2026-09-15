import { useRouter } from "expo-router";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Image as ImageIcon, X } from "lucide-react-native";
import * as React from "react";
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { CategoryPicker } from "@/components/CategoryPicker";
import { useTurnstileChallenge } from "@/components/TurnstileChallenge";
import { AHButton, BrandHeader, Card, SectionTitle, StatusBanner, TextField } from "@/components/ui";
import { taskCategories } from "@/constants/categories";
import { marketRegions } from "@/constants/regions";
import { useAppStore } from "@/state/app-store";
import { colors, radii, spacing } from "@/theme/colors";
import type { TaskDraft } from "@/types/marketplace";

const initialDraft: TaskDraft = {
  title: "",
  description: "",
  category: "",
  suburb: "Melbourne CBD",
  state: "VIC",
  budget: "",
  date: "",
  time: ""
};

type PreparedMedia = {
  label: string;
  previewUri?: string;
  source: string;
  type: "image";
};

const MAX_TASK_MEDIA = 10;
const MAX_IMAGE_BYTES = 5_000_000;

export default function PostRoute() {
  const store = useAppStore();
  const router = useRouter();
  const { challenge, runChallenge } = useTurnstileChallenge();
  const [draft, setDraft] = React.useState<TaskDraft>(initialDraft);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [customCategory, setCustomCategory] = React.useState("");
  const [categoryQuery, setCategoryQuery] = React.useState("");
  const [mediaPreviews, setMediaPreviews] = React.useState<Record<string, PreparedMedia>>({});
  const [isPreparingMedia, setIsPreparingMedia] = React.useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [noticeTone, setNoticeTone] = React.useState<"info" | "error" | "success">("info");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [postedTaskId, setPostedTaskId] = React.useState<string | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const scrollRef = React.useRef<ScrollView>(null);
  const availableCategories = store.categories.length ? store.categories : taskCategories;
  const categorySuggestions = React.useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase();
    if (!needle) return [];
    return availableCategories
      .filter((category) => !selectedCategories.includes(category))
      .map((category) => ({ category, label: store.localizedCategory(category) }))
      .filter((item) => item.category.toLowerCase().includes(needle) || item.label.toLowerCase().includes(needle))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(needle) || a.category.toLowerCase().startsWith(needle);
        const bStarts = b.label.toLowerCase().startsWith(needle) || b.category.toLowerCase().startsWith(needle);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 8);
  }, [availableCategories, categoryQuery, selectedCategories, store]);

  function update<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function showNotice(message: string, tone: "info" | "error" | "success" = "info") {
    setNoticeTone(tone);
    setNotice(message);
  }

  function showError(message: string) {
    showNotice(message, "error");
  }

  function setCategories(nextCategories: string[]) {
    const uniqueCategories = Array.from(new Set(nextCategories.map((item) => item.trim()).filter(Boolean)));
    setSelectedCategories(uniqueCategories);
    update("category", uniqueCategories.join(", "));
  }

  function toggleCategory(category: string) {
    const selected = selectedCategories.includes(category);
    const nextCategories = selected ? selectedCategories.filter((item) => item !== category) : [...selectedCategories, category];
    setCategories(nextCategories);
  }

  function selectSuggestedCategory(category: string) {
    setCategories([...selectedCategories, category]);
    setCategoryQuery("");
  }

  function addInlineCustomCategory() {
    const value = categoryQuery.trim();
    if (!value) return;
    setCategories([...selectedCategories, value]);
    setCategoryQuery("");
  }

  function addCustomCategory() {
    const value = customCategory.trim();
    if (!value) return;
    setCategories([...selectedCategories, value]);
    setCustomCategory("");
  }

  async function pickMedia() {
    const remainingSlots = MAX_TASK_MEDIA - (draft.photos || []).length;
    if (remainingSlots <= 0) {
      showError(store.translate("taskPhotoLimitReached"));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError(store.translate("mediaPermissionRequired"));
      return;
    }
    try {
      setIsPreparingMedia(true);
      showNotice(store.translate("preparingMediaPreviews"));
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        base64: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        quality: 0.78,
        selectionLimit: remainingSlots
      });
      if (result.canceled) {
        setNotice(null);
        return;
      }

      const prepared = (
        await Promise.all(result.assets.slice(0, remainingSlots).map((asset) => preparePickedMedia(asset)))
      ).filter(Boolean) as PreparedMedia[];

      if (!prepared.length) {
        showError(store.translate("mediaPrepareFailed"));
        return;
      }

      setDraft((current) => {
        const photos = Array.from(new Set([...(current.photos || []), ...prepared.map((item) => item.source)])).slice(0, MAX_TASK_MEDIA);
        return { ...current, photos };
      });
      setMediaPreviews((current) => {
        const next = { ...current };
        for (const item of prepared) next[item.source] = item;
        return next;
      });
      showNotice(store.translate("mediaAdded"), "success");
    } catch {
      showError(store.translate("mediaPrepareFailed"));
    } finally {
      setIsPreparingMedia(false);
    }
  }

  function removeMedia(url: string) {
    setDraft((current) => ({ ...current, photos: (current.photos || []).filter((item) => item !== url) }));
    setMediaPreviews((current) => {
      const next = { ...current };
      delete next[url];
      return next;
    });
  }

  function moveMedia(source: string, direction: -1 | 1) {
    setDraft((current) => {
      const photos = [...(current.photos || [])];
      const index = photos.indexOf(source);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) return current;
      [photos[index], photos[targetIndex]] = [photos[targetIndex], photos[index]];
      return { ...current, photos };
    });
  }

  function selectRegion(code: string, defaultSuburb: string) {
    setDraft((current) => ({
      ...current,
      state: code,
      suburb: current.suburb && !marketRegions.some((region) => region.defaultSuburb === current.suburb) ? current.suburb : defaultSuburb
    }));
  }

  function openDatePicker() {
    if (Platform.OS !== "android") return;
    DateTimePickerAndroid.open({
      value: parseDate(draft.date) || new Date(),
      mode: "date",
      display: "calendar",
      minimumDate: new Date(),
      onChange: (event, selectedDate) => {
        if (event.type !== "set" || !selectedDate) return;
        update("date", formatDate(selectedDate));
        setErrors((current) => ({ ...current, date: "" }));
      }
    });
  }

  function openTimePicker() {
    if (Platform.OS !== "android") return;
    DateTimePickerAndroid.open({
      value: parseTime(draft.time) || defaultTime(),
      mode: "time",
      display: "clock",
      is24Hour: false,
      onChange: (event, selectedTime) => {
        if (event.type !== "set" || !selectedTime) return;
        update("time", formatTime(selectedTime));
        setErrors((current) => ({ ...current, time: "" }));
      }
    });
  }

  async function submit() {
    const finalDraft = {
      ...draft,
      category: selectedCategories.join(", "),
      language: store.language
    };
    const validationErrors = validateDraft(finalDraft, store.translate);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setNotice(null);
      scrollRef.current?.scrollTo({ y: 250, animated: true });
      return;
    }
    let antiRobotToken = "";
    try {
      antiRobotToken = await runChallenge("post_task");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Security verification failed. Please try again.");
      return;
    }
    const beforeIds = new Set(store.state.tasks.map((task) => task.id));
    const error = await store.createTask(finalDraft, antiRobotToken);
    if (!error) {
      showNotice(store.translate("taskPostedNotice"), "success");
      const createdTask = store.state.tasks.find((task) => !beforeIds.has(task.id) && task.title === finalDraft.title);
      setPostedTaskId(createdTask?.id || null);
      setDraft(initialDraft);
      setSelectedCategories([]);
      setMediaPreviews({});
      setErrors({});
      setCurrentStep(0);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }

  function validateStep(step: number) {
    const snapshot = { ...draft, category: selectedCategories.join(", ") };
    const allErrors = validateDraft(snapshot, store.translate);
    const fieldsByStep = [
      ["title", "description", "category"],
      ["suburb", "date", "time"],
      ["budget"],
      ["title", "description", "category", "suburb", "date", "time", "budget"]
    ];
    const fields = fieldsByStep[step] || fieldsByStep[fieldsByStep.length - 1];
    return Object.fromEntries(Object.entries(allErrors).filter(([field]) => fields.includes(field)));
  }

  function goToStep(step: number) {
    const nextStep = Math.max(0, Math.min(step, 3));
    setCurrentStep(nextStep);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function goNext() {
    const stepErrors = validateStep(currentStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) return;
    goToStep(currentStep + 1);
  }

  return (
    <>
    <ScrollView
      ref={scrollRef}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: spacing.gap, padding: spacing.screen, paddingBottom: 32 }}
    >
      <BrandHeader eyebrow={store.translate("postTaskSubtitle")} title={store.translate("postTask")} />
      <PostProgress draft={draft} selectedCategories={selectedCategories} />
      <WizardStepper currentStep={currentStep} translate={store.translate} />

      {!store.isAuthenticated ? (
        <StatusBanner tone="error" message={store.translate("loginBeforePosting")} />
      ) : null}
      {notice ? <StatusBanner tone={noticeTone} message={notice} /> : null}
      {store.error ? <StatusBanner tone="error" message={store.error} /> : null}
      {noticeTone === "success" ? (
        <Card tone="warm">
          <SectionTitle title={store.translate("taskLiveTitle")} subtitle={store.translate("taskLiveBody")} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {postedTaskId ? (
              <View style={{ flexGrow: 1 }}>
                <AHButton label={store.translate("viewTask")} onPress={() => router.push(`/task/${postedTaskId}`)} />
              </View>
            ) : null}
            <View style={{ flexGrow: 1 }}>
              <AHButton label={store.translate("browseTasks")} tone="secondary" onPress={() => router.push("/browse")} />
            </View>
            <View style={{ flexGrow: 1 }}>
              <AHButton label={store.translate("postAnotherTask")} tone="secondary" onPress={() => setNotice(null)} />
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        {currentStep === 0 ? (
          <>
          <StepHeader number={1} title={store.translate("postStepBasics")} body={store.translate("postStepBasicsBody")} />
          <TextField
            label={store.translate("title")}
            value={draft.title}
            onChangeText={(value) => update("title", value)}
            placeholder={store.translate("titlePlaceholder")}
            error={errors.title}
          />
          <TextField
            label={store.translate("description")}
            value={draft.description}
            onChangeText={(value) => update("description", value)}
            placeholder={store.translate("descriptionPlaceholder")}
            multiline
            error={errors.description}
          />
          <StepHeader number={2} title={store.translate("postStepCategory")} body={store.translate("postStepCategoryBody")} />
          <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
            {store.translate("categories")}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            {store.translate("postCategoryHint")}
          </Text>
          {errors.category ? (
            <Text selectable style={{ color: colors.danger, fontSize: 12, fontWeight: "800", lineHeight: 17 }}>
              {errors.category}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {selectedCategories.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => toggleCategory(item)}
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 18,
                  borderWidth: 1,
                  flexDirection: "row",
                  gap: 6,
                  minHeight: 34,
                  paddingHorizontal: 12
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800" }}>
                  {store.localizedCategory(item)}
                </Text>
                <X color={colors.primary} size={14} strokeWidth={3} />
              </Pressable>
            ))}
          </View>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              borderWidth: 1,
              overflow: "hidden"
            }}
          >
            <TextInput
              value={categoryQuery}
              onChangeText={setCategoryQuery}
              placeholder={store.translate("typeOrChooseCategory")}
              placeholderTextColor="#8995A7"
              style={{ color: colors.text, fontSize: 15, fontWeight: "800", minHeight: 50, paddingHorizontal: 14 }}
            />
            {categorySuggestions.map((item) => (
              <Pressable
                key={item.category}
                accessibilityRole="button"
                onPress={() => selectSuggestedCategory(item.category)}
                style={{
                  alignItems: "center",
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  minHeight: 48,
                  paddingHorizontal: 14
                }}
              >
                <Text style={{ color: colors.primaryDark, flex: 1, fontSize: 14, fontWeight: "800" }}>
                  {item.label}
                </Text>
                <Check color={colors.primary} size={18} strokeWidth={3} />
              </Pressable>
            ))}
            {categoryQuery.trim() && !categorySuggestions.some((item) => item.label.toLowerCase() === categoryQuery.trim().toLowerCase()) ? (
              <Pressable
                accessibilityRole="button"
                onPress={addInlineCustomCategory}
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  minHeight: 48,
                  justifyContent: "center",
                  paddingHorizontal: 14
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>
                  {store.translate("useCustomCategory")}: {categoryQuery.trim()}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCategoryPicker(true)}
            style={{
              alignItems: "center",
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 52,
              paddingHorizontal: 16
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>
              {store.translate("chooseCategories")}
            </Text>
          </Pressable>
          </View>
          </>
        ) : null}
        {currentStep === 1 ? (
          <>
        <StepHeader number={3} title={store.translate("postStepPlaceTime")} body={store.translate("postStepPlaceTimeBody")} />
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
            {store.translate("region")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {marketRegions.map((region) => (
              <AHButton
                key={region.code}
                label={region.label}
                tone={draft.state === region.code ? "primary" : "secondary"}
                onPress={() => selectRegion(region.code, region.defaultSuburb)}
              />
            ))}
          </View>
        </View>
        <TextField label={store.translate("suburb")} value={draft.suburb} onChangeText={(value) => update("suburb", value)} error={errors.suburb} />
        <PickerField
          label={store.translate("preferredDate")}
          value={draft.date}
          placeholder={todayString()}
          error={errors.date}
          icon={<CalendarDays color={colors.primary} size={20} />}
          onPress={openDatePicker}
        />
        <PickerField
          label={store.translate("preferredTime")}
          value={draft.time}
          placeholder={store.translate("after5pm")}
          error={errors.time}
          icon={<Clock color={colors.primary} size={20} />}
          onPress={openTimePicker}
        />
          </>
        ) : null}
        {currentStep === 2 ? (
          <>
        <StepHeader number={4} title={store.translate("postStepBudgetPhotos")} body={store.translate("postStepBudgetPhotosBody")} />
        <TextField
          label={store.translate("budget")}
          keyboardType="number-pad"
          value={draft.budget}
          onChangeText={(value) => update("budget", value)}
          placeholder="120"
          error={errors.budget}
        />
        <View style={{ gap: 10 }}>
          <SectionTitle title={store.translate("taskMedia")} subtitle={store.translate("taskMediaBody")} />
          <AHButton
            label={store.translate("choosePhotosOrVideos")}
            tone="secondary"
            loading={isPreparingMedia}
            disabled={(draft.photos || []).length >= MAX_TASK_MEDIA}
            onPress={pickMedia}
          />
          {(draft.photos || []).length ? (
            <View style={{ gap: 8 }}>
              <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                {(draft.photos || []).length} {store.translate("mediaSelected")}
              </Text>
              <MediaPreviewGrid
                media={(draft.photos || []).map((source) => mediaPreviews[source] || fallbackPreviewForSource(source))}
                onRemove={removeMedia}
                onMove={moveMedia}
              />
            </View>
          ) : null}
          <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            {store.translate("androidPostMediaMilestoneNote")}
          </Text>
        </View>
          </>
        ) : null}
        {currentStep === 3 ? (
          <>
        <StepHeader number={5} title={store.translate("postStepPreview")} body={store.translate("postStepPreviewBody")} />
        <TaskDraftPreview
          draft={{ ...draft, category: selectedCategories.join(", ") }}
          media={(draft.photos || []).map((source) => mediaPreviews[source] || fallbackPreviewForSource(source))}
          translate={store.translate}
          localizedCategory={store.localizedCategory}
        />
          </>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {currentStep > 0 ? (
            <View style={{ flex: 1 }}>
              <AHButton label={store.translate("back")} tone="secondary" icon={<ChevronLeft color={colors.primary} size={18} />} onPress={() => goToStep(currentStep - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {currentStep < 3 ? (
              <AHButton label={store.translate("next")} icon={<ChevronRight color={colors.surface} size={18} />} onPress={goNext} />
            ) : (
              <AHButton label={store.translate("publishTask")} tone="accent" disabled={!store.isAuthenticated} loading={store.isSubmitting} onPress={submit} />
            )}
          </View>
        </View>
      </Card>

      <CategoryPicker
        visible={showCategoryPicker}
        categories={availableCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onReset={() => setCategories([])}
        onClose={() => setShowCategoryPicker(false)}
        allowCustom
        customCategory={customCategory}
        onChangeCustomCategory={setCustomCategory}
        onAddCustomCategory={addCustomCategory}
      />
    </ScrollView>
    {challenge}
    </>
  );
}

function StepHeader({ body, number, title }: { body: string; number: number; title: string }) {
  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10 }}>
      <View style={{ alignItems: "center", backgroundColor: colors.accent, borderRadius: 999, height: 28, justifyContent: "center", width: 28 }}>
        <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
          {number}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function WizardStepper({ currentStep, translate }: { currentStep: number; translate: (key: string) => string }) {
  const labels = ["Details", "When", "Budget", "Preview"];
  return (
    <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, padding: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {labels.map((label, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View style={{ backgroundColor: isActive || isDone ? colors.accent : colors.surfaceAlt, borderRadius: 999, height: 6 }} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: isActive ? colors.text : colors.muted, fontSize: 11, fontWeight: "900", textAlign: "center" }}>
                {translate(label)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TaskDraftPreview({
  draft,
  localizedCategory,
  media,
  translate
}: {
  draft: TaskDraft;
  localizedCategory: (category: string) => string;
  media: PreparedMedia[];
  translate: (key: string) => string;
}) {
  const categories = draft.category.split(",").map((item) => item.trim()).filter(Boolean);
  const title = draft.title.trim() || translate("notSet");
  const description = draft.description.trim() || translate("notSet");
  const location = [draft.suburb, draft.state].filter(Boolean).join(" ") || translate("notSet");
  const timing = [draft.date, draft.time].filter(Boolean).join(" · ") || translate("notSet");
  const budget = draft.budget.trim() ? `$${draft.budget.trim()}` : translate("notSet");

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title={translate("taskPreview")} subtitle={translate("taskPreviewSubtitle")} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          borderWidth: 1,
          gap: 12,
          padding: 16
        }}
      >
        <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {categories.length ? categories.map((category) => (
                <View key={category} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: colors.text, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                    {localizedCategory(category)}
                  </Text>
                </View>
              )) : (
                <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                    {translate("category")}
                  </Text>
                </View>
              )}
            </View>
            <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>
              {title}
            </Text>
          </View>
          <Text selectable style={{ color: colors.primaryDark, fontSize: 18, fontWeight: "900" }}>
            {budget}
          </Text>
        </View>
        <Text selectable numberOfLines={4} style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
        {media.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {media.map((item) => (
              <View key={item.source} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 72, overflow: "hidden", width: 72 }}>
                {item.previewUri ? (
                  <Image source={{ uri: item.previewUri }} resizeMode="cover" style={{ height: "100%", width: "100%" }} />
                ) : (
                  <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
                    <ImageIcon color={colors.primary} size={24} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 6, paddingTop: 10 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
            {location}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
            {timing}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PickerField({
  error,
  icon,
  label,
  onPress,
  placeholder,
  value
}: {
  error?: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radii.control,
          borderWidth: 1,
          flexDirection: "row",
          gap: 10,
          minHeight: 46,
          paddingHorizontal: 12
        }}
      >
        {icon}
        <Text
          numberOfLines={1}
          style={{
            color: value ? colors.text : "#8995A7",
            flex: 1,
            fontSize: 15,
            fontWeight: value ? "800" : "500"
          }}
        >
          {value || placeholder}
        </Text>
      </Pressable>
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 12, fontWeight: "800", lineHeight: 17 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function MediaPreviewGrid({
  media,
  onRemove,
  onMove
}: {
  media: PreparedMedia[];
  onRemove: (source: string) => void;
  onMove: (source: string, direction: -1 | 1) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {media.map((item, index) => (
        <View
          key={item.source}
          style={{
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderRadius: radii.card,
            borderWidth: 1,
            overflow: "hidden",
            width: 104
          }}
        >
          <View style={{ aspectRatio: 1, backgroundColor: colors.surfaceWarm }}>
            {item.previewUri ? (
              <Image source={{ uri: item.previewUri }} resizeMode="cover" style={{ height: "100%", width: "100%" }} />
            ) : (
              <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
                <ImageIcon color={colors.primary} size={28} />
              </View>
            )}
          </View>
          <View style={{ gap: 8, padding: 8 }}>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
              {item.label}
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <MediaIconButton disabled={index === 0} icon={<ChevronLeft color={index === 0 ? colors.muted : colors.primary} size={16} strokeWidth={3} />} onPress={() => onMove(item.source, -1)} />
              <MediaIconButton
                disabled={index === media.length - 1}
                icon={<ChevronRight color={index === media.length - 1 ? colors.muted : colors.primary} size={16} strokeWidth={3} />}
                onPress={() => onMove(item.source, 1)}
              />
              <MediaIconButton icon={<X color={colors.danger} size={16} strokeWidth={3} />} onPress={() => onRemove(item.source)} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function MediaIconButton({ disabled, icon, onPress }: { disabled?: boolean; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: disabled ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.94)",
        borderColor: colors.border,
        borderRadius: 999,
        borderWidth: 1,
        height: 28,
        justifyContent: "center",
        opacity: disabled ? 0.55 : 1,
        width: 28
      }}
    >
      {icon}
    </Pressable>
  );
}

async function preparePickedMedia(asset: ImagePicker.ImagePickerAsset): Promise<PreparedMedia | null> {
  const mimeType = asset.mimeType || "image/jpeg";
  if (asset.type && asset.type !== "image") return null;
  if (!mimeType.startsWith("image/")) return null;
  return prepareImageMedia(asset);
}

async function prepareImageMedia(asset: ImagePicker.ImagePickerAsset): Promise<PreparedMedia | null> {
  const firstPass = await encodeImage(asset, 1600, 0.72);
  const encoded = firstPass && base64ByteLength(firstPass.base64) <= MAX_IMAGE_BYTES
    ? firstPass
    : await encodeImage(asset, 1200, 0.58);
  if (!encoded || base64ByteLength(encoded.base64) > MAX_IMAGE_BYTES) return null;
  return {
    label: asset.fileName || "Photo",
    previewUri: encoded.uri || asset.uri,
    source: `data:image/jpeg;base64,${encoded.base64}`,
    type: "image"
  };
}

async function encodeImage(asset: ImagePicker.ImagePickerAsset, width: number, compress: number) {
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width || width, width) } }],
    { base64: true, compress, format: ImageManipulator.SaveFormat.JPEG }
  );
  const base64 = result.base64 || asset.base64 || "";
  return base64 ? { base64, uri: result.uri } : null;
}

function fallbackPreviewForSource(source: string): PreparedMedia {
  return {
    label: mediaLabelForSource(source),
    previewUri: isPreviewableImageSource(source) ? source : undefined,
    source,
    type: "image"
  };
}

function isPreviewableImageSource(source: string) {
  const trimmed = source.trim().toLowerCase();
  if (trimmed.startsWith("data:image/")) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return /\.(png|jpe?g|webp|gif|heic)(\?|#|$)/i.test(trimmed);
}

function mediaLabelForSource(source: string) {
  const trimmed = source.trim();
  if (trimmed.startsWith("data:image/")) return "Photo";
  const clean = trimmed.split(/[?#]/)[0] || trimmed;
  return clean.split("/").filter(Boolean).pop() || "Photo";
}

function base64ByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function validateDraft(draft: TaskDraft, translate: (key: string) => string) {
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.title = translate("requiredField");
  if (draft.description.trim().length < 10) errors.description = translate("descriptionTooShort");
  if (!draft.category.trim()) errors.category = translate("categoryRequired");
  if (!draft.suburb.trim()) errors.suburb = translate("requiredField");
  if (!Number.isFinite(Number(draft.budget)) || Number(draft.budget) <= 0) errors.budget = translate("budgetRequired");
  if (!draft.date.trim()) {
    errors.date = translate("dateRequired");
  } else if (isPastDate(draft.date)) {
    errors.date = translate("pastDateNotAllowed");
  }
  if (!draft.time.trim()) errors.time = translate("timeRequired");
  return errors;
}

function PostProgress({ draft, selectedCategories }: { draft: TaskDraft; selectedCategories: string[] }) {
  const store = useAppStore();
  const steps = [
    Boolean(draft.title.trim() && draft.description.trim().length >= 10),
    Boolean(selectedCategories.length),
    Boolean(draft.suburb.trim() && draft.state.trim() && draft.date.trim() && draft.time.trim()),
    Boolean(Number(draft.budget) > 0),
    Boolean((draft.photos || []).length || (draft.title && draft.description && Number(draft.budget) > 0))
  ];
  const completed = steps.filter(Boolean).length;
  const labels = [
    store.translate("details"),
    store.translate("categories"),
    store.translate("location"),
    store.translate("budgetLabel"),
    store.translate("review")
  ];

  return (
    <Card>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
          {store.translate("postTask")}
        </Text>
        <Text selectable style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>
          {completed}/5
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {steps.map((done, index) => (
          <View key={index} style={{ alignItems: "center", flex: 1, gap: 6 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: done ? colors.accent : colors.surfaceAlt,
                borderColor: done ? colors.accent : colors.border,
                borderRadius: 999,
                borderWidth: 1,
                height: 28,
                justifyContent: "center",
                width: 28
              }}
            >
              <Text style={{ color: done ? colors.text : colors.muted, fontSize: 12, fontWeight: "900" }}>{index + 1}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: done ? colors.text : colors.muted, fontSize: 10, fontWeight: "800" }}>
              {labels[index]}
            </Text>
          </View>
        ))}
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 17 }}>
        {store.translate("postStepBasics")} · {store.translate("postStepCategory")} · {store.translate("location")} · {store.translate("budgetLabel")}
      </Text>
    </Card>
  );
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultTime() {
  const date = new Date();
  date.setHours(17, 0, 0, 0);
  return date;
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function parseTime(value: string) {
  const trimmed = value.trim().toLowerCase();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/.exec(trimmed);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return null;
  if (match[3] === "pm" && hours < 12) hours += 12;
  if (match[3] === "am" && hours === 12) hours = 0;
  if (hours > 23) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function isPastDate(value: string) {
  const trimmed = value.trim();
  if (/^(flexible|anytime|tomorrow)$/i.test(trimmed)) return false;
  const parsed = parseDate(trimmed);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function parseDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
