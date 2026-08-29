import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader from '@/components/dashboard/app-header';
import ConfirmModal from '@/components/dashboard/confirm-modal';
import DashboardCalendar from '@/components/dashboard/dashboard-calendar';
import DashboardStats from '@/components/dashboard/dashboard-stats';
import PatientFormModal from '@/components/dashboard/patient-form-modal';
import PatientList from '@/components/dashboard/patient-list';
import { apiErrorMessage, Btn, ErrorText, s } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  deletePatient,
  getTherapistDashboard,
  type CalendarSession,
  type PatientUser,
  type TherapistStats,
} from '@/services/dashboard';

export default function PsychDashboard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<TherapistStats | null>(null);
  const [patients, setPatients] = useState<PatientUser[]>([]);
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formPatient, setFormPatient] = useState<PatientUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientUser | null>(null);

  const loadDashboard = useCallback(
    () =>
      getTherapistDashboard()
        .then((response) => {
          setStats(response.stats);
          setSessions(response.calendar_sessions ?? []);
          setPatients(response.patients ?? []);
          setLoadError(null);
        })
        .catch((error: unknown) =>
          setLoadError(apiErrorMessage(error, 'Não foi possível carregar o painel.')),
        )
        .finally(() => setIsLoading(false)),
    [],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return loadDashboard();
  }, [loadDashboard]);

  function openEdit(patient: PatientUser) {
    setFormPatient(patient);
    setShowForm(true);
  }

  return (
    <View style={s.screen}>
      <AppHeader greeting={`Olá, ${user?.name ?? 'Terapeuta'}!`} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={C.primary} />
          }>
          {loadError ? (
            <View style={[s.card, { gap: 12 }]}>
              <ErrorText marginBottom={0}>{loadError}</ErrorText>
              <Btn title="Tentar novamente" variant="outline" onPress={refresh} />
            </View>
          ) : null}

          <DashboardStats stats={stats} sessions={sessions} />

          <DashboardCalendar
            sessions={sessions}
            patients={patients}
            onReload={loadDashboard}
            onEditPatient={(id) => {
              const patient = patients.find((p) => p.id === id);
              if (patient) openEdit(patient);
            }}
          />

          <PatientList
            patients={patients}
            sessions={sessions}
            isLoading={isLoading}
            onAdd={() => {
              setFormPatient(null);
              setShowForm(true);
            }}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onNoteSaved={(patientId) =>
              setPatients((prev) =>
                prev.map((p) =>
                  p.id === patientId ? { ...p, clinical_notes_count: p.clinical_notes_count + 1 } : p,
                ),
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {showForm ? (
        <PatientFormModal
          patientToEdit={formPatient}
          onClose={() => {
            setShowForm(false);
            setFormPatient(null);
          }}
          onSaved={refresh}
        />
      ) : null}

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Excluir paciente"
        message={`Tem certeza que deseja excluir ${deleteTarget?.name ?? ''}? Todas as anotações e sessões serão removidas permanentemente.`}
        confirmLabel="Excluir"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deletePatient(deleteTarget.id);
          await loadDashboard();
        }}
      />
    </View>
  );
}
