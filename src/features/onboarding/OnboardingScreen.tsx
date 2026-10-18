import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react-native';
import { Banner, Button, Card, Checkbox, Chip, ChipGroup, KText, PermissionPrompt, TextField } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { getNotifPermission, requestNotifPermission, scheduleDailyCheckin } from '@/lib/notifications';
import { useKalma } from '@/lib/store';
import { layout, space, useTheme } from '@/theme';

const STEPS = 4;

const CONDITIONS = [
  { id: 'Migraña', label: 'Migraña o dolores de cabeza' },
  { id: 'Molestias digestivas', label: 'Molestias digestivas o colon irritable' },
  { id: 'Otro', label: 'Otra cosa' },
] as const;

const MEDS = [
  { name: 'Acetaminofén (Dolex)', generic: 'acetaminofén' },
  { name: 'Ibuprofeno', generic: 'ibuprofeno' },
  { name: 'Naproxeno', generic: 'naproxeno' },
  { name: 'Buscapina', generic: 'butilbromuro de hioscina' },
  { name: 'Omeprazol', generic: 'omeprazol' },
] as const;

const TIMES = ['20:00', '21:00', '22:00'] as const;
const timeLabel = (t: string) => `${Number(t.slice(0, 2)) - 12}:${t.slice(3)} p. m.`;

/**
 * Onboarding de una cuenta nueva: 4 pasos + primer registro guiado (≤ 6, brief §6).
 * Una decisión principal por paso; lo opcional se puede saltar; "atrás" de Android retrocede de paso.
 * (La bienvenida y el nombre ya se resolvieron al crear la cuenta.)
 */
export function OnboardingScreen() {
  const reduce = useReducedMotion();
  const { profile, updateProfile, setConsent } = useKalma();
  const [step, setStep] = useState(0);

  const [consent, setLocalConsent] = useState({ health: false, ai: false, location: false });
  const [forWhom, setForWhom] = useState<'me' | 'other'>('me');
  const [tracksCycle, setTracksCycle] = useState(false);
  const [personName, setPersonName] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [meds, setMeds] = useState<string[]>([]);
  const [time, setTime] = useState<string>('21:00');
  const [notif, setNotif] = useState<'ask' | 'granted' | 'denied' | 'unsupported'>('ask');

  const back = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    void getNotifPermission().then((p) => setNotif(p === 'granted' ? 'granted' : p === 'unsupported' ? 'unsupported' : 'ask'));
  }, []);

  const finish = async () => {
    for (const k of ['health', 'ai', 'location'] as const) setConsent(k, consent[k]);
    updateProfile({
      conditions: conditions.filter((c) => c !== 'Otro'),
      goals: conditions.map((c) => `Entender ${c.toLowerCase()}`),
      medications: MEDS.filter((m) => meds.includes(m.name)).map((m) => ({ name: m.name, generic_name: m.generic, use: 'rescue' as const })),
      reminderTime: time,
      caregiver: { enabled: forWhom === 'other', personName: forWhom === 'other' ? personName.trim() || null : null },
      onboarded: true,
      tracksCycle,
    });
    if (notif === 'granted') await scheduleDailyCheckin(time, profile.name || undefined);
    router.replace('/');
    router.push({ pathname: '/registro', params: { auto: '1', guiado: '1' } });
  };

  const canContinue = [
    consent.health && consent.ai,
    conditions.length > 0 && (forWhom === 'me' || personName.trim().length >= 2),
    true,
    true,
  ][step];

  return (
    <Screen scroll={false} edges={['top', 'bottom']} keyboard>
      <View style={{ paddingTop: space[3], gap: space[2] }}>
        <KText variant="caption" tone="muted" accessibilityLiveRegion="polite">Paso {step + 1} de {STEPS}</KText>
        <Progress value={step + 1} max={STEPS} />
      </View>

      <ScrollView style={{ flex: 1, marginHorizontal: -layout.gutter }} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingVertical: space[5], gap: space[4] }} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={reduce ? FadeIn : SlideInRight.duration(260)} style={{ gap: space[4] }}>
          {step === 0 && <ConsentStep name={profile.name} value={consent} onChange={setLocalConsent} />}
          {step === 1 && (
            <>
              <KText variant="title">¿Qué quieres entender?</KText>
              <KText tone="muted">Así te pregunto lo que importa. Puedes elegir varias.</KText>
              <ChipGroup label="Lo que quiero entender" hideLabel mode="multiple">
                {CONDITIONS.map((c) => (
                  <Chip key={c.id} mode="multiple" label={c.label} selected={conditions.includes(c.id)} onPress={() => setConditions((xs) => (xs.includes(c.id) ? xs.filter((x) => x !== c.id) : [...xs, c.id]))} />
                ))}
              </ChipGroup>
              <ChipGroup label="¿Para quién vas a registrar?">
                <Chip label="Para mí" selected={forWhom === 'me'} onPress={() => setForWhom('me')} />
                <Chip label="Para alguien que cuido" selected={forWhom === 'other'} onPress={() => setForWhom('other')} />
              </ChipGroup>
              {forWhom === 'other' && (
                <TextField label="¿Cómo se llama esa persona?" multiline={false} placeholder="Ej.: mi mamá, Rosa" value={personName} onChangeText={setPersonName} hint="Te preguntaré «¿Cómo está Rosa?» y el reporte saldrá a su nombre." />
              )}
              {/* Opcional y sin suponer el género: lo decide cada persona (D72) */}
              <Checkbox
                checked={tracksCycle}
                onChange={setTracksCycle}
                requirement="optional"
                label="También quiero registrar el ciclo menstrual"
                description="Para ver si los síntomas cambian con el periodo. Lo puedes cambiar después en Perfil › Mi salud."
              />
            </>
          )}
          {step === 2 && (
            <>
              <KText variant="title">¿Tomas algo cuando te da?</KText>
              <KText tone="muted">Opcional. Solo para anotarlo más rápido; Kalma nunca te dirá qué tomar.</KText>
              <ChipGroup label="Medicamentos" hideLabel mode="multiple">
                {MEDS.map((m) => (
                  <Chip key={m.name} mode="multiple" label={m.name} selected={meds.includes(m.name)} onPress={() => setMeds((xs) => (xs.includes(m.name) ? xs.filter((x) => x !== m.name) : [...xs, m.name]))} />
                ))}
              </ChipGroup>
            </>
          )}
          {step === 3 && (
            <>
              <KText variant="title">¿A qué hora te recuerdo?</KText>
              <KText tone="muted">Un aviso al día para el check-in de la noche (menos de 30 segundos).</KText>
              <ChipGroup label="Hora del recordatorio" hideLabel>
                {TIMES.map((t) => <Chip key={t} label={timeLabel(t)} selected={time === t} onPress={() => setTime(t)} />)}
              </ChipGroup>
              {notif === 'ask' && (
                <Card>
                  <PermissionPrompt
                    kind="notifications"
                    onAllow={async () => setNotif((await requestNotifPermission()) === 'granted' ? 'granted' : 'denied')}
                    onAlternative={() => setNotif('denied')}
                  />
                </Card>
              )}
              {notif === 'granted' && <Banner tone="success" title={`Listo: te recuerdo a las ${timeLabel(time)}`} />}
              {notif === 'denied' && <Banner tone="info" title="Sin recordatorios por ahora" message="Igual verás el aviso del check-in en Hoy por la noche. Puedes activarlos en Perfil." />}
              {notif === 'unsupported' && <Banner tone="info" title="Los recordatorios funcionan en el celular" />}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={{ gap: space[2], paddingBottom: space[2] }}>
        {step < STEPS - 1 ? (
          <Button fullWidth size="lg" label={step === 2 && meds.length === 0 ? 'Saltar' : 'Continuar'} disabled={!canContinue} onPress={next} />
        ) : (
          <Button fullWidth size="lg" label="Hacer mi primer registro" onPress={finish} />
        )}
        {step > 0 && <Button fullWidth variant="ghost" label="Atrás" onPress={back} />}
      </View>
    </Screen>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space[1] }} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: max }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < value ? c.primaryStrong : c.accent }} />
      ))}
    </View>
  );
}

