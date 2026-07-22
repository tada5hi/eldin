import { describe, expect, it, vi } from 'vitest';
import { Container, ContainerError, TypedToken } from '../../src';

interface Handler {
    name: string;
}

describe('src/container.ts — multi-binding (registerMany / resolveAll)', () => {
    // ---- registerMany & resolveAll ----

    describe('registerMany & resolveAll', () => {
        it('should resolve all providers registered under one key in order', () => {
            const container = new Container();
            const token = new TypedToken<Handler>('handler');

            container.registerMany(token, { useValue: { name: 'a' } });
            container.registerMany(token, { useFactory: () => ({ name: 'b' }) });
            container.registerMany(token, { useValue: { name: 'c' } });

            expect(container.resolveAll(token).map((h) => h.name)).toEqual(['a', 'b', 'c']);
        });

        it('should return an empty array for an unregistered key', () => {
            const container = new Container();
            const token = new TypedToken<Handler>('missing');

            expect(container.resolveAll(token)).toEqual([]);
        });

        it('should work with string keys', () => {
            const container = new Container();

            container.registerMany<number>('nums', { useValue: 1 });
            container.registerMany<number>('nums', { useValue: 2 });

            expect(container.resolveAll<number>('nums')).toEqual([1, 2]);
        });

        it('should pass the resolving container to each factory', () => {
            const container = new Container();
            const dep = new TypedToken<string>('dep');
            const token = new TypedToken<string>('svc');

            container.register(dep, { useValue: 'value' });
            container.registerMany(token, { useFactory: (c) => c.resolve(dep) });

            expect(container.resolveAll(token)).toEqual(['value']);
        });

        it('should keep single- and multi-bindings on the same key independent', () => {
            const container = new Container();
            const token = new TypedToken<string>('key');

            container.register(token, { useValue: 'single' });
            container.registerMany(token, { useValue: 'multi' });

            expect(container.resolve(token)).toBe('single');
            expect(container.resolveAll(token)).toEqual(['multi']);
        });
    });

    // ---- Lifetimes ----

    describe('singleton lifetime (default)', () => {
        it('should call each factory only once across resolveAll calls', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const first = vi.fn(() => ({}));
            const second = vi.fn(() => ({}));

            container.registerMany(token, { useFactory: first });
            container.registerMany(token, { useFactory: second });

            const a = container.resolveAll(token);
            const b = container.resolveAll(token);

            expect(first).toHaveBeenCalledTimes(1);
            expect(second).toHaveBeenCalledTimes(1);
            expect(a[0]).toBe(b[0]);
            expect(a[1]).toBe(b[1]);
        });
    });

    describe('transient lifetime', () => {
        it('should call the factory on every resolveAll', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(() => ({}));

            container.registerMany(token, { useFactory: factory }, { lifetime: 'transient' });

            container.resolveAll(token);
            container.resolveAll(token);

            expect(factory).toHaveBeenCalledTimes(2);
        });
    });

    describe('scoped lifetime', () => {
        it('should reject scoped multi-bindings', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            expect(() => container.registerMany(token, { useValue: {} }, { lifetime: 'scoped' }))
                .toThrow(ContainerError);
        });
    });

    // ---- Async ----

    describe('resolveAllAsync', () => {
        it('should resolve async factory providers', async () => {
            const container = new Container();
            const token = new TypedToken<number>('async');

            container.registerMany(token, { useAsyncFactory: async () => 1 });
            container.registerMany(token, { useAsyncFactory: async () => 2 });
            container.registerMany(token, { useValue: 3 });

            await expect(container.resolveAllAsync(token)).resolves.toEqual([1, 2, 3]);
        });

        it('should cache singletons across async resolutions', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(async () => ({}));

            container.registerMany(token, { useAsyncFactory: factory });

            const a = await container.resolveAllAsync(token);
            const b = await container.resolveAllAsync(token);

            expect(factory).toHaveBeenCalledTimes(1);
            expect(a[0]).toBe(b[0]);
        });

        it('should not cache transient async registrations', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(async () => ({}));

            container.registerMany(token, { useAsyncFactory: factory }, { lifetime: 'transient' });

            const a = await container.resolveAllAsync(token);
            const b = await container.resolveAllAsync(token);

            expect(factory).toHaveBeenCalledTimes(2);
            expect(a[0]).not.toBe(b[0]);
        });

        it('should dedupe concurrent async singleton resolutions', async () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(async () => ({}));

            container.registerMany(token, { useAsyncFactory: factory });

            const [a, b] = await Promise.all([
                container.resolveAllAsync(token),
                container.resolveAllAsync(token),
            ]);

            expect(factory).toHaveBeenCalledTimes(1);
            expect(a[0]).toBe(b[0]);
        });
    });

    describe('resolveAll (sync) with async providers', () => {
        it('should throw when a registration uses an async factory', () => {
            const container = new Container();
            const token = new TypedToken<number>('async');

            container.registerMany(token, { useValue: 1 });
            container.registerMany(token, { useAsyncFactory: async () => 2 });

            expect(() => container.resolveAll(token)).toThrow(ContainerError);
        });

        it('should not resolve any entry when the collection contains an async provider', async () => {
            const container = new Container();
            const token = new TypedToken<number>('mixed');
            const syncFactory = vi.fn(() => 1);

            container.registerMany(token, { useFactory: syncFactory });
            container.registerMany(token, { useAsyncFactory: async () => 2 });

            // Rejected up-front, before the earlier sync factory runs — no partial state.
            expect(() => container.resolveAll(token)).toThrow(ContainerError);
            expect(syncFactory).not.toHaveBeenCalled();

            // Async resolution still works and runs the sync factory exactly once.
            await expect(container.resolveAllAsync(token)).resolves.toEqual([1, 2]);
            expect(syncFactory).toHaveBeenCalledTimes(1);
        });
    });

    // ---- has / unregister ----

    describe('has / unregister', () => {
        it('should report has() for a multi-binding', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.registerMany(token, { useValue: 1 });

            expect(container.has(token)).toBe(true);
        });

        it('should clear the collection on unregister', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.registerMany(token, { useValue: 1 });
            container.unregister(token);

            expect(container.has(token)).toBe(false);
            expect(container.resolveAll(token)).toEqual([]);
        });
    });

    // ---- Hierarchy ----

    describe('container hierarchy', () => {
        it('should include parent registrations in resolveAll', () => {
            const parent = new Container();
            const token = new TypedToken<number>('num');

            parent.registerMany(token, { useValue: 1 });

            const child = parent.createChild();
            child.registerMany(token, { useValue: 2 });

            expect(child.resolveAll(token)).toEqual([2, 1]);
            expect(parent.resolveAll(token)).toEqual([1]);
        });

        it('should include parent registrations in resolveAllAsync', async () => {
            const parent = new Container();
            const token = new TypedToken<number>('num');

            parent.registerMany(token, { useValue: 1 });

            const child = parent.createChild();
            child.registerMany(token, { useAsyncFactory: async () => 2 });

            await expect(child.resolveAllAsync(token)).resolves.toEqual([2, 1]);
        });
    });
});
