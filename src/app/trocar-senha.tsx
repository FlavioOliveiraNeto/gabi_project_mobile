import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Btn, ErrorText, Field, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { forcedChangePasswordRequest } from '@/services/auth';

export function useLoginCountdown(active: boolean): number {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [active]);

  return countdown;
}

export function SuccessPanel({
  title,
  message,
  countdown,
}: {
  title: string;
  message: string;
  countdown: number;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Ionicons name="checkmark-circle" size={48} color={C.green} />
      <Text style={s.title}>{title}</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>{message}</Text>
      <Text style={[s.muted, { fontSize: 12 }]}>Redirecionando em {countdown}s...</Text>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { clearAuthState } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const countdown = useLoginCountdown(success);

  useEffect(() => {
    if (countdown === 0) router.replace('/login');
  }, [countdown, router]);

  async function handleChangePassword() {
    setError('');

    if (newPassword !== confirmPassword) return setError('As senhas não coincidem.');
    if (newPassword.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');

    setIsLoading(true);
    try {
      await forcedChangePasswordRequest(newPassword, confirmPassword);
      clearAuthState();
      setSuccess(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Erro ao trocar a senha. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={[s.card, { padding: 24 }]}>
          {success ? (
            <SuccessPanel
              title="Senha alterada com sucesso!"
              message="Por segurança, faça login novamente com sua nova senha."
              countdown={countdown}
            />
          ) : (
            <>
              <Text style={[s.h2, { textAlign: 'center' }]}>Trocar senha</Text>
              <Text style={[s.muted, { textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>
                Crie uma senha pessoal para continuar
              </Text>

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
                placeholder="Repita a senha"
              />

              <ErrorText>{error}</ErrorText>

              <Btn title="Definir nova senha" loading={isLoading} onPress={handleChangePassword} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
