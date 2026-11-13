import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { Design } from "./model";
import type { Brand, Lang, ProductInfo } from "./templates";
import { DefaultUi, type UiKit } from "./ui";

/** A product the studio can design for. `id: null` is a sample; `sample: true` marks a stand-in photo. */
export type StudioProduct = ProductInfo & { id: string | null; sample?: boolean };

/** The empty frame («put your product photo here») a host serves for a product with no photo yet. */
export const PHOTO_PLACEHOLDER = "/studio/samples/placeholder.webp";

export type DesignRow = { id: string; name: string; size: string; thumb: string | null; updatedAt: string; openedAt?: string; cleanupWarnedAt?: string | null };

/**
 * Where designs live. Errors may carry a numeric `status` (HTTP-like): 4xx other than 408/429 means "this version
 * can never be saved" (the editor stops retrying and says why: 403 = quota, else invalid); anything else is retried.
 */
export interface DesignStore {
  list(): Promise<{ designs: DesignRow[]; usage?: { designs: number }; quota?: { designs: number } }>;
  open(id: string): Promise<{ id: string; name: string; doc: Design }>;
  create(name: string, doc: Design, thumb: string | null): Promise<{ id: string }>;
  save(id: string, name: string, doc: Design, thumb?: string | null): Promise<unknown>;
  duplicate(id: string, suffix: string): Promise<unknown>;
  remove(id: string): Promise<unknown>;
  /** Accepts an id read from the page address (?d=) before it is opened. */
  isId(id: string): boolean;
}

/** Pictures the merchant adds (own photo, cut-outs). Keys are `studio:<path>.png|jpg|webp`. */
export interface AssetStore {
  upload(blob: Blob): Promise<{ key: string; url: string }>;
  /** Temporary links for keys (a host with private storage signs them; a local host returns object URLs). */
  sign(keys: string[]): Promise<Record<string, string>>;
  /** The address the canvas loads a design's picture from. Must be same-origin or CORS-enabled. */
  resolve(src: string, signed: Record<string, string>): string;
  /** How long a signed link lives; links are renewed before that. Default 45 minutes. */
  renewAfterMs?: number;
}

export interface ProductSource {
  list(): Promise<StudioProduct[]>;
  get?(id: string): Promise<StudioProduct | null>;
}

export interface AiCopy {
  suggest(product: string, lang: "darija" | "ar" | "fr", offer?: string): Promise<{ headline: string; line: string; cta: string }>;
  /** Shown when the suggestion fails with status 402 (no credit left). */
  buyUrl?: string;
}

/** Optional places an export can go besides the merchant's device. */
export interface ExportTargets {
  toProduct?(productId: string, file: File, altText: string): Promise<void>;
  /** Returns the picture's public address (copied for the merchant). */
  toLanding?(file: File): Promise<string>;
}

export interface Notify {
  success(message: string): void;
  error(message: string): void;
  undo(message: string, label: string, onUndo: () => void, ms: number): void;
}

export interface StudioHost {
  locale: Lang;
  designs: DesignStore;
  assets: AssetStore;
  products?: ProductSource;
  brand(): Promise<Brand>;
  ai?: AiCopy;
  exports?: ExportTargets;
  notify?: Notify;
  ui?: Partial<UiKit>;
  /** The u2netp model for background removal (Apache-2.0); served by the host. */
  modelUrl: string;
  /** Shown when the merchant has no product yet (its photo must pass `allowedImageSrc`). */
  sample: StudioProduct;
  /** Page-address helpers; default reads and writes `?d=` on window.location. */
  address?: { get(name: string): string | null; set(name: string, value: string | null): void };
}

export type ResolvedHost = Required<Pick<StudioHost, "notify" | "address">> & Omit<StudioHost, "notify" | "ui" | "address"> & { ui: UiKit };

const consoleNotify: Notify = {
  success: (m) => console.info(m),
  error: (m) => console.error(m),
  undo: (m, _label, _onUndo) => console.info(m),
};

const urlAddress = {
  get: (name: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name)),
  set: (name: string, value: string | null) => {
    try {
      const u = new URL(window.location.href);
      if (value === null) u.searchParams.delete(name); else u.searchParams.set(name, value);
      window.history.replaceState(null, "", u);
    } catch {}
  },
};

const HostContext = createContext<ResolvedHost | null>(null);

export function StudioProvider({ host, children }: { host: StudioHost; children: ReactNode }) {
  const value: ResolvedHost = { ...host, notify: host.notify ?? consoleNotify, address: host.address ?? urlAddress, ui: { ...DefaultUi, ...(host.ui ?? {}) } };
  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

export function useHost(): ResolvedHost {
  const h = useContext(HostContext);
  if (!h) throw new Error("TaswiQ Design Studio: wrap the studio in <StudioProvider host={…}>");
  return h;
}

export type { UiKit, ComponentType };
