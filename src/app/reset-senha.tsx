import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Btn, Field, apiErrorMessage, s } from '@/components/ui';
import { confirmPasswordReset } from '@/services/auth';

import { SuccessPanel, useLoginCountdown } from './trocar-senha';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const countdown = useLoginCountdown(success);

  useEffect(() => {
    if (countdown === 0) router.replace('/login');
  }, [countdown, router]);

  async function handleReset() {
    setError('');

    if (newPassword !== confirmPassword) return setError('As senhas não coincidem.');
    if (newPassword.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (!token) return;

    setIsLoading(true);
    try {
      await confirmPasswordReset(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Link de recuperação inválido ou expirado. Solicite um novo.'));
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <View style={[s.screen, { justifyContent: 'center', padding: 20 }]}>
        <View style={[s.card, { padding: 24, gap: 16 }]}>
          <Text style={[s.title, { textAlign: 'center' }]}>Link inválido</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            O link de recuperação está incompleto ou expirado.
          </Text>
          <Btn title="Voltar ao login" onPress={() => router.replace('/login')} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={[s.card, { padding: 24 }]}>
          {success ? (
            <SuccessPanel
              title="Senha redefinida!"
              message="Sua senha foi alterada com sucesso. Faça login com a nova senha."
              countdown={countdown}
            />
          ) : (
            <>
              <Text style={[s.h2, { textAlign: 'center' }]}>Redefinir senha</Text>
              <Text style={[s.muted, { textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>
                Crie uma nova senha para sua conta
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

              {error ? <Text style={[s.error, { marginBottom: 14 }]}>{error}</Text> : null}

              <Btn title="Definir nova senha" loading={isLoading} onPress={handleReset} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
