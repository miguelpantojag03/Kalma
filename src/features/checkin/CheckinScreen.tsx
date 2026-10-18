import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, useReducedMotion } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Button, Chip, EmptyState, KText, Mascot } from '@/components/ui';
import { NeedsConsent, useCanRecord } from '@/components/NeedsConsent';
import { Screen } from '@/components/Screen';
import { buildCheckin } from '@/lib/checkin';
import { dayKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { closeModal } from '@/lib/nav';
import type { ExtractedEvent } from '@/lib/schema';
import { eventsByDay } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';
import { SavedView } from '@/features/recording/SavedView';

/**
 * Check-in nocturno (< 30 s). Una pregunta por pantalla con chips grandes; tocar una opción avanza
 * sola (sin botón "Siguiente": un toque por pregunta). Cada pregunta se puede saltar.
 */
export function CheckinScreen() {
  const reduce = useReducedMotion();
  const { c } = useTheme();
  const entries = useKalma((s) => s.entries);
  const addEntry = useKalma((s) => s.addEntry);
  const name = useKalma((s) => s.profile.name);
  const canRecord = useCanRecord();

  const today = dayKey(new Date());
  const already = entries.some((e) => e.source === 'checkin' && dayKey(e.recordedAt) === today);
  // Las preguntas se fijan al abrir (no cambian mientras se responde)
  const [questions] = useState(() => buildCheckin(eventsByDay(entries).get(today) ?? []));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState<number | null>(null);
  const startedAt = useRef(new Date().toISOString());

  const q = questions[step];

  const finish = (final: Record<string, string>) => {
    const events: ExtractedEvent[] = questions.flatMap((qq) => {
      const opt = qq.options.find((o) => o.label === final[qq.id]);
      return opt ? opt.build(startedAt.current) : [];
    });
    const answered = Object.keys(final).length;
    if (events.length > 0 || answered > 0) {
      addEntry({
        transcript: questions.filter((qq) => final[qq.id]).map((qq) => `${qq.question} ${final[qq.id]}`).join(' · '),
        summary: 'Check-in nocturno.',
        source: 'checkin',
        events: events.length ? events : [{ type: 'note', occurred_at: startedAt.current, occurred_at_precision: 'part_of_day', confidence: 1, source_text: 'check-in', data: { text: 'Check-in sin novedades' } }],
        recordedAt: startedAt.current,
      });
    }
    setDone(events.length);
    setTimeout(closeModal, 1600);
  };

  const answer = (label: string | null) => {
    haptic.tap();
    const next = label && q ? { ...answers, [q.id]: label } : answers;
    setAnswers(next);
    if (step + 1 >= questions.length) finish(next);
    else setStep(step + 1);
  };

  const progressLabel = useMemo(() => `Pregunta ${step + 1} de ${questions.length}`, [step, questions.length]);

  if (!canRecord && done === null) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <NeedsConsent />
      </Screen>
    );
  }

  if (done !== null) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <SavedView count={done} />
        <KText center tone="muted" style={{ marginBottom: space[6] }}>Buenas noches{name ? `, ${name}` : ''}. Que descanses.</KText>
      </Screen>
    );
  }

  if (already && step === 0 && Object.keys(answers).length === 0) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <Close />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState kind="first-use" title="Ya hiciste el check-in de hoy" description="Si algo cambió, puedes contármelo con el micrófono." actions={<Button fullWidth label="Volver" onPress={closeModal} />} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <Close />
      <View style={{ alignItems: 'center', gap: space[2] }}>
        <Mascot mood="sleepy" size={90} />
        <KText variant="caption" tone="muted" accessibilityLiveRegion="polite">{progressLabel}</KText>
        <View style={{ flexDirection: 'row', gap: space[1] }} importantForAccessibility="no-hide-descendants">
          {questions.map((qq, i) => (
            <View key={qq.id} style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: i <= step ? c.primaryStrong : c.accent }} />
          ))}
        </View>
      </View>

      {q && (
        <Animated.View
          key={q.id}
          entering={reduce ? FadeIn : SlideInRight.duration(250)}
          exiting={reduce ? FadeOut : SlideOutLeft.duration(200)}
          style={{ flex: 1, justifyContent: 'center', gap: space[5] }}
        >
          <KText variant="title" center>{q.question}</KText>
          <View accessibilityRole="radiogroup" accessibilityLabel={q.question} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[3] }}>
            {q.options.map((o) => (
              <Chip key={o.label} label={o.label} selected={answers[q.id] === o.label} onPress={() => answer(o.label)} />
            ))}
          </View>
        </Animated.View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space[2] }}>
        <Button variant="ghost" label="Atrás" disabled={step === 0} onPress={() => setStep(Math.max(0, step - 1))} />
        <Button variant="ghost" label="Saltar" onPress={() => answer(null)} />
      </View>
    </Screen>
  );
}

function Close() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space[2] }}>
      <Button variant="ghost" label="Cerrar" icon={(c) => <X size={20} color={c} />} onPress={closeModal} />
    </View>
  );
}
