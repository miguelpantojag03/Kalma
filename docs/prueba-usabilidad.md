# Prueba de usabilidad — guion

Prueba moderada, presencial, con **5 participantes**, sobre el APK (`docs/build.md`) en un Android real. Cada sesión dura unos 40 minutos. Las tareas T0–T11 son las mismas que citan las decisiones de diseño (`decisiones-de-diseno.md`), así cada decisión queda validada o refutada.

## 1. Objetivos

1. Comprobar que registrar toma **≤ 10 segundos y ≤ 2 toques** (la promesa central).
2. Verificar que las personas **entienden los patrones sin leerlos como causa** ("el café te causa migraña").
3. Confirmar que pueden **corregir lo que la IA entendió** antes de guardar.
4. Medir la **satisfacción general** con el SUS (meta ≥ 75).
5. Validar que las pantallas de **seguridad** (emergencia, permisos, eliminar cuenta) se entienden y no alarman.

## 2. Participantes

| Perfil | Cuántos | Basado en |
|---|---|---|
| Persona con migraña, 20–35 años, usa el celular todo el día | 2 | Laura |
| Persona con molestias digestivas, 25–45 años, poco tiempo | 2 | Andrés |
| Cuidadora de 50+ años que registra por un familiar, texto grande | 1 | Gloria |

**Criterio de exclusión:** estudiantes de diseño o de ingeniería de sistemas, porque conocen los patrones de interfaz y sesgan la prueba.

## 3. Materiales

- Celular Android con el APK, la demo reiniciada, volumen y vibración activos.
- Grabación de pantalla del celular y audio de la sesión (con consentimiento firmado).
- Este guion impreso, cronómetro y la hoja de observación (sección 7).
- Formulario SUS impreso (sección 6).

## 4. Guion del moderador

**Bienvenida (3 min).**
> "Gracias por venir. Vamos a probar una app, no a ti: si algo es difícil, es culpa de la app y eso es justo lo que queremos encontrar. Piensa en voz alta: dime qué buscas, qué esperas y qué te sorprende. Puedes parar cuando quieras. ¿Me autorizas a grabar la pantalla y el audio? Los datos son de ejemplo; no vas a escribir nada tuyo."

**Contexto (2 min).**
> "Imagina que tienes [migraña / molestias digestivas] y tu médico te pidió anotar qué comes, cómo duermes y cuándo te duele. Alguien te recomendó Kalma."

**Reglas para el moderador:** no ayudar durante 60 s de bloqueo; si la persona pregunta, devolver la pregunta ("¿Qué crees que pasaría?"); anotar tiempo, errores y frases textuales.

## 5. Tareas

Formato: **escenario que se lee al participante** · qué se mide · criterio de éxito.

| ID | Escenario (se lee en voz alta) | Métrica | Éxito |
|---|---|---|---|
| T0 | "Crea tu cuenta con este correo de prueba." | Tiempo, errores de validación, ¿usa "Mostrar contraseña"? | < 90 s, sin ayuda |
| T0b | (Pantalla "Revisa tu correo") "¿Qué harías ahora?" | Comprensión | Explica que debe abrir el correo |
| T1 | "Configura la app para ti: quieres entender tu migraña." | Tiempo, ¿lee el consentimiento? | < 2 min; nombra 1 cosa que Kalma no hace |
| T2 | "Acabas de almorzar bandeja paisa con gaseosa. Anótalo." | Tiempo hasta empezar a hablar; toques | ≤ 2 toques; habla en < 5 s |
| T2b | (Micrófono denegado) "Anota lo mismo." | ¿Encuentra la alternativa de texto? ¿Se alarma? | Usa el texto; nadie se siente alarmado |
| T3 | "Kalma entendió intensidad 5, pero fue 7. Corrígelo." | Tiempo, errores | < 20 s |
| T3b | "Anota tu desayuno con una foto." | ¿Revisa la tarjeta antes de guardar? | Revisa y guarda |
| T3c | "Ayer el dolor fue más fuerte de lo que anotaste. Corrígelo." | Tiempo, ruta | < 45 s desde Calendario |
| T4 | "¿Qué día de esta semana fue el peor? ¿Cuántos días tuviste molestia digestiva este mes?" | Acierto | Responde bien ambas |
| T4b | "Te acaba de empezar un dolor de cabeza y no quieres hablar. Anótalo." | Tiempo | < 8 s |
| T4c | "Se te olvidó anotar el almuerzo de ayer. Agrégalo." | Tiempo | < 45 s |
| T5 | "¿Qué encontró Kalma? Explícalo con tus palabras." Luego: "¿Significa que los lácteos te causan la molestia?" | Comprensión | La mayoría responde "no necesariamente" |
| T6 | "Prepara un reporte de los últimos 30 días, sin la sección de experimentos, y compártelo por WhatsApp." | Tiempo | < 60 s |
| T6b | (Sin conexión) "Anota cómo dormiste." | ¿Entiende que se guardó? | Sí, sin preocuparse |
| T7 | (Llega la notificación) "Responde el check-in de la noche." | Tiempo, tasa de "Saltar" | < 30 s |
| T8 | "Anota: 'tengo el peor dolor de cabeza de mi vida y se me durmió medio cuerpo'." | Reacción a la pantalla de emergencia | Identifica que debe llamar al 123 |
| T9 | "Quieres borrar todos tus registros, pero conservar la cuenta." | Ruta, ¿borra sin querer? | Lo logra; nadie borra por accidente |
| T9b | "Quieres eliminar tu cuenta." (se detiene antes de confirmar) | Comprensión de la irreversibilidad | Explica que no se puede deshacer |
| T9c | "Ya no quieres que Kalma entienda tu voz con IA. Desactívalo y luego vuelve a activarlo." | Tiempo; ¿qué cree que pasó con sus datos? | ≤ 20 s para encontrarlo; sabe que no se borró nada |
| T10 | "Kalma notó que duermes poco antes del dolor. Prueba un cambio durante 2 semanas." | Tiempo, ¿elige plantilla? | < 60 s sin ayuda |
| T10b | (Experimento terminado) "¿Te sirvió el cambio?" | Comprensión | No dice "el experimento me curó" |
| T11 | "Acabas de salir del neurólogo. Anota lo que te dijo." (lee el ejemplo) | Tiempo, ¿corrige algo? | < 2 min; corrige al menos un dato |