function ConsentStep({ name, value, onChange }: { name: string; value: { health: boolean; ai: boolean; location: boolean }; onChange: (v: { health: boolean; ai: boolean; location: boolean }) => void }) {
  const { c } = useTheme();
  const [more, setMore] = useState(false);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <ShieldCheck size={32} color={c.primaryStrong} />
        <KText variant="title" style={{ flex: 1 }}>{name ? `${name}, tus datos son tuyos` : 'Tus datos son tuyos'}</KText>
      </View>
      <Banner tone="info" title="Kalma no es un servicio médico ni de emergencias" message="No diagnostica, no receta y no reemplaza a tu médico. Si es una emergencia, llama al 123." />
      <KText tone="muted">Vas a registrar datos de salud, que la ley protege de forma especial. Marca lo que aceptas; puedes cambiarlo cuando quieras en Perfil.</KText>
      <Checkbox
        checked={value.health}
        onChange={(v) => onChange({ ...value, health: v })}
        requirement="required"
        label="Guardar mis datos de salud"
        description="Síntomas, comidas, sueño y medicamentos, guardados en tu cuenta. Solo tú puedes verlos."
      />
      <Checkbox
        checked={value.ai}
        onChange={(v) => onChange({ ...value, ai: v })}
        requirement="required"
        label="Entender lo que digo con IA"
        description="Para convertir tu voz o texto en registros. Solo el texto que dictas (sin tu nombre) se envía a Google Gemini; en su versión gratuita, Google puede usarlo para mejorar sus productos. Si no hay conexión, se entiende en el celular."
      />
      <Checkbox
        checked={value.location}
        onChange={(v) => onChange({ ...value, location: v })}
        requirement="optional"
        label="Usar mi ubicación aproximada"
        description="Para cruzar con el clima en el futuro. La app funciona igual sin esto."
      />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore((m) => !m)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48 }}>
        <KText variant="bodyStrong" tone="brand" style={{ flex: 1 }}>Qué hago con tus datos</KText>
        {more ? <ChevronUp size={20} color={c.primaryStrong} /> : <ChevronDown size={20} color={c.primaryStrong} />}
      </Pressable>
      {more && (
        <Card tone="outline" style={{ gap: space[2] }}>
          <KText variant="small">• Los uso solo para mostrarte tus registros, tus patrones y el reporte que tú decidas compartir.</KText>
          <KText variant="small">• Cada cuenta solo puede ver sus propios datos. No los vendo ni los comparto.</KText>
          <KText variant="small">• Puedes exportarlos o eliminar tu cuenta con todos tus datos en Perfil › Cuenta.</KText>
          <KText variant="small">• Puedes revocar tu consentimiento cuando quieras (Ley 1581 de 2012).</KText>
        </Card>
      )}
    </>
  );
}
