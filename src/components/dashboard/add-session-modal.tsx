import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Btn, Field, Sheet, apiErrorMessage, initials, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { formatDayMonth, isValidTime, maskTime, scheduledAt } from '@/lib/date';
import { createSession, type CalendarSession, type PatientUser } from '@/services/dashboard';

export default function AddSessionModal({
  date,
  patients,
  onClose,
  onCreated,
}: {
  date: Date;
  patients: PatientUser[];
  onClose: () => void;
  onCreated: (session: CalendarSession) => void;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(q));
  }, [patients, search]);

  async function handleConfirm() {
    if (!selectedPatientId || !isValidTime(time)) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const session = await createSession({
        patient_id: selectedPatientId,
        scheduled_at: scheduledAt(date, time),
        session_type: 'extra',
      });
      onCreated(session);
      onClose();
    } catch (err) {
      setErrorMessage(
        apiErrorMessage(err, 'Erro ao criar sessão. Verifique o horário e tente novamente.'),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet visible onClose={() => !isLoading && onClose()}>
      <Text style={s.title}>Adicionar sessão</Text>
      <Text style={[s.muted, { marginTop: 4, marginBottom: 16 }]}>
        Criar sessão para {formatDayMonth(date)}
      </Text>

      <Text style={s.label}>Paciente</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar paciente..."
        placeholderTextColor={C.mutedForeground}
        style={[s.input, { marginBottom: 8 }]}
      />

      <ScrollView style={{ maxHeight: 180, marginBottom: 14 }}>
        {filtered.length === 0 ? (
          <Text style={[s.muted, { textAlign: 'center', paddingVertical: 12 }]}>
            Nenhum paciente encontrado
          </Text>
        ) : (
          filtered.map((p) => {
            const selected = p.id === selectedPatientId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedPatientId(p.id)}
                style={[
                  s.row,
                  {
                    gap: 10,
                    padding: 8,
                    borderRadius: 10,
                    backgroundColor: selected ? '#EDE9F7' : 'transparent',
                  },
                ]}>
                <View style={[s.avatar, { width: 32, height: 32, borderRadius: 16 }]}>
                  <Text style={s.avatarText}>{initials(p.name)}</Text>
                </View>
                <Text style={{ color: C.foreground }}>{p.name}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Field
        label="Horário (HH:MM)"
        value={time}
        onChangeText={(t) => setTime(maskTime(t))}
        keyboardType="number-pad"
        placeholder="14:30"
      />

      {errorMessage ? <Text style={[s.error, { marginBottom: 14 }]}>{errorMessage}</Text> : null}

      <View style={[s.row, { gap: 12 }]}>
        <Btn title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Btn
          title="Criar sessão"
          loading={isLoading}
          disabled={!selectedPatientId || !isValidTime(time)}
          onPress={handleConfirm}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}
