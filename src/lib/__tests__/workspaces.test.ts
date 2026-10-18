import AsyncStorage from '@react-native-async-storage/async-storage';
import { closeWorkspace, openWorkspace, useKalma } from '@/lib/store';

const s = () => useKalma.getState();
const symptom = {
  type: 'symptom' as const,
  occurred_at: '2026-10-17T15:00:00.000Z',
  occurred_at_precision: 'exact' as const,
  confidence: 1,
  source_text: 'me duele la cabeza',
  data: { name: 'dolor de cabeza', intensity_0_10: 5, intensity_inferred: false },
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await openWorkspace('none');
});

describe('espacios de datos (demo separada de las cuentas reales)', () => {
  it('la demo carga los datos de Laura en su propio espacio', async () => {
    await openWorkspace('demo');
    expect(s().workspace).toBe('demo');
    expect(s().profile.name).toBe('Laura');
    expect(s().entries.length).toBeGreaterThan(100);
    expect(s().hydrated).toBe(true);
  });

  it('una cuenta nueva empieza vacía', async () => {
    await openWorkspace('user:aaaa');
    expect(s().entries).toHaveLength(0);
    expect(s().profile.onboarded).toBe(false);
  });

  it('cambiar de espacio no mezcla datos', async () => {
    await openWorkspace('user:aaaa');
    s().addEntry({ transcript: 'a', summary: 'a', source: 'voice', events: [symptom] });
    await new Promise((r) => setTimeout(r, 0)); // deja que persist escriba

    await openWorkspace('demo');
    expect(s().entries.some((e) => e.transcript === 'a')).toBe(false);

    await openWorkspace('user:bbbb');
    expect(s().entries).toHaveLength(0); // la cuenta B no ve lo de la cuenta A

    await openWorkspace('user:aaaa');
    expect(s().entries.map((e) => e.transcript)).toEqual(['a']); // la caché de A sigue ahí
  });

  it('la demo conserva sus cambios entre aperturas y nunca crea operaciones de sincronización', async () => {
    await openWorkspace('demo');
    const n = s().entries.length;
    s().addEntry({ transcript: 'demo', summary: 'd', source: 'voice', events: [symptom] });
    await new Promise((r) => setTimeout(r, 0));
    await openWorkspace('none');
    await openWorkspace('demo');
    expect(s().entries.length).toBe(n + 1);
    expect(s().outbox).toHaveLength(0);
  });

  it('cerrar sesión borra la caché local de ese usuario', async () => {
    await openWorkspace('user:aaaa');
    s().addEntry({ transcript: 'privado', summary: 'p', source: 'voice', events: [symptom] });
    await new Promise((r) => setTimeout(r, 0));
    expect(await AsyncStorage.getItem('kalma:user:aaaa')).not.toBeNull();

    await closeWorkspace({ wipe: true });
    expect(await AsyncStorage.getItem('kalma:user:aaaa')).toBeNull();
    expect(s().workspace).toBe('none');
    expect(s().entries).toHaveLength(0);
  });

  it('los datos de versiones anteriores pasan al espacio demo', async () => {
    await AsyncStorage.setItem('kalma-data', JSON.stringify({ state: { entries: [], profile: { name: 'Vieja demo' } }, version: 2 }));
    await openWorkspace('demo');
    expect(await AsyncStorage.getItem('kalma-data')).toBeNull();
    expect(s().profile.name).toBe('Vieja demo');
  });
});
