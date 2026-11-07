import { project, rubberband, spring } from '@/theme';

describe('movimiento (D84–D85)', () => {
  it('project: sin velocidad no se mueve; la proyección sigue el signo de la velocidad', () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeGreaterThan(0);
    expect(project(-1000)).toBeLessThan(0);
  });

  it('project: un lanzamiento rápido (1500 px/s) proyecta lejos; uno lento casi nada', () => {
    // 1,5 × 0,998 / 0,002 ≈ 748 px: suficiente para cerrar una hoja aunque haya bajado poco
    expect(project(1500)).toBeCloseTo(748.5, 0);
    expect(project(100)).toBeLessThan(60);
  });

  it('rubberband: sigue casi 1:1 al principio y cada vez menos, sin pasar del tamaño', () => {
    const h = 500;
    expect(rubberband(10, h)).toBeGreaterThan(5);
    expect(rubberband(10, h)).toBeLessThan(10);
    const small = rubberband(100, h) / 100;
    const big = rubberband(1000, h) / 1000;
    expect(big).toBeLessThan(small);
    expect(rubberband(100000, h)).toBeLessThan(h);
    expect(rubberband(-50, h)).toBeCloseTo(-rubberband(50, h));
  });

  it('solo el resorte de soltar con impulso rebota', () => {
    const bouncy = Object.entries(spring).filter(([, s]) => s.dampingRatio < 1).map(([k]) => k);
    expect(bouncy).toEqual(['sheetFling']);
  });
});
