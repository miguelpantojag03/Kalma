import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { setHours } from 'date-fns';
import { Camera, Images, Keyboard, ListChecks, X } from 'lucide-react-native';
import {
  AudioWave, Banner, BottomSheet, Button, Chip, EmptyState, KText, Mascot, MicButton, PermissionPrompt, TextField, useToast,
} from '@/components/ui';
import { NeedsConsent, useCanRecord } from '@/components/NeedsConsent';
import { Screen } from '@/components/Screen';
import { dayKey, fromDayKey, fullDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { closeModal } from '@/lib/nav';
import { detectRedFlags } from '@/lib/redFlags';
import type { Entry, Extraction, ExtractedEvent } from '@/lib/schema';
import { useOnline, useSession } from '@/lib/session';
import { getMicPermission, requestMicPermission, speechAvailable, useSpeech, type PermissionState } from '@/lib/speech';
import { useKalma } from '@/lib/store';
import { extractEntry } from '@/mocks/extractEntry';
import { LISTENING_HINTS, SAMPLE_TRANSCRIPTS } from '@/mocks/transcripts';
import { layout, space } from '@/theme';
import { understandEntry, understandPhoto, type Engine } from '@/lib/ai';
import { ConfirmView } from './ConfirmView';
import { SavedView } from './SavedView';

type Phase =
  | { k: 'start' }
  | { k: 'mic-permission'; status: 'undetermined' | 'denied' }
  | { k: 'camera-permission' }
  | { k: 'listening' }
  | { k: 'simulating'; text: string }
  | { k: 'text' }
  | { k: 'processing'; transcript: string }
  | { k: 'confirm'; transcript: string; source: Entry['source']; extraction: Extraction }
  | { k: 'saved'; count: number }
  | { k: 'error'; kind: 'empty' | 'offline' | 'not-understood'; transcript?: string };

/**
 * Registro (modal). Flujo núcleo del brief:
 * escuchando → "Kalma está entendiendo…" → confirmación editable → (1 pregunta) → "Listo, lo guardé".
 * Desde el micrófono de la barra arranca escuchando de una vez y el sistema corta al detectar silencio:
 * registrar cuesta 2 toques (micrófono + Guardar).
 */
export function RecordScreen() {
  const params = useLocalSearchParams<{ auto?: string; modo?: string; fecha?: string; guiado?: string }>();
  // "Agregar a este día" desde el calendario: la hora base es las 8 p. m. de ese día, para que
  // "en la mañana" o "a las 3" se ubiquen dentro de él.
  const pastDay = params.fecha && params.fecha !== dayKey(new Date()) ? params.fecha : null;
  const baseTime = () => (pastDay ? setHours(fromDayKey(pastDay), 20) : new Date());
  const addEntry = useKalma((s) => s.addEntry);
  const removeEntry = useKalma((s) => s.removeEntry);
  const caregiver = useKalma((s) => s.profile.caregiver);
  const showToast = useToast((s) => s.show);
  const { pending, setPending } = useSession();
  const canRecord = useCanRecord();
  const online = useOnline();

  // Si se vuelve de la pantalla de emergencia con "fue un error", se retoma la confirmación pendiente.
  const [phase, setPhase] = useState<Phase>(() =>
    pending
      ? { k: 'confirm', transcript: pending.transcript, source: pending.source, extraction: pending.extraction }
      : params.modo === 'texto' ? { k: 'text' } : { k: 'start' },
  );
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [engine, setEngine] = useState<Engine | undefined>(undefined);
  const [photo, setPhoto] = useState<{ uri: string; caption: string | null } | undefined>(undefined);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [typed, setTyped] = useState('');
  // Momento del registro: ref para los cálculos en callbacks, estado para mostrarlo.
  const [recordedAtShown, setRecordedAtShown] = useState(baseTime);
  const recordedAt = useRef(recordedAtShown);
  const stamp = useCallback(() => {
    recordedAt.current = pastDay ? setHours(fromDayKey(pastDay), 20) : new Date();
    setRecordedAtShown(recordedAt.current);
  }, [pastDay]);

  /* ---------- procesar ---------- */

  const process = useCallback(
    async (transcript: string, source: Entry['source']) => {
      const text = transcript.trim();
      if (text.length < 2) {
        setPhase({ k: 'error', kind: 'empty' });
        return;
      }
      // Banderas rojas ANTES que nada (también sin internet: es una regla local).
      const red = detectRedFlags(text);
      if (red.detected) {
        haptic.warning();
        setPhase({ k: 'processing', transcript: text });
        const extraction = await extractEntry(text, { recordedAt: recordedAt.current.toISOString(), latencyMs: 0 });
        setPending({ transcript: text, source, extraction });
        setPhase({ k: 'confirm', transcript: text, source, extraction });
        router.push({ pathname: '/emergencia', params: { tipo: red.kind ?? 'physical' } });
        return;
      }
      if (!online) {
        setPhase({ k: 'error', kind: 'offline', transcript: text });
        return;
      }
      setPhase({ k: 'processing', transcript: text });
      // IA real con respaldo local (D81): si Gemini falla o no está configurada, entiende el celular
      const { extraction, engine } = await understandEntry(text, recordedAt.current);
      setEngine(engine);
      if (extraction.events.length === 0) {
        setPhase({ k: 'error', kind: 'not-understood', transcript: text });
        return;
      }
      setPhase({ k: 'confirm', transcript: text, source, extraction });
    },
    [online, setPending],
  );

  /* ---------- micrófono ---------- */

  const speech = useSpeech({
    onDone: (t) => void process(t, 'voice'),
    onError: (err, t) => {
      if (err === 'denied') setPhase({ k: 'mic-permission', status: 'denied' });
      else if (err === 'network') setPhase({ k: 'error', kind: 'offline', transcript: t });
      else setPhase({ k: 'error', kind: 'empty' });
    },
  });

  const startListening = useCallback(async () => {
    if (!speechAvailable) {
      setExamplesOpen(true);
      return;
    }
    const perm: PermissionState = await getMicPermission();
    if (perm === 'undetermined') return setPhase({ k: 'mic-permission', status: 'undetermined' });
    if (perm === 'denied') return setPhase({ k: 'mic-permission', status: 'denied' });
    stamp();
    setPhase({ k: 'listening' });
    speech.start();
  }, [speech, stamp]);

  // Desde la barra: empezar a escuchar sin otro toque.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (params.auto === '1' && !autoStarted.current) {
      autoStarted.current = true;
      void startListening();
    }
  }, [params.auto, startListening]);

  /* ---------- simulación (sin módulo de voz: Expo Go) ---------- */

  const simulate = (text: string) => {
    setExamplesOpen(false);
    stamp();
    setPhase({ k: 'simulating', text });
  };

  /* ---------- foto (reconocida con Gemini) ---------- */

  const takePhoto = async (from: 'camera' | 'library', afterSheet = true) => {
    setPhotoOpen(false);
    // iOS no abre la cámara ni la galería mientras la hoja (un modal) todavía se está cerrando:
    // fallaba sin avisar. Se espera a que termine de cerrarse.
    if (afterSheet && Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 600));
    if (from === 'camera') {
      const perm = await ImagePicker.getCameraPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) return setPhase({ k: 'camera-permission' });
    }
    let res: ImagePicker.ImagePickerResult;
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.4, base64: true, exif: false };
      res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    } catch {
      showToast({ message: from === 'camera' ? 'No pude abrir la cámara. Revisa el permiso en Ajustes.' : 'No pude abrir tus fotos. Revisa el permiso de Fotos en Ajustes.', tone: 'error' });
      return;
    }
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    stamp();
    const describeInstead = (message: string) => {
      showToast({ message, tone: 'info' });
      setTyped('');
      setPhase({ k: 'text' });
    };
    if (!online || !asset.base64) return describeInstead('Sin conexión no puedo mirar la foto. Cuéntame qué es y lo anoto.');
    setPhase({ k: 'processing', transcript: 'Foto' });
    const { extraction, seen, caption } = await understandPhoto(asset.base64, asset.mimeType ?? 'image/jpeg', recordedAt.current);
    if (!extraction) {
      // Nunca se inventa un plato: si no se reconoce, se pide describirlo
      return describeInstead(seen ? `En la foto veo ${seen.charAt(0).toLowerCase()}${seen.slice(1).replace(/\.$/, '')}. Cuéntame qué comiste o tomaste.` : 'No pude reconocer la foto. Cuéntame qué es y lo anoto.');
    }
    setEngine('gemini');
    setPhoto({ uri: asset.uri, caption: caption ?? null });
    setPhase({ k: 'confirm', transcript: 'Foto', source: 'photo', extraction });
  };

  /* ---------- guardar ---------- */

  const save = (events: ExtractedEvent[], c: Extract<Phase, { k: 'confirm' }>) => {
    const entry = addEntry({
      transcript: c.transcript,
      summary: c.extraction.summary,
      source: c.source,
      events,
      recordedAt: recordedAt.current.toISOString(),
    });
    setPending(null);
    setPhase({ k: 'saved', count: events.length });
    setTimeout(() => {
      closeModal();
      showToast({ message: 'Listo, lo guardé', actionLabel: 'Deshacer', onAction: () => removeEntry(entry.id) });
    }, 1600);
  };

  const close = () => {
    speech.abort();
    setPending(null);
    closeModal();
  };

  /* ---------- vistas ---------- */

  if (!canRecord && phase.k !== 'saved') {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <NeedsConsent />
      </Screen>
    );
  }

  if (phase.k === 'saved') {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <SavedView count={phase.count} />
      </Screen>
    );
  }

  if (phase.k === 'confirm') {
    return (
      <Screen scroll={false} edges={['top', 'bottom']} contentContainerStyle={{ paddingHorizontal: 0 }}>
        <CloseBar onClose={close} />
        <View style={{ flex: 1, marginHorizontal: -layout.gutter }}>
          <ConfirmView
            key={phase.extraction.summary + phase.extraction.events.length}
            extraction={phase.extraction}
            transcript={phase.transcript}
            recordedAt={recordedAtShown}
            engine={engine}
            photo={phase.source === 'photo' ? photo : undefined}
            onAddMore={(extra) => void process(`${phase.transcript}, ${extra}`, phase.source)}
            onSave={(events) => save(events, phase)}
            onDiscard={close}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={phase.k === 'text'} edges={['top', 'bottom']}>
      <CloseBar onClose={close} />

      {phase.k === 'start' && (
        <StartView
          caregiverName={caregiver.enabled ? caregiver.personName : null}
          dayLabel={pastDay ? fullDate(fromDayKey(pastDay)) : null}
          guided={params.guiado === '1'}
          onMic={startListening}
          onText={() => setPhase({ k: 'text' })}
          onPhoto={() => setPhotoOpen(true)}
          onExamples={() => setExamplesOpen(true)}
        />
      )}

      {phase.k === 'listening' && <ListeningView transcript={speech.transcript} level={speech.level} onStop={speech.stop} />}

      {phase.k === 'simulating' && <SimulatedListening text={phase.text} onDone={(t) => void process(t, 'voice')} />}

      {phase.k === 'processing' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
          <Mascot mood="thinking" size={140} />
          <KText variant="title" center accessibilityLiveRegion="polite">Kalma está entendiendo…</KText>
          <KText tone="muted" center>“{phase.transcript}”</KText>
        </View>
      )}

      {phase.k === 'text' && (
        <View style={{ gap: space[4], paddingTop: space[4] }}>
          <KText variant="title">Escríbelo como lo dirías</KText>
          <TextField
            label="Cuéntame"
            hint="Qué comiste, cómo dormiste, qué sentiste y cuándo."
            placeholder="Ej.: almorcé bandeja paisa y a las 3 me dolió la cabeza"
            value={typed}
            onChangeText={setTyped}
            autoFocus
          />
          <Button fullWidth size="lg" label="Listo" disabled={typed.trim().length < 2} onPress={() => void process(typed, 'text')} />
          <Button fullWidth variant="ghost" label="Ver ejemplos" onPress={() => setExamplesOpen(true)} />
        </View>
      )}

      {phase.k === 'mic-permission' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <PermissionPrompt
            kind="microphone"
            status={phase.status}
            onAllow={async () => {
              const r = await requestMicPermission();
              if (r === 'granted') {
                setPhase({ k: 'start' });
                void startListening();
              } else setPhase({ k: 'mic-permission', status: 'denied' });
            }}
            onAlternative={() => setPhase({ k: 'text' })}
          />
        </View>
      )}

      {phase.k === 'camera-permission' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <PermissionPrompt
            kind="camera"
            onAllow={async () => {
              const r = await ImagePicker.requestCameraPermissionsAsync();
              setPhase({ k: 'start' });
              if (r.granted) void takePhoto('camera', false);
            }}
            onAlternative={() => setPhase({ k: 'text' })}
          />
        </View>
      )}

      {phase.k === 'error' && phase.kind === 'empty' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            kind="error"
            title="No pude escucharte bien"
            description="¿Lo intentamos otra vez o prefieres escribirlo?"
            actions={
              <>
                <Button fullWidth label="Intentar otra vez" onPress={startListening} />
                <Button fullWidth variant="ghost" label="Escribirlo" onPress={() => setPhase({ k: 'text' })} />
              </>
            }
          />
        </View>
      )}

      {phase.k === 'error' && phase.kind === 'not-understood' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            kind="no-data"
            title="No encontré síntomas, comidas ni hábitos"
            description={`Entendí: “${phase.transcript}”. Cuéntame qué sentiste, qué comiste o cómo dormiste.`}
            actions={
              <>
                <Button fullWidth label="Intentar otra vez" onPress={startListening} />
                <Button fullWidth variant="ghost" label="Escribirlo" onPress={() => { setTyped(phase.transcript ?? ''); setPhase({ k: 'text' }); }} />
              </>
            }
          />
        </View>
      )}

      {phase.k === 'error' && phase.kind === 'offline' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            kind="offline"
            title="Estás sin conexión"
            description="Para entender lo que dices necesito internet. Puedo guardarlo como nota y lo revisas cuando vuelvas."
            actions={
              <>
                <Button
                  fullWidth
                  label="Guardar como nota"
                  disabled={!phase.transcript}
                  onPress={() => {
                    const now = new Date().toISOString();
                    const entry = addEntry({
                      transcript: phase.transcript ?? '',
                      summary: 'Nota guardada sin conexión.',
                      source: 'text',
                      events: [{ type: 'note', occurred_at: now, occurred_at_precision: 'exact', confidence: 1, source_text: phase.transcript ?? '', data: { text: phase.transcript ?? '' } }],
                    });
                    closeModal();
                    showToast({ message: 'Lo guardé como nota', actionLabel: 'Deshacer', onAction: () => removeEntry(entry.id) });
                  }}
                />
                <Button fullWidth variant="ghost" label="Intentar otra vez" onPress={() => phase.transcript ? void process(phase.transcript, 'voice') : void startListening()} />
              </>
            }
          />
        </View>
      )}

      <ExamplesSheet open={examplesOpen} onClose={() => setExamplesOpen(false)} onPick={simulate} />

      <BottomSheet open={photoOpen} onClose={() => setPhotoOpen(false)} title="Registrar con una foto" description="De tu plato o de la caja de un medicamento.">
        <Button fullWidth variant="secondary" label="Tomar foto" icon={(c) => <Camera size={20} color={c} />} onPress={() => void takePhoto('camera')} />
        <Button fullWidth variant="secondary" label="Elegir de la galería" icon={(c) => <Images size={20} color={c} />} onPress={() => void takePhoto('library')} />
      </BottomSheet>
    </Screen>
  );
}

