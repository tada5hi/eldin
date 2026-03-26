import { describe, expect, it } from 'vitest';
import { TypedToken } from '../../src';

describe('src/token.ts', () => {
    it('should create distinct id symbols for tokens with the same name', () => {
        const a = new TypedToken<string>('Service');
        const b = new TypedToken<string>('Service');

        expect(a.id).not.toBe(b.id);
    });

    it('should return formatted string from toString()', () => {
        const token = new TypedToken<number>('Counter');

        expect(token.toString()).toBe('TypedToken(Counter)');
    });

    it('should not have a runtime _type property', () => {
        const token = new TypedToken<string>('Test');

        expect('_type' in token).toBe(false);
    });

    it('should store the name', () => {
        const token = new TypedToken<string>('MyName');

        expect(token.name).toBe('MyName');
    });
});
