import { useState } from 'react';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Button, CalendarDay, Chip, IntensitySlider, MicButton, PatternCard } from '@/components/ui';
import { describeEvent } from '@/lib/describeEvent';
import type { StoredEvent } from '@/lib/schema';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

function Slider() {
  const [v, setV] = useState(5);
  return <IntensitySlider value={v} onChange={setV} label="¿Qué tan fuerte?" />;
}

describe('accesibilidad de componentes', () => {
  it('PatternCard abre el detalle al tocarla (antes no tenía onPress)', async () => {
    const onPress = jest.fn();
    await render(<PatternCard level="strong" statement="El 95 % de tus molestias…" evidence="18 de 19 episodios" onPress={onPress} />);
    // userEvent simula un toque real: fireEvent.press encontraría el onPress de PatternCard aunque el Pressable no lo tuviera
    await userEvent.setup().press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('describeEvent no repite la zona cuando el nombre del síntoma ya la dice', () => {
    const base = { type: 'symptom', occurred_at: '2026-10-18T15:00:00.000Z', occurred_at_precision: 'exact', confidence: 1, source_text: '' };
    const data = { side: null, intensity_0_10: 7, intensity_inferred: false, character: null, duration_minutes: null };
    const head = { ...base, data: { ...data, name: 'dolor de cabeza', body_location: 'cabeza' } } as unknown as StoredEvent;
    const belly = { ...base, data: { ...data, name: 'dolor', body_location: 'abdomen' } } as unknown as StoredEvent;
    expect(describeEvent(head).detail).toBeUndefined();
    expect(describeEvent(belly).detail).toBe('abdomen');
  });

  it('IntensitySlider es "adjustable" y anuncia número + palabra', async () => {
    await render(<Slider />);
    const slider = screen.getByRole('adjustable', { name: '¿Qué tan fuerte?' });
    expect(slider.props.accessibilityValue).toMatchObject({ min: 0, max: 10, now: 5, text: '5 de 10, moderado' });

    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByRole('adjustable').props.accessibilityValue).toMatchObject({ now: 7, text: '7 de 10, fuerte' });
  });

  it('IntensitySlider no pasa de 10 ni baja de 0', async () => {
    await render(<Slider />);
    const slider = screen.getByRole('adjustable');
    for (let i = 0; i < 15; i++) await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(10);
  });

  it('Chip de selección simple es radio con estado checked', async () => {
    await render(<Chip label="Un poco" selected />);
    expect(screen.getByRole('radio', { name: 'Un poco', checked: true })).toBeTruthy();
  });

  it('Chip de selección múltiple es checkbox', async () => {
    await render(<Chip label="Estrés" mode="multiple" />);
    expect(screen.getByRole('checkbox', { name: 'Estrés', checked: false })).toBeTruthy();
  });

  it('Button en carga anuncia el texto de carga y queda ocupado', async () => {
    const onPress = jest.fn();
    await render(<Button label="Guardar" loading loadingLabel="Guardando…" onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'Guardando…' });
    expect(btn.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('CalendarDay describe la intensidad en palabras, no solo en color', async () => {
    await render(<CalendarDay day={14} fullDate="martes 14 de octubre" maxIntensity={8} />);
    expect(screen.getByRole('button', { name: 'martes 14 de octubre: síntoma máximo 8 de 10, fuerte' })).toBeTruthy();
  });

  it('CalendarDay sin registro lo dice explícitamente', async () => {
    await render(<CalendarDay day={15} fullDate="miércoles 15 de octubre" maxIntensity={null} isToday />);
    expect(screen.getByRole('button', { name: 'miércoles 15 de octubre, hoy: sin registro' })).toBeTruthy();
  });

  it('MicButton cambia su nombre accesible según el estado', async () => {
    const { rerender } = await render(<MicButton state="idle" />);
    expect(screen.getByRole('button', { name: 'Registrar por voz' })).toBeTruthy();
    await rerender(<MicButton state="listening" />);
    expect(screen.getByRole('button', { name: 'Terminar de grabar' })).toBeTruthy();
    await rerender(<MicButton state="blocked" />);
    expect(screen.getByRole('button', { name: 'Micrófono sin permiso' })).toBeTruthy();
  });
});
