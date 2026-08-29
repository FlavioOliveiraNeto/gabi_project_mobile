import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { IconBtn, initials, s } from '@/components/ui';
import { C } from '@/constants/theme';
import {
  addMonths,
  formatDayMonth,
  formatMonthYear,
  isToday,
  monthGrid,
  startOfDay,
  toKey,
} from '@/lib/date';
import { updateSessionStatus, type CalendarSession, type PatientUser } from '@/services/dashboard';

import AddSessionModal from './add-session-modal';
import ConfirmModal from './confirm-modal';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_ICON: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  completed: { name: 'checkmark', color: C.green },
  absent: { name: 'close', color: C.red },
  cancelled: { name: 'ban-outline', color: C.mutedForeground },
  scheduled: { name: 'time-outline', color: C.yellow },
};

export default function DashboardCalendar({
  sessions,
  patients,
  onEditPatient,
  onReload,
}: {
  sessions: CalendarSession[];
  patients: PatientUser[];
  onEditPatient: (patientId: number) => void;
  onReload: () => void;
}) {
  const [base, setBase] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [showAddSession, setShowAddSession] = useState(false);
  const [absentTarget, setAbsentTarget] = useState<CalendarSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CalendarSession | null>(null);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, CalendarSession[]> = {};
    (sessions ?? []).forEach((s) => {
      (map[s.date] ??= []).push(s);
    });
    return map;
  }, [sessions]);

  const { offset, days } = useMemo(() => monthGrid(base), [base]);
  const daySessions = sessionsByDate[toKey(selectedDate)] ?? [];
  const isSelectedDatePast = startOfDay(selectedDate) < startOfDay(new Date());

  async function applyStatus(sessionId: number, status: 'absent' | 'cancelled') {
    try {
      await updateSessionStatus(sessionId, status);
      onReload();
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={[s.card, { gap: 12 }]}>
        <View style={[s.row, { gap: 8 }]}>
          <Ionicons name="calendar-outline" size={18} color={C.primary} />
          <Text style={s.title}>{formatMonthYear(base)}</Text>
          <View style={[s.row, { marginLeft: 'auto' }]}>
            <IconBtn name="chevron-back" label="Mês anterior" onPress={() => setBase(addMonths(base, -1))} />
            <IconBtn name="chevron-forward" label="Próximo mês" onPress={() => setBase(addMonths(base, 1))} />
          </View>
        </View>

        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[s.muted, { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11 }]}>
              {w}
            </Text>
          ))}
        </View>

        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {Array.from({ length: offset }).map((_, i) => (
            <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
          ))}

          {days.map((d) => {
            const key = toKey(d);
            const today = isToday(d);
            const hasSession = Boolean(sessionsByDate[key]);
            const selected = key === toKey(selectedDate);

            return (
              <Pressable
                key={key}
                onPress={() => setSelectedDate(d)}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    borderWidth: selected ? 2 : 0,
                    borderColor: C.primary,
                    backgroundColor: today ? C.primary : hasSession ? '#E4F1F1' : 'transparent',
                  }}>
                  <Text
                    style={{
                      color: today ? C.primaryForeground : hasSession ? C.foreground : C.mutedForeground,
                      fontWeight: today ? '700' : '400',
                    }}>
                    {d.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[s.card, { gap: 12 }]}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>
            {formatDayMonth(selectedDate)}
          </Text>
          <IconBtn
            name="calendar-outline"
            color={C.primary}
            label="Adicionar sessão extra neste dia"
            onPress={() => setShowAddSession(true)}
          />
        </View>

        {daySessions.length === 0 ? (
          <Text style={[s.muted, { textAlign: 'center', paddingVertical: 16 }]}>
            Nenhum atendimento neste dia.
          </Text>
        ) : (
          daySessions.map((session) => {
            const icon = STATUS_ICON[session.status] ?? STATUS_ICON.scheduled;
            const meet = session.patient?.google_meet_link;

            return (
              <View
                key={session.id}
                style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 8 }}>
                <View style={[s.row, { gap: 10 }]}>
                  <Ionicons name={icon.name} size={16} color={icon.color} />
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials(session.patient?.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[s.row, { gap: 6, flexWrap: 'wrap' }]}>
                      <Text style={{ fontWeight: '600', color: C.foreground }}>
                        {session.patient?.name ?? 'Paciente'}
                      </Text>
                      {session.session_type === 'extra' ? (
                        <Text style={[s.chip, { backgroundColor: '#FEF3C7', color: C.amber }]}>Extra</Text>
                      ) : null}
                    </View>
                    <Text style={[s.muted, { fontSize: 12 }]}>{session.time}</Text>
                  </View>
                </View>

                <View style={[s.row, { gap: 16, flexWrap: 'wrap' }]}>
                  {session.status === 'cancelled' ? (
                    <Text style={[s.muted, { fontStyle: 'italic' }]}>Cancelada</Text>
                  ) : session.status === 'completed' ? (
                    <>
                      <Pressable onPress={() => setAbsentTarget(session)}>
                        <Text style={{ fontSize: 12, color: C.red }}>Registrar falta</Text>
                      </Pressable>
                      <Pressable onPress={() => setCancelTarget(session)}>
                        <Text style={[s.muted, { fontSize: 12 }]}>Cancelar sessão</Text>
                      </Pressable>
                    </>
                  ) : session.status === 'scheduled' ? (
                    <>
                      {!isSelectedDatePast && meet ? (
                        <Pressable onPress={() => Linking.openURL(meet)} style={[s.row, { gap: 4 }]}>
                          <Ionicons name="videocam-outline" size={14} color={C.secondary} />
                          <Text style={{ fontSize: 12, color: C.secondary, fontWeight: '600' }}>
                            Google Meet
                          </Text>
                        </Pressable>
                      ) : !isSelectedDatePast ? (
                        <Pressable
                          onPress={() => onEditPatient(session.patient.id)}
                          style={[s.row, { gap: 4 }]}>
                          <Ionicons name="videocam-outline" size={14} color={C.amber} />
                          <Text style={{ fontSize: 12, color: C.amber, fontWeight: '600' }}>
                            Adicionar link do Meet
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => setCancelTarget(session)}>
                        <Text style={[s.muted, { fontSize: 12 }]}>Cancelar sessão</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      <ConfirmModal
        visible={Boolean(absentTarget)}
        message="Tem certeza que deseja marcar esta falta?"
        details={
          absentTarget
            ? [
                ['Paciente', absentTarget.patient?.name ?? '—'],
                ['Data', absentTarget.date],
                ['Horário', absentTarget.time],
              ]
            : undefined
        }
        confirmLabel="Marcar falta"
        loadingLabel="Marcando falta..."
        onClose={() => setAbsentTarget(null)}
        onConfirm={async () => {
          if (absentTarget) await applyStatus(absentTarget.id, 'absent');
        }}
      />

      <ConfirmModal
        visible={Boolean(cancelTarget)}
        message="Tem certeza que deseja cancelar esta sessão?"
        details={
          cancelTarget
            ? [
                ['Paciente', cancelTarget.patient?.name ?? '—'],
                ['Data', cancelTarget.date],
                ['Horário', cancelTarget.time],
              ]
            : undefined
        }
        confirmLabel="Cancelar sessão"
        loadingLabel="Cancelando..."
        destructive={false}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (cancelTarget) await applyStatus(cancelTarget.id, 'cancelled');
        }}
      />

      {showAddSession ? (
        <AddSessionModal
          date={selectedDate}
          patients={patients}
          onClose={() => setShowAddSession(false)}
          onCreated={onReload}
        />
      ) : null}
    </View>
  );
}
