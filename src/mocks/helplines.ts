/**
 * Líneas de ayuda de Colombia (configuración).
 *
 * ⚠ REGLA DEL PROYECTO: no inventar números. Cada línea tiene su fuente y la fecha en que se revisó.
 * Las que dicen `confirmBeforePresenting: true` aparecen en fuentes públicas pero de 2020–2021:
 * el equipo debe llamar o revisar el sitio oficial antes de la sustentación y actualizar `checked`.
 */
export interface Helpline {
  id: string;
  name: string;
  description: string;
  /** Lo que se marca (se abre con tel:). */
  dial: string;
  /** Instrucción adicional al marcar, p. ej. "Marca la opción 4". */
  instructions?: string;
  coverage: string;
  hours: string;
  source: string;
  checked: string;
  confirmBeforePresenting: boolean;
}

export const EMERGENCY_NUMBER = '123';

export const HELPLINES: Helpline[] = [
  {
    id: 'emergencias-123',
    name: 'Línea de emergencias 123',
    description: 'Emergencias médicas y de seguridad.',
    dial: '123',
    coverage: 'Nacional',
    hours: '24 horas',
    source: 'Brief del proyecto (número único de emergencias de Colombia)',
    checked: '2026-10-17',
    confirmBeforePresenting: false,
  },
  {
    id: 'minsalud-192-4',
    name: 'Línea 192, opción 4',
    description: 'Orientación en salud mental y primeros auxilios psicológicos del Ministerio de Salud.',
    dial: '192',
    instructions: 'Cuando contesten, marca la opción 4.',
    coverage: 'Nacional',
    hours: 'Confirmar horario',
    source: 'https://www.minsalud.gov.co/English/Paginas/Ministry-of-Health,-Committed-to-Colombians%E2%80%99-Mental-Health-.aspx',
    checked: '2026-10-17',
    confirmBeforePresenting: true,
  },
  {
    id: 'bogota-106',
    name: 'Línea 106',
    description: 'Escucha, apoyo psicológico e intervención en crisis de la Secretaría Distrital de Salud.',
    dial: '106',
    coverage: 'Bogotá',
    hours: '24 horas',
    source: 'https://www.eltiempo.com/justicia/investigacion/lineas-de-prevencion-de-suicidio-en-colombia-como-funcionan-553057',
    checked: '2026-10-17',
    confirmBeforePresenting: true,
  },
];

export const MENTAL_HEALTH_LINES = HELPLINES.filter((h) => h.id !== 'emergencias-123');
