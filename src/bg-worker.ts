/// <reference lib="webworker" />
/**
 * Background removal in the merchant's browser: u2netp (Apache-2.0, 4.6 MB, served by the host at `modelUrl`)
 * on onnxruntime-web (MIT, WASM). The photo never leaves the device. Input: a picture; output: its cut-out mask.
 */
import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import mjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl } as any;
ort.env.wasm.numThreads = 1;
const S = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
let session: Promise<ort.InferenceSession> | null = null;

async function model(url: string): Promise<ArrayBuffer> {
  try {
    const cache = await caches.open("design-studio-models-v1");
    const hit = await cache.match(url);
    if (hit) return hit.arrayBuffer();
    const res = await fetch(url);
    if (!res.ok) throw new Error("model");
    await cache.put(url, res.clone());
    return res.arrayBuffer();
  } catch {
    const res = await fetch(url);
    if (!res.ok) throw new Error("model");
    return res.arrayBuffer();
  }
}

self.onmessage = async (e: MessageEvent<{ id: number; bitmap: ImageBitmap; modelUrl: string }>) => {
  const { id, bitmap, modelUrl } = e.data;
  try {
    (self as any).postMessage({ id, stage: "model" });
    session ??= model(modelUrl).then((buf) => ort.InferenceSession.create(buf, { executionProviders: ["wasm"] }));
    const s = await session;
    (self as any).postMessage({ id, stage: "run" });
    const cv = new OffscreenCanvas(S, S);
    const cx = cv.getContext("2d")!;
    cx.drawImage(bitmap, 0, 0, S, S);
    const px = cx.getImageData(0, 0, S, S).data;
    let max = 1;
    for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
    const input = new Float32Array(3 * S * S);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) for (let c = 0; c < 3; c++) input[c * S * S + p] = (px[i + c] / max - MEAN[c]) / STD[c];
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, S, S]) });
    const a = out[s.outputNames[0]].data as Float32Array;
    let lo = Infinity, hi = -Infinity;
    for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const mask = new Uint8ClampedArray(S * S);
    for (let p = 0; p < S * S; p++) mask[p] = Math.round((255 * (a[p] - lo)) / (hi - lo || 1));
    (self as any).postMessage({ id, mask, size: S }, [mask.buffer]);
  } catch (err) {
    (self as any).postMessage({ id, error: err instanceof Error ? err.message : "failed" });
  }
};
