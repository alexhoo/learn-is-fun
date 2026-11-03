import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from '../store';
import { colors } from '../theme';

export default function RootLayout() {
  const ready = useGameStore((s) => s.ready);
  const init = useGameStore((s) => s.init);
  const hasProfile = useGameStore((s) => s.activeProfileId !== null);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {ready ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            {/* Con un perfil activo: mapa y lecciones. Sin perfil: selector y alta. */}
            <Stack.Protected guard={hasProfile}>
              <Stack.Screen name="index" />
              <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
            </Stack.Protected>
            <Stack.Protected guard={!hasProfile}>
              <Stack.Screen name="profiles" />
              <Stack.Screen name="profile-new" options={{ presentation: 'modal' }} />
            </Stack.Protected>
          </Stack>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
