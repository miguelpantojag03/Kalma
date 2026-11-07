---
name: apple-design
description: Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent materials and depth, typography (optical sizing, tracking, leading), reduced-motion, or the design foundations (feedback, spatial consistency, restraint) behind Apple-style interfaces.
---

# Apple Design

> En Kalma (React Native) se traduce así: resortes = `withSpring` de Reanimated con `duration` + `dampingRatio` (ver `src/theme/motion.ts`); gestos = `react-native-gesture-handler`; materiales = `expo-blur` (`src/components/ui/Material.tsx`); háptica = `src/lib/haptics.ts`.

The through-line: **an interface feels alive when motion starts from the current on-screen value, inherits the user's velocity, projects momentum forward, and can be grabbed and reversed at any instant.** Springs are the tool that makes all of this natural, because they are inherently interruptible and velocity-aware.

Apple frames design as serving four human needs: **safety/predictability, understanding, achievement, and joy.**

## 1. Response — kill latency
- Respond on pointer-down, not on release. Highlight a button the instant it's pressed.
- Audit every latency on the input path (debounces, timers, transition waits).
- Feedback must be continuous during the interaction (drag, slider, drawer track 1:1).

## 2. Direct manipulation — 1:1 tracking
Touch and content move together; respect the grab offset. Track a short velocity history — you need velocity at release.

## 3. Interruptibility — the single most important principle
- Never lock out input during a transition.
- Always animate from the presentation (current) value, never the target value.
- Avoid fixed-duration timing animations for gesture-driven things; springs re-target from the current value and velocity.
- When a gesture reverses, blend velocity — don't hard-cut it.
- Decompose 2D motion into independent X and Y springs.

## 4. Behavior over animation — use springs
Think in **damping ratio** (1.0 = no overshoot; <1 bounces) and **response** (seconds; not a duration).
- Default UI: damping 1.0.
- Bounce (~0.8) only when the gesture itself carried momentum (flick, throw, drag release).

| Interaction | Damping | Response |
| --- | --- | --- |
| Move / reposition | 1.0 | 0.4 |
| Rotation | 0.8 | 0.4 |
| Drawer / sheet | 0.8 | 0.3 |

## 5. Velocity handoff
When a gesture ends, the animation continues at the finger's exact velocity (pass release velocity as the spring's initial velocity).

## 6. Momentum projection
```js
function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}
const target = nearestSnapPoint(currentPosition + project(releaseVelocity));
```

## 7. Spatial consistency
Enter and exit along the same path. Anchor menus/sheets to their source. Mirror easing on reversible transitions.

## 8. Hint in the direction of the gesture
Intermediate frames should telegraph where things are going.

## 9. Rubber-banding
```js
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

## 10. Gesture details
Highlight on touch-down, commit on touch-up, allow cancel by dragging away. ~10px hysteresis before committing to a drag direction. Recognize gestures in parallel; minimize disambiguation delays.

## 11. Frame-level smoothness
Animate only transform and opacity; run on the UI thread.

## 12. Materials & depth
- Nav/toolbars/sheets as translucent layers with content scrolling underneath.
- Heavier material = structure; never stack light translucent on light translucent.
- Dim to focus (modal + scrim); separate without scrim for parallel panels.
- Scroll edge effects instead of hard dividers — only where floating UI overlaps content.

## 13. Multimodal feedback
Causality, harmony (visual + haptic on the same frame), utility (only meaningful moments).

## 14. Reduced motion & accessibility
Reduced motion → cross-fades, no overshoot. Reduced transparency → solid surfaces. Increased contrast → solid backgrounds with defined borders.

## 15. Typography
Tracking is size-specific (negative on large display text, slightly positive on small text). Leading tight on headings, looser on body. Hierarchy from weight + size + leading. Respect the user's text size.

## 16. Design foundations
Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity (not minimalism), Craft, Delight. Feedback kinds: status, completion, warning, error. Wayfinding: where am I, where can I go, how do I get out. Specific labels beat generic ones.

## 17. Process
Prototype interactively, design interaction and visuals together, test with real people, review motion in slow motion.

## Quick Reference
| Need | Technique | Value |
| --- | --- | --- |
| Default UI spring | Critically damped | damping 1.0, response 0.3–0.4 |
| Momentum spring | Slight bounce | damping ~0.8, response 0.3–0.4 |
| Flick landing | Project momentum | current + (v/1000)·d/(1−d), d ≈ 0.998 |
| Interrupt | From live value | read the on-screen value |
| Decide reverse vs commit | Velocity sign | at release |
| Boundary | Rubber-band | progressive resistance |
| Type tracking | Size-specific | tighten large text |
| Reduced motion | Cross-fade | no slide/spring |
