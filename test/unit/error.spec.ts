import { describe, expect, it } from 'vitest';
import { ContainerError } from '../../src';

describe('src/error.ts', () => {
    it('should extend Error', () => {
        const error = new ContainerError('test');

        expect(error).toBeInstanceOf(Error);
    });

    it('should have name set to ContainerError', () => {
        const error = new ContainerError('test');

        expect(error.name).toBe('ContainerError');
    });

    it('should be detectable via instanceof', () => {
        const error = new ContainerError('something went wrong');

        expect(error instanceof ContainerError).toBe(true);
    });

    it('should preserve the message', () => {
        const error = new ContainerError('custom message');

        expect(error.message).toBe('custom message');
    });
});
