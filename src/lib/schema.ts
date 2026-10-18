/**
 * Esquemas de datos de Kalma (zod 4).
 *
 * `ExtractionSchema` es el contrato EXACTO que devuelve extractEntry() — el mock de hoy y un LLM real
 * mañana (vía proxy) deben producir este mismo JSON. Lo que se guarda en el celular (`StoredEvent`,
 * `Entry`) añade ids, de dónde vino el registro y si la persona lo editó.
 */
import { z } from 'zod';

export const EVENT_TYPES = [
  'symptom', 'food', 'drink', 'medication', 'sleep', 'activity',
  'mood', 'stress', 'menstrual', 'bowel', 'water', 'note',
] as const;

export const isoDate = z.iso.datetime({ offset: true });
const level010 = z.number().int().min(0).max(10);

/* ---------- data por tipo de evento ---------- */

export const SymptomData = z.object({
  name: z.string(),
  body_location: z.string().nullable().optional(),
  side: z.enum(['left', 'right', 'both', 'center']).nullable().optional(),
  intensity_0_10: level010.nullable(),
  /** true si la intensidad salió de palabras ("fuerte" → 7) y no de un número dicho. */
  intensity_inferred: z.boolean().default(false),
  character: z.string().nullable().optional(),
  duration_minutes: z.number().int().nonnegative().nullable().optional(),
});

export const FoodDrinkData = z.object({
  name: z.string(),
  /** Nombre normalizado: "tinto" → "café". */
  canonical_name: z.string(),
  /** Para el motor de patrones: cafeína, lácteo, frito, alcohol, harina, azúcar… */
  categories: z.array(z.string()),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable().optional(),
  quantity: z.string().nullable().optional(),
});

export const MedicationData = z.object({
  name: z.string(),
  generic_name: z.string().nullable(),
  dose: z.string().nullable().optional(),
  taken_for: z.string().nullable().optional(),
  relief: z.enum(['full', 'partial', 'none', 'unknown']).nullable().optional(),
});

export const SleepData = z.object({
  hours: z.number().min(0).max(24),
  quality_1_5: z.number().int().min(1).max(5).nullable().optional(),
});

export const LevelData = z.object({ level_0_10: level010 });

export const ActivityData = z.object({
  name: z.string(),
  duration_minutes: z.number().int().nonnegative().nullable().optional(),
  intensity: z.enum(['light', 'moderate', 'vigorous']).nullable().optional(),
});

export const WaterData = z.object({ glasses: z.number().int().nonnegative() });
export const BowelData = z.object({ description: z.string(), bristol: z.number().int().min(1).max(7).nullable().optional() });
export const MenstrualData = z.object({ flow: z.enum(['spotting', 'light', 'medium', 'heavy']).nullable().optional() });
export const NoteData = z.object({ text: z.string() });

const base = {
  occurred_at: isoDate.nullable(),
  occurred_at_precision: z.enum(['exact', 'approximate', 'part_of_day', 'unknown']),
  confidence: z.number().min(0).max(1),
  source_text: z.string(),
};

/** Evento tal como lo extrae la IA (unión discriminada por `type`). */
export const ExtractedEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('symptom'), ...base, data: SymptomData }),
  z.object({ type: z.literal('food'), ...base, data: FoodDrinkData }),
  z.object({ type: z.literal('drink'), ...base, data: FoodDrinkData }),
  z.object({ type: z.literal('medication'), ...base, data: MedicationData }),
  z.object({ type: z.literal('sleep'), ...base, data: SleepData }),
  z.object({ type: z.literal('stress'), ...base, data: LevelData }),
  z.object({ type: z.literal('mood'), ...base, data: LevelData }),
  z.object({ type: z.literal('activity'), ...base, data: ActivityData }),
  z.object({ type: z.literal('water'), ...base, data: WaterData }),
  z.object({ type: z.literal('bowel'), ...base, data: BowelData }),
  z.object({ type: z.literal('menstrual'), ...base, data: MenstrualData }),
  z.object({ type: z.literal('note'), ...base, data: NoteData }),
]);
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

export const RED_FLAG_CATEGORIES = [
  'chest_pain', 'breathing', 'thunderclap_headache', 'meningitis_signs', 'stroke_signs', 'vision_loss',
  'fainting', 'seizure', 'gi_bleeding', 'uncontrolled_bleeding', 'acute_abdomen', 'anaphylaxis',
  'pregnancy_bleeding', 'self_harm',
] as const;

/** Respuesta completa de extractEntry() — el esquema del brief. */
export const ExtractionSchema = z.object({
  summary: z.string(),
  events: z.array(ExtractedEventSchema),
  red_flag: z.object({
    detected: z.boolean(),
    categories: z.array(z.enum(RED_FLAG_CATEGORIES)),
    evidence: z.string().nullable(),
  }),
  follow_up: z.object({
    question: z.string().nullable(),
    quick_replies: z.array(z.string()),
    target_event_index: z.number().int().nonnegative().nullable(),
  }),
  unparsed: z.string().nullable(),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/* ---------- lo que se guarda en el celular ---------- */

export const StoredEventSchema = ExtractedEventSchema.and(
  z.object({
    id: z.string(),
    entryId: z.string(),
    /** La persona corrigió lo que entendió la IA (se muestra "Editado por ti"). */
    edited: z.boolean().default(false),
  }),
);
export type StoredEvent = z.infer<typeof StoredEventSchema>;

export const EntrySchema = z.object({
  id: z.string(),
  recordedAt: isoDate,
  source: z.enum(['voice', 'text', 'photo', 'checkin', 'seed']),
  transcript: z.string(),
  summary: z.string(),
  events: z.array(StoredEventSchema),
});
export type Entry = z.infer<typeof EntrySchema>;

export const ExperimentSchema = z.object({
  id: z.string(),
  /** Lo que la persona decide cambiar. Nunca suspender medicamentos. */
  title: z.string(),
  factor: z.string(),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(21)]),
  startDate: z.string(), // yyyy-MM-dd
  /** yyyy-MM-dd → ¿lo cumplió ese día? */
  adherence: z.record(z.string(), z.boolean()),
  status: z.enum(['active', 'finished', 'cancelled']),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

export const ConsentSchema = z.object({
  health: z.boolean(),
  ai: z.boolean(),
  location: z.boolean(),
  /** Cuándo se dio o revocó cada consentimiento (Ley 1581 de 2012: trazabilidad). */
  updatedAt: z.record(z.string(), isoDate),
});
export type Consent = z.infer<typeof ConsentSchema>;

export const ProfileSchema = z.object({
  name: z.string(),
  conditions: z.array(z.string()),
  goals: z.array(z.string()),
  medications: z.array(z.object({ name: z.string(), generic_name: z.string().nullable(), use: z.enum(['rescue', 'preventive', 'other']) })),
  doctors: z.array(z.object({ name: z.string(), specialty: z.string() })),
  reminderTime: z.string(), // "21:00"
  caregiver: z.object({ enabled: z.boolean(), personName: z.string().nullable() }),
  onboarded: z.boolean(),
});
export type Profile = z.infer<typeof ProfileSchema>;
