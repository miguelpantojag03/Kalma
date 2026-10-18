import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { Banner, Card, Chip, ChipGroup, KText, PermissionPrompt, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useDeviceSettings } from '@/lib/deviceSettings';
import { cancelDailyCheckin, getNotifPermission, requestNotifPermission, scheduleDailyCheckin, type NotifPermission } from '@/lib/notifications';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';

const TIMES = ['19:00', '20:00', '20:30', '21:00', '21:30', '22:00'];
const label = (t: string) => { const h = Number(t.slice(0, 2)); return `${h > 12 ? h - 12 : h}:${t.slice(3)} p. m.`; };

/** Recordatorios: hora del check-in, encender/apagar y permiso de notificaciones con contexto. */
export function RemindersScreen() {
  const { c } = useTheme();
  const { profile, updateProfile } = useKalma();
  const { checkinReminder, setCheckinReminder } = useDeviceSettings();
  const showToast = useToast((s) => s.show);
  const [perm, setPerm] = useState<NotifPermission | null>(null);

  useEffect(() => {
    void getNotifPermission().then(setPerm);
  }, []);

  const apply = async (time: string, on: boolean) => {
    if (on) {
      const ok = await scheduleDailyCheckin(time, profile.name || undefined);
      if (ok) showToast({ message: `Te recuerdo a las ${label(time)}` });
    } else {
      await cancelDailyCheckin();
      showToast({ message: 'Apagué el recordatorio. El aviso en Hoy sigue apareciendo de noche.', tone: 'info' });
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Recordatorios' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        {perm === 'unsupported' && <Banner tone="info" title="Los recordatorios funcionan en el celular" />}
        {(perm === 'undetermined' || perm === 'denied') && (
          <Card>
            <PermissionPrompt kind="notifications" status={perm} onAllow={async () => setPerm(await requestNotifPermission())} onAlternative={() => setPerm('denied')} />
          </Card>
        )}

        <Card style={{ gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <KText variant="subheading">Check-in de la noche</KText>
              <KText variant="small" tone="muted">Un aviso al día, sin sonido. Menos de 30 segundos.</KText>
            </View>
            <Switch
              accessibilityLabel="Recordatorio del check-in"
              value={checkinReminder}
              disabled={perm !== 'granted'}
              onValueChange={(v) => { setCheckinReminder(v); void apply(profile.reminderTime, v); }}
              trackColor={{ true: c.primaryStrong, false: c.borderStrong }}
              thumbColor={c.surface}
            />
          </View>
          <ChipGroup label="¿A qué hora?">
            {TIMES.map((t) => (
              <Chip key={t} label={label(t)} selected={profile.reminderTime === t} onPress={() => { updateProfile({ reminderTime: t }); if (checkinReminder && perm === 'granted') void apply(t, true); }} />
            ))}
          </ChipGroup>
        </Card>
        <KText variant="small" tone="muted">Los experimentos te recuerdan 30 minutos antes del check-in, y los controles médicos el día anterior a las 9 a. m.</KText>
      </Screen>
    </>
  );
}
