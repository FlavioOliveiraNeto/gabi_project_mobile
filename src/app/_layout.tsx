import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { AuthProvider, homeRoute, useAuth } from '@/lib/auth';

function Gate({ children }: { children: React.ReactNode }) {
  const { user, isBooting } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const current: string = segments[0] ?? 'index';

  useEffect(() => {
    if (isBooting) return;

    const isPublic = current === 'login' || current === 'reset-senha';

    if (!user) {
      if (!isPublic) router.replace('/login');
      return;
    }

    if (user.role === 'client' && user.must_change_password) {
      if (current !== 'trocar-senha' && current !== 'reset-senha') router.replace('/trocar-senha');
      return;
    }

    const expected = user.role === 'therapist' ? 'terapeuta' : 'paciente';
    if (current === 'login' || current === 'index') router.replace(homeRoute(user));
    else if ((current === 'terapeuta' || current === 'paciente') && current !== expected)
      router.replace(homeRoute(user));
  }, [user, isBooting, current, router]);

  if (isBooting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />
        </Gate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
