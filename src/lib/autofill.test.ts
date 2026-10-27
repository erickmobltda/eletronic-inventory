import { describe, expect, it } from 'vitest';
import { mergeEmpty, type FormFields } from './autofill';

const empty: FormFields = { name: '', category: '', voltage: '', interfaces: '', description: '', notes: '', specs: [], links: [] };

const pi = {
  name: 'Raspberry Pi 5',
  category: 'Single-board computer',
  voltage: '5V',
  interfaces: ['GPIO', 'I2C', 'SPI'],
  description: 'Single-board Linux computer.',
  notes: 'Needs a 5V/5A supply.',
  specs: { SoC: 'BCM2712', GPIO: '40-pin' },
  links: [{ label: 'Product page', url: 'https://www.raspberrypi.com/products/raspberry-pi-5/' }],
};

describe('mergeEmpty', () => {
  it('fills an empty form', () => {
    expect(mergeEmpty(empty, pi)).toEqual({
      name: 'Raspberry Pi 5',
      category: 'Single-board computer',
      voltage: '5V',
      interfaces: 'GPIO, I2C, SPI',
      description: 'Single-board Linux computer.',
      notes: 'Needs a 5V/5A supply.',
      specs: [{ a: 'SoC', b: 'BCM2712' }, { a: 'GPIO', b: '40-pin' }],
      links: [{ a: 'Product page', b: 'https://www.raspberrypi.com/products/raspberry-pi-5/' }],
    });
  });

  it('keeps what was typed', () => {
    const typed = { ...empty, name: 'Pi 5 (lab)', category: 'SBC', interfaces: 'GPIO', notes: 'In the drawer' };
    const merged = mergeEmpty(typed, pi);
    expect(merged).toMatchObject({ name: 'Pi 5 (lab)', category: 'SBC', interfaces: 'GPIO', notes: 'In the drawer', voltage: '5V' });
  });

  it('adds specs and links without duplicating existing ones', () => {
    const typed = {
      ...empty,
      specs: [{ a: 'soc', b: 'BCM2712 rev C' }, { a: '', b: '' }],
      links: [{ a: 'Mine', b: 'https://www.raspberrypi.com/products/raspberry-pi-5/' }],
    };
    const merged = mergeEmpty(typed, pi);
    expect(merged.specs).toEqual([{ a: 'soc', b: 'BCM2712 rev C' }, { a: 'GPIO', b: '40-pin' }]);
    expect(merged.links).toEqual([{ a: 'Mine', b: 'https://www.raspberrypi.com/products/raspberry-pi-5/' }]);
  });

  it('ignores missing or malformed fields in the answer', () => {
    const merged = mergeEmpty(empty, { name: 'HC-SR04', specs: { Range: '' }, links: [{ label: 'x', url: '' }] });
    expect(merged).toEqual({ ...empty, name: 'HC-SR04' });
  });
});
