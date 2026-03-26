import { describe, expect, it } from 'vitest';
import {
    Container, ContainerError, TypedToken,
} from '../../src';

describe('src/index.ts', () => {
    it('should export Container class', () => {
        expect(Container).toBeDefined();
    });

    it('should export ContainerError class', () => {
        expect(ContainerError).toBeDefined();
    });

    it('should export TypedToken class', () => {
        expect(TypedToken).toBeDefined();
    });
});
