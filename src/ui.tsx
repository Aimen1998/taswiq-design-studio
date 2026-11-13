import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import { X } from "lucide-react";

/** The few UI pieces the studio needs. A host (like TaswiQ) passes its own; these are the standalone defaults. */
export interface UiKit {
  Button: ComponentType<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }>;
  Dialog: ComponentType<{ onClose: () => void; title: string; description?: string; className?: string; preventClose?: boolean; children?: ReactNode }>;
  Select: ComponentType<{ value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children?: ReactNode; "aria-label"?: string; triggerClassName?: string; wrapperClassName?: string; [k: `data-${string}`]: unknown }>;
  Skeleton: ComponentType<{ className?: string }>;
  PageHeader: ComponentType<{ title: string; subtitle?: string }>;
}

function Button({ variant = "default", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) {
  const look = variant === "outline" ? "border border-border bg-card text-foreground hover:bg-muted" : "bg-brand text-white hover:opacity-90";
  return <button {...rest} className={`inline-flex items-center gap-2 rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`} />;
}

function Dialog({ onClose, title, description, className = "", preventClose, children }: { onClose: () => void; title: string; description?: string; className?: string; preventClose?: boolean; children?: ReactNode }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.focus(); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !preventClose) onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, preventClose]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/40 sm:place-items-center" onClick={(e) => { if (e.target === e.currentTarget && !preventClose) onClose(); }}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 text-foreground shadow-xl outline-none sm:max-w-md sm:rounded-2xl ${className}`}>
        <div className="mb-3 flex items-start gap-2">
          <div className="grid flex-1 gap-0.5"><h2 id={id} className="text-lg font-black">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
          {!preventClose && <button type="button" className="grid size-11 place-items-center rounded-lg" aria-label="×" onClick={onClose}><X className="size-5" /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Select({ value, onChange, children, triggerClassName = "", wrapperClassName = "", ...rest }: { value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children?: ReactNode; "aria-label"?: string; triggerClassName?: string; wrapperClassName?: string }) {
  return (
    <div className={wrapperClassName}>
      <select {...rest} value={value} onChange={onChange} className={`h-11 w-full rounded-lg border border-border bg-card px-2 text-base text-foreground ${triggerClassName}`}>{children}</select>
    </div>
  );
}

const Skeleton = ({ className = "" }: { className?: string }) => <div className={`animate-pulse rounded-xl bg-muted motion-reduce:animate-none ${className}`} />;
const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header className="grid gap-1"><h1 className="text-2xl font-black">{title}</h1>{subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}</header>
);

export const DefaultUi: UiKit = { Button, Dialog, Select, Skeleton, PageHeader };
