import { Tabs } from "expo-router";
import { BriefcaseBusiness, Home, MessageCircle, Plus, UserCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppStore } from "@/state/app-store";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  const store = useAppStore();
  const insets = useSafeAreaInsets();
  const unreadMessages = store.threads.reduce((total, thread) => total + Number(thread.unreadCount || 0), 0);
  const unreadNotifications = store.state.notifications.filter((item) => !item.read && tabActionPriority(item) > 0).length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "900" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarBadgeStyle: {
          backgroundColor: colors.accent,
          color: colors.text,
          fontSize: 11,
          fontWeight: "900"
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
          shadowColor: colors.text,
          shadowOffset: { height: -4, width: 0 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: store.translate("home"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: store.translate("browse"),
          tabBarIcon: ({ color, size }) => <BriefcaseBusiness color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: store.translate("post"),
          tabBarIcon: ({ color }) => <Plus color={color} size={28} strokeWidth={3} />
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: store.translate("messages"),
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: store.translate("account"),
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />
        }}
      />
    </Tabs>
  );
}

function tabActionPriority(item: { type?: string; title?: string; body?: string }) {
  const normalized = `${item.type || ""} ${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (/payment|release|payout|refund|counter|offer|message|review|approve|verification|dispute|cancel/.test(normalized)) return 1;
  return 0;
}
