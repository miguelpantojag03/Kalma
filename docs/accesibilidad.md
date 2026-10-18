# Accesibilidad — WCAG 2.1 AA aplicado a móvil

Estado: **fase 10 (auditoría final)**. Leyenda: ✅ verificado · 🧪 verificado con prueba automática · 🟡 implementado, falta verificar con TalkBack/VoiceOver en un celular real · ⬜ pendiente.

## Cómo se verificó

| Herramienta | Qué cubre |
|---|---|
| `npm test` → `src/theme/__tests__/contrast.test.ts` | Contraste de 23 pares de uso real × 2 temas, y 3 pares prohibidos que deben seguir fallando |
| `npm test` → `a11y.test.tsx` | Nombre, rol y valor de slider, chips, botones, días del calendario y micrófono |
| `node scripts/check-reflow.mjs` | Reflujo a 320 px en 16 rutas (ver abajo) |
| Capturas a 390 y 320 px, tema claro y oscuro | Revisión visual de cada pantalla nueva |
| Revisión de código | Todos los `Pressable` tienen `accessibilityRole` o están ocultos a propósito (fondo de la hoja y botones +/− del slider, que el lector maneja como `adjustable`) |

## Contraste

La prueba importa `src/theme/tokens.ts` directamente: si alguien cambia un color y rompe AA, falla. El catálogo de la app (Perfil › Design system) muestra la misma tabla en vivo.

| Uso | Claro | Oscuro | Mín. |
|---|---|---|---|
| Texto / fondo | 14.40 | 15.37 | 4.5 |
| Texto secundario / tarjeta | 5.30 | 6.96 | 4.5 |
| Botón primario | 5.16 | 10.31 | 4.5 |
| Texto de marca / tarjeta | 5.16 | 9.17 | 4.5 |
| Texto / accent | 10.92 | 9.70 | 4.5 |
| Chip seleccionado | 7.72 | 6.51 | 4.5 |
| Advertencia (texto) | 5.91 | 7.31 | 4.5 |
| Botón de emergencia | 5.44 | 5.92 | 4.5 |
| Intensidad 10 (la más oscura) | 4.98 | 4.98 | 4.5 |
| Borde de control | 3.58 | 3.18 | 3 |

**Pares prohibidos:** blanco sobre `primary` (3.54; los botones usan `primaryStrong`), `primaryStrong` como texto sobre `accent` en claro (3.84) y `warning` como texto (2.17; se usa `warningText`).

## Reflujo a 320 px — `scripts/check-reflow.mjs`

Resultado de la fase 10: **16 de 16 rutas sin scroll horizontal ni elementos fuera del borde**: Hoy, Calendario, Patrones, Perfil, Registro, Check-in, Reporte, Mis experimentos, Nuevo experimento, Volví del médico, Visitas, Mi salud, Recordatorios, Privacidad y seguridad, Emergencia y Design system. Antes de la corrección D66, un chip largo de "Nuevo experimento" se salía a 390 px.

## Checklist

| Criterio | Estado | Cómo se cumple en la app |
|---|---|---|
| 1.1.1 Contenido no textual | 🟡 | Íconos ocultos al lector cuando hay texto. La mascota es decorativa salvo que tenga `label`. La onda de audio está oculta (el estado va en texto). La cuadrícula de días del experimento tiene un resumen accesible ("Cumpliste 5 de 7 días anotados"). |
| 1.3.1 Información y relaciones | 🟡 | `header` en títulos, `radiogroup` en chips de opción única, `list` en los de varias opciones, `tablist`/`tab` en la barra, `link` en los enlaces con flecha. |
| 1.4.1 Uso del color | 🧪 | Intensidad = color + número + palabra. Chip seleccionado = check. Día sin registro = borde punteado. Adherencia = ✓ / ✗ / número. Nivel de patrón = puntos + texto. |
| 1.4.3 Contraste mínimo | 🧪 | Ver tabla. |
| 1.4.4 Cambio de tamaño del texto | 🟡 | `allowFontScaling` activo. Topes de 1.3–1.4× solo en las etiquetas de la barra, el número del día y el centro del anillo (D15). Los chips bajan de línea (D66). |
| 1.4.10 Reflujo | 🧪 | 16/16 rutas a 320 px (script). |
| 1.4.11 Contraste no textual | 🧪 | `borderStrong` en controles e íconos con `primary` (≥ 3:1). |
| 2.1.1 Teclado / switch | 🟡 | Todo control es un `Pressable` con rol. El slider responde a acciones de accesibilidad (subir/bajar). |
| 2.2.1 Tiempo ajustable | ✅ | Toast con acción = 7 s; sin acción = 4 s (solo informativo). El bloqueo con huella no tiene tiempo límite para desbloquear. |
| 2.3.3 Animación | 🟡 | `useReducedMotion` en mascota, micrófono, anillo, hojas y toast: sin escala ni desplazamiento, solo opacidad. |
| 2.4.3 Orden del foco | 🟡 | La hoja mueve el foco a su título; en iOS, `accessibilityViewIsModal` lo encierra; en Android, atrás la cierra. El bloqueo de la app también es modal para el lector. |
| 2.5.2 Cancelación del puntero | ✅ | El micrófono usa toque, no presión sostenida. |
| 2.5.5 Tamaño del objetivo | ✅ | Mínimo 48 (44 pt iOS / 48 dp Android). Filas de ajustes de 56. Botones "Quitar" de 48 × 48. Chips compactos de 40 + `hitSlop` 4. Enlaces de 44 + `hitSlop` 8. |
| 3.1.1 Idioma | ✅ | Región de desarrollo `es` y textos de permisos en español. |
| 3.3.1 Identificación de errores | 🟡 | `TextField` con borde ámbar, mensaje en región viva y pista accesible. El bloqueo de experimentos con medicamentos usa el mismo patrón. |
| 3.3.4 Prevención de errores (datos) | ✅ | Borrar datos pide escribir "BORRAR"; eliminar la cuenta, "ELIMINAR"; revocar un permiso pide confirmación (D64). |
| 4.1.2 Nombre, función, valor | 🧪 | `a11y.test.tsx` + `Switch` con `accessibilityLabel` (bloqueo, recordatorios, sin conexión). |
| 4.1.3 Mensajes de estado | 🟡 | Toast con `announceForAccessibility` (y háptica de advertencia en errores, D68); banners con `accessibilityLiveRegion`. |
| Alternativa a la voz | ✅ | Texto en registro y en Volví del médico; síntoma rápido en 3 toques; ejemplos tocables. Verificado en web, donde no hay voz. |

## Pendiente de verificación manual (Android real con el APK)

Esto no se puede automatizar y lo hace el equipo antes de la prueba de usabilidad:

- [ ] TalkBack: recorrer Hoy (incluida la tarjeta del experimento), la barra de pestañas, Registro, Perfil › Tu Kalma y el slider (deslizar arriba/abajo).
- [ ] VoiceOver (si hay iPhone disponible, con Expo Go).
- [ ] Tamaño de fuente y de pantalla del sistema al máximo.
- [ ] Ajustes › Accesibilidad › Quitar animaciones.
- [ ] Simulador de deuteranopía (Opciones de desarrollador › Simular espacio de color) sobre Calendario y la cuadrícula del experimento.
- [ ] Bloqueo con huella: activarlo, salir más de 1 minuto y volver; probar "Desbloquear" con PIN.
