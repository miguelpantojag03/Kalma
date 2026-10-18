import { format, parseISO, startOfDay, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

/** Clave de día local: "2026-10-17". Todo se agrupa por el día del celular de la persona. */
export const dayKey = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'yyyy-MM-dd');

export const fromDayKey = (key: string) => parseISO(`${key}T00:00:00`);

/** "2:30 p. m." — formato de hora colombiano. */
export function formatTime(iso: string): string {
  const d = parseISO(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

export type PartOfDay = 'madrugada' | 'mañana' | 'tarde' | 'noche';

export function partOfDay(iso: string): PartOfDay {
  const h = parseISO(iso).getHours();
  if (h < 6) return 'madrugada';
  if (h < 12) return 'mañana';
  if (h < 19) return 'tarde';
  return 'noche';
}

/** "martes 14 de octubre" — para nombres accesibles y encabezados. */
export const fullDate = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, "EEEE d 'de' MMMM", { locale: es });

/** "14 oct" */
export const shortDate = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'd MMM', { locale: es });

export const daysBetween = (a: Date, b: Date) => differenceInCalendarDays(startOfDay(b), startOfDay(a));

export { parseISO };
