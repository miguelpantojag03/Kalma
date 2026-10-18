# Evaluación heurística — Kalma

Autoevaluación con las 10 heurísticas de Nielsen, hecha por el equipo al cerrar la fase 10 sobre el APK y la versión web a 390 px y 320 px, en tema claro y oscuro. No reemplaza la prueba con usuarios (`prueba-usabilidad.md`): sirve para llegar a ella sin errores evidentes.

**Escala de severidad (Nielsen):** 0 = no es problema · 1 = cosmético · 2 = menor · 3 = mayor · 4 = catástrofe.

## Resumen

| # | Heurística | Cumplimiento | Problemas abiertos (máx. severidad) |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | Alto | 0 |
| 2 | Relación con el mundo real | Alto | 0 |
| 3 | Control y libertad | Alto | 0 |
| 4 | Consistencia y estándares | Alto | 0 |
| 5 | Prevención de errores | Alto | 0 |
| 6 | Reconocer antes que recordar | Alto | 0 |
| 7 | Flexibilidad y eficiencia | Medio | 1 (sev. 2) |
| 8 | Estética y diseño minimalista | Alto | 1 (sev. 1) |
| 9 | Recuperarse de errores | Alto | 0 |
| 10 | Ayuda y documentación | Alto | 0 |

## Detalle por heurística

### 1. Visibilidad del estado del sistema
**Cómo se cumple:** el micrófono tiene cinco estados con texto ("Te escucho…", "Entendiendo…") además de la onda; el anillo de progreso dice cuántos días faltan para el primer análisis; los cambios pendientes de subir se cuentan en Perfil; el modo demo tiene una franja permanente; el banner "Sin conexión" aparece y desaparece solo; la tarjeta del experimento dice "Día 3 de 14".
**Cerrado en la fase 11 (D77):** con cuenta y sin internet, Hoy muestra «N cambios por subir a tu cuenta · se envían solos con internet».

### 2. Relación entre el sistema y el mundo real
**Cómo se cumple:** español colombiano y tuteo ("tinto", "almojábana", "Dolex"); horas en formato "6:41 a. m."; decimales con coma en el reporte; "Lo que mencionó tu médico" en lugar de "Diagnóstico"; intensidad de 0 a 10 como la preguntan los médicos.

### 3. Control y libertad del usuario
**Cómo se cumple:** todo lo que la IA extrae se ve y se edita antes de guardar (D04); "Deshacer" en el toast tras guardar; registro y check-in son modales que se cierran con atrás o con el gesto; revocar un permiso pausa el registro sin borrar (D64); la demo se reinicia y se sale de ella en un toque.

### 4. Consistencia y estándares
**Cómo se cumple:** un solo design system (tokens claros/oscuros, 20 componentes); el verde es la acción y el rojo solo emergencia (D03); los ajustes usan filas con flecha como iOS y Android (D63); la háptica tiene cinco señales fijas (D68).

### 5. Prevención de errores
**Cómo se cumple:** crear un experimento que toque un medicamento está bloqueado (D59); borrar datos exige escribir "BORRAR" y eliminar la cuenta "ELIMINAR"; la validación de formularios aparece al salir del campo y no al primer carácter (D52); un solo experimento activo a la vez (D60); las banderas rojas interrumpen el flujo antes de guardar.

### 6. Reconocer antes que recordar
**Cómo se cumple:** chips con las respuestas más probables primero (ley de Hick); ejemplos tocables en el registro y en "Volví del médico"; las plantillas de experimento salen de los patrones encontrados; los médicos guardados aparecen como chips al registrar una visita.

### 7. Flexibilidad y eficiencia de uso
**Cómo se cumple:** tres caminos para registrar según el momento: voz (≤ 10 s), síntoma rápido sin hablar (3 toques) y texto; el check-in abre directo desde la notificación; deslizar para refrescar en Hoy.
**Problema abierto (sev. 2):** no hay atajos para registrar desde fuera de la app (widget o *quick action* del ícono). *Propuesta (trabajo futuro):* quick action "Me empezó un síntoma" en el ícono de la app.

### 8. Estética y diseño minimalista
**Cómo se cumple:** una acción principal por pantalla; la mascota solo aparece en estados vacíos, de error y de bienvenida; los patrones muestran una frase y un nivel, y el detalle estadístico queda un nivel más abajo; el reporte cabe en una hoja A4.
**Problema abierto (sev. 1):** Hoy puede apilar a la vez check-in, patrón nuevo y experimento antes del día. *Propuesta:* si hay más de dos avisos, agrupar los secundarios en un carrusel.

### 9. Ayudar a reconocer, diagnosticar y recuperarse de errores
**Cómo se cumple:** ningún error técnico llega a la pantalla (D67); los errores de cuenta se traducen ("El correo o la contraseña no coinciden", D53); sin micrófono se ofrece texto; si la IA no entiende, se dice y se ofrece reintentar o escribir; enlace roto lleva a "No encontré esta pantalla" con salida a Hoy.

### 10. Ayuda y documentación
**Cómo se cumple:** el onboarding explica en 4 pasos qué hace y qué no hace Kalma; cada patrón tiene "¿Qué significa esto?"; cada permiso explica para qué es antes de pedirlo.
**Cerrado en la fase 11 (D78):** Perfil › Ayuda y preguntas frecuentes, con 11 preguntas en acordeón.

## Problemas encontrados y corregidos durante la evaluación

| Problema | Heurística | Sev. | Corrección |
|---|---|---|---|
| Un chip largo ("Máximo 2 tintos, ninguno después de las 2 p. m.") se salía de la pantalla | 8 / WCAG 1.4.10 | 3 | El chip baja de línea (D66) |
| Ruta inexistente mostraba "Unmatched Route" en inglés | 9 | 3 | Pantalla "No encontré esta pantalla" (D67) |
| Un error de render mostraba la pantalla técnica | 9 | 4 | ErrorBoundary amable (D67) |
| "Opcional. La app funciona igual…" repetía la etiqueta "Opcional" | 8 | 1 | Texto simplificado |
| "tres veces al dia" sin tilde en la visita organizada | 2 | 1 | Se muestra "al día" |
| Errores y "sin conexión" no se sentían sin mirar | 1 | 2 | Háptica de advertencia en el toast (D68) |
| "Ver el experimento" era un botón *ghost* a la izquierda y "Ver detalle" del patrón un enlace con flecha | 4 | 1 | Ambos son enlaces con flecha a la derecha |
| La misma tarea (T6) se usaba para dos cosas en la documentación | — | 1 | Guion renumerado T0–T11 |
