import { describe, expect, it, vi } from 'vitest';
import {
    Container, ContainerError, TypedToken,
} from '../../src';
import type { IContainer } from '../../src';

describe('src/container.ts', () => {
    // ---- Registration & Resolution ----

    describe('registration & resolution', () => {
        it('should register and resolve a value provider', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 42 });

            expect(container.resolve(token)).toBe(42);
        });

        it('should register and resolve a factory provider', () => {
            const container = new Container();
            const token = new TypedToken<string>('str');

            container.register(token, { useFactory: () => 'hello' });

            expect(container.resolve(token)).toBe('hello');
        });

        it('should pass the container to the factory', () => {
            const container = new Container();
            const token = new TypedToken<IContainer>('self');

            container.register(token, { useFactory: (c) => c });

            expect(container.resolve(token)).toBe(container);
        });

        it('should resolve with a plain symbol key', () => {
            const container = new Container();
            const key = Symbol('sym');

            container.register(key, { useValue: 'sym-value' });

            expect(container.resolve<string>(key)).toBe('sym-value');
        });

        it('should resolve with a plain string key', () => {
            const container = new Container();

            container.register('myKey', { useValue: 99 });

            expect(container.resolve<number>('myKey')).toBe(99);
        });

        it('should resolve with a class constructor key', () => {
            class MyService { value = 'svc'; }

            const container = new Container();
            const instance = new MyService();

            container.register(MyService, { useValue: instance });

            expect(container.resolve<MyService>(MyService)).toBe(instance);
        });

        it('should throw ContainerError when resolving unregistered key', () => {
            const container = new Container();
            const token = new TypedToken<string>('missing');

            expect(() => container.resolve(token)).toThrow(ContainerError);
        });

        it('should include key description in error message', () => {
            const container = new Container();
            const token = new TypedToken<string>('MyDep');

            expect(() => container.resolve(token)).toThrow(/MyDep/);
        });
    });

    // ---- Singleton Lifetime ----

    describe('singleton lifetime (default)', () => {
        it('should call factory only once', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(() => ({}));

            container.register(token, { useFactory: factory });

            container.resolve(token);
            container.resolve(token);

            expect(factory).toHaveBeenCalledTimes(1);
        });

        it('should return the same reference on subsequent resolves', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useFactory: () => ({}) });

            const first = container.resolve(token);
            const second = container.resolve(token);

            expect(first).toBe(second);
        });

        it('should always return the same reference for value providers', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const value = { x: 1 };

            container.register(token, { useValue: value });

            expect(container.resolve(token)).toBe(value);
            expect(container.resolve(token)).toBe(value);
        });
    });

    // ---- Transient Lifetime ----

    describe('transient lifetime', () => {
        it('should call factory on every resolve', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');
            const factory = vi.fn(() => ({}));

            container.register(token, { useFactory: factory }, { lifetime: 'transient' });

            container.resolve(token);
            container.resolve(token);
            container.resolve(token);

            expect(factory).toHaveBeenCalledTimes(3);
        });

        it('should return a new instance on every resolve', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useFactory: () => ({}) }, { lifetime: 'transient' });

            const a = container.resolve(token);
            const b = container.resolve(token);

            expect(a).not.toBe(b);
        });
    });

    // ---- tryResolve ----

    describe('tryResolve', () => {
        it('should return success result for registered key', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 7 });

            const result = container.tryResolve(token);
            expect(result).toEqual({ success: true, data: 7 });
        });

        it('should return failure result for unregistered key', () => {
            const container = new Container();
            const token = new TypedToken<number>('missing');

            const result = container.tryResolve(token);
            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error).toBeInstanceOf(ContainerError);
            }
        });

        it('should not throw', () => {
            const container = new Container();
            const token = new TypedToken<number>('missing');

            expect(() => container.tryResolve(token)).not.toThrow();
        });
    });

    // ---- has ----

    describe('has', () => {
        it('should return true for registered keys', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 1 });

            expect(container.has(token)).toBe(true);
        });

        it('should return false for unregistered keys', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            expect(container.has(token)).toBe(false);
        });
    });

    // ---- unregister ----

    describe('unregister', () => {
        it('should remove the provider', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 1 });
            container.unregister(token);

            expect(container.has(token)).toBe(false);
        });

        it('should clear the cached singleton instance', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useFactory: () => ({}) });
            container.resolve(token); // cache it
            container.unregister(token);

            expect(container.has(token)).toBe(false);
        });

        it('should cause subsequent resolve to throw', () => {
            const container = new Container();
            const token = new TypedToken<number>('num');

            container.register(token, { useValue: 1 });
            container.unregister(token);

            expect(() => container.resolve(token)).toThrow(ContainerError);
        });
    });

    // ---- Re-registration ----

    describe('re-registration', () => {
        it('should replace the provider for an existing key', () => {
            const container = new Container();
            const token = new TypedToken<string>('str');

            container.register(token, { useValue: 'old' });
            container.register(token, { useValue: 'new' });

            expect(container.resolve(token)).toBe('new');
        });

        it('should clear the cached singleton on re-register', () => {
            const container = new Container();
            const token = new TypedToken<object>('obj');

            container.register(token, { useFactory: () => ({ v: 'first' }) });
            const first = container.resolve(token);

            container.register(token, { useFactory: () => ({ v: 'second' }) });
            const second = container.resolve(token);

            expect(second).not.toBe(first);
            expect(second).toEqual({ v: 'second' });
        });
    });

    // ---- Edge Cases ----

    describe('edge cases', () => {
        it('should allow undefined as a value', () => {
            const container = new Container();
            const token = new TypedToken<undefined>('undef');

            container.register(token, { useValue: undefined });

            expect(container.resolve(token)).toBeUndefined();
        });

        it('should allow null as a value', () => {
            const container = new Container();
            const token = new TypedToken<null>('nil');

            container.register(token, { useValue: null });

            expect(container.resolve(token)).toBeNull();
        });

        it('should store a function as a value without calling it', () => {
            const container = new Container();
            const token = new TypedToken<() => string>('fn');
            const fn = () => 'hi';

            container.register(token, { useValue: fn });

            expect(container.resolve(token)).toBe(fn);
        });

        it('should support recursive factory resolution (A → B → C)', () => {
            const container = new Container();
            const tokenC = new TypedToken<string>('C');
            const tokenB = new TypedToken<string>('B');
            const tokenA = new TypedToken<string>('A');

            container.register(tokenC, { useValue: 'c' });
            container.register(tokenB, { useFactory: (c) => `b+${c.resolve(tokenC)}` });
            container.register(tokenA, { useFactory: (c) => `a+${c.resolve(tokenB)}` });

            expect(container.resolve(tokenA)).toBe('a+b+c');
        });
    });
});
