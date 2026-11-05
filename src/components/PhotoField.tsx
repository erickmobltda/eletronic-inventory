import * as React from 'react';
import type { PhotoChange } from '../lib/photos';

/** Pick, take (on phones) or remove a photo. Nothing is uploaded until the form is saved. */
export function PhotoField({ current, change, onChange }: { current: string; change: PhotoChange; onChange: (c: PhotoChange) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState('');

  React.useEffect(() => {
    if (!(change instanceof File)) return setPreview(change === null ? '' : current);
    const url = URL.createObjectURL(change);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [change, current]);

  return (
    <div className="field">Photo
      <div className="photo-field">
        {preview ? <img className="thumb lg" src={preview} alt="" /> : <span className="thumb lg none" aria-hidden />}
        <button type="button" className="btn" onClick={() => input.current?.click()}>{preview ? 'Change' : 'Add photo'}</button>
        {preview && <button type="button" className="btn ghost" onClick={() => onChange(current ? null : undefined)}>Remove</button>}
        <input ref={input} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChange(f); }} />
      </div>
    </div>
  );
}
