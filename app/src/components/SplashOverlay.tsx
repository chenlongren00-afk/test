import * as React from "react";
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, Text, View } from "react-native";

import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

type SplashOverlayProps = {
  onDone?: () => void;
};

export function SplashOverlay({ onDone }: SplashOverlayProps) {
  const store = useAppStore();
  const [logo] = React.useState(() => new Animated.Value(0));
  const [wordmark] = React.useState(() => new Animated.Value(0));
  const [pulse] = React.useState(() => new Animated.Value(0));
  const [fade] = React.useState(() => new Animated.Value(1));

  React.useEffect(() => {
    let mounted = true;
    const fallbackTimer = setTimeout(() => {
      if (mounted) onDone?.();
    }, Platform.OS === "web" ? 1200 : 2600);

    async function run() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();

      Animated.spring(logo, {
        damping: 8,
        mass: 0.7,
        stiffness: 82,
        toValue: 1,
        useNativeDriver: true
      }).start();

      if (!reduceMotion) {
        Animated.loop(
          Animated.timing(pulse, {
            delay: 420,
            duration: 1050,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true
          })
        ).start();
      } else {
        pulse.setValue(1);
      }

      Animated.sequence([
        Animated.delay(380),
        Animated.timing(wordmark, {
          duration: 450,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(850),
        Animated.timing(fade, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ]).start(() => {
        if (mounted) onDone?.();
      });
    }

    run();
    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [fade, logo, onDone, pulse, wordmark]);

  const logoScale = logo.interpolate({
    inputRange: [0, 1],
    outputRange: [0.74, 1]
  });
  const logoRotate = logo.interpolate({
    inputRange: [0, 1],
    outputRange: ["-5deg", "0deg"]
  });
  const wordmarkTranslate = wordmark.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0]
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 1.95]
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 0]
  });

  return (
    <Animated.View
      accessibilityLabel={`${store.translate("helper")}, ${store.translate("slogan")}`}
      pointerEvents="none"
      style={[styles.container, { opacity: fade }]}
    >
      <View style={styles.content}>
        <View style={styles.logoStage}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.pulse,
                {
                  opacity: pulseOpacity,
                  transform: [
                    { translateX: 18 },
                    { translateY: 30 },
                    { scale: pulseScale }
                  ]
                }
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logo,
                transform: [{ scale: logoScale }, { rotate: logoRotate }]
              }
            ]}
          >
            <Image source={require("../../assets/splash-logo.png")} style={styles.logo} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.words,
            {
              opacity: wordmark,
              transform: [{ translateY: wordmarkTranslate }]
            }
          ]}
        >
          <Text style={styles.title}>{store.translate("helper")}</Text>
          <Text style={styles.subtitle}>{store.translate("slogan")}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    alignItems: "center",
    backgroundColor: colors.splashTeal,
    justifyContent: "center",
    zIndex: 1000
  },
  content: {
    alignItems: "center",
    gap: 18,
    transform: [{ translateY: -22 }]
  },
  logo: {
    height: 164,
    resizeMode: "contain",
    width: 164
  },
  logoStage: {
    alignItems: "center",
    height: 188,
    justifyContent: "center",
    width: 188
  },
  logoWrap: {
    shadowColor: "#000000",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 16
  },
  pulse: {
    borderColor: "rgba(242,160,20,0.48)",
    borderRadius: 21,
    borderWidth: 3,
    height: 42,
    position: "absolute",
    width: 42
  },
  subtitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  title: {
    color: colors.surface,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 48,
    textAlign: "center"
  },
  words: {
    alignItems: "center",
    gap: 7
  }
});
