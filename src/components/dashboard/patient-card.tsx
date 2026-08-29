import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

import { Btn, IconBtn, initials, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { formatShort, formatWeekdayShort, parseDate } from '@/lib/date';
import {
  createClinicalNote,
  deleteClinicalNote,
  getClinicalNotes,
  updateClinicalNote,
  type CalendarSession,
  type ClinicalNote,
  type PatientUser,
} from '@/services/dashboard';

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: 'Dom',
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  absent: 'Falta',
};

function ClinicalNotes({
  patient,
  sessions,
  onNoteSaved,
}: {
  patient: PatientUser;
  sessions: CalendarSession[];
  onNoteSaved: (patientId: number) => void;
}) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notesError, setNotesError] = useState('');

  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [pickedSessionId, setPickedSessionId] = useState<number | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    [sessions],
  );

  const selectedSessionId = sortedSessions.some((s) => s.id === pickedSessionId)
    ? pickedSessionId
    : (sortedSessions[0]?.id ?? null);

  useEffect(() => {
    let alive = true;
    getClinicalNotes(patient.id)
      .then((list) => alive && setNotes(list))
      .catch(() => {
        if (!alive) return;
        setNotesError('Não foi possível carregar as anotações.');
        setNotes([]);
      })
      .finally(() => alive && setLoadingNotes(false));
    return () => {
      alive = false;
    };
  }, [patient.id]);

  async function saveNote() {
    const text = newNote.trim();
    if (!text || savingNote || selectedSessionId === null) return;

    setSavingNote(true);
    try {
      const note = await createClinicalNote(patient.id, selectedSessionId, text);
      setNotes((prev) => [note, ...prev]);
      onNoteSaved(patient.id);
      setNewNote('');
    } catch {
      setNotesError('Não foi possível salvar a anotação.');
    } finally {
      setSavingNote(false);
    }
  }

  async function confirmEdit(noteId: number) {
    const text = editingContent.trim();
    if (!text || savingEdit) return;

    setSavingEdit(true);
    try {
      const updated = await updateClinicalNote(patient.id, noteId, text);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingNoteId(null);
      setEditingContent('');
    } catch {
      setNotesError('Não foi possível salvar a anotação.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeNote(noteId: number) {
    try {
      await deleteClinicalNote(patient.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      setNotesError('Não foi possível excluir a anotação.');
    }
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 10 }}>
      <Text style={[s.muted, { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }]}>
        Anotações clínicas (visíveis apenas para você)
      </Text>

      <Text style={s.label}>Sessão</Text>
      {sortedSessions.length === 0 ? (
        <Text style={s.muted}>Nenhuma sessão disponível</Text>
      ) : (
        <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
          {sortedSessions.map((session) => (
            <Pressable key={session.id} onPress={() => setPickedSessionId(session.id)}>
              <Text style={[s.chip, session.id === selectedSessionId ? s.chipAccent : null]}>
                {formatShort(parseDate(session.date))} às {session.time}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <TextInput
        value={newNote}
        onChangeText={setNewNote}
        multiline
        placeholder="Nova anotação clínica..."
        placeholderTextColor={C.mutedForeground}
        style={[s.input, { minHeight: 76, textAlignVertical: 'top' }]}
      />
      <Btn
        title="Salvar anotação"
        loading={savingNote}
        disabled={!newNote.trim() || selectedSessionId === null}
        onPress={saveNote}
      />

      {notesError ? <Text style={s.error}>{notesError}</Text> : null}

      {loadingNotes ? (
        <Text style={s.muted}>Carregando anotações...</Text>
      ) : notes.length === 0 ? (
        <Text style={[s.muted, { textAlign: 'center' }]}>Nenhuma anotação ainda.</Text>
      ) : (
        notes.map((note) => (
          <View
            key={note.id}
            style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10 }}>
            {editingNoteId === note.id ? (
              <>
                <TextInput
                  value={editingContent}
                  onChangeText={setEditingContent}
                  multiline
                  style={[s.input, { minHeight: 70, textAlignVertical: 'top', marginBottom: 8 }]}
                />
                <View style={[s.row, { gap: 8 }]}>
                  <Btn
                    title="Salvar"
                    loading={savingEdit}
                    disabled={!editingContent.trim()}
                    onPress={() => confirmEdit(note.id)}
                    style={{ flex: 1 }}
                  />
                  <Btn
                    title="Cancelar"
                    variant="outline"
                    onPress={() => {
                      setEditingNoteId(null);
                      setEditingContent('');
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <Text style={[s.muted, { fontSize: 11 }]}>
                    {formatShort(parseDate(note.created_at))}
                  </Text>
                  <View style={s.row}>
                    <IconBtn
                      name="pencil-outline"
                      size={14}
                      label="Editar anotação"
                      onPress={() => {
                        setEditingNoteId(note.id);
                        setEditingContent(note.content);
                      }}
                    />
                    <IconBtn
                      name="trash-outline"
                      size={14}
                      color={C.destructive}
                      label="Excluir anotação"
                      onPress={() => removeNote(note.id)}
                    />
                  </View>
                </View>
                <Text style={{ color: C.foreground, lineHeight: 20 }}>{note.content}</Text>
              </>
            )}
          </View>
        ))
      )}
    </View>
  );
}

export default function PatientCard({
  patient,
  sessions,
  isOpen,
  onToggleNotes,
  onEdit,
  onDelete,
  onNoteSaved,
}: {
  patient: PatientUser;
  sessions: CalendarSession[];
  isOpen: boolean;
  onToggleNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNoteSaved: (patientId: number) => void;
}) {
  const extras = patient.extra_sessions ?? [];

  return (
    <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10 }}>
      <View style={[s.row, { gap: 10, alignItems: 'flex-start' }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(patient.name)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: C.foreground }}>{patient.name}</Text>
          <Text style={[s.muted, { fontSize: 12 }]}>{patient.email}</Text>
        </View>

        <View style={s.row}>
          <IconBtn
            name="document-text-outline"
            label={isOpen ? 'Fechar anotações' : 'Ver anotações'}
            onPress={onToggleNotes}
          />
          <IconBtn name="pencil-outline" label="Editar paciente" onPress={onEdit} />
          <IconBtn
            name="trash-outline"
            color={C.destructive}
            label="Excluir paciente"
            onPress={onDelete}
          />
        </View>
      </View>

      <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
        {patient.schedule_type ? (
          <Text style={s.chip}>
            {patient.schedule_type === 'regular' ? 'Agendamento semanal' : 'Agendamento avulso'}
          </Text>
        ) : null}

        {patient.schedule_type === 'regular' ? (
          <>
            {patient.sessions_per_week > 0 ? (
              <Text style={s.chip}>{patient.sessions_per_week}x/semana</Text>
            ) : null}
            {patient.session_days.map((day) => (
              <Text key={day} style={[s.chip, s.chipAccent]}>
                {WEEKDAY_LABELS[day] ?? day}
              </Text>
            ))}
          </>
        ) : patient.schedule_type === 'extra' ? (
          <Text style={[s.chip, s.chipAccent]}>
            {extras.length} {extras.length === 1 ? 'sessão agendada' : 'sessões agendadas'}
          </Text>
        ) : null}

        {patient.session_time ? (
          <Text style={[s.chip, s.chipAccent]}>{patient.session_time}</Text>
        ) : null}
      </View>

      {patient.schedule_type === 'extra' && extras.length > 0 ? (
        <View style={{ gap: 2 }}>
          {extras.map((e) => (
            <Text key={e.id} style={[s.muted, { fontSize: 12 }]}>
              {formatWeekdayShort(parseDate(e.date))} às {e.time} ({STATUS_LABELS[e.status] ?? e.status})
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[s.row, { gap: 14, flexWrap: 'wrap' }]}>
        <View style={[s.row, { gap: 5 }]}>
          <Ionicons name="checkmark-circle-outline" size={14} color={C.green} />
          <Text style={[s.muted, { fontSize: 12 }]}>{patient.completed_sessions} realizadas</Text>
        </View>
        <View style={[s.row, { gap: 5 }]}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={patient.absent_sessions > 0 ? C.amber : C.mutedForeground}
          />
          <Text
            style={{
              fontSize: 12,
              color: patient.absent_sessions > 0 ? C.amber : C.mutedForeground,
            }}>
            {patient.absent_sessions} {patient.absent_sessions === 1 ? 'falta' : 'faltas'}
          </Text>
        </View>
        {patient.google_meet_link ? (
          <Pressable
            onPress={() => Linking.openURL(patient.google_meet_link!)}
            style={[s.row, { gap: 4 }]}>
            <Ionicons name="videocam-outline" size={14} color={C.secondary} />
            <Text style={{ fontSize: 12, color: C.secondary, fontWeight: '600' }}>Google Meet</Text>
          </Pressable>
        ) : (
          <Text style={[s.muted, { fontSize: 12, fontStyle: 'italic' }]}>Sem link de Meet</Text>
        )}
      </View>

      {isOpen ? (
        <ClinicalNotes patient={patient} sessions={sessions} onNoteSaved={onNoteSaved} />
      ) : null}
    </View>
  );
}
