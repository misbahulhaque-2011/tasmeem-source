import { supabase } from "@/integrations/supabase/client";

export type Gps = { latitude: number; longitude: number; accuracy: number | null };

export function getGps(): Promise<Gps> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This device does not support GPS."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy ?? null }),
      (e) => reject(new Error(e.code === 1 ? "Location permission denied. Allow location access and retry — GPS is required." : "Could not get GPS location. Move to an open area and retry.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Image compression failed"))), "image/jpeg", 0.82));
  } catch { return file; }
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("sourcing-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
export function downloadXls(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>${rows.map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  download(name, html, "application/vnd.ms-excel");
}
/** Turn any technical/server error into one clean, human sentence. Never leaks code, SQL, RPC names or stack data. */
export function friendlyError(e: unknown): string {
  const raw = (e as any)?.message ?? String(e ?? "");
  const m = raw.replace(/^Error:\s*/i, "").trim();
  if (/invalid login credentials/i.test(m)) return "Email or password is incorrect. Please check and try again.";
  if (/email not confirmed/i.test(m)) return "Please confirm your email from the invitation link first, then sign in.";
  if (/user already registered/i.test(m)) return "This email already has an account.";
  if (/password should be at least/i.test(m)) return "Please choose a stronger password (at least 8 characters).";
  if (/rate limit|too many requests/i.test(m)) return "Too many attempts in a short time. Please wait a minute and try again.";
  if (/failed to fetch|network|load failed/i.test(m)) return "Connection problem. Check your internet and try again.";
  if (/location|geolocation|gps/i.test(m) && m.length < 160) return m;
  if (/photograph|photo/i.test(m) && m.length < 160) return m;
  if (/quotation|pieces are required/i.test(m)) return "Prices for 10, 100 and 500 pieces are required — enter a per-unit price or mark Not Available.";
  if (/not authorized|not been invited|access required|Super Admin/i.test(m) && m.length < 160) return m;
  if (/active visit/i.test(m) && m.length < 160) return m;
  if (/^[A-Z][^<>{}[\]]{3,140}$/.test(m) && !/(function|select |insert |update |delete |rpc|postgrest|supabase|jwt|schema|relation|column)/i.test(m)) return m.endsWith(".") ? m : `${m}.`;
  return "Something went wrong on our side. Please try again — if it keeps happening, contact the Super Admin.";
}
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const bdt = (n?: number | null) => (n == null ? "Not Available" : `৳${Number(n).toLocaleString("en-IN")}/unit`);
export const LOGO_URL = "/__l5e/assets-v1/3053ca59-9005-4598-a579-5d9b1bb9033a/tasmeem-logo.png";
