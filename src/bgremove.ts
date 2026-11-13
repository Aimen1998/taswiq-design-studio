/** Runs the background-removal worker; refuses gently on a device that is too weak or too old. */
export type Stage = "model" | "run";
let worker: Worker | null = null;
let seq = 0;
export const TOO_SLOW_MS = 25_000;

export function supported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof WebAssembly === "object" && typeof createImageBitmap === "function";
}

/** The cut-out mask (0–255 per pixel, size × size) for a picture. */
export function removeBackground(blob: Blob, modelUrl: string, onStage: (s: Stage) => void): Promise<{ mask: Uint8ClampedArray; size: number }> {
  worker ??= new Worker(new URL("./bg-worker.ts", import.meta.url), { type: "module" });
  const id = ++seq;
  return new Promise(async (resolve, reject) => {
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" } as any);
    // The limit times the removal itself, not the first download of the model on a slow connection.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const listen = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      if (e.data.stage) {
        onStage(e.data.stage);
        if (e.data.stage === "run" && !timer) timer = setTimeout(() => { worker?.terminate(); worker = null; reject(new Error("too_slow")); }, TOO_SLOW_MS);
        return;
      }
      if (timer) clearTimeout(timer);
      worker?.removeEventListener("message", listen);
      if (e.data.error) reject(new Error(e.data.error)); else resolve({ mask: e.data.mask, size: e.data.size });
    };
    worker!.addEventListener("message", listen);
    worker!.postMessage({ id, bitmap, modelUrl }, [bitmap]);
  });
}

/** The picture with the mask as transparency, at most 1600 px a side, as PNG. */
export async function applyMask(image: HTMLImageElement | ImageBitmap, mask: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  const w0 = (image as any).naturalWidth ?? image.width, h0 = (image as any).naturalHeight ?? image.height;
  const k = Math.min(1, 1600 / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const out = new OffscreenCanvas(w, h);
  const cx = out.getContext("2d")!;
  cx.drawImage(mask as any, 0, 0, w, h);
  cx.globalCompositeOperation = "source-in";
  cx.drawImage(image as any, 0, 0, w, h);
  return out.convertToBlob({ type: "image/png" });
}

/** The 320×320 mask as an alpha-only canvas the brush can paint on. */
export function maskCanvas(mask: Uint8ClampedArray, size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const cx = c.getContext("2d")!;
  const img = cx.createImageData(size, size);
  for (let p = 0; p < size * size; p++) { img.data[p * 4 + 3] = mask[p]; }
  cx.putImageData(img, 0, 0);
  return c;
}
