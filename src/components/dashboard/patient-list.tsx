import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Btn, IconBtn, s } from '@/components/ui';
import { C } from '@/constants/theme';
import type { CalendarSession, PatientUser } from '@/services/dashboard';

import PatientCard from './patient-card';

const PER_PAGE = 5;

export default function PatientList({
  patients,
  sessions,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  onNoteSaved,
}: {
  patients: PatientUser[];
  sessions: CalendarSession[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (patient: PatientUser) => void;
  onDelete: (patient: PatientUser) => void;
  onNoteSaved: (patientId: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const sorted = [...patients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return q ? sorted.filter((p) => p.name.toLowerCase().includes(q)) : sorted;
  }, [patients, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <View style={[s.card, { gap: 12 }]}>
      <View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Ionicons name="people-outline" size={18} color={C.primary} />
        <Text style={s.title}>Pacientes</Text>
        <Text style={[s.chip, { marginLeft: 'auto' }]}>
          {patients.length} cadastrado{patients.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <Btn title="Adicionar paciente" onPress={onAdd} />

      <TextInput
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setPage(1);
        }}
        placeholder="Buscar paciente..."
        placeholderTextColor={C.mutedForeground}
        style={s.input}
      />

      {isLoading ? (
        <Text style={[s.muted, { textAlign: 'center', paddingVertical: 20 }]}>
          Carregando pacientes...
        </Text>
      ) : paginated.length === 0 ? (
        <Text style={[s.muted, { textAlign: 'center', paddingVertical: 20 }]}>
          {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
        </Text>
      ) : (
        <>
          {totalPages > 1 ? (
            <View style={[s.row, { justifyContent: 'flex-end', gap: 4 }]}>
              <IconBtn
                name="chevron-back"
                size={16}
                label="Página anterior"
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text style={[s.muted, { fontSize: 12 }]}>
                {currentPage} / {totalPages}
              </Text>
              <IconBtn
                name="chevron-forward"
                size={16}
                label="Próxima página"
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </View>
          ) : null}

          {paginated.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              sessions={sessions.filter((s) => s.patient.id === patient.id)}
              isOpen={openId === patient.id}
              onToggleNotes={() => setOpenId((id) => (id === patient.id ? null : patient.id))}
              onEdit={() => onEdit(patient)}
              onDelete={() => onDelete(patient)}
              onNoteSaved={onNoteSaved}
            />
          ))}
        </>
      )}
    </View>
  );
}
