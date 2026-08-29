import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBtn, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { formatFull } from '@/lib/date';
import { useAuth } from '@/lib/auth';

import ChangePasswordModal from './change-password-modal';

export default function AppHeader({ greeting }: { greeting: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.h2} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={[s.muted, { marginTop: 2 }]}>{formatFull(new Date())}</Text>
        </View>

        <View style={s.row}>
          <IconBtn name="key-outline" label="Trocar senha" onPress={() => setShowChangePassword(true)} />
          <IconBtn name="log-out-outline" label="Sair" onPress={handleLogout} />
        </View>
      </View>

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </View>
  );
}
