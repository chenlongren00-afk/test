import { useIAP, type ProductSubscription, type Purchase } from "expo-iap";
import * as React from "react";
import { Platform, Text, View } from "react-native";

import { api, ApiError } from "@/api/client";
import { AHButton, Card, StatusBanner } from "@/components/ui";
import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

const googlePlayProSkus = [
  process.env.EXPO_PUBLIC_GOOGLE_PLAY_PRO_MONTHLY_SKU || "pro_monthly",
  process.env.EXPO_PUBLIC_GOOGLE_PLAY_PRO_YEARLY_SKU || "pro_yearly"
];

export function NativeGooglePlayProPanel({ isActive }: { isActive: boolean }) {
  const store = useAppStore();
  const [selectedSku, setSelectedSku] = React.useState(googlePlayProSkus[0]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const finishTransactionRef = React.useRef<((input: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>) | null>(null);

  const iap = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (Platform.OS !== "android") return;
      const purchaseToken = purchase.purchaseToken || "";
      const productId = purchase.productId || selectedSku;
      if (!store.token) {
        setNotice(store.translate("loginBeforeProPurchase"));
        return;
      }
      if (!purchaseToken) {
        setNotice(store.translate("googlePlayMissingToken"));
        return;
      }
      setIsPurchasing(true);
      setNotice(store.translate("verifyingGooglePlayPurchase"));
      try {
        const payload = await api.activateGooglePlayPro(store.token, {
          productId,
          purchaseToken,
          transactionId: purchase.transactionId || purchase.id || "",
          packageName: androidPackageName(purchase),
          purchaseState: purchase.purchaseState || "purchased",
          isAutoRenewing: purchase.isAutoRenewing
        });
        await finishTransactionRef.current?.({ purchase, isConsumable: false });
        await store.refreshAll();
        setNotice(payload.user?.proStatus === "active" ? store.translate("googlePlayProActive") : store.translate("googlePlayPurchaseSubmitted"));
      } catch (error) {
        setNotice(messageFor(error, store.translate("googlePlayVerificationFailed")));
      } finally {
        setIsPurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      setIsPurchasing(false);
      setNotice(error.message || store.translate("googlePlayPurchaseFailed"));
    },
    onError: (error) => {
      setNotice(error.message || store.translate("googlePlayBillingUnavailable"));
    }
  });

  React.useEffect(() => {
    finishTransactionRef.current = iap.finishTransaction;
  }, [iap.finishTransaction]);

  React.useEffect(() => {
    if (!iap.connected) return;
    iap.fetchProducts({ skus: googlePlayProSkus, type: "subs" }).catch((error) => {
      setNotice(error.message || store.translate("googlePlayBillingUnavailable"));
    });
  }, [iap, store]);

  const products = googlePlayProSkus
    .map((sku) => iap.subscriptions.find((item) => item.id === sku))
    .filter(Boolean) as ProductSubscription[];
  const selectedProduct = products.find((item) => item.id === selectedSku) || products[0] || null;
  const selectedOffer = selectedProduct?.subscriptionOffers?.[0] || null;
  const canPurchase = store.isAuthenticated && iap.connected && Boolean(selectedProduct) && !isActive;

  async function startPurchase() {
    if (!store.isAuthenticated) {
      setNotice(store.translate("loginBeforeProPurchase"));
      return;
    }
    if (!selectedProduct) {
      setNotice(store.translate("googlePlayProductUnavailable"));
      return;
    }
    setIsPurchasing(true);
    setNotice(store.translate("openingGooglePlayBilling"));
    try {
      await iap.requestPurchase({
        type: "subs",
        request: {
          google: {
            skus: [selectedProduct.id],
            subscriptionOffers: selectedOffer?.offerTokenAndroid
              ? [{ sku: selectedProduct.id, offerToken: selectedOffer.offerTokenAndroid }]
              : undefined,
            obfuscatedAccountId: store.currentUser?.id || undefined
          }
        }
      });
    } catch (error) {
      setIsPurchasing(false);
      setNotice(messageFor(error, store.translate("googlePlayPurchaseFailed")));
    }
  }

  if (isActive) return null;

  return (
    <Card>
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
        {store.translate("chooseProPlan")}
      </Text>
      {products.length ? (
        <View style={{ gap: 10 }}>
          {products.map((product) => (
            <AHButton
              key={product.id}
              tone={selectedSku === product.id ? "primary" : "secondary"}
              label={`${product.title || planLabel(product.id, store.translate)} · ${product.displayPrice || store.translate("pricePending")}`}
              onPress={() => setSelectedSku(product.id)}
            />
          ))}
        </View>
      ) : (
        <StatusBanner message={iap.connected ? store.translate("googlePlayProductsLoading") : store.translate("googlePlayBillingUnavailable")} />
      )}
      <AHButton
        label={isPurchasing ? store.translate("processingPayment") : store.translate("upgradePro")}
        loading={isPurchasing}
        disabled={!canPurchase || isPurchasing}
        onPress={startPurchase}
      />
      {!store.isAuthenticated ? <StatusBanner tone="error" message={store.translate("loginBeforeProPurchase")} /> : null}
      {notice ? <StatusBanner message={notice} /> : null}
    </Card>
  );
}

function messageFor(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function planLabel(productId: string, translate: (key: string) => string) {
  return productId.includes("year") ? translate("yearly") : translate("monthly");
}

function androidPackageName(purchase: Purchase) {
  return "packageNameAndroid" in purchase && purchase.packageNameAndroid
    ? purchase.packageNameAndroid
    : "com.australianhelper.app";
}
