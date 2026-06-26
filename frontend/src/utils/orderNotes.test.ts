import { describe, expect, it } from 'vitest';

import { buildOrderNotes } from './orderNotes';

describe('buildOrderNotes', () => {
    it('keeps only the customer-entered note', () => {
        expect(buildOrderNotes('  Prosím volať pred doručením.  ')).toBe(
            'Prosím volať pred doručením.'
        );
    });

    it('does not generate variant or bundled screw content', () => {
        expect(buildOrderNotes('')).toBe('');
    });
});
