import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Coffee, Mic, Phone } from 'lucide-react-native';
import {
  AudioWave, Banner, BottomSheet, Button, CalendarDay, Card, Chip, ChipGroup, EmptyState, EventCard,
  IntensityBadge, IntensitySlider, KText, Mascot, MicButton, PatternCard, PermissionPrompt, ProgressRing,
  TextField, useToast, type MicState,
} from '@/components/ui';
import { contrastRatio } from '@/lib/contrast';
import { intensityWord } from '@/lib/intensity';
import { layout, radius, space, typeScale, useTheme, useThemePref, type ColorTokens } from '@/theme';

/**
 * Catálogo vivo del design system dentro de la app: todos los componentes con sus variantes y
 * estados, en el tema activo. Complementa a Storybook y funciona en Expo Go para la sustentación.
 */
export function DesignSystemScreen() {
  const { c } = useTheme();
  const { pref, setPref } = useThemePref();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <ChipGroup label="Tema" hideLabel>
        {(['system', 'light', 'dark'] as const).map((p) => (
          <Chip key={p} compact label={{ system: 'Sistema', light: 'Claro', dark: 'Oscuro' }[p]} selected={pref === p} onPress={() => setPref(p)} />
        ))}
      </ChipGroup>

      <Section title="Color y contraste" lead="Cada par de uso, medido en vivo en el tema activo. Mínimo 4.5:1 para texto y 3:1 para controles e íconos.">
        <ContrastTable c={c} />
      </Section>

      <Section title="Intensidad 0–10" lead="Siempre color + número + palabra.">
        <View style={styles.row}>
          {[0, 2, 4, 6, 8, 10].map((v, i) => (
            <View key={v} style={[styles.swatch, { backgroundColor: c.intensity[i] }]}>
              <KText tone="onIntensity" style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 20 }}>{v}</KText>
              <KText tone="onIntensity" variant="caption">{intensityWord(v)}</KText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Tipografía" lead="Nunito para títulos, Inter para texto. Escala 34/28/22/18/16/14/12 con escalado del sistema activo.">
        {(['display', 'title', 'heading', 'subheading', 'body', 'small', 'caption'] as const).map((v) => (
          <View key={v} style={{ gap: 2 }}>
            <KText variant="caption" tone="muted">{v} · {typeScale[v].fontSize}</KText>
            <KText variant={v} accessibilityRole="text">{v === 'caption' ? 'SÍNTOMA' : 'Listo, lo guardé'}</KText>
          </View>
        ))}
      </Section>

      <Section title="Button">
        <Button label="Primario" fullWidth />
        <Button label="Prefiero escribirlo" variant="secondary" fullWidth />
        <Button label="Ahora no" variant="ghost" fullWidth />
        <Button label="Grabar otra vez" fullWidth icon={(col) => <Mic size={20} color={col} />} />
        <Button label="Guardar" loading loadingLabel="Guardando…" fullWidth />
        <Button label="Deshabilitado" disabled fullWidth />
        <Button label="Llamar al 123 (solo emergencia)" variant="danger" size="lg" fullWidth icon={(col) => <Phone size={24} color={col} />} />
      </Section>

      <Section title="MicButton" lead="Un toque para empezar, otro para terminar. Toca el grande.">
        <MicDemo />
        <View style={[styles.row, { justifyContent: 'space-around' }]}>
          {(['processing', 'blocked', 'unavailable'] as const).map((s) => (
            <View key={s} style={{ alignItems: 'center', gap: space[2] }}>
              <MicButton size="nav" state={s} />
              <KText variant="caption" tone="muted">{s}</KText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Mascota">
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          {(['idle', 'listening', 'thinking', 'happy', 'sleepy'] as const).map((m) => (
            <View key={m} style={{ alignItems: 'center', gap: space[1] }}>
              <Mascot mood={m} size={56} />
              <KText variant="caption" tone="muted">{m}</KText>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Chip">
        <ChipsDemo />
        <View style={styles.row}>
          <Chip label="Tinto" icon={(col) => <Coffee size={16} color={col} />} />
          <Chip label="Filtro" compact />
          <Chip label="Deshabilitado" disabled />
        </View>
      </Section>

      <Section title="IntensitySlider" lead="Con lector de pantalla: desliza hacia arriba o abajo para ajustar.">
        <SliderDemo />
        <View style={styles.row}>
          {[0, 3, 5, 7, 10].map((v) => <IntensityBadge key={v} value={v} showWord />)}
        </View>
      </Section>

      <Section title="EventCard" lead="Normal · baja confianza · editada · seleccionada.">
        <EventCard type="symptom" title="Dolor de cabeza" time="2:30 p. m." detail="Después del almuerzo · aprox." intensity={7} confidence={0.9} sourceText="me dolió la cabeza fuerte después del almuerzo" onEdit={() => {}} onRemove={() => {}} />
        <EventCard type="food" title="Algo con queso" detail="Almuerzo" confidence={0.4} sourceText="comí algo con queso creo" onEdit={() => {}} onRemove={() => {}} />
        <EventCard type="medication" title="Acetaminofén (Dolex)" time="2:45 p. m." edited onEdit={() => {}} />
        <EventCard type="sleep" title="5 h de sueño" detail="Calidad 2 de 5" selected onPress={() => {}} />
        <EventCard type="drink" title="Tinto" time="10:00 a. m." detail="2 tazas · cafeína" />
      </Section>

      <Section title="CalendarDay" lead="Sin síntomas · leve · moderado · fuerte · muy fuerte · sin registro · hoy · seleccionado.">
        <View style={styles.row}>
          {([
            [10, undefined], [11, 2], [12, 5], [13, 8], [14, 10], [15, null],
          ] as const).map(([d, i]) => (
            <View key={d} style={{ width: 44 }}>
              <CalendarDay day={d} fullDate={`${d} de octubre`} maxIntensity={i} />
            </View>
          ))}
          <View style={{ width: 44 }}><CalendarDay day={17} fullDate="17 de octubre" isToday maxIntensity={3} /></View>
          <View style={{ width: 44 }}><CalendarDay day={16} fullDate="16 de octubre" selected maxIntensity={6} /></View>
        </View>
      </Section>

      <Section title="PatternCard" lead="Posible · Probable · Fuerte · nuevo · descartado.">
        <PatternCard level="strong" isNew statement="El 70 % de tus dolores de cabeza llegaron después de noches de menos de 6 horas." evidence="14 de 20 episodios · 45 días" onPress={() => {}} />
        <PatternCard level="probable" statement="La molestia digestiva apareció más seguido en las 6 horas después de comer lácteos." evidence="8 de 11 episodios · 45 días" onPress={() => {}} />
        <PatternCard level="possible" dismissed statement="Los días con más de 3 tintos tuviste dolor de cabeza un poco más seguido." evidence="6 de 20 episodios" />
      </Section>

      <Section title="ProgressRing">
        <View style={[styles.row, { alignItems: 'center' }]}>
          <ProgressRing value={6} max={14} label="6 de 14 días para tu primer análisis" />
          <ProgressRing value={14} max={14} label="Análisis listo" />
          <ProgressRing value={9} max={21} size={110} label="Día 9 de 21 del experimento">
            <KText variant="smallStrong" center>Día 9{'\n'}<KText variant="caption" tone="muted">de 21</KText></KText>
          </ProgressRing>
        </View>
      </Section>

      <Section title="Banner y Toast">
        <Banner tone="reminder" title="Hora del check-in" message="Tres preguntas rápidas sobre tu día." onDismiss={() => {}} />
        <Banner tone="success" title="Listo, lo guardé" />
        <Banner tone="offline" title="Estás sin conexión" message="Puedes seguir registrando; lo proceso cuando vuelvas." />
        <Banner tone="error" title="No pude escucharte bien" message="¿Lo intentamos otra vez o prefieres escribirlo?" />
        <ToastDemo />
      </Section>

      <Section title="BottomSheet">
        <SheetDemo />
      </Section>

      <Section title="TextField" lead="Alternativa por texto a la voz.">
        <TextField label="Escríbelo como lo dirías" hint="Ej.: almorcé bandeja paisa y a las 3 me dolió la cabeza" placeholder="Cuéntame…" />
        <TextField label="Escríbelo como lo dirías" defaultValue="asdf" error="No alcancé a entender. ¿Me cuentas qué sentiste o qué comiste?" />
      </Section>

      <Section title="EmptyState">
        <Card><EmptyState kind="first-use" title="Tu día está en blanco" description="Toca el micrófono y cuéntame cómo te sientes." actions={<Button fullWidth label="Hacer mi primer registro" />} /></Card>
        <Card><EmptyState kind="error" title="No pude cargar tu calendario" description="Tus datos están a salvo en tu celular." actions={<Button fullWidth label="Intentar otra vez" />} /></Card>
      </Section>

      <Section title="PermissionPrompt" lead="Antes del diálogo del sistema · después de negarlo.">
        <Card><PermissionPrompt kind="microphone" onAllow={() => {}} onAlternative={() => {}} /></Card>
        <Card><PermissionPrompt kind="microphone" status="denied" onAllow={() => {}} onAlternative={() => {}} /></Card>
      </Section>
    </ScrollView>
  );
}

/* ---------- piezas del catálogo ---------- */

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ gap: space[1] }}>
        <KText variant="heading">{title}</KText>
        {!!lead && <KText variant="small" tone="muted">{lead}</KText>}
      </View>
      {children}
    </View>
  );
}

function ContrastTable({ c }: { c: ColorTokens }) {
  const pairs: [string, string, string, number][] = [
    ['Texto / fondo', c.text, c.bg, 4.5],
    ['Secundario / tarjeta', c.muted, c.surface, 4.5],
    ['Botón primario', c.onPrimary, c.primaryStrong, 4.5],
    ['Marca / tarjeta', c.primaryStrong, c.surface, 4.5],
    ['Chip seleccionado', c.text, c.primarySoft, 4.5],
    ['Advertencia', c.warningText, c.surface, 4.5],
    ['Emergencia', c.onDanger, c.danger, 4.5],
    ['Intensidad 10', c.onIntensity, c.intensity[5], 4.5],
    ['Borde de control', c.borderStrong, c.surface, 3],
    ['⚠ Blanco / primary', '#FFFFFF', c.primary, 4.5],
  ];
  return (
    <View style={{ gap: space[2] }}>
      {pairs.map(([label, fg, bg, min]) => {
        const r = contrastRatio(fg, bg);
        const ok = r >= min;
        return (
          <View key={label} style={styles.contrastRow} accessible accessibilityLabel={`${label}: ${r.toFixed(2)} a 1, ${ok ? 'pasa' : 'no pasa'}`}>
            <View style={[styles.sample, { backgroundColor: bg, borderColor: c.border }]}>
              <KText style={{ color: fg, fontFamily: 'Inter_700Bold' }}>Aa</KText>
            </View>
            <KText variant="small" style={{ flex: 1 }}>{label}</KText>
            <KText variant="smallStrong" tone={ok ? 'default' : 'warning'}>
              {r.toFixed(2)} {ok ? '✓' : '✗'}
            </KText>
          </View>
        );
      })}
    </View>
  );
}

function MicDemo() {
  const [state, setState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (state !== 'listening') return;
    const id = setInterval(() => setLevel(Math.random() * 0.9 + 0.1), 120);
    return () => clearInterval(id);
  }, [state]);
  return (
    <Card style={{ alignItems: 'center', gap: space[3] }}>
      <KText variant="subheading" accessibilityLiveRegion="polite">
        {state === 'listening' ? 'Te escucho…' : state === 'processing' ? 'Kalma está entendiendo…' : 'Toca para hablar'}
      </KText>
      <AudioWave level={state === 'listening' ? level : 0} active={state === 'listening'} />
      <MicButton
        state={state}
        level={state === 'listening' ? level : 0}
        onPress={() => {
          if (state === 'listening') {
            setState('processing');
            setTimeout(() => setState('idle'), 1500);
          } else setState('listening');
        }}
      />
    </Card>
  );
}

function ChipsDemo() {
  const [one, setOne] = useState<string | null>('Un poco');
  const [many, setMany] = useState<string[]>(['Pantallas']);
  return (
    <>
      <ChipGroup label="¿Te alivió el acetaminofén?">
        {['Sí, del todo', 'Un poco', 'No', 'Todavía no sé'].map((o) => (
          <Chip key={o} label={o} selected={one === o} onPress={() => setOne(o)} />
        ))}
      </ChipGroup>
      <ChipGroup label="¿Qué crees que influyó? (varias)" mode="multiple">
        {['Pantallas', 'Estrés', 'Poco sueño', 'Tinto'].map((o) => (
          <Chip
            key={o}
            mode="multiple"
            label={o}
            selected={many.includes(o)}
            onPress={() => setMany((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))}
          />
        ))}
      </ChipGroup>
    </>
  );
}

function SliderDemo() {
  const [v, setV] = useState(7);
  return <IntensitySlider value={v} onChange={setV} inferred />;
}

function ToastDemo() {
  const show = useToast((s) => s.show);
  return <Button variant="secondary" fullWidth label="Mostrar toast con Deshacer" onPress={() => show({ message: 'Listo, lo guardé', actionLabel: 'Deshacer', onAction: () => {} })} />;
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState<string | null>(null);
  return (
    <>
      <Button variant="secondary" fullWidth label="Abrir pregunta de seguimiento" onPress={() => setOpen(true)} />
      <Button variant="secondary" fullWidth label="Abrir confirmación de borrado" onPress={() => setConfirm(true)} />
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Te alivió el dolex?"
        description="Así sé si te sirvió. Puedes saltarlo."
        footer={
          <>
            <Button fullWidth label="Listo" disabled={!v} onPress={() => setOpen(false)} />
            <Button fullWidth variant="ghost" label="Saltar" onPress={() => setOpen(false)} />
          </>
        }
      >
        <ChipGroup label="Alivio" hideLabel>
          {['Sí, del todo', 'Un poco', 'No', 'Todavía no sé'].map((o) => (
            <Chip key={o} label={o} selected={v === o} onPress={() => setV(o)} />
          ))}
        </ChipGroup>
      </BottomSheet>
      <BottomSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        variant="dialog"
        dismissible={false}
        title="¿Borrar todo?"
        description="Se borrarán tus registros, patrones y reportes. No se puede deshacer."
        footer={
          <>
            <Button fullWidth label="No, conservar mis datos" onPress={() => setConfirm(false)} />
            <Button fullWidth variant="ghost" label="Sí, borrar todo" onPress={() => setConfirm(false)} />
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.gutter, paddingBottom: space[7], gap: space[6] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // 3 por fila: a 320–390 de ancho, 6 en una fila cortaban 'Moderado' y 'Muy fuerte'.
  swatch: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md },
  contrastRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sample: { width: 48, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
