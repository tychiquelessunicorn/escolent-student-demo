/**
 * Progressive-enhancement haptics via the Vibration API.
 *
 * Android Chrome (and other supporting browsers) will buzz. iOS Safari has no
 * Vibration API — calling vibrate there is a quiet no-op when we guard with
 * feature detection, so we never attempt a failing path or surface an error.
 * Prefer reduced-motion users get no vibration either.
 */

function canVibrate(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  } catch {
    // matchMedia can throw in odd environments — treat as "no preference"
  }
  return true;
}

/** Fire-and-forget. Never throws. No-op on unsupported platforms (incl. iOS). */
export function haptic(pattern: number | number[] = 12): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silent — progressive enhancement only.
  }
}

export function hapticTap(): void {
  haptic(10);
}

export function hapticConfirm(): void {
  haptic([14, 40, 18]);
}

export function hapticSoft(): void {
  haptic(8);
}
