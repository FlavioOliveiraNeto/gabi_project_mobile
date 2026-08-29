import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Btn, Field, Sheet, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { fromIsoDate, isValidTime, maskDate, maskTime, toIsoDate } from '@/lib/date';
import {
  createPatient,
  updatePatient,
  updatePatientSchedule,
  type CreatePatientParams,
  type PatientUser,
} from '@/services/dashboard';

const WEEKDAYS: [string, string][] = [
  ['sunday', 'Dom'],
  ['monday', 'Seg'],
  ['tuesday', 'Ter'],
  ['wednesday', 'Qua'],
  ['thursday', 'Qui'],
  ['friday', 'Sex'],
  ['saturday', 'Sáb'],
];

const EMPTY = {
  name: '',
  email: '',
  google_meet_link: '',
  schedule_type: 'regular' as 'regular' | 'extra',
  sessions_per_week: 0,
  weekdays: [] as string[],
  session_time: '',
  single_date: '',
  single_time: '',
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text style={[s.chip, active ? s.chipAccent : null, { paddingVertical: 6, paddingHorizontal: 12 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function initialForm(p: PatientUser | null): typeof EMPTY {
  if (!p) return { ...EMPTY };

  const next = {
    ...EMPTY,
    name: p.name,
    email: p.email,
    google_meet_link: p.google_meet_link ?? '',
    schedule_type: (p.schedule_type ?? 'regular') as 'regular' | 'extra',
  };

  if (p.schedule_type === 'regular') {
    next.sessions_per_week = p.sessions_per_week ?? 0;
    next.weekdays = [...(p.session_days ?? [])];
    next.session_time = p.session_time ?? '';
  }

  if (p.schedule_type === 'extra') {
    const first = p.extra_sessions?.[0];
    if (first) {
      next.single_date = fromIsoDate(first.date ?? '');
      next.single_time = first.time ?? '';
    }
  }

  return next;
}

export default function PatientFormModal({
  patientToEdit,
  onClose,
  onSaved,
}: {
  patientToEdit: PatientUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(patientToEdit);
  const editingSessionId = patientToEdit?.extra_sessions?.[0]?.id ?? null;

  const [form, setForm] = useState(() => initialForm(patientToEdit));
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState('');

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Nome é obrigatório.';
    if (!form.email.trim()) next.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'E-mail inválido.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsLoading(true);
    setFormError('');

    const singleDateIso = toIsoDate(form.single_date);

    try {
      if (isEditing && patientToEdit) {
        const original = patientToEdit;

        await updatePatient(original.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          google_meet_link: form.google_meet_link.trim() || undefined,
        });

        const originalDays = [...(original.session_days ?? [])].sort();
        const newDays = [...form.weekdays].sort();

        const weeklyChanged =
          form.schedule_type === 'regular' &&
          (form.schedule_type !== original.schedule_type ||
            form.session_time !== original.session_time ||
            form.sessions_per_week !== original.sessions_per_week ||
            JSON.stringify(newDays) !== JSON.stringify(originalDays));

        const extraChanged =
          form.schedule_type === 'extra' &&
          (singleDateIso !== original.extra_sessions?.[0]?.date ||
            form.single_time !== original.extra_sessions?.[0]?.time);

        if (weeklyChanged) {
          await updatePatientSchedule(original.id, {
            schedule_type: 'regular',
            sessions_per_week: form.sessions_per_week || undefined,
            weekdays: form.weekdays.length > 0 ? form.weekdays : undefined,
            session_time: form.session_time || undefined,
          });
        }

        if (extraChanged) {
          await updatePatientSchedule(original.id, {
            schedule_type: 'extra',
            single_date: singleDateIso || undefined,
            single_time: form.single_time || undefined,
            session_id: editingSessionId || undefined,
          });
        }

        onSaved();
        onClose();
        return;
      }

      const payload: CreatePatientParams = {
        name: form.name.trim(),
        email: form.email.trim(),
        google_meet_link: form.google_meet_link.trim() || undefined,
        schedule_type: form.schedule_type,
      };

      if (form.schedule_type === 'regular') {
        payload.sessions_per_week = form.sessions_per_week || undefined;
        payload.weekdays = form.weekdays.length > 0 ? form.weekdays : undefined;
        payload.session_time = form.session_time || undefined;
      } else {
        payload.single_date = singleDateIso || undefined;
        payload.single_time = form.single_time || undefined;
      }

      const created = await createPatient(payload);

      setGeneratedPassword(created.generated_password);
      onSaved();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Erro ao salvar paciente.'));
    } finally {
      setIsLoading(false);
    }
  }

  if (generatedPassword) {
    return (
      <Sheet visible onClose={onClose}>
        <View style={[s.row, { gap: 10, marginBottom: 12 }]}>
          <Ionicons name="key-outline" size={22} color={C.green} />
          <Text style={s.title}>Paciente cadastrado!</Text>
        </View>

        <Text style={[s.muted, { marginBottom: 14 }]}>
          Anote a senha temporária abaixo e entregue ao paciente. Ela não será exibida novamente.
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: '#FCD34D',
            backgroundColor: '#FFFBEB',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
          }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.amber, marginBottom: 6 }}>
            SENHA TEMPORÁRIA
          </Text>
          <Text selectable style={{ fontSize: 20, fontWeight: '700', letterSpacing: 2, color: '#78350F' }}>
            {generatedPassword}
          </Text>
        </View>

        <Text style={[s.muted, { fontSize: 12, marginBottom: 16 }]}>
          O paciente será obrigado a trocar esta senha no primeiro login.
        </Text>

        <Btn title="Entendi, fechar" onPress={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet visible onClose={() => !isLoading && onClose()}>
      <Text style={[s.title, { marginBottom: 16 }]}>
        {isEditing ? 'Editar paciente' : 'Adicionar paciente'}
      </Text>

      <ScrollView>
        <Field
          label="Nome completo *"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          error={errors.name}
          placeholder="Nome do paciente"
        />
        <Field
          label="E-mail *"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="paciente@email.com"
        />
        <Field
          label="Link do Google Meet"
          value={form.google_meet_link}
          onChangeText={(v) => set('google_meet_link', v)}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://meet.google.com/..."
        />

        <Text style={s.label}>Tipo de agendamento</Text>
        <View style={[s.row, { gap: 8, marginBottom: 14 }]}>
          <Chip
            label="Semanal"
            active={form.schedule_type === 'regular'}
            onPress={() => set('schedule_type', 'regular')}
          />
          <Chip
            label="Avulso"
            active={form.schedule_type === 'extra'}
            onPress={() => set('schedule_type', 'extra')}
          />
        </View>

        {form.schedule_type === 'regular' ? (
          <>
            <Text style={s.label}>Sessões por semana</Text>
            <View style={[s.row, { gap: 6, flexWrap: 'wrap', marginBottom: 14 }]}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Chip
                  key={n}
                  label={n === 0 ? '—' : `${n}x`}
                  active={form.sessions_per_week === n}
                  onPress={() => set('sessions_per_week', n)}
                />
              ))}
            </View>

            <Text style={s.label}>Dias das sessões</Text>
            <View style={[s.row, { gap: 6, flexWrap: 'wrap', marginBottom: 14 }]}>
              {WEEKDAYS.map(([day, label]) => (
                <Chip
                  key={day}
                  label={label}
                  active={form.weekdays.includes(day)}
                  onPress={() =>
                    set(
                      'weekdays',
                      form.weekdays.includes(day)
                        ? form.weekdays.filter((d) => d !== day)
                        : [...form.weekdays, day],
                    )
                  }
                />
              ))}
            </View>

            <Field
              label="Horário da sessão (HH:MM)"
              value={form.session_time}
              onChangeText={(v) => set('session_time', maskTime(v))}
              keyboardType="number-pad"
              placeholder="14:30"
              error={
                form.session_time && !isValidTime(form.session_time) ? 'Horário inválido.' : undefined
              }
            />
          </>
        ) : (
          <>
            <Field
              label="Data da sessão (DD/MM/AAAA)"
              value={form.single_date}
              onChangeText={(v) => set('single_date', maskDate(v))}
              keyboardType="number-pad"
              placeholder="25/08/2026"
              error={form.single_date && !toIsoDate(form.single_date) ? 'Data inválida.' : undefined}
            />
            <Field
              label="Horário da sessão (HH:MM)"
              value={form.single_time}
              onChangeText={(v) => set('single_time', maskTime(v))}
              keyboardType="number-pad"
              placeholder="14:30"
              error={
                form.single_time && !isValidTime(form.single_time) ? 'Horário inválido.' : undefined
              }
            />
          </>
        )}

        {formError ? <Text style={[s.error, { marginBottom: 14 }]}>{formError}</Text> : null}

        <View style={[s.row, { gap: 12, paddingBottom: 8 }]}>
          <Btn title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Btn
            title={isEditing ? 'Salvar alterações' : 'Cadastrar paciente'}
            loading={isLoading}
            onPress={handleSubmit}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}
