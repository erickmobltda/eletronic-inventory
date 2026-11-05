/** A photo edit in a form: a new File, null = removed, undefined = unchanged. */
export type PhotoChange = File | null | undefined;

export type PhotoIO = { upload: (file: File) => Promise<string>; remove: (url: string) => Promise<void> };

const quietly = (p: Promise<void>) => p.catch(() => {}); // a leftover file on the CDN is harmless

/**
 * Upload the new photo, save the item with its URL, then delete the photo it replaced.
 * If the save fails, the photo that was just uploaded is deleted again.
 */
export async function withPhoto(old: string, change: PhotoChange, save: (photo: string) => Promise<void>, io: PhotoIO): Promise<void> {
  if (change === undefined) return save(old);
  const photo = change ? await io.upload(change) : '';
  try {
    await save(photo);
  } catch (err) {
    if (photo) await quietly(io.remove(photo));
    throw err;
  }
  if (old) await quietly(io.remove(old));
}

/** Delete an item, then its photo. */
export async function withoutPhoto(photo: string, del: () => Promise<void>, io: PhotoIO): Promise<void> {
  await del();
  if (photo) await quietly(io.remove(photo));
}
