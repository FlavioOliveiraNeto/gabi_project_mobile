import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { s } from '@/components/ui';
import { C } from '@/constants/theme';
import { toKey } from '@/lib/date';
import type { CalendarSession, TherapistStats } from '@/services/dashboard';

const SECONDARY: { label: string; caption: string; key: keyof TherapistStats }[] = [
  { label: 'Pacientes', caption: 'ativos', key: 'active_clients' },
  { label: 'Agendadas', caption: 'nesta semana', key: 'sessions_this_week' },
  { label: 'Realizadas', caption: 'nesta semana', key: 'sessions_completed_this_week' },
];

const MAX_ROWS = 5;

export default function DashboardStats({
  stats,
  sessions = [],
}: {
  stats: TherapistStats | null;
  sessions?: CalendarSession[];
}) {
  const today = useMemo(() => {
    const key = toKey(new Date());
    return sessions
      .filter((session) => session.date === key && session.status === 'scheduled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions]);

  const count = stats ? today.length : null;

  return (
    <View style={{ gap: 14 }}>
      <View style={[s.card, { backgroundColor: C.primary, borderColor: C.primary, gap: 14 }]}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.5,
              color: C.primaryForeground,
            }}>
            HOJE
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.primaryForeground }}>
            {count === null
              ? '—'
              : count === 1
                ? '1 sessão'
                : `${count} sessões`}
          </Text>
        </View>

        {count === null ? (
          <Text style={{ fontSize: 15, color: C.primaryForeground }}>Carregando a agenda...</Text>
        ) : today.length === 0 ? (
          <Text style={{ fontSize: 15, color: C.primaryForeground }}>
            Nenhuma sessão agendada para hoje.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {today.slice(0, MAX_ROWS).map((session) => (
              <View key={session.id} style={[s.row, { gap: 12 }]}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    letterSpacing: -0.5,
                    color: C.primaryForeground,
                  }}>
                  {session.time}
                </Text>
                <Text
                  style={{ flex: 1, fontSize: 15, color: C.primaryForeground }}
                  numberOfLines={1}>
                  {session.patient?.name ?? 'Paciente'}
                </Text>
              </View>
            ))}

            {today.length > MAX_ROWS ? (
              <Text style={{ fontSize: 13, color: C.primaryForeground }}>
                e mais {today.length - MAX_ROWS} no calendário abaixo
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={s.row}>
        {SECONDARY.map((item, i) => (
          <View
            key={item.key}
            style={{
              flex: 1,
              paddingLeft: i === 0 ? 0 : 14,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: C.border,
            }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: C.foreground }}>
              {stats ? stats[item.key] : '—'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.foreground }}>
              {item.label}
            </Text>
            <Text style={[s.muted, { fontSize: 12 }]}>{item.caption}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
