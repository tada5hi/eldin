import { describe, expect, it, vi } from 'vitest';
import { Container, ContainerError, TypedToken } from '../../src';

describe('src/container.ts — createScope', () => {
    it('should resolve scoped registrations within a scope', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'scoped' });

        const scope = container.createScope();
        const instance = scope.resolve(token);

        expect(instance).toBeDefined();
    });

    it('should return same instance within same scope', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'scoped' });

        const scope = container.createScope();
        const a = scope.resolve(token);
        const b = scope.resolve(token);

        expect(a).toBe(b);
    });

    it('should return different instances across different scopes', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'scoped' });

        const scope1 = container.createScope();
        const scope2 = container.createScope();

        expect(scope1.resolve(token)).not.toBe(scope2.resolve(token));
    });

    it('should throw when resolving scoped registration outside a scope', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'scoped' });

        expect(() => container.resolve(token)).toThrow(ContainerError);
        expect(() => container.resolve(token)).toThrow(/outside a scope/);
    });

    it('should share singletons between scope and root', () => {
        const container = new Container();
        const singletonToken = new TypedToken<object>('singleton');
        const factory = vi.fn(() => ({}));

        container.register(singletonToken, { useFactory: factory });

        const scope = container.createScope();
        const fromScope = scope.resolve(singletonToken);
        const fromRoot = container.resolve(singletonToken);

        expect(fromScope).toBe(fromRoot);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should resolve transient registrations fresh each time in scope', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'transient' });

        const scope = container.createScope();
        const a = scope.resolve(token);
        const b = scope.resolve(token);

        expect(a).not.toBe(b);
    });

    it('should resolve parent registrations from scope', () => {
        const container = new Container();
        const token = new TypedToken<number>('num');

        container.register(token, { useValue: 99 });

        const scope = container.createScope();
        expect(scope.resolve(token)).toBe(99);
    });

    it('should allow overrides in scope', () => {
        const container = new Container();
        const token = new TypedToken<string>('val');

        container.register(token, { useValue: 'root' });

        const scope = container.createScope();
        scope.register(token, { useValue: 'scoped' });

        expect(scope.resolve(token)).toBe('scoped');
        expect(container.resolve(token)).toBe('root');
    });

    it('should support scoped factory with nested resolution', () => {
        const container = new Container();
        const configToken = new TypedToken<string>('config');
        const connToken = new TypedToken<string>('conn');

        container.register(configToken, { useValue: 'db://host' });
        container.register(connToken, {
            useFactory: (c) => `conn(${c.resolve(configToken)})`,
        }, { lifetime: 'scoped' });

        const scope = container.createScope();
        expect(scope.resolve(connToken)).toBe('conn(db://host)');
    });

    it('should throw for scoped in child (non-scope)', () => {
        const container = new Container();
        const token = new TypedToken<object>('obj');

        container.register(token, { useFactory: () => ({}) }, { lifetime: 'scoped' });

        const child = container.createChild();
        expect(() => child.resolve(token)).toThrow(ContainerError);
    });
});
