import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { dayKey } from './dates';

/** La semana empieza el lunes, como en los calendarios de Colombia. */
const WEEK = { weekStartsOn: 1 as const };

export interface CalendarCell {
  date: Date;
  key: string;
  inMonth: boolean;
}

/** Semanas completas (lunes a domingo) que cubren el mes. */
export function monthMatrix(month: Date): CalendarCell[][] {
  const start = startOfWeek(startOfMonth(month), WEEK);
  const end = endOfWeek(endOfMonth(month), WEEK);
  const weeks: CalendarCell[][] = [];
  let d = start;
  while (d <= end) {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: d, key: dayKey(d), inMonth: isSameMonth(d, month) });
      d = addDays(d, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function weekDays(anchor: Date): CalendarCell[] {
  const start = startOfWeek(anchor, WEEK);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, key: dayKey(date), inMonth: true };
  });
}

/** ["L", "M", "M", "J", "V", "S", "D"] con nombres completos para lectores de pantalla. */
export const WEEKDAY_LABELS = [
  { short: 'L', long: 'lunes' }, { short: 'M', long: 'martes' }, { short: 'M', long: 'miércoles' },
  { short: 'J', long: 'jueves' }, { short: 'V', long: 'viernes' }, { short: 'S', long: 'sábado' }, { short: 'D', long: 'domingo' },
];

export const monthTitle = (d: Date) => format(d, "MMMM 'de' yyyy", { locale: es }).replace(/^./, (c) => c.toUpperCase());
