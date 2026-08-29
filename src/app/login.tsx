import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Btn, ErrorText, Field, IconBtn, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { homeRoute, useAuth } from '@/lib/auth';
import { requestPasswordReset } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  async function handleSubmit() {
    try {
      const user = await login(email.trim(), password);
      router.replace(homeRoute(user));
    } catch (error) {
      console.log(error)
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      await requestPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    } catch (e) {
      setForgotError(apiErrorMessage(e, 'Não foi possível enviar o e-mail. Tente novamente.'));
    } finally {
      setForgotLoading(false);
    }
  }

  function backToLogin() {
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail('');
    setForgotError('');
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={[s.card, { padding: 24 }]}>
          <Text style={[s.h2, { textAlign: 'center' }]}>Gabi</Text>
          <Text style={[s.muted, { textAlign: 'center', marginTop: 4, marginBottom: 24 }]}>
            {showForgot ? 'Recuperar senha' : 'Acesse sua área administrativa'}
          </Text>

          {showForgot ? (
            forgotSent ? (
              <View style={{ gap: 16 }}>
                <Text style={[s.muted, { textAlign: 'center' }]}>
                  Se o e-mail {forgotEmail} estiver cadastrado, você receberá as instruções de
                  recuperação.
                </Text>
                <Btn title="Voltar ao login" variant="outline" onPress={backToLogin} />
              </View>
            ) : (
              <View>
                <Field
                  label="E-mail"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="seu@email.com"
                />
                <ErrorText marginBottom={12}>{forgotError}</ErrorText>
                <Btn
                  title="Enviar link de recuperação"
                  loading={forgotLoading}
                  onPress={handleForgotPassword}
                />
                <Pressable onPress={backToLogin} style={{ marginTop: 14, alignItems: 'center' }}>
                  <Text style={s.muted}>Voltar ao login</Text>
                </Pressable>
              </View>
            )
          ) : (
            <View>
              <ErrorText>{error}</ErrorText>

              <Field
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="seu@email.com"
              />

              <Text style={s.label}>Senha</Text>
              <View style={{ justifyContent: 'center' }}>
                <Field
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••••••"
                  style={{ paddingRight: 44 }}
                />
                <View style={{ position: 'absolute', right: 6, top: 2 }}>
                  <IconBtn
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                </View>
              </View>

              <Pressable onPress={() => setShowForgot(true)} style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, color: C.primary }}>Esqueceu a senha?</Text>
              </Pressable>

              <Btn title="Entrar" loading={isLoading} onPress={handleSubmit} />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
