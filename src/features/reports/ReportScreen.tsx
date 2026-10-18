import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { FileDown, QrCode, X } from 'lucide-react-native';
import { Banner, BottomSheet, Button, Card, Chip, ChipGroup, EmptyState, IntensityBadge, KText, PatternLevelBadge, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { shortDate } from '@/lib/dates';
import { buildReport, MAX, reportHtml, SECTION_LABEL, suggestedQuestions, type ReportSection } from '@/lib/report';
import { uuid } from '@/lib/id';
import { useKalma } from '@/lib/store';
import { logReport } from '@/lib/sync/engine';
import { usePatterns } from '@/lib/usePatterns';
import { space, touch, useTheme } from '@/theme';

const RANGES = [
  { days: 14, label: '2 semanas' },
  { days: 30, label: '30 días' },
  { days: 45, label: '45 días' },
] as const;
const ALL_SECTIONS = Object.keys(SECTION_LABEL) as ReportSection[];

/**
 * Reporte para el médico: elegir rango y secciones → vista previa → PDF de una página →
 * hoja nativa de compartir (WhatsApp, correo, archivos) o QR para mostrar en la consulta.
 */
export function ReportScreen() {
  const { c } = useTheme();
  const { entries, profile, experiments, reportPatterns } = useKalma();
  const { patterns } = usePatterns();
  const showToast = useToast((s) => s.show);

  const [range, setRange] = useState<number>(30);
  const [sections, setSections] = useState<ReportSection[]>(ALL_SECTIONS);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [newQ, setNewQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const draft = useMemo(
    () => buildReport({ entries, profile, experiments, patterns, selectedPatternIds: reportPatterns, rangeDays: range, questions: [] }),
    [entries, profile, experiments, patterns, reportPatterns, range],
  );
  // Las preguntas sugeridas se cargan una vez; después son de la persona
  const qs = questions ?? suggestedQuestions(patterns, draft);
  const data = useMemo(() => ({ ...draft, questions: qs.slice(0, MAX.questions) }), [draft, qs]);

  const toggleSection = (s: ReportSection) => setSections((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  const share = async () => {
    setBusy(true);
    setError(false);
    try {
      const html = reportHtml(data, sections);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Compartir reporte para el médico' });
        } else {
          await Print.printAsync({ uri });
        }
      }
      logReport(range, sections, uuid());
      showToast({ message: 'Listo, tu reporte está listo para compartir' });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (draft.daysRecorded === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Reporte para el médico' }} />
        <EmptyState kind="no-data" title="Todavía no hay nada para reportar" description="Cuando registres algunos días, aquí armo un resumen de una página para tu consulta." />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Reporte para el médico' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <KText tone="muted">Un resumen de una página para llevar a tu consulta. Tú eliges qué incluir.</KText>

        <ChipGroup label="¿De qué periodo?">
          {RANGES.map((r) => <Chip key={r.days} label={r.label} selected={range === r.days} onPress={() => setRange(r.days)} />)}
        </ChipGroup>

        <ChipGroup label="¿Qué incluir?" mode="multiple">
          {ALL_SECTIONS.map((s) => <Chip key={s} mode="multiple" compact label={SECTION_LABEL[s]} selected={sections.includes(s)} onPress={() => toggleSection(s)} />)}
        </ChipGroup>

        {sections.includes('questions') && (
          <Card style={{ gap: space[3] }}>
            <KText variant="subheading">Preguntas para tu médico</KText>
            {qs.map((q, i) => (
              <View key={`${q}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <KText style={{ flex: 1 }}>{i + 1}. {q}</KText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar la pregunta: ${q}`}
                  onPress={() => setQuestions(qs.filter((_, j) => j !== i))}
                  style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} color={c.muted} />
                </Pressable>
              </View>
            ))}
            {qs.length < MAX.questions && (
              <>
                <TextField label="Agregar una pregunta" hideLabel multiline={false} placeholder="Escribe una pregunta…" value={newQ} onChangeText={setNewQ} />
                <Button variant="secondary" fullWidth label="Agregar" disabled={newQ.trim().length < 3} onPress={() => { setQuestions([...qs, newQ.trim()]); setNewQ(''); }} />
              </>
            )}
            <KText variant="caption" tone="muted">Máximo {MAX.questions}, para que todo quepa en una página.</KText>
          </Card>
        )}

        <KText variant="heading">Vista previa</KText>
        <ReportPreview data={data} sections={sections} />

        {error && <Banner tone="error" title="No pude crear el PDF" message="Intenta otra vez. Si sigue pasando, muestra el QR en la consulta." />}

        <View style={{ gap: space[2] }}>
          <Button fullWidth size="lg" label="Compartir PDF" loading={busy} loadingLabel="Preparando…" icon={(col) => <FileDown size={22} color={col} />} disabled={sections.length === 0} onPress={share} />
          <Button fullWidth variant="secondary" label="Mostrar QR en la consulta" icon={(col) => <QrCode size={20} color={col} />} onPress={() => setQrOpen(true)} />
        </View>

        <BottomSheet open={qrOpen} onClose={() => setQrOpen(false)} title="Muéstrale este código a tu médico" description="Simulado: en la versión real, el médico lo escanea y ve el reporte por 24 horas.">
          <View style={{ alignItems: 'center', gap: space[3], paddingVertical: space[4] }}>
            <View style={{ padding: space[4], backgroundColor: '#FFFFFF', borderRadius: 16 }} accessible accessibilityRole="image" accessibilityLabel="Código QR del reporte (simulado)">
              <QRCode value={`https://kalma.app/r/demo-${range}d`} size={200} color="#1F2A2E" backgroundColor="#FFFFFF" />
            </View>
            <KText variant="small" tone="muted" center>kalma.app/r/demo-{range}d · vence en 24 h</KText>
          </View>
        </BottomSheet>
      </Screen>
    </>
  );
}

/** Vista previa nativa con los mismos datos del PDF (fiel en contenido, adaptada a la pantalla). */
function ReportPreview({ data, sections }: { data: ReturnType<typeof buildReport>; sections: ReportSection[] }) {
  const { c } = useTheme();
  const has = (s: ReportSection) => sections.includes(s);
  return (
    <Card tone="outline" style={{ gap: space[4] }}>
      <View style={{ borderBottomWidth: 2, borderBottomColor: c.primaryStrong, paddingBottom: space[2] }}>
        <KText variant="subheading" tone="brand">Kalma · Reporte para consulta</KText>
        <KText variant="small"><KText variant="smallStrong">{data.patient}</KText> · {shortDate(data.from)} al {shortDate(data.to)} · {data.daysRecorded} de {data.daysInRange} días con registros</KText>
      </View>
      {has('timeline') && (
        <View style={{ gap: space[1] }}>
          <KText variant="smallStrong" tone="brand">LÍNEA DE TIEMPO</KText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 48, gap: 1 }} accessible accessibilityLabel={`Intensidad máxima diaria de los últimos ${data.daysInRange} días`}>
            {data.timeline.map((d) => (
              <View key={d.key} style={{ flex: 1, height: typeof d.max === 'number' ? 6 + d.max * 4 : 3, borderRadius: 2, backgroundColor: typeof d.max === 'number' ? c.intensity[Math.min(5, Math.ceil(d.max / 2))] : d.max === null ? c.border : c.accent }} />
            ))}
          </View>
        </View>
      )}
      {has('summary') && (
        <View style={{ gap: space[1] }}>
          <KText variant="smallStrong" tone="brand">RESUMEN DE EPISODIOS</KText>
          {data.symptoms.map((s) => (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <KText variant="small" style={{ flex: 1 }}>{s.name.charAt(0).toUpperCase() + s.name.slice(1)} · {s.days} días</KText>
              {s.max !== null && <IntensityBadge value={s.max} size="sm" />}
            </View>
          ))}
        </View>
      )}
      {has('patterns') && data.patterns.length > 0 && (
        <View style={{ gap: space[2] }}>
          <KText variant="smallStrong" tone="brand">PATRONES</KText>
          {data.patterns.map((p) => (
            <View key={p.statement} style={{ gap: space[1] }}>
              <PatternLevelBadge level={p.level} />
              <KText variant="small">{p.statement}</KText>
            </View>
          ))}
        </View>
      )}
      {has('medications') && data.medications.length > 0 && (
        <View style={{ gap: space[1] }}>
          <KText variant="smallStrong" tone="brand">MEDICAMENTOS DE RESCATE</KText>
          {data.medications.map((m) => <KText key={m.name} variant="small">{m.name}: {m.times} {m.times === 1 ? 'vez' : 'veces'}</KText>)}
        </View>
      )}
      {has('experiments') && data.experiments.length > 0 && (
        <View style={{ gap: space[1] }}>
          <KText variant="smallStrong" tone="brand">EXPERIMENTOS</KText>
          {data.experiments.map((x) => <KText key={x.title} variant="small">{x.title}: {x.summary}</KText>)}
        </View>
      )}
      {has('questions') && data.questions.length > 0 && (
        <View style={{ gap: space[1] }}>
          <KText variant="smallStrong" tone="brand">PREGUNTAS</KText>
          {data.questions.map((q, i) => <KText key={q} variant="small">{i + 1}. {q}</KText>)}
        </View>
      )}
      <KText variant="caption" tone="muted" style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: space[2] }}>
        Registro generado por el paciente. No constituye diagnóstico.
      </KText>
    </Card>
  );
}
