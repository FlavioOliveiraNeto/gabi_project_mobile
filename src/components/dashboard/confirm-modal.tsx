import { useState } from 'react';
import { Text, View } from 'react-native';

import { apiErrorMessage, Btn, ErrorText, Sheet, s } from '@/components/ui';
import { C } from '@/constants/theme';

export default function ConfirmModal({
  visible,
  title,
  message,
  details,
  confirmLabel,
  destructive = true,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title?: string;
  message: string;
  details?: [string, string][];
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (isLoading) return;
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível concluir. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      {title ? <Text style={[s.title, { marginBottom: 8 }]}>{title}</Text> : null}
      <Text style={[s.muted, { marginBottom: 16 }]}>{message}</Text>

      {details?.length ? (
        <View style={{ marginBottom: 20, gap: 4 }}>
          {details.map(([k, v]) => (
            <Text key={k} style={{ color: C.foreground }}>
              {k}: {v}
            </Text>
          ))}
        </View>
      ) : null}

      <ErrorText>{error}</ErrorText>

      <View style={s.actions}>
        <Btn title="Voltar" variant="outline" onPress={close} style={{ flex: 1 }} />
        <Btn
          title={confirmLabel}
          loading={isLoading}
          variant={destructive ? 'destructive' : 'primary'}
          onPress={handleConfirm}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}
