import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router, Stack, type Href } from 'expo-router';
import { X } from 'lucide-react-native';
import { Button, Card, Chip, ChipGroup, KText, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useKalma } from '@/lib/store';
import { space, touch, useTheme } from '@/theme';

const CONDITIONS = ['Migraña', 'Molestias digestivas', 'Colon irritable', 'Gastritis', 'Cefalea tensional'];

/** Mi salud: condiciones, medicamentos habituales, médicos y modo cuidador. */
export function HealthSettingsScreen() {
  const { c } = useTheme();
  const { profile, updateProfile } = useKalma();
  const showToast = useToast((s) => s.show);
  const [med, setMed] = useState('');
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState('');
  const [personName, setPersonName] = useState(profile.caregiver.personName ?? '');

  const toggleCondition = (x: string) =>
    updateProfile({ conditions: profile.conditions.includes(x) ? profile.conditions.filter((y) => y !== x) : [...profile.conditions, x] });

  const Remove = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${label}`} onPress={onPress} style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}>
      <X size={18} color={c.muted} />
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mi salud' }} />
      <Screen edges={[]} keyboard>
        <View style={{ height: space[3] }} />

        <Card>
          <ChipGroup label="Lo que quiero entender" mode="multiple">
            {[...new Set([...CONDITIONS, ...profile.conditions])].map((x) => (
              <Chip key={x} mode="multiple" label={x} selected={profile.conditions.includes(x)} onPress={() => toggleCondition(x)} />
            ))}
          </ChipGroup>
        </Card>

        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Medicamentos que tomo cuando me da</KText>
          <KText variant="small" tone="muted">Solo para registrarlos más rápido. Kalma no los evalúa ni te dice qué tomar.</KText>
          {profile.medications.length === 0 && <KText variant="small" tone="muted">Aún no has agregado medicamentos.</KText>}
          {profile.medications.map((m) => (
            <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <KText style={{ flex: 1 }}>• {m.name}</KText>
              <Remove label={m.name} onPress={() => updateProfile({ medications: profile.medications.filter((x) => x.name !== m.name) })} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[2] }}>
            <View style={{ flex: 1 }}><TextField label="Agregar medicamento" hideLabel multiline={false} placeholder="Ej.: Ibuprofeno" value={med} onChangeText={setMed} /></View>
            <Button label="Agregar" disabled={med.trim().length < 2} onPress={() => { updateProfile({ medications: [...profile.medications, { name: med.trim(), generic_name: null, use: 'rescue' }] }); setMed(''); }} />
          </View>
        </Card>

        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Mis médicos</KText>
          {profile.doctors.length === 0 && <KText variant="small" tone="muted">Agrega a quien te atiende para elegirlo rápido en «Volví del médico».</KText>}
          {profile.doctors.map((d) => (
            <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <KText style={{ flex: 1 }}>• {d.name}{d.specialty ? ` · ${d.specialty}` : ''}</KText>
              <Remove label={d.name} onPress={() => updateProfile({ doctors: profile.doctors.filter((x) => x.name !== d.name) })} />
            </View>
          ))}
          <TextField label="Nombre" multiline={false} placeholder="Ej.: Dra. Rincón" value={docName} onChangeText={setDocName} />
          <TextField label="Especialidad" multiline={false} placeholder="Ej.: Neurología" value={docSpec} onChangeText={setDocSpec} />
          <Button variant="secondary" fullWidth label="Agregar médico" disabled={docName.trim().length < 2 || profile.doctors.some((d) => d.name === docName.trim())} onPress={() => { updateProfile({ doctors: [...profile.doctors, { name: docName.trim(), specialty: docSpec.trim() }] }); setDocName(''); setDocSpec(''); }} />
        </Card>

        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <KText variant="subheading">Registrar mi ciclo menstrual</KText>
              <KText variant="small" tone="muted">Opcional. Agrega «Mi ciclo», una pregunta en el check-in y la comparación de tus síntomas con tu periodo.</KText>
            </View>
            <Switch
              accessibilityLabel="Registrar mi ciclo menstrual"
              value={!!profile.tracksCycle}
              onValueChange={(v) => { updateProfile({ tracksCycle: v }); showToast({ message: v ? 'Listo: encuentras «Mi ciclo» en Hoy y en Perfil' : 'Listo, ya no te pregunto por tu ciclo', tone: 'info' }); }}
              trackColor={{ true: c.primaryStrong, false: c.borderStrong }}
              thumbColor={c.surface}
            />
          </View>
          {profile.tracksCycle && <Button variant="ghost" label="Ir a Mi ciclo" onPress={() => router.push('/ciclo' as Href)} />}
        </Card>

        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <KText variant="subheading">Modo cuidador</KText>
              <KText variant="small" tone="muted">Registras por alguien que cuidas: Kalma pregunta por esa persona y el reporte sale a su nombre.</KText>
            </View>
            <Switch
              accessibilityLabel="Modo cuidador"
              value={profile.caregiver.enabled}
              onValueChange={(v) => updateProfile({ caregiver: { enabled: v, personName: v ? personName.trim() || null : profile.caregiver.personName } })}
              trackColor={{ true: c.primaryStrong, false: c.borderStrong }}
              thumbColor={c.surface}
            />
          </View>
          {profile.caregiver.enabled && (
            <>
              <TextField label="¿Cómo se llama la persona que cuidas?" multiline={false} placeholder="Ej.: mi mamá, Rosa" value={personName} onChangeText={setPersonName} />
              {personName.trim() !== (profile.caregiver.personName ?? '') && (
                <Button label="Guardar nombre" disabled={personName.trim().length < 2} onPress={() => { updateProfile({ caregiver: { enabled: true, personName: personName.trim() } }); showToast({ message: 'Listo' }); }} />
              )}
            </>
          )}
        </Card>
      </Screen>
    </>
  );
}
