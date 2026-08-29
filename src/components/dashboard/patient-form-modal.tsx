import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Btn, ErrorText, Field, Sheet, apiErrorMessage, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { fromIsoDate, isValidTime, maskDate, maskTime, scheduleError, toIsoDate } from '@/lib/date';
import {
  conflictSlots,
  createPatient,
  slotsFromPatient,
  sortSlots,
  updatePatient,
  updatePatientSchedule,
  type CreatePatientParams,
  type PatientUser,
  type ScheduleSlot,
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

const WEEKDAY_LABEL: Record<string, string> = Object.fromEntries(WEEKDAYS);

const DEFAULT_SLOT_TIME = '09:00';

const EMPTY = {
  name: '',
  email: '',
  google_meet_link: '',
  schedule_type: 'regular' as 'regular' | 'extra',
  slots: [] as ScheduleSlot[],
  single_date: '',
  single_time: '',
};

function slotsEqual(a: ScheduleSlot[], b: ScheduleSlot[]): boolean {
  return JSON.stringify(sortSlots(a)) === JSON.stringify(sortSlots(b));
}

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 10, bottom: 10 }}
      onPress={onPress}>
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
    next.slots = slotsFromPatient(p);
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
  const [errors, setErrors] = useState<{ name?: string; email?: string; schedule?: string }>({});
  const [conflictedDays, setConflictedDays] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState('');

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      slots: f.slots.some((slot) => slot.weekday === day)
        ? f.slots.filter((slot) => slot.weekday !== day)
        : [...f.slots, { weekday: day, time: DEFAULT_SLOT_TIME }],
    }));

    setConflictedDays((days) => {
      const next = new Set(days);
      next.delete(day);
      return next;
    });
  }

  function setSlotTime(day: string, time: string) {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((slot) => (slot.weekday === day ? { ...slot, time } : slot)),
    }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Nome é obrigatório.';
    if (!form.email.trim()) next.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'E-mail inválido.';

    next.schedule = scheduleError(form);
    if (!next.schedule) delete next.schedule;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsLoading(true);
    setFormError('');
    setConflictedDays(new Set());

    const singleDateIso = toIsoDate(form.single_date);

    try {
      if (isEditing && patientToEdit) {
        const original = patientToEdit;

        await updatePatient(original.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          google_meet_link: form.google_meet_link.trim() || undefined,
        });

        const weeklyChanged =
          form.schedule_type === 'regular' &&
          (form.schedule_type !== original.schedule_type ||
            !slotsEqual(form.slots, slotsFromPatient(original)));

        const extraChanged =
          form.schedule_type === 'extra' &&
          (singleDateIso !== original.extra_sessions?.[0]?.date ||
            form.single_time !== original.extra_sessions?.[0]?.time);

        if (weeklyChanged) {
          await updatePatientSchedule(original.id, {
            schedule_type: 'regular',
            schedule_slots: sortSlots(form.slots),
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
        payload.schedule_slots = sortSlots(form.slots);
      } else {
        payload.single_date = singleDateIso || undefined;
        payload.single_time = form.single_time || undefined;
      }

      const created = await createPatient(payload);

      setGeneratedPassword(created.generated_password);
      onSaved();
    } catch (err) {
      setConflictedDays(new Set(conflictSlots(err).map((c) => c.weekday)));
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
            borderColor: C.amberBorder,
            backgroundColor: C.amberSurfaceSoft,
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
          }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.amber, marginBottom: 6 }}>
            SENHA TEMPORÁRIA
          </Text>
          <Text selectable style={{ fontSize: 20, fontWeight: '700', letterSpacing: 2, color: C.amberInk }}>
            {generatedPassword}
          </Text>
        </View>

        <Text style={[s.muted, { fontSize: 12, marginBottom: 16 }]}>
          O paciente será obrigado a trocar esta senha no primeiro login.
        </Text>

        <View style={{ gap: 10 }}>
          <Btn
            title={copied ? 'Senha copiada' : 'Copiar senha'}
            onPress={async () => {
              await Clipboard.setStringAsync(generatedPassword);
              setCopied(true);
            }}
          />
          <Btn title="Entendi, fechar" variant="outline" onPress={onClose} />
        </View>
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
          maxLength={120}
          value={form.name}
          onChangeText={(v) => set('name', v)}
          error={errors.name}
          placeholder="Nome do paciente"
        />
        <Field
          label="E-mail *"
          maxLength={160}
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="paciente@email.com"
        />
        <Field
          label="Link do Google Meet"
          maxLength={300}
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
            <Text style={s.label}>Dias das sessões</Text>
            <Text style={[s.label, { fontWeight: '400', marginBottom: 8 }]}>
              Cada dia tem seu próprio horário. A sessão dura 50 minutos, com 10 de
              intervalo até a próxima.
            </Text>
            <View style={[s.row, { gap: 6, flexWrap: 'wrap', marginBottom: 14 }]}>
              {WEEKDAYS.map(([day, label]) => (
                <Chip
                  key={day}
                  label={label}
                  active={form.slots.some((slot) => slot.weekday === day)}
                  onPress={() => toggleDay(day)}
                />
              ))}
            </View>

            {sortSlots(form.slots).map((slot) => (
              <Field
                key={slot.weekday}
                label={`Horário de ${WEEKDAY_LABEL[slot.weekday]} (HH:MM)`}
                value={slot.time}
                onChangeText={(v) => setSlotTime(slot.weekday, maskTime(v))}
                keyboardType="number-pad"
                placeholder="14:30"
                error={
                  conflictedDays.has(slot.weekday)
                    ? 'Horário já ocupado. Escolha outro.'
                    : slot.time && !isValidTime(slot.time)
                      ? 'Horário inválido.'
                      : undefined
                }
              />
            ))}
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

        <ErrorText>{errors.schedule}</ErrorText>
        <ErrorText>{formError}</ErrorText>

        <View style={[s.actions, { paddingBottom: 8 }]}>
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
