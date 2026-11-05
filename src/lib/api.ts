import type { Identified } from './autofill';
import type { PhotoIO } from './photos';
import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8010';

/** Call erickmob-api with the signed-in user's Firebase ID token. */
async function request<T>(method: string, path: string, body?: BodyInit, contentType?: string): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (contentType) headers['content-type'] = contentType;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

/** POST JSON to erickmob-api with the signed-in user's Firebase ID token. */
export const apiPost = <T>(path: string, payload: unknown) =>
  request<T>('POST', path, JSON.stringify(payload), 'application/json');

// Scale the photo down so phone pictures stay small.
async function scaled(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const MAX_SIDE = 1568; // Claude scales larger photos down anyway

export async function identify(name: string, photo: File | null, categories: string[]): Promise<Identified> {
  const image = photo ? (await scaled(photo, MAX_SIDE)).toDataURL('image/jpeg', 0.85).split(',')[1] : '';
  const result = await apiPost<Identified>('/inventory/identify', {
    name, categories, image, media_type: photo ? 'image/jpeg' : '',
  });
  if (!result.name) throw new Error(`Couldn't tell what this component is.`);
  return result;
}

const PHOTO_SIDE = 800;

/** Upload a component or project photo to the public CDN; returns its URL. */
export async function uploadPhoto(file: File): Promise<string> {
  const canvas = await scaled(file, PHOTO_SIDE);
  // Safari can't always encode WebP and hands back a PNG instead: send JPEG then.
  let blob = await toBlob(canvas, 'image/webp', 0.82);
  if (blob?.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error(`Couldn't read this photo.`);
  const form = new FormData();
  form.append('file', blob, blob.type === 'image/webp' ? 'photo.webp' : 'photo.jpg');
  const { url } = await request<{ url: string }>('POST', '/inventory/photos', form);
  return url;
}

/** Delete a photo uploaded by uploadPhoto (URL …/inventory/{uid}/{name}). Other URLs are left alone. */
export async function deletePhoto(url: string): Promise<void> {
  const m = /\/inventory\/([^/]+)\/([^/]+)$/.exec(url);
  if (m) await request('DELETE', `/inventory/photos/${m[1]}/${m[2]}`);
}

export const photoIO: PhotoIO = { upload: uploadPhoto, remove: deletePhoto };
