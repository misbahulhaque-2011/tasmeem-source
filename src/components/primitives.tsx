"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronDown } from "lucide-react";
import { LOGO_URL } from "@/lib/app-utils";

/** Premium custom dropdown — never opens the OS/native picker. Children are plain <option> elements, parsed here. */
export function Sel({ value, onValueChange, children, className, style, disabled, placeholder }: {
  value?: string; onValueChange?: (v: string) => void; children?: React.ReactNode; className?: string; style?: React.CSSProperties; disabled?: boolean; placeholder?: string;
}) {
  const items: { value: string; label: string }[] = [];
  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const p = child.props as any;
      if (child.type === "option") { const label = Array.isArray(p.children) ? p.children.join("") : String(p.children ?? ""); items.push({ value: p.value != null ? String(p.value) : label, label }); }
      else if (p.children) walk(p.children);
    });
  };
  walk(children);
  return (
    <SelectPrimitive.Root {...(value !== undefined ? { value } : {})} {...(onValueChange ? { onValueChange } : {})} {...(disabled ? { disabled: true } : {})}>
      <SelectPrimitive.Trigger className={`ts-trigger ${className ?? ""}`} style={style} aria-label={placeholder ?? "Select"}>
        <SelectPrimitive.Value placeholder={placeholder ?? "Select…"} />
        <SelectPrimitive.Icon asChild><ChevronDown size={15} className="ts-chevron" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="ts-content" position="popper" sideOffset={6}>
          <SelectPrimitive.Viewport className="ts-viewport">
            {items.map((it) => (
              <SelectPrimitive.Item key={it.value} value={it.value} className="ts-item">
                <SelectPrimitive.ItemText>{it.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ts-check"><Check size={14} /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Premium toggle switch (replaces native checkboxes). */
export function Toggle({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <SwitchPrimitive.Root className="ts-switch" checked={checked} onCheckedChange={onCheckedChange} disabled={disabled}>
      <SwitchPrimitive.Thumb className="ts-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Custom date field — three branded dropdowns, no native date picker. Value/onChange use ISO yyyy-mm-dd. */
export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [y, m, d] = (value || new Date().toISOString().slice(0, 10)).split("-").map((x) => Number(x));
  const days = new Date(y || 2026, m || 1, 0).getDate();
  const emit = (yy = y || 2026, mm = m || 1, dd = d || 1) => { const safeDay = Math.min(dd || 1, new Date(yy, mm, 0).getDate()); onChange(`${yy}-${String(mm).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`); };
  const years = Array.from({ length: 7 }, (_, i) => String(new Date().getFullYear() - 2 + i));
  return (
    <div className="ts-date">
      <Sel value={String(d)} onValueChange={(v) => emit(y, m, Number(v))}>{Array.from({ length: days }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</Sel>
      <Sel value={String(m)} onValueChange={(v) => emit(y, Number(v), d)}>{MONTHS.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}</Sel>
      <Sel value={String(y)} onValueChange={(v) => emit(Number(v), m, d)}>{years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}</Sel>
    </div>
  );
}

/** Branded premium loading screen. */
export function Splash({ note }: { note?: string }) {
  return (
    <div className="splash">
      <div className="splash-ring"><img src={LOGO_URL} alt="TASMEEM" onError={(e) => { (e.target as HTMLImageElement).src = "/favicon.png"; }} /></div>
      <div className="splash-name">TASMEEM <span>SOURCE</span></div>
      <div className="splash-tag">Discover. Evaluate. Source.</div>
      <div className="splash-bar"><span /></div>
      <div className="splash-note">{note ?? "Preparing your sourcing workspace…"}</div>
    </div>
  );
}

export function Skeletons() {
  return <div aria-hidden>{[0, 1, 2].map((i) => <div key={i} className="skel-row" style={{ animationDelay: `${i * 120}ms` }} />)}</div>;
}
