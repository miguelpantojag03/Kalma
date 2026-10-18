import { useMemo } from 'react';
import { dayKey } from './dates';
import { analyzePatterns, type PatternAnalysis } from './patterns';
import { useKalma } from './store';

/** Análisis de patrones memorizado: se recalcula solo cuando cambian los registros o el día. */
export function usePatterns(): PatternAnalysis & { visible: PatternAnalysis['patterns']; dismissed: PatternAnalysis['patterns'] } {
  const entries = useKalma((s) => s.entries);
  const dismissedIds = useKalma((s) => s.dismissedPatterns);
  const today = dayKey(new Date());
  const analysis = useMemo(() => analyzePatterns(entries), [entries, today]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    ...analysis,
    visible: analysis.patterns.filter((p) => !dismissedIds.includes(p.id)),
    dismissed: analysis.patterns.filter((p) => dismissedIds.includes(p.id)),
  };
}
