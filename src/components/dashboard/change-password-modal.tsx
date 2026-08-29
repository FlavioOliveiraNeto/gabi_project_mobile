import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, ErrorText, Field, Sheet, apiErrorMessage, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { changePasswordRequest } from '@/services/auth';

export default function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { clearAuthState } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function close() {
    if (isLoading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    setError('');

    if (newPassword !== confirmPassword) return setError('As senhas não coincidem.');
    if (newPassword.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');

    setIsLoading(true);
    try {
      await changePasswordRequest(currentPassword, newPassword, confirmPassword);
      clearAuthState();
      router.replace('/login');
    } catch (e) {
      setError(apiErrorMessage(e, 'Erro ao trocar a senha. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      <Text style={s.title}>Trocar senha</Text>
      <Text style={[s.muted, { marginTop: 4, marginBottom: 18 }]}>
        Confirme sua senha atual e defina uma nova.
      </Text>

      <Field
        label="Senha atual"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
      />
      <Field
        label="Nova senha"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="Mínimo 6 caracteres"
      />
      <Field
        label="Confirme a nova senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <ErrorText>{error}</ErrorText>

      <View style={s.actions}>
        <Btn title="Cancelar" variant="outline" onPress={close} style={{ flex: 1 }} />
        <Btn title="Trocar senha" loading={isLoading} onPress={handleSubmit} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}
