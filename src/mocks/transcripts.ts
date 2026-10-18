/**
 * Transcripciones de ejemplo: alimentan el selector cuando no hay voz (Expo Go) y la prueba de usabilidad.
 * Cubren los 8 casos del brief + 2 extra (persona cuidadora y hora explícita).
 */
export interface SampleTranscript {
  id: string;
  /** Etiqueta corta para el selector. */
  label: string;
  text: string;
  /** Qué demuestra (para el equipo y la sustentación; no se muestra a participantes). */
  demonstrates: string;
  /** Las banderas rojas se agrupan aparte en el selector para no dispararlas por accidente. */
  sensitive?: boolean;
}

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  { id: 'comida-sintoma-med', label: 'Dolor de cabeza y dolex', text: 'Me dolió la cabeza fuerte después del almuerzo, me tomé un dolex', demonstrates: 'Comida/momento + síntoma con intensidad inferida + medicamento → pregunta por el alivio' },
  { id: 'solo-comida', label: 'Desayuno', text: 'Desayuné changua con almojábana y me tomé dos tintos', demonstrates: 'Solo comida y bebida, sin pregunta de seguimiento' },
  { id: 'sueno-estres', label: 'Dormí poco', text: 'Dormí como cinco horas y estoy muy estresada por el cierre', demonstrates: 'Sueño + estrés inferido' },
  { id: 'sintoma-sin-intensidad', label: 'Me duele la barriga', text: 'Me está doliendo la barriga', demonstrates: 'Síntoma sin intensidad → pregunta "¿Qué tan fuerte?"' },
  { id: 'ambigua', label: 'Algo con queso', text: 'Comí algo con queso creo, no me acuerdo bien', demonstrates: 'Frase ambigua → baja confianza, punto ámbar "¿Es correcto?"' },
  { id: 'no-relacionado', label: 'Otra cosa', text: 'Mañana tengo que llevar el carro al taller', demonstrates: 'Texto no relacionado → "No encontré síntomas…" con opciones' },
  { id: 'hora-explicita', label: 'Almuerzo y estómago', text: 'Almorcé bandeja paisa y como a las 3 me dio un dolor de estómago molesto', demonstrates: 'Hora explícita + intensidad "molesto" (5)' },
  { id: 'cuidadora', label: 'Mi mamá (cuidadora)', text: 'Mi mamá amaneció con mareo y casi no desayunó, solo un perico', demonstrates: 'Modo cuidador (Gloria): síntoma sin intensidad de otra persona' },
  { id: 'bandera-fisica', label: 'Pecho y respiración', text: 'Me duele el pecho y me cuesta respirar', demonstrates: 'Bandera roja física → pantalla de emergencia antes que nada', sensitive: true },
  { id: 'bandera-mental', label: 'Pensamientos difíciles', text: 'A veces pienso en hacerme daño', demonstrates: 'Bandera roja de salud mental → mensaje empático y líneas de ayuda', sensitive: true },
];

/** Ejemplos que rotan mientras Kalma escucha (pistas de qué se puede decir). */
export const LISTENING_HINTS = [
  '«Almorcé bandeja paisa y me dio acidez»',
  '«Dormí como cinco horas»',
  '«Me duele la cabeza, un 6»',
  '«Me tomé un dolex hace una hora»',
  '«Hoy caminé 30 minutos»',
];
