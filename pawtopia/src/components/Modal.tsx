"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Accessible modal built on the native <dialog> element: showModal() traps
 * focus, makes the page behind inert, and Escape closes it. Mark the element
 * that should receive initial focus with `data-autofocus` (React's autoFocus
 * runs before the dialog is shown, so it can't be used here).
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[min(24rem,calc(100%-2rem))] rounded-[2rem] bg-cream p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm open:pop-in ${className}`}
    >
      {open && <div className="p-6">{children}</div>}
    </dialog>
  );
}
