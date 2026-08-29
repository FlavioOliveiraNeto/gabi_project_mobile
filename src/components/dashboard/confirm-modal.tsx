import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Sheet, s } from '@/components/ui';
import { C } from '@/constants/theme';

export default function ConfirmModal({
  visible,
  title,
  message,
  details,
  confirmLabel,
  loadingLabel,
  destructive = true,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title?: string;
  message: string;
  details?: [string, string][];
  confirmLabel: string;
  loadingLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  function close() {
    if (!isLoading) onClose();
  }

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onClose();
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

      <View style={[s.row, { gap: 12 }]}>
        <Btn title="Voltar" variant="outline" onPress={close} style={{ flex: 1 }} />
        <Btn
          title={isLoading ? loadingLabel : confirmLabel}
          loading={isLoading}
          variant={destructive ? 'destructive' : 'primary'}
          onPress={handleConfirm}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}
