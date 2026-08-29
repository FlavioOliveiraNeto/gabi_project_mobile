import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  Btn,
  ErrorText,
  IconBtn,
  Sheet,
  TapRow,
  apiErrorMessage,
  initials,
  s,
} from '@/components/ui';
import { C } from '@/constants/theme';
import { formatShort, formatWeekdayShort, hasStarted, isToday, parseDate } from '@/lib/date';
import {
  createClinicalNote,
  deleteClinicalNote,
  getClinicalNotes,
  NOTES_PAGE_SIZE,
  updateClinicalNote,
  slotsFromPatient,
  type CalendarSession,
  type ClinicalNote,
  type PatientUser,
} from '@/services/dashboard';

import ConfirmModal from './confirm-modal';

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
  cancelled: 'Cancelada',
};

function SessionPicker({
  visible,
  sessions,
  selectedId,
  onPick,
  onClose,
}: {
  visible: boolean;
  sessions: CalendarSession[];
  selectedId: number | null;
  onPick: (session: CalendarSession) => void;
  onClose: () => void;
}) {
  const groups = useMemo(() => {
    const past = sessions.filter((session) => hasStarted(session.date, session.time));
    const upcoming = sessions
      .filter((session) => !hasStarted(session.date, session.time))
      .reverse();
    return [
      { title: 'Já realizadas', items: past },
      { title: 'Próximas', items: upcoming },
    ];
  }, [sessions]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[s.title, { marginBottom: 4 }]}>Sobre qual sessão?</Text>
      <Text style={[s.muted, { marginBottom: 14 }]}>
        A anotação fica arquivada nesta sessão do prontuário.
      </Text>

      <ScrollView style={{ maxHeight: 320 }}>
        {groups.map(({ title, items }) =>
          items.length === 0 ? null : (
            <View key={title}>
              <Text
                style={[
                  s.muted,
                  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 6 },
                ]}>
                {title}
              </Text>

              {items.map((session) => {
                const selected = session.id === selectedId;
                return (
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Sessão de ${formatShort(parseDate(session.date))} às ${session.time}`}
                    onPress={() => onPick(session)}
                    style={[
                      s.row,
                      {
                        gap: 10,
                        paddingVertical: 12,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: selected ? C.primarySurface : 'transparent',
                      },
                    ]}>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? C.primary : C.mutedForeground}
                    />
                    <Text style={{ flex: 1, color: C.foreground }} numberOfLines={1}>
                      {isToday(parseDate(session.date))
                        ? 'Hoje'
                        : formatShort(parseDate(session.date))}{' '}
                      às {session.time}
                    </Text>
                    <Text style={s.chip}>{STATUS_LABELS[session.status] ?? session.status}</Text>
                  </Pressable>
                );
              })}
            </View>
          ),
        )}
      </ScrollView>

      <Btn title="Fechar" variant="outline" onPress={onClose} style={{ marginTop: 14 }} />
    </Sheet>
  );
}

const NoteRow = memo(function NoteRow({
  note,
  isEditing,
  editingContent,
  savingEdit,
  onChangeEditing,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onRequestDelete,
}: {
  note: ClinicalNote;
  isEditing: boolean;
  editingContent: string;
  savingEdit: boolean;
  onChangeEditing: (value: string) => void;
  onStartEdit: (note: ClinicalNote) => void;
  onCancelEdit: () => void;
  onConfirmEdit: (noteId: number) => void;
  onRequestDelete: (note: ClinicalNote) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = note.content.length > 280;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 12, gap: 8 }}>
      {isEditing ? (
        <>
          <TextInput
            accessibilityLabel="Editar anotação clínica"
            maxLength={5000}
            value={editingContent}
            onChangeText={onChangeEditing}
            multiline
            style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          />
          <View style={[s.row, { gap: 8 }]}>
            <Btn
              title="Salvar"
              loading={savingEdit}
              disabled={!editingContent.trim()}
              onPress={() => onConfirmEdit(note.id)}
              style={{ flex: 1 }}
            />
            <Btn title="Cancelar" variant="outline" onPress={onCancelEdit} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          <View style={[s.row, { gap: 8 }]}>
            <Text style={[s.chip, s.chipAccent]}>
              {note.date
                ? formatShort(parseDate(note.date))
                : formatShort(parseDate(note.created_at))}
            </Text>
            <Text style={[s.muted, { flex: 1, fontSize: 11 }]} numberOfLines={1}>
              {note.date ? 'sessão' : 'sem sessão'}
            </Text>
            <IconBtn
              name="pencil-outline"
              size={16}
              label="Editar anotação"
              onPress={() => onStartEdit(note)}
            />
            <IconBtn
              name="trash-outline"
              size={16}
              color={C.destructive}
              label="Excluir anotação"
              onPress={() => onRequestDelete(note)}
            />
          </View>

          <Text
            style={{ fontSize: 15, color: C.foreground, lineHeight: 22 }}
            numberOfLines={long && !expanded ? 6 : undefined}>
            {note.content}
          </Text>

          {long ? (
            <TapRow
              label={expanded ? 'Recolher anotação' : 'Ler anotação inteira'}
              onPress={() => setExpanded((v) => !v)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>
                {expanded ? 'Recolher' : 'Ler tudo'}
              </Text>
            </TapRow>
          ) : null}
        </>
      )}
    </View>
  );
});

function ClinicalNotes({
  patient,
  sessions,
  onNoteSaved,
  draft,
  onDraftChange,
}: {
  patient: PatientUser;
  sessions: CalendarSession[];
  onNoteSaved: (patientId: number) => void;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const [notesError, setNotesError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [savingNote, setSavingNote] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [pickedSessionId, setPickedSessionId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ClinicalNote | null>(null);

  const newNote = draft;
  const setNewNote = onDraftChange;

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    [sessions],
  );

  const defaultSession = useMemo(
    () =>
      sortedSessions.find((session) => hasStarted(session.date, session.time)) ??
      sortedSessions[sortedSessions.length - 1] ??
      null,
    [sortedSessions],
  );

  const selectedSession =
    sortedSessions.find((session) => session.id === pickedSessionId) ?? defaultSession;
  const selectedSessionId = selectedSession?.id ?? null;

  const orderedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at)),
    [notes],
  );

  useEffect(() => {
    let alive = true;
    setLoadingNotes(true);
    getClinicalNotes(patient.id)
      .then((list) => {
        if (!alive) return;
        setNotes(list);
        setServerOffset(list.length);
        setReachedEnd(list.length < NOTES_PAGE_SIZE);
        setLoadFailed(false);
        setNotesError('');
      })
      .catch(() => {
        if (!alive) return;
        setNotesError('Não foi possível carregar as anotações.');
        setLoadFailed(true);
        setNotes([]);
      })
      .finally(() => alive && setLoadingNotes(false));
    return () => {
      alive = false;
    };
  }, [patient.id, reloadToken]);

  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(0), 4000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  async function loadMore() {
    setLoadingMore(true);
    setNotesError('');
    try {
      const page = await getClinicalNotes(patient.id, serverOffset);
      setNotes((prev) => {
        const known = new Set(prev.map((n) => n.id));
        return [...prev, ...page.filter((n) => !known.has(n.id))];
      });
      setServerOffset((o) => o + page.length);
      if (page.length < NOTES_PAGE_SIZE) setReachedEnd(true);
    } catch (err) {
      setNotesError(apiErrorMessage(err, 'Não foi possível carregar mais anotações.'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function saveNote() {
    const text = newNote.trim();
    if (!text || savingNote || selectedSessionId === null) return;

    setSavingNote(true);
    setNotesError('');
    try {
      const note = await createClinicalNote(patient.id, selectedSessionId, text);
      setNotes((prev) => [note, ...prev]);
      onNoteSaved(patient.id);
      setNewNote('');
      setSavedAt(Date.now());
    } catch (err) {
      setNotesError(apiErrorMessage(err, 'Não foi possível salvar a anotação.'));
    } finally {
      setSavingNote(false);
    }
  }

  const editingRef = useRef('');
  editingRef.current = editingContent;

  const confirmEdit = useCallback(
    async (noteId: number) => {
      const text = editingRef.current.trim();
      if (!text) return;

      setSavingEdit(true);
      setNotesError('');
      try {
        const updated = await updateClinicalNote(patient.id, noteId, text);
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
        setEditingNoteId(null);
        setEditingContent('');
      } catch (err) {
        setNotesError(apiErrorMessage(err, 'Não foi possível salvar a anotação.'));
      } finally {
        setSavingEdit(false);
      }
    },
    [patient.id],
  );

  const startEdit = useCallback((note: ClinicalNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditingContent('');
  }, []);

  const requestDelete = useCallback((note: ClinicalNote) => setNoteToDelete(note), []);

  async function removeNote(noteId: number) {
    await deleteClinicalNote(patient.id, noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (editingNoteId === noteId) cancelEdit();
  }

  const remaining = 5000 - newNote.length;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 10 }}>
      <View>
        <Text style={s.title}>Anotações clínicas</Text>
        <Text style={[s.muted, { fontSize: 12 }]}>Visíveis apenas para você.</Text>
      </View>

      {sortedSessions.length === 0 ? (
        <Text style={s.muted}>
          Nenhuma sessão cadastrada ainda. Crie uma sessão para poder anotar.
        </Text>
      ) : (
        <View
          style={{
            backgroundColor: C.primarySurface,
            borderRadius: 14,
            padding: 14,
            gap: 10,
          }}>
          <View style={[s.row, { gap: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.muted, { fontSize: 13, fontWeight: '500' }]}>Sessão</Text>
              <Text style={{ color: C.foreground }} numberOfLines={1}>
                {selectedSession
                  ? `${
                      isToday(parseDate(selectedSession.date))
                        ? 'Hoje'
                        : formatShort(parseDate(selectedSession.date))
                    } às ${selectedSession.time}`
                  : '—'}
              </Text>
            </View>
            {sortedSessions.length > 1 ? (
              <TapRow label="Mudar a sessão da anotação" onPress={() => setShowPicker(true)}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>
                  Mudar sessão
                </Text>
              </TapRow>
            ) : null}
          </View>

          <TextInput
            accessibilityLabel="Nova anotação clínica"
            maxLength={5000}
            value={newNote}
            onChangeText={setNewNote}
            multiline
            placeholder="Nova anotação clínica..."
            placeholderTextColor={C.mutedForeground}
            style={[s.input, { minHeight: 96, textAlignVertical: 'top' }]}
          />

          {remaining <= 500 ? (
            <Text style={[s.muted, { fontSize: 12, textAlign: 'right' }]}>
              {remaining} caracteres restantes
            </Text>
          ) : null}

          <Btn
            title="Salvar anotação"
            loading={savingNote}
            disabled={!newNote.trim() || selectedSessionId === null}
            onPress={saveNote}
          />

          {savedAt ? (
            <View
              accessibilityLiveRegion="polite"
              style={[s.row, { gap: 6, justifyContent: 'center' }]}>
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
              <Text style={{ fontSize: 13, color: C.green }}>Anotação salva.</Text>
            </View>
          ) : null}
        </View>
      )}

      <ErrorText marginBottom={0}>{notesError}</ErrorText>

      {loadFailed ? (
        <Btn
          title="Tentar novamente"
          variant="outline"
          onPress={() => setReloadToken((t) => t + 1)}
        />
      ) : null}

      {!loadingNotes && orderedNotes.length > 0 ? (
        <Text
          style={[
            s.muted,
            { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
          ]}>
          Histórico
        </Text>
      ) : null}

      {loadingNotes ? (
        <Text style={s.muted}>Carregando anotações...</Text>
      ) : orderedNotes.length === 0 && !loadFailed ? (
        <Text style={[s.muted, { textAlign: 'center' }]}>Nenhuma anotação ainda.</Text>
      ) : (
        orderedNotes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            isEditing={editingNoteId === note.id}
            editingContent={editingNoteId === note.id ? editingContent : ''}
            savingEdit={editingNoteId === note.id && savingEdit}
            onChangeEditing={setEditingContent}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onConfirmEdit={confirmEdit}
            onRequestDelete={requestDelete}
          />
        ))
      )}

      {!loadingNotes && !reachedEnd && notes.length > 0 ? (
        <Btn
          title="Mostrar anotações anteriores"
          variant="outline"
          loading={loadingMore}
          onPress={loadMore}
        />
      ) : null}

      <SessionPicker
        visible={showPicker}
        sessions={sortedSessions}
        selectedId={selectedSessionId}
        onPick={(session) => {
          setPickedSessionId(session.id);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />

      <ConfirmModal
        visible={Boolean(noteToDelete)}
        title="Excluir anotação"
        message="Esta anotação clínica será removida permanentemente."
        details={
          noteToDelete
            ? [
                [
                  noteToDelete.date ? 'Sessão' : 'Anotada em',
                  formatShort(parseDate(noteToDelete.date ?? noteToDelete.created_at)),
                ],
                [
                  'Trecho',
                  noteToDelete.content.length > 80
                    ? `${noteToDelete.content.slice(0, 80)}...`
                    : noteToDelete.content,
                ],
              ]
            : undefined
        }
        confirmLabel="Excluir anotação"
        onClose={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (noteToDelete) await removeNote(noteToDelete.id);
        }}
      />
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
  const [draft, setDraft] = useState('');

  return (
    <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10 }}>
      <View style={[s.row, { gap: 10, alignItems: 'flex-start' }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(patient.name)}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: '600', color: C.foreground }} numberOfLines={2}>
            {patient.name}
          </Text>
          <Text style={[s.muted, { fontSize: 12 }]} numberOfLines={1}>
            {patient.email}
          </Text>
        </View>

        <View style={[s.row, { gap: 8 }]}>
          <IconBtn
            name="document-text-outline"
            color={draft.trim() ? C.amber : undefined}
            label={
              isOpen
                ? 'Fechar anotações'
                : draft.trim()
                  ? 'Ver anotações (rascunho não salvo)'
                  : 'Ver anotações'
            }
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
            {slotsFromPatient(patient).map((slot) => (
              <Text key={slot.weekday} style={[s.chip, s.chipAccent]}>
                {WEEKDAY_LABELS[slot.weekday] ?? slot.weekday}
                {slot.time ? ` ${slot.time}` : ''}
              </Text>
            ))}
          </>
        ) : patient.schedule_type === 'extra' ? (
          <Text style={[s.chip, s.chipAccent]}>
            {extras.length} {extras.length === 1 ? 'sessão agendada' : 'sessões agendadas'}
          </Text>
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
          <TapRow
            label="Abrir o Google Meet"
            onPress={() => Linking.openURL(patient.google_meet_link!)}>
            <Ionicons name="videocam-outline" size={14} color={C.secondary} />
            <Text style={{ fontSize: 12, color: C.secondary, fontWeight: '600' }}>Google Meet</Text>
          </TapRow>
        ) : (
          <Text style={[s.muted, { fontSize: 12, fontStyle: 'italic' }]}>Sem link de Meet</Text>
        )}
      </View>

      {draft.trim() && !isOpen ? (
        <Text style={{ fontSize: 12, color: C.amber }}>Rascunho de anotação não salvo.</Text>
      ) : null}

      {isOpen ? (
        <ClinicalNotes
          patient={patient}
          sessions={sessions}
          onNoteSaved={onNoteSaved}
          draft={draft}
          onDraftChange={setDraft}
        />
      ) : null}
    </View>
  );
}