/* ---------- piezas ---------- */

function CloseBar({ onClose }: { onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space[2] }}>
      <Button variant="ghost" label="Cerrar" icon={(c) => <X size={20} color={c} />} onPress={onClose} />
    </View>
  );
}

function useRotatingHint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % LISTENING_HINTS.length), 3500);
    return () => clearInterval(id);
  }, []);
  return LISTENING_HINTS[i]!;
}

function StartView({ caregiverName, dayLabel, guided, onMic, onText, onPhoto, onExamples }: {
  caregiverName: string | null;
  dayLabel: string | null;
  guided?: boolean;
  onMic: () => void;
  onText: () => void;
  onPhoto: () => void;
  onExamples: () => void;
}) {
  const hint = useRotatingHint();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: space[4], paddingTop: space[5] }}>
        <Mascot mood="idle" size={150} />
        <KText variant="title" center>
          {caregiverName ? `¿Cómo está ${caregiverName}?` : 'Cuéntame cómo te sientes'}
        </KText>
        {dayLabel && <KText variant="smallStrong" tone="brand" center>Lo agrego al {dayLabel}</KText>}
        {guided && (
          <Banner tone="info" title="Tu primer registro" message="Toca el micrófono y di algo como: «Hoy dormí 7 horas y me tomé un tinto». Yo lo organizo y tú revisas." />
        )}
        <KText tone="muted" center>Puedes decir algo como {hint}</KText>
        {!speechAvailable && (
          <Banner
            tone="info"
            title="La voz funciona en la app instalada"
            message="Aquí puedes elegir un ejemplo y Kalma lo procesa como si lo hubieras dicho, o escribirlo."
          />
        )}
      </View>
      <View style={{ alignItems: 'center', gap: space[5], paddingBottom: space[4] }}>
        <MicButton state={speechAvailable ? 'idle' : 'unavailable'} onPress={onMic} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] }}>
          <Chip label="Escribir" icon={(c) => <Keyboard size={16} color={c} />} onPress={onText} />
          <Chip label="Foto" icon={(c) => <Camera size={16} color={c} />} onPress={onPhoto} />
          <Chip label="Ejemplos" icon={(c) => <ListChecks size={16} color={c} />} onPress={onExamples} />
        </View>
      </View>
    </View>
  );
}

function useTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function ListeningView({ transcript, level, onStop }: { transcript: string; level: number; onStop: () => void }) {
  const hint = useRotatingHint();
  const time = useTimer();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: space[4], paddingTop: space[5] }}>
        <Mascot mood="listening" size={150} />
        <KText variant="title" center accessibilityLiveRegion="polite">Te escucho…</KText>
        <KText tone="muted" center accessibilityLabel={`Tiempo: ${time}`}>{time}</KText>
        <KText center style={{ minHeight: 48 }}>{transcript || hint}</KText>
      </View>
      <View style={{ alignItems: 'center', gap: space[4], paddingBottom: space[5] }}>
        <AudioWave level={level} active />
        <MicButton state="listening" level={level} onPress={onStop} />
        <KText variant="small" tone="muted">Toca para terminar</KText>
      </View>
    </View>
  );
}

/** Sin módulo de voz: "dicta" el ejemplo en pantalla con una onda simulada, para que la prueba se sienta real. */
function SimulatedListening({ text, onDone }: { text: string; onDone: (t: string) => void }) {
  const [shown, setShown] = useState('');
  const [level, setLevel] = useState(0.3);
  const time = useTimer();
  // onDone llega como función nueva en cada render del padre: el ref evita reiniciar el dictado.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const words = text.split(' ');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(words.slice(0, i).join(' '));
      setLevel(0.25 + Math.random() * 0.7);
      if (i >= words.length) {
        clearInterval(id);
        setTimeout(() => doneRef.current(text), 500);
      }
    }, 180);
    return () => clearInterval(id);
  }, [text]);
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: space[4], paddingTop: space[5] }}>
        <Mascot mood="listening" size={150} />
        <KText variant="title" center accessibilityLiveRegion="polite">Te escucho…</KText>
        <KText tone="muted" center>{time}</KText>
        <KText center style={{ minHeight: 48 }}>{shown}</KText>
      </View>
      <View style={{ alignItems: 'center', gap: space[4], paddingBottom: space[5] }}>
        <AudioWave level={level} active />
        <MicButton state="listening" level={level} />
      </View>
    </View>
  );
}

function ExamplesSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: string) => void }) {
  const normal = SAMPLE_TRANSCRIPTS.filter((s) => !s.sensitive);
  const sensitive = SAMPLE_TRANSCRIPTS.filter((s) => s.sensitive);
  return (
    <BottomSheet open={open} onClose={onClose} title="Elige un ejemplo" description="Kalma lo procesa como si lo hubieras dicho.">
      <View style={{ gap: space[2] }}>
        {normal.map((s) => (
          <Button key={s.id} variant="secondary" fullWidth label={`«${s.text}»`} onPress={() => onPick(s.text)} />
        ))}
        <KText variant="smallStrong" tone="muted" style={{ marginTop: space[3] }}>Para probar la pantalla de seguridad</KText>
        {sensitive.map((s) => (
          <Button key={s.id} variant="ghost" fullWidth label={s.label} onPress={() => onPick(s.text)} />
        ))}
      </View>
    </BottomSheet>
  );
}
