import { computed, ref, type ComputedRef, type Ref } from "vue";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "biatec-scan-theme";
export const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

/** Narrow an arbitrary stored string to a valid mode (default: follow system). */
export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

/** Effective theme for a mode given the OS preference. */
export function resolveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (mode === "system") return systemPrefersDark ? "dark" : "light";
  return mode;
}

function readStoredMode(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode / disabled cookies).
    return "system";
  }
}

const mode = ref<ThemeMode>("system");
const systemPrefersDark = ref(true);
let initialised = false;

const resolved = computed<ResolvedTheme>(() =>
  resolveTheme(mode.value, systemPrefersDark.value),
);

function apply(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Syncs reactive state with the theme that public/theme-init.js already applied
 * to <html> before first paint (an external script, because the CSP forbids
 * inline JS). Keep THEME_STORAGE_KEY in sync with that file.
 */
export function initTheme(): void {
  if (initialised) return;
  initialised = true;
  mode.value = readStoredMode();
  const query =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  systemPrefersDark.value = query ? query.matches : true;
  query?.addEventListener("change", (event) => {
    systemPrefersDark.value = event.matches;
    apply(resolved.value);
  });
  apply(resolved.value);
}

export function useTheme(): {
  mode: Ref<ThemeMode>;
  resolved: ComputedRef<ResolvedTheme>;
  setMode: (next: ThemeMode) => void;
  cycleMode: () => void;
} {
  initTheme();
  const setMode = (next: ThemeMode) => {
    mode.value = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persisting is best effort; the choice still applies for this session.
    }
    apply(resolved.value);
  };
  // Quick toggle for the navbar: flips the *effective* theme explicitly.
  // Picking the theme the OS already prefers stores "system", so the default
  // keeps following the device instead of silently pinning an explicit choice.
  const cycleMode = () => {
    const next: ResolvedTheme = resolved.value === "dark" ? "light" : "dark";
    const os: ResolvedTheme = systemPrefersDark.value ? "dark" : "light";
    setMode(next === os ? "system" : next);
  };
  return { mode, resolved, setMode, cycleMode };
}
