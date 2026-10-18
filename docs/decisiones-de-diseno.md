# Decisiones de diseño — Kalma

Registro vivo de las decisiones de diseño de la app. Cada entrada responde la pregunta "¿por qué?" con un principio reconocido y dice cómo se va a validar. Las tareas (T1, T2…) se refieren al guion de `prueba-usabilidad.md`.

**Índice por fase**
- Fase 1 · Proyecto Expo, design system y navegación: D00–D23
- Fase 2 · Datos semilla y store: D24–D29
- Fase 3 · Registro por voz y emergencia: D30–D36
- Fase 4 · Hoy y Calendario: D37–D40
- Fase 5 · Check-in nocturno: D41–D42
- Fase 6 · Motor de patrones: D43–D46
- Fase 7 · Reporte para el médico: D47–D49
- Cuentas reales (Supabase): D50–D58

---

## Fase 1 · Proyecto Expo, design system y navegación

### D00. Kalma es una app nativa (Expo + React Native), no una web
- **Necesidad del usuario:** registrar en 10 segundos desde el celular, recibir el recordatorio nocturno, abrir la hoja nativa de compartir para mandar el reporte por WhatsApp y llamar al 123 con un toque.
- **Principio:** ley de Jakob (las personas esperan los patrones de su sistema: gesto de volver, hoja de compartir, permisos del sistema) y guías de plataforma (HIG / Material 3). Notificaciones locales, háptica y voz nativa no son confiables en una web móvil.
- **Alternativa descartada:** el prototipo web (React + Vite + PWA) de la primera iteración. Se conservaron sus tokens, la verificación de contraste y estas decisiones; la versión web quedó archivada en `Kalma-web-fase1/`.
- **Cómo se validará:** las pruebas de usabilidad se hacen en un Android real con el APK (EAS Build), no en un navegador.

