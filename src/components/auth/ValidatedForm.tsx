"use client";

import { useId, useRef, useState, type ComponentProps, type SubmitEvent } from "react";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Keep browser constraint validation, but present errors inside the page rather
// than in the browser's floating tooltip. Server validation remains authoritative.
export function ValidatedForm({ children, onSubmit, onChangeCapture, ...props }: ComponentProps<"form">) {
  const errorId = useId();
  const invalid = useRef<Control | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    const control = invalid.current;
    if (control) {
      control.removeAttribute("aria-invalid");
      const descriptions = (control.getAttribute("aria-describedby") || "").split(" ").filter(id => id && id !== errorId);
      if (descriptions.length) control.setAttribute("aria-describedby", descriptions.join(" "));
      else control.removeAttribute("aria-describedby");
    }
    invalid.current = null;
    setError(null);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    clearError();
    const controls = Array.from(event.currentTarget.elements).filter((element): element is Control =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement);
    const control = controls.find(element => element.willValidate && !element.validity.valid);
    if (control) {
      event.preventDefault();
      const label = control.getAttribute("aria-label") || control.labels?.[0]?.firstChild?.textContent?.trim() || control.getAttribute("name") || "This field";
      const message = control.validity.valueMissing ? `${label} is required.`
        : control.validity.typeMismatch && control instanceof HTMLInputElement && control.type === "email" ? "Enter a valid email address."
        : control.validity.patternMismatch && control.getAttribute("autocomplete") === "one-time-code" ? "Enter the six-digit code from your email."
        : control.validationMessage;
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", [control.getAttribute("aria-describedby"), errorId].filter(Boolean).join(" "));
      invalid.current = control;
      setError(message);
      control.focus();
      return;
    }
    onSubmit?.(event);
  }

  return <form {...props} method={props.method ?? "post"} noValidate onSubmit={submit} onChangeCapture={event => {
    if (event.nativeEvent.target === invalid.current) clearError();
    onChangeCapture?.(event);
  }}>
    {children}
    {error && <p id={errorId} role="alert" className="rounded-xl border border-danger bg-danger-soft px-3 py-2.5 text-sm leading-relaxed text-danger">{error}</p>}
  </form>;
}
