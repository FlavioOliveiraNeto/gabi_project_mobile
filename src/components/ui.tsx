import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { C } from '@/constants/theme';

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.card,
    padding: 16,
  },
  title: { fontSize: 20, color: C.foreground, fontWeight: '600' },
  h2: { fontSize: 22, color: C.primary, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '500', color: C.foreground, marginBottom: 6 },
  muted: { fontSize: 13, color: C.mutedForeground },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.foreground,
    backgroundColor: C.card,
  },
  error: {
    fontSize: 13,
    color: C.destructive,
    textAlign: 'center',
    backgroundColor: C.destructiveSurface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  chip: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: C.muted,
    color: C.mutedForeground,
  },
  chipAccent: { backgroundColor: C.secondarySurface, color: C.secondary, fontWeight: '600' },
});

export function ErrorText({
  children,
  marginBottom = 14,
}: {
  children?: string | null;
  marginBottom?: number;
}) {
  if (!children) return null;
  return (
    <Text accessibilityLiveRegion="polite" role="alert" style={[s.error, { marginBottom }]}>
      {children}
    </Text>
  );
}

export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.mutedForeground}
        {...props}
        style={[s.input, error ? { borderColor: C.destructive } : null, style]}
      />
      {error ? <Text style={{ fontSize: 12, color: C.destructive, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

type BtnVariant = 'primary' | 'outline' | 'destructive';

export function Btn({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: BtnVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const bg =
    variant === 'primary' ? C.primary : variant === 'destructive' ? C.destructive : 'transparent';
  const fg = variant === 'outline' ? C.foreground : C.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: off, busy: Boolean(loading) }}
      disabled={off}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      style={[
        {
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: C.border,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: 'center',
          opacity: off ? 0.5 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function IconBtn({
  name,
  color = C.mutedForeground,
  size = 20,
  onPress,
  label,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  size?: number;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={{ padding: 6 }}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function TapRow({
  onPress,
  label,
  children,
  style,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={[s.row, { gap: 4, paddingVertical: 4 }, style]}>
      {children}
    </Pressable>
  );
}

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: C.scrim,
            justifyContent: 'center',
            padding: 16,
          }}>
          {/* Pressable interno evita que o toque no conteúdo feche o modal. */}
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: C.card, borderRadius: 18, padding: 20, maxHeight: '85%' }}>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function initials(name?: string): string {
  if (!name) return '?';
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { errors?: unknown; error?: unknown } };
  };
  const data = e?.response?.data;
  if (Array.isArray(data?.errors)) return data.errors.join(', ');
  if (typeof data?.error === 'string') return data.error;
  if (!e?.response) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  if (e.response.status === 403) return 'Você não tem permissão para esta ação.';
  if (e.response.status === 404) return 'Registro não encontrado. Atualize a tela.';
  if (e.response.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  if ((e.response.status ?? 0) >= 500) return 'O servidor falhou. Tente novamente em instantes.';
  return fallback;
}
