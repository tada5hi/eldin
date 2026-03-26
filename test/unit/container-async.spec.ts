import { describe, expect, it, vi } from 'vitest';
import {
    Container, ContainerError, TypedToken,
} from '../../src';

describe('src/container.ts (async)', () => {
    // ---- resolveAsync with async factory ----

    describe('resolveAsync', () => {
        it('should resolve an async factory provider', async () => {
            const container = new Container();
            const token = new TypedToken<string>('async-str');

            container.register(token, { useAsyncFactory: async () => 'hello async' });

            const result = await container.resolveAsync(token);
            expect(result).toBe('hello async');
        });

        it('should pass the container to the async factory', async () => {
            const container = new Container();
            const depToken = new TypedToken<number>('dep');
            const token = new TypedToken<string>('svc');

            container.register(depToken, { useValue: 42 });
            container.register(token, {
                useAsyncFactory: async (c) => `value-${c.resolve(depToken)}`,
            });

            expect(await container.resolveAsync(token)).toBe('value-42');
        });

        it('should resolve a value provider via resolveAsync', async () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 7 });

            expect(await container.resolveAsync(token)).toBe(7);
        });

        it('should resolve a sync factory provider via resolveAsync', async () => {
            const container = new Container();
            const token = new TypedToken<string>('str');

            container.register(token, { useFactory: () => 'sync' });

            expect(await container.resolveAsync(token)).toBe('sync');
        });

        it('should throw when resolving unregistered key', async () => {
            const container = new Container();
            const token = new TypedToken<string>('missing');

            await expect(container.resolveAsync(token)).rejects.toThrow(ContainerError);
        });
    });

    // ---- sync resolve throws for async providers ----

    describe('resolve (sync) with async provider', () => {
        it('should throw ContainerError when resolving async provider synchronously', () => {
            const container = new Container();
            const token = new TypedToken<string>('async-str');

            container.register(token, { useAsyncFactory: async () => 'hello' });

            expect(() => container.resolve(token)).toThrow(ContainerError);
            expect(() => container.resolve(token)).toThrow(/resolveAsync/);
        });
    });

    // ---- singleton caching ----

    describe('singleton lifetime with async factory', () => {
        it('should call async factory only once', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(async () => ({}));

            container.register(token, { useAsyncFactory: factory });

            await container.resolveAsync(token);
            await container.resolveAsync(token);

            expect(factory).toHaveBeenCalledTimes(1);
        });

        it('should return the same reference on subsequent resolves', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useAsyncFactory: async () => ({}) });

            const first = await container.resolveAsync(token);
            const second = await container.resolveAsync(token);

            expect(first).toBe(second);
        });
    });

    // ---- transient lifetime with async factory ----

    describe('transient lifetime with async factory', () => {
        it('should call async factory on every resolve', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(async () => ({}));

            container.register(token, { useAsyncFactory: factory }, { lifetime: 'transient' });

            await container.resolveAsync(token);
            await container.resolveAsync(token);
            await container.resolveAsync(token);

            expect(factory).toHaveBeenCalledTimes(3);
        });

        it('should return a new instance on every resolve', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useAsyncFactory: async () => ({}) }, { lifetime: 'transient' });

            const a = await container.resolveAsync(token);
            const b = await container.resolveAsync(token);

            expect(a).not.toBe(b);
        });
    });

    // ---- tryResolveAsync ----

    describe('tryResolveAsync', () => {
        it('should return success result for registered async provider', async () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useAsyncFactory: async () => 42 });

            const result = await container.tryResolveAsync(token);
            expect(result).toEqual({ success: true, data: 42 });
        });

        it('should return failure result for unregistered key', async () => {
            const container = new Container();
            const token = new TypedToken<number>('missing');

            const result = await container.tryResolveAsync(token);
            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error).toBeInstanceOf(ContainerError);
            }
        });

        it('should return failure result when async factory throws', async () => {
            const container = new Container();
            const token = new TypedToken<string>('fail');

            container.register(token, {
                useAsyncFactory: async () => { throw new Error('boom'); },
            });

            const result = await container.tryResolveAsync(token);
            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error.message).toBe('boom');
            }
        });

        it('should not throw', async () => {
            const container = new Container();
            const token = new TypedToken<number>('missing');

            await expect(container.tryResolveAsync(token)).resolves.toBeDefined();
        });
    });

    // ---- child container ----

    describe('child container with async factory', () => {
        it('should resolve async provider from parent', async () => {
            const container = new Container();
            const token = new TypedToken<string>('str');

            container.register(token, { useAsyncFactory: async () => 'from-parent' });

            const child = container.createChild();
            expect(await child.resolveAsync(token)).toBe('from-parent');
        });
    });

    // ---- scoped lifetime ----

    describe('scoped lifetime with async factory', () => {
        it('should resolve async scoped provider within a scope', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useAsyncFactory: async () => ({}) }, { lifetime: 'scoped' });

            const scope = container.createScope();
            const first = await scope.resolveAsync(token);
            const second = await scope.resolveAsync(token);

            expect(first).toBe(second);
        });

        it('should throw when resolving scoped async provider outside a scope', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useAsyncFactory: async () => ({}) }, { lifetime: 'scoped' });

            await expect(container.resolveAsync(token)).rejects.toThrow(ContainerError);
        });
    });
});
