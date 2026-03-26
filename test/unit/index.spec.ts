import { describe, expect, it } from 'vitest';
import { add } from '../../src';

describe('src/index.ts', () => {
    it('should add numbers', () => {
        const result = add(1, 2);
        expect(result).toEqual(3);
    });
});
