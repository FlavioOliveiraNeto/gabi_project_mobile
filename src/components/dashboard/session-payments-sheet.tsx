import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Btn, ErrorText, Sheet, TapRow, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { formatMonthYear, formatWeekdayShort, parseDate } from '@/lib/date';
import { markSessionsPaid, type CalendarSession } from '@/services/dashboard';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Aguardando',
  completed: 'Realizada',
  absent: 'Falta',
  cancelled: 'Cancelada',
};

/** Sessões cobráveis: cancelada não se paga. */
export const payableSessions = (sessions: CalendarSession[]) =>
  sessions.filter((x) => x.status !== 'cancelled');

/** Montado apenas enquanto aberto: o estado inicial vem das props, sem efeito. */
export default function SessionPaymentsSheet({
  patientName,
  sessions,
  onClose,
  onSaved,
}: {
  patientName: string;
  sessions: CalendarSession[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const months = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    payableSessions(sessions)
      .slice()
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
      .forEach((x) => {
        const key = x.date.slice(0, 7);
        const list = map.get(key) ?? [];
        list.push(x);
        map.set(key, list);
      });
    return [...map.entries()];
  }, [sessions]);

  // Seleção começa no estado atual: salvar aplica a diferença nos dois sentidos.
  const [picked, setPicked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(payableSessions(sessions).map((x) => [x.id, x.paid])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setMany = (list: CalendarSession[], paid: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      list.forEach((x) => (next[x.id] = paid));
      return next;
    });

  const changed = payableSessions(sessions).filter((x) => Boolean(picked[x.id]) !== x.paid);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const toPay = changed.filter((x) => picked[x.id]).map((x) => x.id);
      const toUnpay = changed.filter((x) => !picked[x.id]).map((x) => x.id);
      if (toPay.length) await markSessionsPaid(toPay, true);
      if (toUnpay.length) await markSessionsPaid(toUnpay, false);
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar os pagamentos.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible onClose={onClose}>
      <Text style={s.title}>Pagamentos</Text>
      <Text style={[s.muted, { fontSize: 12, marginBottom: 12 }]} numberOfLines={1}>
        {patientName}
      </Text>

      <ErrorText>{error}</ErrorText>

      <ScrollView style={{ maxHeight: 360 }}>
        {months.length === 0 ? (
          <Text style={[s.muted, { textAlign: 'center', paddingVertical: 16 }]}>
            Nenhuma sessão a cobrar neste período.
          </Text>
        ) : (
          months.map(([key, list]) => {
            const allPicked = list.every((x) => picked[x.id]);
            return (
              <View key={key} style={{ marginBottom: 12 }}>
                <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.foreground }}>
                    {formatMonthYear(parseDate(`${key}-01`))}
                  </Text>
                  <TapRow
                    label={
                      allPicked
                        ? 'Desmarcar o mês inteiro'
                        : 'Marcar o mês inteiro como pago'
                    }
                    onPress={() => setMany(list, !allPicked)}>
                    <Text style={{ fontSize: 12, color: C.primary, fontWeight: '600' }}>
                      {allPicked ? 'Desmarcar mês' : 'Marcar mês'}
                    </Text>
                  </TapRow>
                </View>

                {list.map((x) => {
                  const on = Boolean(picked[x.id]);
                  return (
                    <TapRow
                      key={x.id}
                      label={`${formatWeekdayShort(parseDate(x.date))} às ${x.time}, ${on ? 'pago' : 'em aberto'}`}
                      onPress={() => setPicked((prev) => ({ ...prev, [x.id]: !on }))}
                      style={{
                        gap: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 10,
                        backgroundColor: on ? C.primarySurface : 'transparent',
                      }}>
                      <Ionicons
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={on ? C.green : C.mutedForeground}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, color: C.foreground }} numberOfLines={1}>
                          {formatWeekdayShort(parseDate(x.date))} às {x.time}
                        </Text>
                        <Text style={[s.muted, { fontSize: 12 }]}>
                          {STATUS_LABELS[x.status] ?? x.status}
                        </Text>
                      </View>
                    </TapRow>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[s.actions, { marginTop: 12 }]}>
        <Btn title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Btn
          title={changed.length ? `Salvar (${changed.length})` : 'Salvar'}
          onPress={save}
          loading={saving}
          disabled={changed.length === 0}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}
