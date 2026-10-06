"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_READER_PREFERENCES, type ReaderPreferences as Preferences } from "@/lib/reader-preferences";

export function ReaderPreferences({ open, value, onChange, onClose, stored }: {
  open: boolean;
  value: Preferences;
  onChange: (value: Preferences) => void;
  onClose: () => void;
  stored: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby="reader-preferences-title" className="reader-preferences" onCancel={onClose} onClose={onClose} onClick={(e) => {
      if (e.target === ref.current) {
        const rect = ref.current.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
      }
    }}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="reader-eyebrow">Make yourself comfortable</p><h2 id="reader-preferences-title" className="mt-2 font-serif text-3xl">Your reading room</h2></div>
        <button type="button" onClick={onClose} aria-label="Close reading preferences" className="reader-icon-button">✕</button>
      </div>
      <div className="mt-7 space-y-6">
        <fieldset><legend className="reader-label">Typeface</legend><div className="mt-2 grid grid-cols-3 gap-2">{(["serif", "sans", "mono"] as const).map(font => <button type="button" key={font} aria-pressed={value.font === font} className="reader-option capitalize" style={{ fontFamily: `var(--font-${font})` }} onClick={() => onChange({ ...value, font })}>{font}</button>)}</div></fieldset>
        <label className="block"><span className="reader-label flex justify-between">Text size <span>{value.fontSize}px</span></span><input className="mt-3 w-full" type="range" min={14} max={24} step={1} value={value.fontSize} onChange={e => onChange({ ...value, fontSize: Number(e.target.value) })} aria-label="Reading text size" /></label>
        <label className="block"><span className="reader-label flex justify-between">Line spacing <span>{value.lineHeight.toFixed(2)}</span></span><input className="mt-3 w-full" type="range" min={1.4} max={2.2} step={0.05} value={value.lineHeight} onChange={e => onChange({ ...value, lineHeight: Number(e.target.value) })} aria-label="Reading line spacing" /></label>
        <fieldset><legend className="reader-label">Page color</legend><div className="mt-2 grid grid-cols-4 gap-2">{(["paper", "sepia", "night", "oled"] as const).map(theme => <button type="button" key={theme} aria-pressed={value.theme === theme} className="reader-option capitalize" onClick={() => onChange({ ...value, theme })}>{theme === "oled" ? "OLED" : theme}</button>)}</div></fieldset>
        <label className="reader-label flex items-center justify-between gap-3"><span>Decorative opening letter</span><input type="checkbox" checked={value.dropCap} onChange={e => onChange({ ...value, dropCap: e.target.checked })} /></label>
        <div className="reader-sample rounded-xl border p-4" aria-label="Typography preview"><p className="font-serif text-xl">Just one more chapter.</p><p style={{fontFamily:`var(--font-${value.font})`,fontSize:value.fontSize,lineHeight:value.lineHeight}}>A quiet place to get lost in a good story. Settle in. Stay a little longer.</p></div>
        <div className="flex items-center justify-between gap-3"><p className="reader-muted text-xs">{stored ? "Remembered on this browser." : "Browser storage is unavailable. Settings apply for this visit."}</p><button type="button" className="reader-label text-xs underline underline-offset-4" onClick={() => onChange({ ...DEFAULT_READER_PREFERENCES })}>Reset</button></div>
      </div>
    </dialog>
  );
}
