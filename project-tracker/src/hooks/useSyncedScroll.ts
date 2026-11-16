import { useEffect, useCallback } from "react";

export function useSyncedScroll() {
  useEffect(() => {
    let syncing = false;
    let dragging = false;
    let dragTarget: HTMLElement | null = null;
    let startX = 0;
    let scrollStart = 0;

    const syncAll = (source: HTMLElement) => {
      if (syncing) return;
      syncing = true;
      const scrollLeft = source.scrollLeft;
      document.querySelectorAll<HTMLElement>(".row-gantt").forEach((el) => {
        if (el !== source) el.scrollLeft = scrollLeft;
      });
      syncing = false;
    };

    const onScroll = (e: Event) => {
      syncAll(e.target as HTMLElement);
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".row-gantt") as HTMLElement;
      if (!target) return;
      dragging = true;
      dragTarget = target;
      startX = e.pageX;
      scrollStart = target.scrollLeft;
      target.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging || !dragTarget) return;
      e.preventDefault();
      dragTarget.scrollLeft = scrollStart - (e.pageX - startX);
    };

    const onMouseUp = () => {
      if (dragTarget) dragTarget.style.cursor = "grab";
      dragging = false;
      dragTarget = null;
    };

    // Attach scroll listener to all row-gantt elements
    const elements = document.querySelectorAll<HTMLElement>(".row-gantt");
    elements.forEach((el) => el.addEventListener("scroll", onScroll));

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      elements.forEach((el) => el.removeEventListener("scroll", onScroll));
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });
}
