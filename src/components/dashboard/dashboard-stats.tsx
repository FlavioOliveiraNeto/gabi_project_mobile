import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { s } from '@/components/ui';
import { C } from '@/constants/theme';
import type { TherapistStats } from '@/services/dashboard';

const CARDS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  key: keyof TherapistStats;
  caption: string;
}[] = [
  { icon: 'people-outline', label: 'Pacientes', key: 'active_clients', caption: 'ativos' },
  { icon: 'calendar-outline', label: 'Hoje', key: 'sessions_today', caption: 'sessões agendadas' },
  { icon: 'time-outline', label: 'Esta Semana', key: 'sessions_this_week', caption: 'sessões agendadas' },
  {
    icon: 'checkmark-outline',
    label: 'Esta Semana',
    key: 'sessions_completed_this_week',
    caption: 'sessões realizadas',
  },
];

export default function DashboardStats({ stats }: { stats: TherapistStats }) {
  return (
    <View style={[s.row, { flexWrap: 'wrap', gap: 12 }]}>
      {CARDS.map((c) => (
        <View key={c.key} style={[s.card, { flexBasis: '47%', flexGrow: 1, gap: 8 }]}>
          <View style={[s.row, { gap: 8 }]}>
            <Ionicons name={c.icon} size={16} color={C.primary} />
            <Text style={[s.muted, { fontWeight: '500' }]}>{c.label}</Text>
          </View>
          <Text style={{ fontSize: 26, color: C.foreground }}>{stats[c.key]}</Text>
          <Text style={[s.muted, { fontSize: 12 }]}>{c.caption}</Text>
        </View>
      ))}
    </View>
  );
}
