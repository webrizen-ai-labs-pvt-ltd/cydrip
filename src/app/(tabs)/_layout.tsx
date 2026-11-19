import { Tabs } from 'expo-router/js-tabs';

import { ChartIcon, ListIcon, RideIcon } from '@/components/Icons';
import { useActiveRide } from '@/lib/tracker';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  // During a ride the whole screen belongs to the dashboard: no tabs to bump by accident.
  const riding = useActiveRide() != null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.paper,
        tabBarInactiveTintColor: colors.fog,
        tabBarStyle: riding
          ? { display: 'none' }
          : { backgroundColor: colors.ink, borderTopColor: colors.kerb, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Go', tabBarIcon: ({ color }) => <RideIcon color={color} size={22} /> }} />
      <Tabs.Screen name="history" options={{ title: 'Activity', tabBarIcon: ({ color }) => <ListIcon color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ color }) => <ChartIcon color={color} /> }} />
    </Tabs>
  );
}
