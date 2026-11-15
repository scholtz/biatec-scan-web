// Applies the saved / system colour theme before first paint to avoid a flash.
// Must stay in sync with src/composables/useTheme.ts (storage key + resolution).
(function () {
  var mode = "system";
  try {
    var stored = localStorage.getItem("biatec-scan-theme");
    if (stored === "light" || stored === "dark") mode = stored;
  } catch (e) {
    /* storage blocked: follow the system */
  }
  var dark =
    mode === "system"
      ? !window.matchMedia ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      : mode === "dark";
  var root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
})();
