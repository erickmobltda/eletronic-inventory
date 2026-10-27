import type { Identified } from './autofill';
import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8010';

/** POST JSON to erickmob-api with the signed-in user's Firebase ID token. */
export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

const MAX_SIDE = 1568; // Claude scales larger photos down anyway

// Scale the photo down and re-encode it as JPEG, so phone pictures stay small.
async function photoToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export async function identify(name: string, photo: File | null, categories: string[]): Promise<Identified> {
  const image = photo ? await photoToJpeg(photo) : '';
  const result = await apiPost<Identified>('/inventory/identify', {
    name, categories, image, media_type: photo ? 'image/jpeg' : '',
  });
  if (!result.name) throw new Error(`Couldn't tell what this component is.`);
  return result;
}
