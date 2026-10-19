import { describe, it, expect } from 'vitest';
import { statusParts } from '../src/lib/hours.js';

describe('statusParts: headline and detail never repeat each other', () => {
  it('closed with a next opening', () => {
    expect(statusParts({ open: false, label: 'Closed — opens 7:30 AM' })).toEqual({ head: 'Closed', detail: 'opens 7:30 AM' });
    expect(statusParts({ open: false, label: 'Closed — opens tomorrow 8:00 AM' })).toEqual({ head: 'Closed', detail: 'opens tomorrow 8:00 AM' });
  });
  it('closed all day', () => {
    expect(statusParts({ open: false, label: 'Closed today' })).toEqual({ head: 'Closed today', detail: '' });
  });
  it('a holiday label keeps its words', () => {
    expect(statusParts({ open: false, label: 'Closed for Thanksgiving' })).toEqual({ head: 'Closed', detail: 'for Thanksgiving' });
    expect(statusParts({ open: false, label: 'Holiday hours' })).toEqual({ head: 'Closed', detail: 'Holiday hours' });
  });
  it('open', () => {
    expect(statusParts({ open: true, label: 'Open until 7:00 PM' })).toEqual({ head: 'Open now', detail: 'until 7:00 PM' });
    expect(statusParts({ open: true, closingSoon: true, label: 'Open — closing at 7:00 PM' })).toEqual({ head: 'Open now', detail: 'closing at 7:00 PM' });
  });
  it('nothing to split', () => {
    expect(statusParts(null)).toEqual({ head: '', detail: '' });
  });
});