### D01. El botón primario usa `primaryStrong`, no `primary`
- **Necesidad del usuario:** leer la acción principal sin esfuerzo, incluso con poco brillo o al aire libre (Andrés almuerza fuera).
- **Principio:** WCAG 2.1 · 1.4.3. Texto blanco sobre `primary` (#6B9080) = **3.54:1** (no pasa). Sobre `primaryStrong` (#4F7566) = **5.16:1**.
- **Alternativa descartada:** oscurecer `primary`. Haría perder el salvia claro de la marca en íconos y decoración, donde basta 3:1 (1.4.11).
- **Cómo se validará:** `src/theme/__tests__/contrast.test.ts` (se corre con `npm test`) y la tabla en vivo del catálogo (Perfil › Demo › Design system).

### D02. Tokens nuevos: `borderStrong`, `warningText` y `onPrimary`
- **Necesidad del usuario:** ver dónde se puede escribir o tocar, y leer los avisos de "¿Es correcto?".
- **Principio:** WCAG 1.4.11 (controles ≥ 3:1) y 1.4.3. `border` = 1.26:1 y `warning` como texto = 2.17:1 no alcanzaban.
- **Alternativa descartada:** cambiar `border` y `warning`. Separar los roles es mejor: `border` sigue siendo decorativo para no ensuciar las tarjetas, y `warning` sigue sirviendo como punto o fondo.
- **Cómo se validará:** la prueba automática cubre 23 pares de uso real en cada tema.

### D03. El rojo se reserva solo para emergencias; los errores de la app usan ámbar
- **Necesidad del usuario:** que un error común ("no te escuché") no asuste a alguien que ya tiene dolor, y que la pantalla de emergencia sí se reconozca al instante.
- **Principio:** Nielsen #8 (un color de alarma usado para todo pierde fuerza) y #9 (errores claros y sin alarmismo). Tono "calma clínica cálida".
- **Alternativa descartada:** la convención de rojo para todo error. En una app de salud se lee como peligro médico.
- **Cómo se validará:** T6 (micrófono denegado) y T8 (bandera roja). Pregunta final: "¿En algún momento te sentiste alarmado/a?". En T6 la meta es que nadie diga que sí.

### D04. La intensidad siempre es color + número + palabra
- **Necesidad del usuario:** comparar días de un vistazo sin depender de distinguir colores (~8 % de los hombres tiene alguna discromatopsia).
- **Principio:** WCAG 1.4.1. Gestalt de similitud: el mismo color significa la misma intensidad en calendario, tarjetas y slider. La escala no cambia en modo oscuro para que un "7" se vea igual siempre.
- **Alternativa descartada:** solo un mapa de calor. También se descartó una escala que terminara en rojo, porque choca con D03; termina en terracota.
- **Cómo se validará:** simulador de deuteranopía sobre el calendario y T4: "¿Qué día de esta semana fue el peor?".

### D05. "Sin registro" se marca con borde punteado, no con otro color
- **Necesidad del usuario:** saber qué días faltan sin confundirlos con días sin síntomas, y sin sentirse regañado.
- **Principio:** WCAG 1.4.1 (la forma diferencia el estado), Nielsen #1 y tono sin culpa.
- **Alternativa descartada:** gris oscuro o una ✗, que se perciben como reproche ("perdiste el día").
- **Cómo se validará:** T4. La persona distingue un día sin registro de uno sin síntomas.

### D06. El micrófono va al centro de la barra, grande (72 pt) y elevado
- **Necesidad del usuario:** registrar en ≤ 10 s y ≤ 2 toques desde cualquier pestaña.
- **Principio:** ley de Fitts (objetivo grande en la zona del pulgar), ley de Jakob (botón central conocido) y Nielsen #7 (atajo para la acción más frecuente).
- **Alternativa descartada:** un FAB en la esquina inferior derecha, menos alcanzable con la mano izquierda y que tapa contenido.
- **Cómo se validará:** T2. Tiempo desde Hoy hasta empezar a hablar (meta < 3 s) y número de toques (meta ≤ 2).

### D07. El micrófono funciona con toque para iniciar y toque para terminar
- **Necesidad del usuario:** Gloria (58) dicta audios largos sobre su mamá; mantener presionado cansa y se suelta sin querer.
- **Principio:** accesibilidad motriz (WCAG 2.5.2: soltar el dedo no destruye la grabación) y Nielsen #5. La háptica al iniciar y al terminar confirma sin tener que mirar.
- **Alternativa descartada:** mantener presionado como en WhatsApp. Respeta la ley de Jakob, pero cuesta en accesibilidad. La analogía visual con WhatsApp (onda, cronómetro) se mantiene.
- **Cómo se validará:** T2 con mayores de 50 años. Si más de 2 de 5 intentan mantener presionado, se agrega soporte para ambos gestos.

### D08. La mascota "respira" para comunicar el estado, con alternativa en texto
- **Necesidad del usuario:** saber que Kalma está escuchando o procesando sin tener que leer.
- **Principio:** Nielsen #1. La respiración de 4 s está inspirada en la respiración pausada. Con "Reducir movimiento" (`useReducedMotion`) queda quieta y el estado se anuncia por texto en una región viva.
- **Alternativa descartada:** un spinner genérico, que comunica espera pero no calma.
- **Cómo se validará:** T2: "¿Cómo sabías que te estaba escuchando?". Repetir con Reducir movimiento activado.

### D09. Slider de intensidad "adjustable", con pista segmentada y botones − / +
- **Necesidad del usuario:** ajustar la intensidad con el dedo, sin precisión fina o con lector de pantalla.
- **Principio:** WCAG 4.1.2 y guías de VoiceOver y TalkBack. El rol `adjustable` permite subir o bajar deslizando hacia arriba o abajo y anuncia "7 de 10, fuerte". La pista tiene 11 segmentos (uno por valor), un pulgar de 32 pt y botones de 48 pt para motricidad reducida.
- **Alternativa descartada:** `@react-native-community/slider`, que es continuo, tiene un pulgar pequeño y no deja controlar qué anuncia el lector.
- **Cómo se validará:** prueba automática (`a11y.test.tsx`: incrementos y límites), recorrido con TalkBack y T3 (corregir una intensidad).

### D10. Lo que la IA entendió se muestra con su fragmento y un punto ámbar si duda
- **Necesidad del usuario:** confiar en lo que Kalma entendió y corregir rápido si se equivocó.
- **Principio:** Nielsen #1, #3 (editar y quitar en cada tarjeta) y #5 (revisar antes de guardar). La cita de lo que dijo la persona explica de dónde salió cada dato.
- **Alternativa descartada:** guardar directo y editar después. Los datos erróneos contaminarían los patrones sin que nadie lo note.
- **Cómo se validará:** T3. Con una frase ambigua, ¿la persona nota la tarjeta marcada y la corrige? (meta: 4 de 5).

### D11. El nivel de un patrón es palabra + puntos (1/2/3), nunca solo color
- **Necesidad del usuario:** entender cuánta confianza merece un hallazgo antes de llevarlo al médico.
- **Principio:** WCAG 1.4.1 y Nielsen #2 (Posible/Probable/Fuerte en vez de "p < 0.05"). Ética: los enunciados describen coincidencias con números ("llegaron después de") y nunca causas.
- **Alternativa descartada:** porcentajes de confianza, que dan una falsa precisión y se leen como probabilidad de causa.
- **Cómo se validará:** T5: "¿Esto quiere decir que el café te causa migraña?". Meta: la mayoría responde que no necesariamente.

### D12. Patrones bloqueado hasta el día 14, con anillo de progreso
- **Necesidad del usuario:** saber cuándo habrá resultados y no abandonar antes.
- **Principio:** efecto de gradiente de objetivo ("6 de 14 días") y Nielsen #1. Ética: no mostrar correlaciones sin base mínima.
- **Alternativa descartada:** "patrones preliminares" desde el día 3, que muestran ruido como si fuera hallazgo.
- **Cómo se validará:** T5 en modo "Empezar desde cero". La persona explica qué falta para ver patrones.

### D13. BottomSheet: se cierra con "atrás" en Android y aísla a VoiceOver en iOS
- **Necesidad del usuario:** responder preguntas rápidas sin estirar el pulgar, y salir como en cualquier otra app.
- **Principio:** ley de Fitts (contenido en la mitad inferior) y convenciones de plataforma. El botón atrás de Android cierra la hoja antes de salir de la pantalla (`onRequestClose`). En iOS, `accessibilityViewIsModal` deja a VoiceOver solo dentro de la hoja. Al abrir, el foco va al título. El diálogo de borrado no se cierra tocando fuera y destaca "No, conservar mis datos" (Nielsen #5).
- **Alternativa descartada:** `@gorhom/bottom-sheet` con arrastre libre. Es más vistoso, pero el arrastre libre aumenta el riesgo de cerrarla por accidente a mitad de una respuesta (hipótesis: se revisará con los resultados de las pruebas).
- **Cómo se validará:** T3 (pregunta de seguimiento) y T9 (borrar datos). Ninguna persona borra sin querer.

### D14. Toast con "Deshacer", anunciado al lector de pantalla
- **Necesidad del usuario:** confirmar que se guardó y revertir un error sin buscar dónde.
- **Principio:** Nielsen #3, WCAG 2.2.1 (7 s con acción, 4 s sin ella) y 4.1.3 (`announceForAccessibility`). Ley Peak-end: cierre amable con "Listo, lo guardé".
- **Alternativa descartada:** un modal "¿Seguro que quieres guardar?", que agrega un toque y rompe la regla de ≤ 2 toques.
- **Cómo se validará:** T2. La persona sabe que se guardó y puede deshacer si se le pide.

### D15. Texto del sistema al máximo: `allowFontScaling` activo y topes solo donde es inevitable
- **Necesidad del usuario:** Gloria usa el texto del celular agrandado.
- **Principio:** WCAG 1.4.4 aplicado a móvil. Todo el texto escala. Solo tienen tope (1.3–1.4×) las etiquetas de la barra de pestañas, el número del día en el calendario y el centro del anillo de progreso, porque con más escala se cortarían. En esos casos la información completa está en el nombre accesible. Las fuentes van incluidas en la app: funcionan sin conexión y no revelan a terceros que la persona abrió una app de salud.
- **Alternativa descartada:** desactivar el escalado para "proteger el diseño".
- **Cómo se validará:** Ajustes › Pantalla › Tamaño de fuente al máximo en Android, recorriendo las pantallas núcleo sin cortes ni solapamientos.

### D16. Modo oscuro con roles invertidos, no solo colores oscurecidos
- **Necesidad del usuario:** hacer el check-in nocturno sin encandilarse.
- **Principio:** WCAG 1.4.3 en ambos temas. En oscuro, el botón primario es salvia claro (#A9CDBE) con texto oscuro (10.31:1). Con texto blanco quedaría en 1.73:1.
- **Alternativa descartada:** solo oscurecer los fondos, que rompe la escala de intensidad y el contraste de los botones.
- **Cómo se validará:** la prueba de contraste del tema oscuro (todos los pares ≥ AA) y el check-in de T7 con el tema oscuro.

### D17. Barra de pestañas propia (Tabs JS) en lugar de la barra nativa
- **Necesidad del usuario:** un micrófono grande y central, siempre a mano.
- **Principio:** ley de Fitts. Las pestañas nativas (`NativeTabs`) no permiten un botón central más grande ni elevado. La barra propia conserva lo que da la nativa: `role="tab"`, estado seleccionado, etiquetas siempre visibles y respeto de la safe area inferior y de la barra de gestos.
- **Alternativa descartada:** `NativeTabs` con una pestaña "Registrar" normal. Es más nativa, pero el micrófono pierde jerarquía.
- **Cómo se validará:** T2 (tiempo hasta empezar a hablar) y recorrido con TalkBack (anuncia "Hoy, pestaña, seleccionada").

### D18. En "secundario" y "fantasma" el texto de los botones es `text`, no `primaryStrong`
- **Necesidad del usuario:** leer el botón también mientras se presiona.
- **Principio:** WCAG 1.4.3. Al presionar, el fondo pasa a `accent`, y `primaryStrong` sobre `accent` da 3.84:1. El borde `primaryStrong` mantiene la identidad de marca.
- **Alternativa descartada:** texto verde de marca, que se ve más "branded" pero falla al presionarlo.
- **Cómo se validará:** queda registrado como par prohibido en la prueba de contraste.

### D19. Permisos con contexto: una pantalla explica antes del diálogo del sistema
- **Necesidad del usuario:** entender para qué se pide el micrófono o las notificaciones antes de decidir.
- **Principio:** HIG y Material ("pedir en contexto") y Nielsen #2. Si la persona niega el permiso, la app sigue funcionando (escribir, elegir un ejemplo) y ofrece "Abrir Ajustes del celular" (`Linking.openSettings`). Nunca bloquea.
- **Alternativa descartada:** pedir todos los permisos al abrir la app. Baja la tasa de aceptación y la persona no sabe para qué son.
- **Cómo se validará:** T1 (onboarding). Tasa de aceptación del micrófono y comprensión del motivo.

### D20. Háptica con propósito, nunca como único feedback
- **Necesidad del usuario:** confirmar que empezó o terminó la grabación sin mirar la pantalla.
- **Principio:** Nielsen #1 y multimodalidad. Hay un toque suave al seleccionar, uno medio al iniciar, uno ligero al terminar, éxito al guardar y advertencia en emergencia. Siempre se acompaña de texto y un estado visual, y falla en silencio si el equipo no tiene motor.
- **Alternativa descartada:** vibración en cada interacción, que se vuelve ruido y cansa.
- **Cómo se validará:** observación en T2 y pregunta "¿Notaste alguna vibración? ¿Te ayudó o molestó?".

### D21. Tokens en TypeScript con `StyleSheet`, sin NativeWind
- **Necesidad del usuario (equipo):** un sistema confiable que se pueda probar y que compile igual en Expo Go y en el APK.
- **Principio:** consistencia (Nielsen #4 aplicado al sistema). Los tokens son objetos TS tipados: la prueba de contraste los importa directamente, y Tailwind no puede inventar valores fuera del sistema.
- **Alternativa descartada:** NativeWind. Es cómodo, pero agrega una capa de compilación frágil entre versiones del SDK y no permite probar los pares de color desde Jest.
- **Cómo se validará:** cero colores hexadecimales fuera de `src/theme/tokens.ts` en componentes (revisión en la auditoría de la fase 10).

### D22. Dos vitrinas del design system: Storybook RN y un catálogo dentro de la app
- **Necesidad del usuario (evaluador):** ver todos los componentes y estados en el celular, en claro y oscuro.
- **Principio:** "si no está documentado, no existe". Storybook RN (`npm run storybook:app`) da controles por componente. El catálogo (Perfil › Demo › Design system) funciona en Expo Go y en el APK sin configuración, e incluye la tabla de contraste en vivo.
- **Alternativa descartada:** solo Storybook. Exige arrancar en un modo especial, que no siempre es posible durante la sustentación.
- **Cómo se validará:** sustentación (recorrer el catálogo en el celular) y revisión heurística (#4 consistencia).

### D23. Registro y emergencia como modales; emergencia sin gesto de descarte
- **Necesidad del usuario:** que el registro se sienta como algo rápido "encima" de lo que estaba haciendo, y que la emergencia no se cierre por accidente.
- **Principio:** HIG (las tareas cortas y autocontenidas van en modal) y Nielsen #3. Registro = `modal`, que se cierra con el gesto de iOS o el atrás de Android. Emergencia = `fullScreenModal` con `gestureEnabled: false`: solo se sale con "Ya estoy bien / fue un error".
- **Alternativa descartada:** el registro como pestaña, que obliga a navegar de vuelta.
- **Cómo se validará:** T2 y T8. Nadie sale de la emergencia sin querer.

---

## Fase 2 · Datos semilla y store

### D24. Un solo contrato de datos para la IA simulada y la real
- **Necesidad del usuario (equipo):** poder conectar el prototipo a un LLM real sin rediseñar pantallas.
- **Principio:** consistencia (Nielsen #4 aplicado al sistema) y separación entre interfaz y servicio. `src/lib/schema.ts` define con zod el JSON exacto de extracción del brief (eventos, banderas rojas, pregunta de seguimiento). El mock de la fase 3 y un LLM detrás de un proxy deben devolver lo mismo.
- **Alternativa descartada:** tipos distintos por pantalla, que obligarían a reescribir la confirmación al cambiar de IA.
- **Cómo se validará:** cada entrada de la semilla valida contra el esquema (prueba automática); en la fase 3, también cada respuesta de `extractEntry`.

### D25. Datos semilla con patrones planteados por cuota, no por azar
- **Necesidad del usuario (evaluador):** ver en la demo los dos patrones del brief con la fuerza diseñada, sin importar el día en que se abra la app.
- **Principio:** validez de la demo. Con sorteos independientes y 45 días, en una corrida el azar dejó el patrón de sueño en 4 de 9 noches (en vez de ~7), y podía volverlo invisible. Ahora se asigna dolor de cabeza exactamente al 75 % de las noches cortas (8 % del resto) y molestia digestiva al 70 % de los días con lácteo (6 % del resto), eligiendo cuáles al azar. Los datos son **sintéticos** y así se declara en la sustentación.
- **Alternativa descartada:** ajustar el umbral de la prueba hasta que pasara, que escondía el problema en vez de resolverlo.
- **Cómo se validará:** `seed.test.ts` regenera la demo con 6 fechas distintas del año y verifica la fuerza de ambos patrones. En la fase 6, el motor debe detectar estos dos y ningún factor aleatorio como "Fuerte".

### D26. Ruido balanceado: el estrés no puede confundirse con el sueño
- **Necesidad del usuario:** que Kalma no muestre coincidencias engañosas ("el estrés te da migraña") en la demo.
- **Principio:** ética del diseño de datos (correlación ≠ causalidad) y el criterio del brief de que ningún factor aleatorio salga como "Fuerte". Con una semilla, el estrés alto coincidió por azar con los dolores (diferencia de 0.26). Ahora el estrés alto cae en la misma proporción (40 %) de días con y sin dolor. El tinto aparece todos los días, así que no hay contraste para que sea un patrón.
- **Alternativa descartada:** dejar el ruido sin controlar y confiar solo en la estadística del motor. La estadística (Fisher + q) se mantiene, pero la demo no debe depender de la suerte.
- **Cómo se validará:** la prueba "el ruido no está ligado al dolor de cabeza" y la revisión de la pantalla Patrones en la fase 6.

### D27. Todo se guarda solo en el celular
- **Necesidad del usuario:** confiar en que sus datos de salud no salen de su teléfono sin permiso.
- **Principio:** privacidad por diseño y minimización de datos (Ley 1581 de 2012). El store (Zustand + AsyncStorage) es local, y el consentimiento guarda cuándo se dio o revocó cada permiso. "Borrar todo" deja la app como recién instalada.
- **Alternativa descartada:** un backend de prueba con cuenta, que agrega riesgo y no suma a la evaluación (brief §13).
- **Cómo se validará:** T9 (borrar datos) y la pregunta en la entrevista posterior: "¿Dónde crees que quedan tus datos?".

### D28. La splash espera a que carguen los datos
- **Necesidad del usuario:** no ver durante el primer segundo un "Tu día está en blanco" falso, que haría pensar que se perdió todo.
- **Principio:** Nielsen #1 (el estado que se muestra debe ser el real) y prevenir errores de interpretación.
- **Alternativa descartada:** mostrar la app enseguida con un spinner sobre cada sección, lo que genera saltos en el diseño.
- **Cómo se validará:** abrir la app en frío varias veces en el APK; el estado vacío nunca debe aparecer por un instante.

### D29. "Racha sin castigo": días registrados de los últimos 7
- **Necesidad del usuario:** sentir avance sin culpa cuando se olvida un día (a Andrés "le da pereza anotar").
- **Principio:** tono del brief (nada de "perdiste tu racha") y motivación por progreso. La racha nunca se reinicia a cero: un día sin registro simplemente no suma. Antes de tener 14 días, el anillo muestra el progreso hacia el primer análisis (gradiente de objetivo).
- **Alternativa descartada:** una racha de días consecutivos tipo Duolingo, que convierte un olvido en castigo.
- **Cómo se validará:** en la entrevista posterior, "¿Cómo te hace sentir el anillo de la semana?" (meta: nadie menciona culpa).

---

## Fase 3 · Registro por voz y pantalla de emergencia

### D30. Registrar en 2 toques: escucha automática y corte por silencio
- **Necesidad del usuario:** registrar en ≤ 10 s, como un audio de WhatsApp, sin pasos intermedios.
- **Principio:** regla del brief (≤ 2 toques), ley de Tesler (la complejidad la absorbe el sistema) y Nielsen #7. Desde el micrófono de la barra, el registro se abre ya escuchando; el reconocimiento corta solo al detectar silencio (o con un toque); luego basta "Guardar". Toques: micrófono + Guardar.
- **Alternativa descartada:** abrir una pantalla intermedia con otro botón de grabar, que suma un toque y una decisión.
- **Cómo se validará:** T2. Contar toques y medir el tiempo desde Hoy hasta "Listo, lo guardé" (meta ≤ 10 s de interacción, sin contar lo que se habla).

### D31. Las banderas rojas se revisan antes que todo, sin internet y con sensibilidad alta
- **Necesidad del usuario:** que un síntoma de alarma nunca quede escondido detrás de una pantalla de confirmación.
- **Principio:** seguridad del paciente (brief §8). La regla es local (funciona sin conexión) y corre antes de la IA. Ante la duda, avisa: un falso positivo cuesta un toque en "Ya estoy bien / fue un error"; un falso negativo puede costar mucho más. Hay variantes coloquiales ("me falta el aire", "la popó negra", "se me durmió medio cuerpo").
- **Alternativa descartada:** marcar la alerta como una tarjeta más en la confirmación, que compite con el resto y se puede pasar por alto.
- **Cómo se validará:** prueba automática con 12 variantes coloquiales y 5 frases que NO deben alarmar; T8 en la prueba de usabilidad.

### D32. Una pantalla distinta para salud mental: empática y con líneas verificadas
- **Necesidad del usuario:** sentirse acompañado, no regañado ni asustado, si menciona pensamientos de hacerse daño.
- **Principio:** lenguaje empático ("Gracias por contármelo"), sin íconos de alarma ni mascota. Las líneas de ayuda vienen de un archivo de configuración con fuente y fecha de revisión (no se inventan números; las que aparecen en fuentes de 2020–2021 quedan marcadas "confirmar antes de presentar"). "Escribirle a alguien de confianza" usa la hoja nativa de compartir: no hay que dar acceso a los contactos.
- **Alternativa descartada:** la misma pantalla de emergencia física con el 123, que no responde a lo que la persona necesita en ese momento.
- **Cómo se validará:** revisión del texto con un profesional de salud mental (si es posible) y revisión heurística; esta tarea NO se prueba con participantes por razones éticas.

### D33. La demo nunca depende del micrófono
- **Necesidad del usuario (evaluador y participantes):** que el flujo funcione en Expo Go, en un salón ruidoso o sin permiso de micrófono.
- **Principio:** brief §7 y Nielsen #7 (varios caminos para la misma tarea). Sin módulo de voz, la app lo explica en un aviso y ofrece **Ejemplos**: Kalma "dicta" el ejemplo en pantalla con la onda animada y lo procesa igual que la voz. Siempre están **Escribir** y **Foto**.
- **Alternativa descartada:** mostrar un error de "voz no disponible", que corta la demo.
- **Cómo se validará:** recorrido completo en Expo Go antes de cada sesión de prueba.

### D34. Sin conexión: decirlo con honestidad y no perder lo que se dijo
- **Necesidad del usuario:** no perder un registro por falta de señal.
- **Principio:** Nielsen #9 (qué pasó + qué puede hacer) y honestidad: la extracción necesitaría internet en la versión real. Se ofrece "Guardar como nota" (con Deshacer) o "Intentar otra vez". En Perfil › Demo se puede simular sin conexión para mostrarlo en la sustentación.
- **Alternativa descartada:** un error genérico de red, o fingir que se procesó.
- **Cómo se validará:** T6b con el modo sin conexión activado.

### D35. La pregunta de seguimiento llega al guardar, es una sola y se puede saltar
- **Necesidad del usuario:** completar el dato que más le sirve al médico sin sentir un formulario.
- **Principio:** ley de Hick (máximo una pregunta, 4 opciones) y prioridad clínica: intensidad que falta, luego alivio del medicamento, luego horas de sueño dudosas. Si la persona ya corrigió ese dato a mano, no se pregunta.
- **Alternativa descartada:** preguntar todo lo que falte en cadena, que convierte el registro en una encuesta.
- **Cómo se validará:** T3. Tasa de respuesta frente a "Saltar" y tiempo extra (meta < 3 s).

### D36. Lo que se reconoce en una foto siempre pide confirmación
- **Necesidad del usuario:** registrar un plato sin escribir, sin que la app "adivine" sin avisar.
- **Principio:** Nielsen #1 y #5. El reconocimiento de imagen está simulado con confianza media: todo aparece con "¿Es correcto?" y el permiso de cámara se pide con contexto previo (D19).
- **Alternativa descartada:** guardar directamente lo que se reconoce en la foto.
- **Cómo se validará:** observar en T3b si la persona revisa y corrige la tarjeta de la foto.

---

## Fase 4 · Hoy y Calendario

### D37. "Me empezó un síntoma": un camino sin voz para el momento de la crisis
- **Necesidad del usuario:** Laura, con migraña, a veces no quiere hablar ni mirar mucho la pantalla (sensibilidad a la luz y al sonido).
- **Principio:** Nielsen #7 (atajo) y accesibilidad situacional. En 3 toques (síntoma · intensidad · guardar) se registra con la hora exacta, lo que hace más preciso el análisis. Los síntomas que la persona dijo que quiere entender aparecen primero (ley de Hick). Si el registro tiene una bandera roja, igual se muestra la pantalla de seguridad.
- **Alternativa descartada:** obligar a pasar por la voz, que sería la única vía en el peor momento.
- **Cómo se validará:** T4b. Registrar un dolor de cabeza "sin hablar" (meta < 8 s).

### D38. En la línea de tiempo se toca la tarjeta para corregir; quitar vive dentro de la hoja
- **Necesidad del usuario:** leer su día de un vistazo, sin ruido.
- **Principio:** Nielsen #8 (estética y minimalismo). Con 10–12 registros por día, repetir "Editar" y la papelera en cada tarjeta saturaba la pantalla (se vio en las capturas). La tarjeta completa es el área táctil (Fitts) y el lector anuncia "Toca para corregir o quitar". En la confirmación del registro sí se mantienen los botones visibles, porque ahí revisar es la tarea principal.
- **Alternativa descartada:** deslizar para borrar como único camino: no es descubrible y no funciona igual con lectores de pantalla.
- **Cómo se validará:** T3c. Corregir la intensidad de un registro de ayer desde el calendario.

### D39. Calendario: flechas y deslizamiento, más un resumen en texto
- **Necesidad del usuario:** comparar semanas y meses rápido, también con lector de pantalla o sin distinguir colores.
- **Principio:** varios caminos (Nielsen #7): deslizar entre meses para quien lo descubre y flechas visibles para todos (el gesto solo no es accesible). Bajo la grilla, un resumen en texto ("11 días con síntomas, el más fuerte 8 de 10") cumple WCAG 1.1.1. Hay filtro por síntoma, vista semanal con conteos y una leyenda permanente.
- **Alternativa descartada:** un mapa de calor sin números ni resumen.
- **Cómo se validará:** T4. "¿Qué día de esta semana fue el peor?" y "¿Cuántos días tuviste molestia digestiva este mes?".

### D40. Se puede agregar a un día pasado: lo aproximado también sirve
- **Necesidad del usuario:** Andrés se acuerda por la noche (o al día siguiente) de lo que almorzó.
- **Principio:** el registro tardío es mejor que no registrar (heurística de flexibilidad #7). Desde el detalle del día, el registro usa ese día como base: "a las 3" queda a las 3 p. m. de ese día. El tono invita sin culpa: "Si te acuerdas, puedes agregarlo ahora. Aproximado también sirve".
- **Alternativa descartada:** permitir registrar solo "ahora", que pierde datos valiosos para los patrones.
- **Cómo se validará:** T4c. Agregar el almuerzo de ayer desde el calendario.

---

## Fase 5 · Check-in nocturno

### D41. Check-in adaptativo de una pregunta por pantalla que avanza al tocar
- **Necesidad del usuario:** cerrar el día en menos de 30 segundos, ya cansado y con poca luz.
- **Principio:** Nielsen #6 (no preguntar lo que ya se sabe: si el sueño ya se registró, no se pregunta) y ley de Hick (3–5 preguntas, ≤ 5 opciones). Si hubo un síntoma, se pregunta "¿Cómo sigue?" en vez de "¿Tuviste alguno?". Tocar una opción avanza sola: un toque por pregunta, sin botón "Siguiente". Cada pregunta se puede saltar y hay "Atrás". La mascota "dormida" y el modo oscuro acompañan el momento.
- **Alternativa descartada:** un formulario con todas las preguntas en una sola pantalla, que exige más lectura y desplazamiento.
- **Cómo se validará:** T7. Tiempo total del check-in (meta < 30 s) y tasa de "Saltar" por pregunta.

### D42. Notificación local y discreta que abre el check-in directamente
- **Necesidad del usuario:** acordarse sin sentirse vigilado ni presionado.
- **Principio:** una notificación al día, a la hora que elija la persona, sin sonido (importancia normal) y con texto amable ("Tres preguntas rápidas, menos de 30 segundos"). Al tocarla se abre el check-in (enrutamiento por `data.url`, también en frío). El permiso se pide con contexto (D19). Si se niega, la app muestra el aviso dentro de Hoy desde las 7 p. m. En Perfil › Demo se puede disparar en 5 segundos para la sustentación.
- **Alternativa descartada:** varios recordatorios al día o notificaciones de "¡No pierdas tu racha!", que generan culpa y hacen que se desactiven las notificaciones.
- **Cómo se validará:** T7. Abrir el check-in desde la notificación; en la entrevista posterior: "¿Te molestaría recibirla todos los días?".

---

## Fase 6 · Motor de patrones y pantallas de Patrones

### D43. Un motor estadístico simple, explicable y corregido por comparaciones múltiples
- **Necesidad del usuario:** confiar en lo que Kalma le muestra y poder explicárselo al médico.
- **Principio:** honestidad estadística y explicabilidad (Nielsen #10). Por persona y por día: tabla 2×2 (¿hubo el factor en la ventana antes del episodio? ¿hubo episodio?), riesgo relativo y prueba exacta de Fisher; corrección de Benjamini–Hochberg sobre las ~70 combinaciones probadas, para que la casualidad no parezca patrón. Mínimos del brief: 14 días, 4 episodios, factor presente y ausente ≥ 3 veces. "¿Cómo lo calculé?" lo explica en lenguaje simple y muestra el q.
- **Alternativa descartada:** un modelo de aprendizaje automático, que no se puede explicar en consulta ni verificar con pocos datos.
- **Cómo se validará:** `patterns.test.ts` verifica Fisher contra valores de referencia y, con la demo en 7 fechas distintas, que los dos patrones planteados salen como "Fuerte" y ningún otro factor sale "Fuerte" (criterio de aceptación).

### D44. Piso para "Posible" y control de factores que van juntos
- **Necesidad del usuario:** no recibir "hallazgos" que son ruido o un efecto de otra cosa.
- **Principio:** ética (brief §13: no mostrar patrones sin base). (1) Al definir "Posible" solo como RR ≥ 1.5, apareció una coincidencia con p = 0,16; ahora además se exige p sin corregir < 0,1 y al menos 3 episodios que lo sustenten. (2) Control de confusión: un factor que deja de asociarse al mirar solo los días sin el patrón más fuerte del mismo síntoma no se muestra. Así se descartaron "harinas" y "grasa" (que vienen con los lácteos del pandebono y la almojábana) y "fritos" y "poca agua" (que coinciden con las noches cortas).
- **Alternativa descartada:** mostrar todo lo que supere RR 1,5, que en la demo producía 7 o más "patrones", varios engañosos.
- **Cómo se validará:** prueba "descarta harinas por ir junto con los lácteos"; revisión de la lista en la sustentación.

### D45. Los medicamentos nunca son factores de un patrón
- **Necesidad del usuario:** que Kalma no sugiera, ni siquiera sin querer, dejar o cambiar un medicamento.
- **Principio:** seguridad (brief §1 y §13: no recetar ni cambiar medicamentos) y validez: el acetaminofén aparece *después* del dolor (causalidad inversa) y saldría como un falso "patrón".
- **Alternativa descartada:** analizarlos como cualquier otro factor.
- **Cómo se validará:** la lista de factores del motor no incluye el tipo "medicamento" (revisión de código y de la demo).

### D46. El patrón se lee en una frase con números, se compara con barras y se puede auditar día por día
- **Necesidad del usuario:** entenderlo en 5 segundos y poder comprobarlo.
- **Principio:** lenguaje del mundo real (Nielsen #2), sin causalidad ("llegaron después de", nunca "causa"). Plantilla del brief: "El 77 % de tus dolores de cabeza llegaron después de noches de menos de 6 horas". Las barras "con vs. sin" muestran el porcentaje escrito, no solo dibujado (WCAG 1.4.1 y 1.1.1). Los días que lo sustentan son chips que abren ese día (transparencia y control). La redacción cambia según la ventana ("al día siguiente de…", "en las 6 horas después de…"). Aviso permanente: "Correlación, no diagnóstico".
- **Alternativa descartada:** un gráfico de dispersión o una cifra de "probabilidad", difíciles de leer y fáciles de malinterpretar como causa.
- **Cómo se validará:** T5. "Explícame con tus palabras qué encontró Kalma" y "¿Significa que el café te causa migraña?" (meta: la mayoría responde que no necesariamente).

---

## Fase 7 · Reporte para el médico

### D47. Una página, garantizada
- **Necesidad del usuario:** un médico tiene minutos por consulta; una página se lee, cinco no.
- **Principio:** carga cognitiva (del médico) y Nielsen #8. Cada sección tiene tope (3 patrones, 3 medicamentos, 4 preguntas, 4 síntomas) y la línea de tiempo es un gráfico compacto (color + altura + número). Se verificó el peor caso (45 días, todas las secciones, todos los patrones, 4 preguntas largas) imprimiendo el PDF A4 real con Chrome: **1 página** y sobra espacio.
- **Alternativa descartada:** un reporte "completo" de varias páginas con cada registro.
- **Cómo se validará:** el script de verificación de páginas; mostrar el PDF a un profesional de salud y preguntar qué entendió en 60 segundos.

### D48. Lenguaje del reporte: tercera persona, sin diagnóstico y con el método a la vista
- **Necesidad del usuario (y del médico):** que el documento sea serio y no se confunda con un diagnóstico.
- **Principio:** el reporte lo lee el médico, no Laura: los patrones pasan a tercera persona ("El 95 % de las molestias digestivas…") y los decimales usan coma (4,7). Se nombra el método (Fisher + Benjamini–Hochberg), se aclara que no implica causalidad y el pie dice siempre "Registro generado por el paciente. No constituye diagnóstico". Los medicamentos solo se informan (veces y alivio), nunca se evalúan. Por defecto entran solo patrones Fuertes y Probables, salvo que la persona elija otros.
- **Alternativa descartada:** reutilizar las frases de la app ("tus molestias"), que suenan raro en un documento clínico.
- **Cómo se validará:** prueba automática (tercera persona, coma decimal, pie obligatorio, escapado del texto escrito por la persona).

### D49. La persona decide qué se comparte, y por dónde
- **Necesidad del usuario:** control sobre sus datos de salud (Ley 1581) y compartir por el canal que ya usa (WhatsApp).
- **Principio:** control y libertad (Nielsen #3) y ley de Jakob: rango (2 semanas, 30 días, 45 días), secciones elegibles, preguntas editables (vienen sugeridas, y siempre son preguntas, nunca indicaciones), vista previa antes de generar y hoja nativa de compartir del sistema. El QR (simulado) sirve para mostrarlo en la consulta sin enviar nada.
- **Alternativa descartada:** enviar el reporte directo al médico desde la app, que exige cuentas, consentimiento adicional y un backend.
- **Cómo se validará:** T6. "Prepara un reporte de los últimos 30 días sin la sección de experimentos y compártelo por WhatsApp" (meta < 60 s).

---

## Cuentas reales (Supabase)

### D50. Cuenta real con Supabase, RLS y caché local por usuario
- **Necesidad del usuario:** usar Kalma con sus propios datos, no perderlos al cambiar de celular y que nadie más pueda verlos.
- **Principio:** privacidad por diseño (Ley 1581) y confiabilidad. Cada tabla tiene `user_id` con borrado en cascada y RLS en las cuatro operaciones (`user_id = auth.uid()`). La anon key es pública por diseño; la `service_role` solo vive en la Edge Function de eliminar cuenta. La app guarda una caché local por usuario (funciona sin conexión) y una cola de cambios que se envía cuando vuelve internet. El motor de patrones sigue corriendo en el celular.
- **Alternativa descartada:** guardar todo solo en el celular (se pierde al cambiar de equipo) o escribir directo en la nube en cada acción (la app dejaría de funcionar sin señal).
- **Cómo se validará:** `scripts/test-rls.mjs` con dos usuarios (B no puede leer, modificar, borrar ni escribir a nombre de A); pruebas de espacios de datos y de la cola; prueba en modo avión con una sesión iniciada.

### D51. No se pide "confirmar contraseña": se puede ver lo que se escribió
- **Necesidad del usuario:** crear la cuenta rápido en el celular, donde escribir dos veces una contraseña es lento y propenso a errores.
- **Principio:** ley de Tesler y prevención de errores (Nielsen #5) con un mecanismo mejor: el botón Mostrar/Ocultar permite verificar lo escrito sin duplicar el esfuerzo. Además, los gestores de contraseñas funcionan (`textContentType="newPassword"`, `autoComplete="new-password"`) y, si alguien se equivoca, "¿Olvidaste tu contraseña?" lo resuelve.
- **Alternativa descartada:** el campo de confirmación tradicional, que duplica el trabajo en un teclado pequeño y no evita errores si la persona copia y pega.
- **Cómo se validará:** prueba de usabilidad T0 ("crea tu cuenta"): tiempo, errores y si alguien usa Mostrar.

### D52. La validación aparece al salir del campo; los requisitos de contraseña, mientras se escribe
- **Necesidad del usuario:** que no le griten "error" cuando apenas va en la segunda letra.
- **Principio:** Nielsen #9 y validación en línea "sin prisa". Los errores (correo incompleto, nombre vacío) aparecen al salir del campo, en ámbar (D03), anunciados al lector de pantalla también en iOS. Los requisitos de contraseña no son errores sino progreso: una lista con ícono y texto que se va marcando mientras se escribe (Nielsen #6, WCAG 1.4.1). El botón queda deshabilitado hasta que todo es válido y un texto explica por qué.
- **Alternativa descartada:** validar en cada tecla (castiga antes de tiempo) o solo al enviar (la persona descubre todos los errores juntos al final).
- **Cómo se validará:** T0. Observar reacciones al escribir el correo y la contraseña; contar envíos fallidos (meta: 0).

### D53. El error de inicio de sesión es genérico: "El correo o la contraseña no coinciden"
- **Necesidad del usuario:** que nadie pueda averiguar si un correo tiene cuenta en una app de salud (eso ya revela información sensible).
- **Principio:** seguridad (no enumerar usuarios) con tono humano: el mensaje no culpa ni usa tecnicismos. "Olvidé mi contraseña" responde igual exista o no la cuenta. Todos los errores de Supabase pasan por `src/lib/authErrors.ts`, que nunca muestra el texto técnico.
- **Alternativa descartada:** "Ese correo no está registrado" / "Contraseña incorrecta", que es más preciso pero filtra quién usa Kalma.
- **Cómo se validará:** prueba automática (`auth.test.ts`); en T0b, comprensión del mensaje ("¿Qué harías ahora?").

### D54. La demo está separada y siempre señalizada
- **Necesidad del usuario (y del evaluador):** explorar Kalma con datos realistas sin crear cuenta, sin confundir esos datos con los propios.
- **Principio:** visibilidad del estado (Nielsen #1) e integridad de datos. La demo vive en su propio espacio del celular (`kalma:demo`), nunca se envía a Supabase (hay una prueba automática que lo garantiza) y muestra en cada pestaña "Estás explorando con datos de ejemplo" con "Crear mi cuenta". Sus herramientas (reiniciar, notificación, sin conexión) solo existen en modo demo. Una cuenta nueva empieza vacía y muestra los estados vacíos.
- **Alternativa descartada:** precargar los datos de Laura en la cuenta nueva, que llevaría a creer que esos patrones son propios.
- **Cómo se validará:** prueba `workspaces.test.ts` y pregunta posterior: "¿De quién eran los datos que viste?".

### D55. Bienvenida con tres niveles de jerarquía
- **Necesidad del usuario:** saber qué hacer en el primer segundo.
- **Principio:** jerarquía visual y ley de Hick. (1) "Crear cuenta" es el botón primario: es lo que necesita la mayoría la primera vez. (2) "Ya tengo cuenta" es secundario (con borde). (3) "Explorar con datos de ejemplo" es un enlace de texto: útil para curiosear o presentar, pero no compite con el camino principal. La mascota, la tagline y el aviso "no es un servicio médico" dan contexto antes de pedir nada. Si las cuentas no están configuradas, se explica y la demo sigue disponible.
- **Alternativa descartada:** tres botones iguales (la persona duda) o un carrusel de onboarding antes de la cuenta (retrasa la acción).
- **Cómo se validará:** prueba de los 5 segundos con la pantalla de Bienvenida: "¿Qué harías primero?".

### D56. La splash se mantiene hasta saber si hay sesión
- **Necesidad del usuario:** no ver por un instante la Bienvenida (o un día vacío) cuando ya tiene sesión.
- **Principio:** Nielsen #1 (el estado mostrado es el real), extensión de D28. AuthProvider lee la sesión guardada (también sin internet), abre el espacio de datos correcto y solo entonces se oculta la splash. Las redirecciones están centralizadas: sin sesión no se llega a la app; con sesión no se vuelve a la Bienvenida.
- **Alternativa descartada:** mostrar la Bienvenida y redirigir después, que produce un parpadeo y puede generar toques sobre la pantalla equivocada.
- **Cómo se validará:** abrir la app en frío 10 veces con sesión, en el APK y en modo avión.

### D57. Cerrar sesión y eliminar la cuenta: claros, reversibles cuando se puede y nunca en rojo
- **Necesidad del usuario:** control total sobre su cuenta, sin sustos ni accidentes.
- **Principio:** Nielsen #3 y #5. Cerrar sesión pide confirmación, explica que los datos quedan en la cuenta y, si hay cambios sin enviar (sin internet), lo advierte antes de borrar la caché local. Eliminar la cuenta exige escribir "ELIMINAR", explica que es irreversible y lo hace del lado del servidor (Edge Function), sin que la app tenga la llave maestra. La opción segura es la primaria y las destructivas son discretas (sin rojo: el rojo es solo para emergencias, D03).
- **Alternativa descartada:** un botón rojo de "Eliminar" con un solo "¿Estás seguro?", que es fácil de tocar sin leer.
- **Cómo se validará:** T9b (eliminar cuenta): nadie la elimina sin querer y todos entienden que es irreversible.

### D58. Saludos neutros en género
- **Necesidad del usuario:** que Andrés, Gloria y Laura se sientan igual de bienvenidos.
- **Principio:** lenguaje inclusivo sin forzar la lectura: "¡Qué bueno verte de nuevo!" y "Creemos tu espacio en Kalma" en lugar de "¡Bienvenida de nuevo, Laura!", que supone el género de la persona.
- **Alternativa descartada:** pedir el género solo para ajustar los saludos (es un dato más sin utilidad clínica aquí).
- **Cómo se validará:** revisión de textos con participantes de distintos géneros.

> Mejora futura anotada: inicio de sesión con Google (y Apple en iOS). No se incluye todavía por decisión del equipo.
