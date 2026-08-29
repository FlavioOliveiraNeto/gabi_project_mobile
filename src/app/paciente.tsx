import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppHeader from '@/components/dashboard/app-header';
import { Btn, IconBtn, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { formatLong, formatShort, isToday, parseDate } from '@/lib/date';
import {
  createPatientNote,
  deletePatientNote,
  getClientDashboard,
  updatePatientNote,
  type ClientDashboardData,
  type PatientNote,
} from '@/services/dashboard';

function StatCard({
  icon,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.card, { flex: 1, minWidth: 150, gap: 10 }]}>
      <View style={[s.row, { gap: 8 }]}>
        <Ionicons name={icon} size={16} color={C.primary} />
        <Text style={s.muted}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

export default function PatientDashboard() {
  const [data, setData] = useState<ClientDashboardData | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    () =>
      getClientDashboard()
        .then((dash) => {
          setData(dash);
          setNotes(dash.notes);
        })
        .catch((error: unknown) => console.error(error))
        .finally(() => setIsLoading(false)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return load();
  }, [load]);

  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function saveNote() {
    const text = newNote.trim();
    if (!text || savingNote) return;
    setSavingNote(true);
    try {
      const note = await createPatientNote(text);
      setNotes((prev) => [note, ...prev]);
      setNewNote('');
    } finally {
      setSavingNote(false);
    }
  }

  async function removeNote(id: number) {
    await deletePatientNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function confirmEdit(noteId: number) {
    const text = editingContent.trim();
    if (!text || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await updatePatientNote(noteId, text);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingNoteId(null);
      setEditingContent('');
    } finally {
      setSavingEdit(false);
    }
  }

  const next = data?.next_session ?? null;
  const meetLink = data?.profile.google_meet_link ?? null;
  const canJoinSession = Boolean(next && meetLink && isToday(parseDate(next.date)));

  return (
    <View style={s.screen}>
      <AppHeader greeting={`Olá, ${data?.profile.name ?? 'Paciente'}!`} />

      {isLoading && !data ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={C.primary} />}>
          <View style={[s.row, { gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }]}>
            <StatCard icon="calendar-outline" label="Próxima Sessão">
              {next ? (
                <View>
                  <Text style={{ fontSize: 15, color: C.foreground }}>{formatLong(parseDate(next.date))}</Text>
                  <Text style={{ color: C.primary, fontWeight: '600', marginTop: 2 }}>
                    {next.time ?? 'Horário a definir'}
                  </Text>
                </View>
              ) : (
                <Text style={s.muted}>Nenhuma sessão agendada</Text>
              )}
            </StatCard>

            <StatCard icon="checkmark-circle-outline" label="Sessões realizadas">
              <Text style={{ fontSize: 28, color: C.foreground }}>
                {data?.stats.completed_sessions ?? 0}
              </Text>
            </StatCard>

            <StatCard icon="alert-circle-outline" label="Faltas acumuladas">
              <Text
                style={{
                  fontSize: 28,
                  color: (data?.stats.absent_sessions ?? 0) > 0 ? C.amber : C.foreground,
                }}>
                {data?.stats.absent_sessions ?? 0}
              </Text>
            </StatCard>
          </View>

          <View style={[s.card, { gap: 12 }]}>
            <View style={[s.row, { gap: 10 }]}>
              <Ionicons name="time-outline" size={18} color={C.primary} />
              <Text style={s.title}>Detalhes da Sessão</Text>
            </View>

            {next ? (
              <View style={{ gap: 4 }}>
                <Text style={s.muted}>
                  Data: <Text style={{ color: C.foreground }}>{formatLong(parseDate(next.date))}</Text>
                </Text>
                <Text style={s.muted}>
                  Horário: <Text style={{ color: C.foreground }}>{next.time ?? 'A definir'}</Text>
                </Text>
              </View>
            ) : (
              <Text style={s.muted}>Nenhuma sessão agendada. Entre em contato com sua terapeuta.</Text>
            )}

            {canJoinSession ? (
              <Pressable
                onPress={() => Linking.openURL(meetLink!)}
                style={[s.row, { gap: 8, alignSelf: 'flex-start' }]}>
                <Ionicons name="videocam-outline" size={16} color={C.secondary} />
                <Text style={{ color: C.secondary, fontWeight: '600' }}>Entrar na sessão</Text>
              </Pressable>
            ) : next && !meetLink ? (
              <Text style={[s.muted, { fontStyle: 'italic' }]}>Link do Google Meet não configurado.</Text>
            ) : null}
          </View>

          <View style={[s.card, { gap: 12 }]}>
            <View style={[s.row, { gap: 10 }]}>
              <Ionicons name="document-text-outline" size={18} color={C.primary} />
              <Text style={s.title}>Minhas Anotações</Text>
            </View>
            <Text style={[s.muted, { fontSize: 11, fontStyle: 'italic' }]}>
              Visíveis apenas para você
            </Text>

            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              multiline
              numberOfLines={3}
              placeholder="Escreva algo importante sobre seu processo..."
              placeholderTextColor={C.mutedForeground}
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />
            <Btn
              title="Salvar anotação"
              loading={savingNote}
              disabled={!newNote.trim()}
              onPress={saveNote}
            />

            {notes.length === 0 ? (
              <Text style={s.muted}>Nenhuma anotação ainda.</Text>
            ) : (
              notes.map((note) => (
                <View
                  key={note.id}
                  style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12 }}>
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
                            size={16}
                            label="Editar anotação"
                            onPress={() => {
                              setEditingNoteId(note.id);
                              setEditingContent(note.content);
                            }}
                          />
                          <IconBtn
                            name="trash-outline"
                            size={16}
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
        </ScrollView>
      )}
    </View>
  );
}
