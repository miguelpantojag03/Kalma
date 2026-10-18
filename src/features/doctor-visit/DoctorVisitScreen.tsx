import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { CalendarClock, ClipboardList, Pill, Stethoscope, X } from 'lucide-react-native';
import { AudioWave, Banner, Button, Card, Chip, ChipGroup, KText, Mascot, MicButton, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { fullDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { closeModal } from '@/lib/nav';
import { scheduleFollowUpReminder } from '@/lib/notifications';
import { getMicPermission, requestMicPermission, speechAvailable, useSpeech } from '@/lib/speech';
import { useKalma } from '@/lib/store';
import { organizeVisitAI } from '@/lib/ai';
import { VISIT_EXAMPLES, type OrganizedVisit } from '@/mocks/organizeVisit';
import { space, touch, useTheme } from '@/theme';

type Phase = 'input' | 'listening' | 'processing' | 'review';

/**
 * "Volví del médico": la persona cuenta lo que le dijo su médico y Kalma lo ordena en cuatro grupos.
 * Kalma NO interpreta ni agrega indicaciones: todo es editable y viene de lo que la persona dijo.
 */
export function DoctorVisitScreen() {
  const { profile, addDoctorVisit } = useKalma();
  const showToast = useToast((s) => s.show);
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [doctor, setDoctor] = useState<string | null>(profile.doctors[0]?.name ?? null);
  const [visit, setVisit] = useState<OrganizedVisit | null>(null);
  const [saving, setSaving] = useState(false);

  const process = async (t: string) => {
    if (t.trim().length < 5) return;
    setText(t);
    setPhase('processing');
    // IA real con respaldo local (D81)
    setVisit((await organizeVisitAI(t)).visit);
    setPhase('review');
  };

  const speech = useSpeech({ onDone: (t) => void process(t), onError: () => setPhase('input') });

  const listen = async () => {
    let p = await getMicPermission();
    if (p === 'undetermined') p = await requestMicPermission();
    if (p !== 'granted') return showToast({ message: 'Sin micrófono puedes escribirlo', tone: 'info' });
    setPhase('listening');
    speech.start();
  };

  const save = async () => {
    if (!visit) return;
    setSaving(true);
    addDoctorVisit({ visitedAt: new Date().toISOString(), doctor, transcript: text, ...visit });
    let reminders = 0;
    for (const f of visit.followUps) if (f.date && (await scheduleFollowUpReminder(f.label, f.date))) reminders++;
    haptic.success();
    showToast({ message: reminders ? `Listo, lo guardé y te recordaré ${reminders === 1 ? 'el control' : `${reminders} controles`}` : 'Listo, lo guardé' });
    closeModal();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Volví del médico', presentation: 'modal' }} />
      <Screen edges={['bottom']} keyboard scroll={phase !== 'listening' && phase !== 'processing'}>
        {phase === 'input' && (
          <View style={{ gap: space[4], paddingTop: space[4] }}>
            <KText variant="title">¿Qué te dijo tu médico?</KText>
            <KText tone="muted">Cuéntamelo como lo recuerdes: qué cree que tienes, qué te mandó, qué debes hacer y cuándo volver. Yo lo ordeno.</KText>
            {speechAvailable && (
              <View style={{ alignItems: 'center', gap: space[2] }}>
                <MicButton onPress={listen} />
                <KText variant="small" tone="muted">Toca para dictar</KText>
              </View>
            )}
            <TextField label={speechAvailable ? 'O escríbelo' : 'Escríbelo'} placeholder="Ej.: me dijo que es migraña, que tome…" value={text} onChangeText={setText} />
            <Button fullWidth size="lg" label="Organizar" disabled={text.trim().length < 5} onPress={() => void process(text)} />
            <KText variant="smallStrong" tone="muted">Ejemplos</KText>
            {VISIT_EXAMPLES.map((e) => (
              <Button key={e} variant="secondary" fullWidth label={`«${e.slice(0, 70)}…»`} onPress={() => void process(e)} />
            ))}
          </View>
        )}

        {phase === 'listening' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
            <Mascot mood="listening" size={140} />
            <KText variant="title" center accessibilityLiveRegion="polite">Te escucho…</KText>
            <KText center>{speech.transcript}</KText>
            <AudioWave level={speech.level} active />
            <MicButton state="listening" level={speech.level} onPress={speech.stop} />
          </View>
        )}

        {phase === 'processing' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
            <Mascot mood="thinking" size={140} />
            <KText variant="title" center accessibilityLiveRegion="polite">Ordenando lo que te dijeron…</KText>
          </View>
        )}

        {phase === 'review' && visit && (
          <View style={{ gap: space[4], paddingTop: space[4] }}>
            <KText variant="title">Esto entendí</KText>
            <Banner tone="info" title="Revisa y corrige lo que haga falta" message="Es lo que contaste, ordenado. Si tienes dudas sobre tu tratamiento, pregúntale a tu médico." />

            {profile.doctors.length > 0 && (
              <ChipGroup label="¿Con quién fue la cita?">
                {profile.doctors.map((d) => <Chip key={d.name} label={`${d.name} · ${d.specialty}`} selected={doctor === d.name} onPress={() => setDoctor(d.name)} />)}
                <Chip label="Otro" selected={doctor === null} onPress={() => setDoctor(null)} />
              </ChipGroup>
            )}

            <Section icon={Stethoscope} title="Lo que mencionó tu médico" empty="No mencionaste un diagnóstico."
              items={visit.diagnoses} onChange={(diagnoses) => setVisit({ ...visit, diagnoses })} />
            <Section icon={Pill} title="Medicamentos" empty="No mencionaste medicamentos."
              items={visit.medications.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(' · '))}
              onChange={(items) => setVisit({ ...visit, medications: items.map((t) => visit.medications.find((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(' · ') === t) ?? { name: t, dose: null, frequency: null }) })} />
            <Section icon={ClipboardList} title="Indicaciones" empty="No mencionaste indicaciones."
              items={visit.instructions} onChange={(instructions) => setVisit({ ...visit, instructions })} />
            <Section icon={CalendarClock} title="Próximos controles" empty="No mencionaste un próximo control."
              items={visit.followUps.map((f) => (f.date ? `${f.label} (${fullDate(f.date)})` : f.label))}
              onChange={(items) => setVisit({ ...visit, followUps: items.map((t) => visit.followUps.find((f) => (f.date ? `${f.label} (${fullDate(f.date)})` : f.label) === t) ?? { label: t, date: null }) })} />

            <Button fullWidth size="lg" label="Guardar" loading={saving} onPress={save} />
            <Button fullWidth variant="ghost" label="Volver a contarlo" onPress={() => setPhase('input')} />
          </View>
        )}
      </Screen>
    </>
  );
}

/** Grupo editable: se puede quitar cada ítem o agregar uno. */
function Section({ icon: Icon, title, items, empty, onChange }: {
  icon: typeof Pill; title: string; items: string[]; empty: string; onChange: (items: string[]) => void;
}) {
  const { c } = useTheme();
  const [adding, setAdding] = useState('');
  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Icon size={20} color={c.primaryStrong} />
        <KText variant="subheading">{title}</KText>
      </View>
      {items.length === 0 && <KText variant="small" tone="muted">{empty}</KText>}
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <KText style={{ flex: 1 }}>• {it}</KText>
          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar: ${it}`} onPress={() => onChange(items.filter((_, j) => j !== i))} style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color={c.muted} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[2] }}>
        <View style={{ flex: 1 }}>
          <TextField label={`Agregar a ${title.toLowerCase()}`} hideLabel multiline={false} placeholder="Agregar…" value={adding} onChangeText={setAdding} />
        </View>
        <Button label="Agregar" disabled={adding.trim().length < 2} onPress={() => { onChange([...items, adding.trim()]); setAdding(''); }} />
      </View>
    </Card>
  );
}
