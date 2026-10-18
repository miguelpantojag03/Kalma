# Accesibilidad — WCAG 2.1 AA aplicado a móvil

Estado: **fase 1 (design system)**. Se actualiza al terminar cada fase. Leyenda: ✅ verificado · 🧪 verificado con prueba automática · 🟡 implementado, falta verificar con TalkBack/VoiceOver · ⬜ pendiente.

## Contraste — `npm test` (`src/theme/__tests__/contrast.test.ts`)

La prueba importa `src/theme/tokens.ts` directamente: si alguien cambia un color y rompe AA, falla. Cubre 23 pares de uso real × 2 temas, más 3 pares prohibidos que deben seguir fallando. El catálogo de la app (Perfil › Demo › Design system) muestra la misma tabla en vivo.

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

**Pares prohibidos (documentados para que nadie los use):**
- Blanco sobre `primary`: 3.54. Los botones usan `primaryStrong`.
- `primaryStrong` como texto sobre `accent` (claro): 3.84. Sobre `accent` va `text`.
- `warning` como texto: 2.17. Para texto se usa `warningText`.

## Checklist

| Criterio | Estado | Cómo se cumple en la app |
|---|---|---|
| 1.1.1 Contenido no textual | 🟡 | Íconos ocultos al lector cuando hay texto. La mascota es decorativa salvo que tenga `label`. La onda de audio está oculta (el estado va en texto). |
| 1.3.1 Información y relaciones | 🟡 | `accessibilityRole="header"` en títulos, `radiogroup` en chips de opción única, `tablist`/`tab` en la barra. |
| 1.4.1 Uso del color | 🧪 | Intensidad = color + número + palabra. Chip seleccionado = check. Sin registro = borde punteado. Nivel de patrón = puntos + texto. |
| 1.4.3 Contraste mínimo | 🧪 | Ver la tabla. |
| 1.4.4 Texto del sistema al máximo | 🟡 | `allowFontScaling` activo. Topes de 1.3–1.4× solo en las etiquetas de la barra, el número del día y el centro del anillo (D15). |
| 1.4.10 Reflujo (320 de ancho) | ⬜ | Se verifica pantalla por pantalla desde la fase 3. |
| 1.4.11 Contraste no textual | 🧪 | `borderStrong` en controles y `primary` en íconos (≥ 3:1). |
| 2.1.1 Teclado / switch | 🟡 | Todo control es un `Pressable` con rol. El slider responde a acciones de accesibilidad. |
| 2.2.1 Tiempo ajustable | ✅ | Toast con acción = 7 s; sin acción = 4 s (solo informativo). |
| 2.3.3 Animación | 🟡 | `useReducedMotion` en mascota, micrófono, anillo, hojas y toast: sin escala ni desplazamiento, solo opacidad. |
| 2.4.3 Orden del foco | 🟡 | La hoja mueve el foco a su título. En iOS, `accessibilityViewIsModal` lo encierra; en Android, atrás la cierra. |
| 2.5.2 Cancelación del puntero | ✅ | El micrófono usa toque, no presión sostenida. |
| 2.5.5 Tamaño del objetivo | ✅ | Mínimo 48 (44 pt iOS / 48 dp Android). Chips compactos de 40 + `hitSlop` 4. Micrófono de 72–96. |
| 3.1.1 Idioma | ✅ | Región de desarrollo `es` en iOS y textos de permisos en español (`locales/es.json`). |
| 3.3.1 Identificación de errores | 🟡 | `TextField` con borde ámbar + mensaje en región viva + pista accesible. |
| 4.1.2 Nombre, función, valor | 🧪 | `a11y.test.tsx`: slider `adjustable` con `accessibilityValue`, chips `radio`/`checkbox` con `checked`, botón `busy`, días con nombre completo, micrófono con nombre por estado. |
| 4.1.3 Mensajes de estado | 🟡 | Toast con `announceForAccessibility`; banners con `accessibilityLiveRegion`. |
| Alternativa a la voz | 🟡 | `TextField` y estados `blocked`/`unavailable` del micrófono listos; se integran en el registro (fase 3). |

## Pendiente de verificación manual (en un Android real con el APK)
- [ ] TalkBack: recorrer Hoy, la barra de pestañas, el catálogo y el slider (deslizar arriba/abajo).
- [ ] VoiceOver (si hay iPhone disponible).
- [ ] Tamaño de fuente y de pantalla del sistema al máximo.
- [ ] Ajustes › Accesibilidad › Quitar animaciones.
- [ ] Simulador de deuteranopía (Opciones de desarrollador › Simular espacio de color).
