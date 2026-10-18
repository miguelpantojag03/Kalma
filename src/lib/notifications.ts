/**
 * Notificaciones LOCALES (funcionan en Expo Go y en el APK; no hay servidor de push).
 * - Recordatorio diario del check-in a la hora que elija la persona.
 * - Al tocar la notificación se abre el check-in (data.url).
 * En web no hay notificaciones: todas las funciones son seguras y no hacen nada.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';

const supported = Platform.OS !== 'web';
const CHANNEL = 'recordatorios';
const CHECKIN_ID = 'kalma-checkin-diario';

export type NotifPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // Android 13+: el canal debe existir antes de pedir el permiso. Importancia normal: sin sonido invasivo.
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Recordatorios de Kalma',
    description: 'El check-in de la noche y los recordatorios de tus experimentos.',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#6B9080',
  });
}

export async function getNotifPermission(): Promise<NotifPermission> {
  if (!supported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (!supported) return 'unsupported';
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: false } });
  return p.granted ? 'granted' : 'denied';
}

const checkinContent = (name?: string): Notifications.NotificationContentInput => ({
  title: name ? `${name}, ¿cómo te fue hoy?` : '¿Cómo te fue hoy?',
  body: 'Tres preguntas rápidas, menos de 30 segundos.',
  data: { url: '/checkin' },
});

/** Programa (o reprograma) el check-in diario a "HH:mm". */
export async function scheduleDailyCheckin(time: string, name?: string): Promise<boolean> {
  if (!supported) return false;
  if ((await getNotifPermission()) !== 'granted') return false;
  await ensureChannel();
  await Notifications.cancelScheduledNotificationAsync(CHECKIN_ID).catch(() => {});
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  await Notifications.scheduleNotificationAsync({
    identifier: CHECKIN_ID,
    content: checkinContent(name),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelDailyCheckin() {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(CHECKIN_ID).catch(() => {});
}

/** Demo: dispara la notificación del check-in en unos segundos (para mostrarla en la sustentación). */
export async function sendCheckinSoon(seconds = 5, name?: string): Promise<boolean> {
  if (!supported) return false;
  if ((await getNotifPermission()) !== 'granted') return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: checkinContent(name),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL },
  });
  return true;
}

export async function scheduleOneOff(title: string, body: string, url: string, seconds: number) {
  if (!supported || (await getNotifPermission()) !== 'granted') return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { url } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL },
  });
  return true;
}

/** Recordatorio diario de un experimento ("¿Lo cumpliste hoy?"). Se cancela al terminarlo. */
export async function scheduleExperimentReminder(id: string, title: string, time: string): Promise<boolean> {
  if (!supported || (await getNotifPermission()) !== 'granted') return false;
  await ensureChannel();
  const [h, m] = time.split(':').map(Number) as [number, number];
  // 30 minutos antes del check-in, para no juntar dos avisos
  const total = Math.max(0, h * 60 + m - 30);
  await Notifications.cancelScheduledNotificationAsync(`exp-${id}`).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: `exp-${id}`,
    content: { title: '¿Cumpliste tu experimento hoy?', body: title, data: { url: `/experimento/${id}` } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: Math.floor(total / 60), minute: total % 60, channelId: CHANNEL },
  });
  return true;
}

export async function cancelExperimentReminder(id: string) {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(`exp-${id}`).catch(() => {});
}

/** Recordatorio de un control médico: el día anterior a las 9 a. m. (si esa fecha aún no pasó). */
export async function scheduleFollowUpReminder(label: string, dayKeyStr: string): Promise<boolean> {
  if (!supported || (await getNotifPermission()) !== 'granted') return false;
  const date = new Date(`${dayKeyStr}T09:00:00`);
  date.setDate(date.getDate() - 1);
  if (date.getTime() <= Date.now()) return false;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Mañana tienes control médico', body: label, data: { url: '/visitas' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
  return true;
}

const MORNING_PREFIX = 'motd-';

/**
 * Mensaje del día a las 8 a. m. Como cada día lleva un texto distinto, se programan los próximos
 * 7 días con fecha fija (y se reprograman al abrir la app). Apagado por defecto.
 */
export async function scheduleMorningMessages(messageFor: (d: Date) => string, days = 7): Promise<boolean> {
  if (!supported || (await getNotifPermission()) !== 'granted') return false;
  await ensureChannel();
  await cancelMorningMessages();
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 8, 0, 0);
    if (at.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${MORNING_PREFIX}${at.toISOString().slice(0, 10)}`,
      content: { title: 'Kalma', body: messageFor(at), data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
  return true;
}

export async function cancelMorningMessages() {
  if (!supported) return;
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(all.filter((n) => n.identifier.startsWith(MORNING_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
}

/**
 * Al cerrar sesión, eliminar la cuenta, salir de la demo o borrar los datos: ningún recordatorio con
 * datos de esa persona (su nombre, sus experimentos, sus controles) sigue llegando al celular.
 */
export async function cancelAllReminders() {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/** Al tocar una notificación (en frío o con la app abierta), navega a su data.url. */
export function useNotificationRouting() {
  useEffect(() => {
    if (!supported) return;
    const go = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as Href);
        Notifications.clearLastNotificationResponse();
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) go(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification));
    return () => sub.remove();
  }, []);
}
