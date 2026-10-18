import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Plus, Stethoscope } from 'lucide-react-native';
import { BottomSheet, Button, Card, EmptyState, KText, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { fullDate } from '@/lib/dates';
import type { DoctorVisit } from '@/lib/schema';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Historial de visitas al médico. */
export function VisitsScreen() {
  const { c } = useTheme();
  const { doctorVisits, removeDoctorVisit } = useKalma();
  const showToast = useToast((s) => s.show);
  const [open, setOpen] = useState<DoctorVisit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Visitas al médico' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <Button fullWidth size="lg" label="Volví del médico" icon={(col) => <Plus size={22} color={col} />} onPress={() => router.push('/volvi-del-medico')} />
        {doctorVisits.length === 0 ? (
          <EmptyState
            kind="first-use"
            visual={<View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Stethoscope size={40} color={c.text} /></View>}
            title="Aún no has guardado visitas"
            description="Después de una cita, cuéntame qué te dijeron y lo ordeno para que no se te olvide."
          />
        ) : (
          doctorVisits.map((v) => (
            <Pressable key={v.id} accessibilityRole="button" onPress={() => setOpen(v)}>
              <Card style={{ gap: space[1] }}>
                <KText variant="caption" tone="muted">{cap(fullDate(v.visitedAt))}{v.doctor ? ` · ${v.doctor}` : ''}</KText>
                <KText variant="subheading">{v.diagnoses[0] ? cap(v.diagnoses[0]) : 'Visita al médico'}</KText>
                <KText variant="small" tone="muted">
                  {[v.medications.length && `${v.medications.length} medicamento${v.medications.length > 1 ? 's' : ''}`, v.instructions.length && `${v.instructions.length} indicaciones`, v.followUps.length && 'control pendiente'].filter(Boolean).join(' · ') || 'Sin detalles'}
                </KText>
              </Card>
            </Pressable>
          ))
        )}

        <BottomSheet
          open={!!open}
          onClose={() => setOpen(null)}
          title={open?.diagnoses[0] ? cap(open.diagnoses[0]) : 'Visita al médico'}
          description={open ? `${cap(fullDate(open.visitedAt))}${open.doctor ? ` · ${open.doctor}` : ''}` : undefined}
          footer={<Button fullWidth variant="ghost" label="Borrar esta visita" onPress={() => setConfirmDelete(true)} />}
        >
          {open && (
            <View style={{ gap: space[3] }}>
              {open.diagnoses.length > 0 && <Block title="Lo que mencionó tu médico" items={open.diagnoses} />}
              {open.medications.length > 0 && <Block title="Medicamentos" items={open.medications.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(' · '))} />}
              {open.instructions.length > 0 && <Block title="Indicaciones" items={open.instructions} />}
              {open.followUps.length > 0 && <Block title="Próximos controles" items={open.followUps.map((f) => (f.date ? `${f.label} (${fullDate(f.date)})` : f.label))} />}
              <KText variant="caption" tone="muted">Lo que contaste: “{open.transcript}”</KText>
            </View>
          )}
        </BottomSheet>

        <BottomSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          variant="dialog"
          title="¿Borrar esta visita?"
          footer={
            <>
              <Button fullWidth label="Conservarla" onPress={() => setConfirmDelete(false)} />
              <Button fullWidth variant="ghost" label="Sí, borrar" onPress={() => { if (open) removeDoctorVisit(open.id); setConfirmDelete(false); setOpen(null); showToast({ message: 'Borré la visita', tone: 'info' }); }} />
            </>
          }
        />
      </Screen>
    </>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ gap: space[1] }}>
      <KText variant="bodyStrong">{title}</KText>
      {items.map((it) => <KText key={it}>• {it}</KText>)}
    </View>
  );
}
