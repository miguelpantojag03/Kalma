import { contrastRatio } from '@/lib/contrast';
import { dark, light, type ColorTokens } from '@/theme/tokens';

/**
 * Pares de USO REAL de los tokens (no todas las combinaciones posibles).
 * Mínimos: 4.5 texto (WCAG 1.4.3) · 3 controles e íconos (WCAG 1.4.11).
 * Si alguien cambia un color en tokens.ts y rompe AA, esta prueba falla.
 */
type Pair = [label: string, fg: (c: ColorTokens) => string, bg: (c: ColorTokens) => string, min: number];

const PAIRS: Pair[] = [
  ['texto / fondo', (c) => c.text, (c) => c.bg, 4.5],
  ['texto / tarjeta', (c) => c.text, (c) => c.surface, 4.5],
  ['secundario / fondo', (c) => c.muted, (c) => c.bg, 4.5],
  ['secundario / tarjeta', (c) => c.muted, (c) => c.surface, 4.5],
  ['secundario / surfaceMuted (citas del audio)', (c) => c.muted, (c) => c.surfaceMuted, 4.5],
  ['botón primario', (c) => c.onPrimary, (c) => c.primaryStrong, 4.5],
  ['texto de marca / fondo', (c) => c.primaryStrong, (c) => c.bg, 4.5],
  ['texto de marca / tarjeta', (c) => c.primaryStrong, (c) => c.surface, 4.5],
  ['texto / accent (pestaña activa, éxito)', (c) => c.text, (c) => c.accent, 4.5],
  ['texto / primarySoft (chip seleccionado)', (c) => c.text, (c) => c.primarySoft, 4.5],
  ['advertencia / tarjeta', (c) => c.warningText, (c) => c.surface, 4.5],
  ['advertencia / warningSoft', (c) => c.warningText, (c) => c.warningSoft, 4.5],
  ['texto / warningSoft', (c) => c.text, (c) => c.warningSoft, 4.5],
  ['botón de emergencia', (c) => c.onDanger, (c) => c.danger, 4.5],
  ['toast (fondo invertido)', (c) => c.bg, (c) => c.text, 4.5],
  ['borde de control / tarjeta', (c) => c.borderStrong, (c) => c.surface, 3],
  ['ícono de marca / tarjeta', (c) => c.primary, (c) => c.surface, 3],
  ...[0, 1, 2, 3, 4, 5].map(
    (i): Pair => [`intensidad ${i * 2}`, (c) => c.onIntensity, (c) => c.intensity[i]!, 4.5],
  ),
];

describe.each([
  ['claro', light],
  ['oscuro', dark],
])('contraste WCAG 2.1 AA — tema %s', (_name, c) => {
  it.each(PAIRS)('%s', (_label, fg, bg, min) => {
    expect(contrastRatio(fg(c), bg(c))).toBeGreaterThanOrEqual(min);
  });
});

describe('pares prohibidos documentados (deben seguir fallando)', () => {
  it('blanco sobre primary no sirve para texto', () => {
    expect(contrastRatio('#FFFFFF', light.primary)).toBeLessThan(4.5);
  });
  it('primaryStrong como texto sobre accent no pasa en claro', () => {
    expect(contrastRatio(light.primaryStrong, light.accent)).toBeLessThan(4.5);
  });
  it('warning no sirve como color de texto', () => {
    expect(contrastRatio(light.warning, light.surface)).toBeLessThan(4.5);
  });
});