> En una sesión de 40 min no caben todas. **Núcleo para todos:** T1, T2, T3, T4b, T5, T6, T8, T9c. **Rotativas** (cada participante hace 3): T0, T3c, T4, T7, T10, T11. Así cada tarea rotativa la hacen al menos 2 personas.

## 6. Cuestionario SUS (System Usability Scale)

Después de las tareas. Escala de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo).

1. Creo que me gustaría usar Kalma con frecuencia.
2. Encontré Kalma innecesariamente complicada.
3. Pensé que Kalma era fácil de usar.
4. Creo que necesitaría ayuda de una persona con conocimientos técnicos para usar Kalma.
5. Las funciones de Kalma están bien integradas.
6. Pensé que había demasiadas inconsistencias en Kalma.
7. Imagino que la mayoría de las personas aprenderían a usar Kalma muy rápido.
8. Encontré Kalma muy difícil de usar.
9. Me sentí muy seguro/a usando Kalma.
10. Necesité aprender muchas cosas antes de poder usar Kalma.

**Cálculo:** a cada ítem impar se le resta 1; a 5 se le resta cada ítem par; se suman y se multiplica por 2,5. Resultado de 0 a 100. **Referencia:** 68 = promedio; ≥ 75 = bueno; ≥ 85 = excelente.

## 7. Entrevista posterior (5 min)

1. "¿Qué fue lo más fácil? ¿Y lo más frustrante?"
2. "¿Notaste alguna vibración? ¿Te ayudó o te molestó?"
3. "¿En algún momento te sentiste alarmado/a o regañado/a?"
4. "¿Te molestaría recibir el recordatorio todos los días?"
5. "¿Le mostrarías el reporte a tu médico? ¿Qué le cambiarías?"
6. "¿Confiarías tus datos de salud a esta app? ¿Por qué?"

## 8. Hoja de observación (una por participante)

| Tarea | Tiempo | Éxito (sí / con ayuda / no) | Errores | Frase textual | Severidad del problema (0–4) |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| … | | | | | |

## 9. Formato de hallazgos

Cada hallazgo se registra así y alimenta la iteración (fase 6 del proceso de diseño):

```
### H[n]. [Título corto del problema]
- Tarea(s): T…
- Participantes afectados: n de 5
- Evidencia: tiempo / error / cita textual
- Heurística o criterio: Nielsen #… / WCAG …
- Severidad: 0–4
- Decisión relacionada: D…
- Propuesta de cambio: …
- Antes / después: captura
```

## 10. Métricas resumen a reportar

| Métrica | Meta |
|---|---|
| Tasa de éxito de tareas núcleo | ≥ 80 % |
| Tiempo de registro por voz (T2) | ≤ 10 s |
| Tiempo de síntoma rápido (T4b) | ≤ 8 s |
| Personas que leen el patrón como causa (T5) | ≤ 1 de 5 |
| SUS promedio | ≥ 75 |
| Personas que se sintieron alarmadas fuera de T8 | 0 |
