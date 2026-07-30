/**
 * Minimal Pointer Events based drag-to-reorder helper for vertical lists.
 * Works uniformly for mouse, pen and touch without any external library.
 *
 * Usage: attach `onPointerDown(event, key)` to a drag handle element inside
 * each row identified by `data-drag-key="<key>"`, with rows living inside a
 * container that has `data-drag-container` set. On drop, `onReorder(key, toIndex)`
 * is called with the new index within the list of rows found in the container.
 */
export function usePointerDragReorder(onReorder: (key: string, toIndex: number) => void) {
  let draggingKey: string | null = null;
  let container: HTMLElement | null = null;
  let rows: HTMLElement[] = [];
  let placeholderIndex = -1;
  let activeEl: HTMLElement | null = null;

  function getRows(): HTMLElement[] {
    if (!container) return [];
    return Array.from(container.querySelectorAll<HTMLElement>("[data-drag-key]"));
  }

  function indexForY(y: number): number {
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  }

  function onPointerMove(e: PointerEvent) {
    if (!draggingKey) return;
    e.preventDefault();
    const newIndex = indexForY(e.clientY);
    if (newIndex !== -1 && newIndex !== placeholderIndex) {
      placeholderIndex = newIndex;
      activeEl?.classList.add("dragging");
      rows.forEach((r, i) => {
        r.classList.toggle("drag-over-before", i === newIndex && r.dataset.dragKey !== draggingKey);
      });
    }
  }

  function onPointerUp() {
    if (!draggingKey) return;
    const key = draggingKey;
    const toIndex = placeholderIndex;
    cleanup();
    if (toIndex !== -1) onReorder(key, toIndex);
  }

  function cleanup() {
    activeEl?.classList.remove("dragging");
    rows.forEach((r) => r.classList.remove("drag-over-before"));
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    draggingKey = null;
    container = null;
    rows = [];
    placeholderIndex = -1;
    activeEl = null;
  }

  function onPointerDown(e: PointerEvent, key: string) {
    const handle = e.currentTarget as HTMLElement;
    const row = handle.closest<HTMLElement>("[data-drag-key]");
    const containerEl = handle.closest<HTMLElement>("[data-drag-container]");
    if (!row || !containerEl) return;
    e.preventDefault();
    draggingKey = key;
    container = containerEl;
    rows = getRows();
    activeEl = row;
    placeholderIndex = rows.findIndex((r) => r.dataset.dragKey === key);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
  }

  return { onPointerDown };
}
