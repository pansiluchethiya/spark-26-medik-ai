import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function App() {
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    setColorScheme('system');
  }, [setColorScheme]);

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-[#121c19]">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-accent dark:bg-[#257d6e]">
        <Text className="text-3xl font-extrabold text-white">M</Text>
      </View>
      <Text className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent dark:text-accent-bright">
        Medik Triage
      </Text>
      <Text className="mt-2 text-center text-2xl font-extrabold text-ink dark:text-[#e8f0ee]">
        Mobile app scaffold
      </Text>
      <Text className="mt-2 text-center text-sm text-muted dark:text-[#9eb5ae]">
        Theme + API client are in. Chat UI lands in Phase 2.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
