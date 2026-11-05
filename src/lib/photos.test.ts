import { describe, expect, it } from 'vitest';
import { withPhoto, withoutPhoto, type PhotoIO } from './photos';

function fakeIO(fail = false) {
  const log: string[] = [];
  const io: PhotoIO = {
    upload: async (f) => { log.push(`upload ${f.name}`); return `https://cdn/inventory/u/${f.name}`; },
    remove: async (url) => { log.push(`remove ${url}`); if (fail) throw new Error('down'); },
  };
  return { io, log };
}

const file = new File(['x'], 'new.webp');
const OLD = 'https://cdn/inventory/u/old.webp';

describe('withPhoto', () => {
  it('keeps the photo when it did not change', async () => {
    const { io, log } = fakeIO();
    const saved: string[] = [];
    await withPhoto(OLD, undefined, async (p) => { saved.push(p); }, io);
    expect(saved).toEqual([OLD]);
    expect(log).toEqual([]);
  });

  it('uploads a new photo, saves its URL, then deletes the old one', async () => {
    const { io, log } = fakeIO();
    const saved: string[] = [];
    await withPhoto(OLD, file, async (p) => { saved.push(p); log.push('save'); }, io);
    expect(saved).toEqual(['https://cdn/inventory/u/new.webp']);
    expect(log).toEqual(['upload new.webp', 'save', `remove ${OLD}`]);
  });

  it('removing saves an empty photo and deletes the old file', async () => {
    const { io, log } = fakeIO();
    const saved: string[] = [];
    await withPhoto(OLD, null, async (p) => { saved.push(p); }, io);
    expect(saved).toEqual(['']);
    expect(log).toEqual([`remove ${OLD}`]);
  });

  it('a failed save deletes the photo it just uploaded and keeps the old one', async () => {
    const { io, log } = fakeIO();
    await expect(withPhoto(OLD, file, async () => { throw new Error('over-allocated'); }, io)).rejects.toThrow('over-allocated');
    expect(log).toEqual(['upload new.webp', 'remove https://cdn/inventory/u/new.webp']);
  });

  it('a failed delete of the old file does not fail the save', async () => {
    const { io } = fakeIO(true);
    await expect(withPhoto(OLD, file, async () => {}, io)).resolves.toBeUndefined();
  });
});

describe('withoutPhoto', () => {
  it('deletes the photo after the item', async () => {
    const { io, log } = fakeIO();
    await withoutPhoto(OLD, async () => { log.push('delete'); }, io);
    expect(log).toEqual(['delete', `remove ${OLD}`]);
  });

  it('keeps the photo when the item could not be deleted', async () => {
    const { io, log } = fakeIO();
    await expect(withoutPhoto(OLD, async () => { throw new Error('in a project'); }, io)).rejects.toThrow('in a project');
    expect(log).toEqual([]);
  });
});
