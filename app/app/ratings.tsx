import * as React from "react";
import { Text, View } from "react-native";
import { Star } from "lucide-react-native";

import { ParityScreen, StatRow } from "@/components/ParityScreen";
import { Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors, spacing } from "@/theme/colors";
import type { Review, TaskReview } from "@/types/marketplace";

export default function RatingsRoute() {
  const store = useAppStore();
  const taskerReviews = store.currentUser?.reviews || [];
  const helperReviews = store.currentHelper?.reviews || [];
  const authoredReviews = (store.state.taskReviews || []).filter((review) => (
    store.currentAccountUserIds.includes(review.authorUserId)
  ));

  return (
    <ParityScreen titleKey="ratingsReviews" subtitle={store.translate("ratingsReviewsSubtitle")}>
      <RatingSummary
        title={store.translate("taskerRating")}
        rating={Number(store.currentUser?.rating || 0)}
        reviewCount={Number(store.currentUser?.reviewCount ?? taskerReviews.length)}
      />
      <ReviewSection title={store.translate("taskerReviews")} reviews={taskerReviews} emptyText={store.translate("noTaskerReviewsYet")} />

      {store.currentHelper ? (
        <>
          <RatingSummary
            title={store.translate("helperRating")}
            rating={Number(store.currentHelper.rating || 0)}
            reviewCount={Number(store.currentHelper.reviewCount ?? helperReviews.length)}
          />
          <ReviewSection title={store.translate("helperReviews")} reviews={helperReviews} emptyText={store.translate("noHelperReviewsYet")} />
        </>
      ) : (
        <StatusBanner message={store.translate("noHelperProfileYet")} />
      )}

      <AuthoredReviewSection reviews={authoredReviews} />
    </ParityScreen>
  );
}

function RatingSummary({ title, rating, reviewCount }: { title: string; rating: number; reviewCount: number }) {
  const store = useAppStore();
  return (
    <Card>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.gap }}>
        <Star color={colors.accent} fill={colors.accent} size={28} />
        <View style={{ flex: 1 }}>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
            {title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
            {store.translate("reviewsReceived")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text selectable style={{ color: colors.primary, fontSize: 24, fontWeight: "900" }}>
            {rating > 0 ? rating.toFixed(1) : "-"}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
            {reviewCount} {reviewCount === 1 ? store.translate("review") : store.translate("reviews")}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function ReviewSection({ title, reviews, emptyText }: { title: string; reviews: Review[]; emptyText: string }) {
  return (
    <Card>
      <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
        {title}
      </Text>
      {reviews.length ? (
        reviews.map((review) => <PublicReviewRow key={review.id} review={review} />)
      ) : (
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
          {emptyText}
        </Text>
      )}
    </Card>
  );
}

function PublicReviewRow({ review }: { review: Review }) {
  return (
    <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: "900" }}>
          {review.authorName}
        </Text>
        <Text selectable style={{ color: colors.accent, fontSize: 13, fontWeight: "900" }}>
          {Number(review.rating || 0).toFixed(1)} ★
        </Text>
      </View>
      {review.taskTitle ? (
        <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
          {review.taskTitle}
        </Text>
      ) : null}
      {review.comment ? (
        <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          {review.comment}
        </Text>
      ) : null}
    </View>
  );
}

function AuthoredReviewSection({ reviews }: { reviews: TaskReview[] }) {
  const store = useAppStore();
  return (
    <Card>
      <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
        {store.translate("reviewsWritten")}
      </Text>
      {reviews.length ? (
        reviews.map((review) => (
          <View key={review.id} style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
            <StatRow label={review.targetName || store.translate(review.targetRole === "helper" ? "helperRole" : "poster")} value={`${Number(review.rating || 0).toFixed(1)} ★`} />
            <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
              {review.taskTitle}
            </Text>
            {review.comment ? (
              <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                {review.comment}
              </Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>
          {store.translate("noSubmittedReviewsYet")}
        </Text>
      )}
    </Card>
  );
}
