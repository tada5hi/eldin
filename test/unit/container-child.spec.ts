import { describe, expect, it, vi } from 'vitest';
import { Container, ContainerError, TypedToken } from '../../src';

describe('src/container.ts — createChild', () => {
    it('should resolve parent registrations from child', () => {
        const parent = new Container();
        const token = new TypedToken<number>('num');

        parent.register(token, { useValue: 42 });

        const child = parent.createChild();
        expect(child.resolve(token)).toBe(42);
    });

    it('should allow child to override parent registrations', () => {
        const parent = new Container();
        const token = new TypedToken<string>('val');

        parent.register(token, { useValue: 'parent' });

        const child = parent.createChild();
        child.register(token, { useValue: 'child' });

        expect(child.resolve(token)).toBe('child');
        expect(parent.resolve(token)).toBe('parent');
    });

    it('should not affect parent when registering in child', () => {
        const parent = new Container();
        const token = new TypedToken<string>('val');

        const child = parent.createChild();
        child.register(token, { useValue: 'child-only' });

        expect(child.resolve(token)).toBe('child-only');
        expect(() => parent.resolve(token)).toThrow(ContainerError);
    });

    it('should report has() for parent registrations', () => {
        const parent = new Container();
        const token = new TypedToken<number>('num');

        parent.register(token, { useValue: 1 });

        const child = parent.createChild();
        expect(child.has(token)).toBe(true);
    });

    it('should return false for has() on unregistered key', () => {
        const parent = new Container();
        const child = parent.createChild();
        const token = new TypedToken<number>('missing');

        expect(child.has(token)).toBe(false);
    });

    it('should cache singletons in root container', () => {
        const parent = new Container();
        const token = new TypedToken<object>('obj');
        const factory = vi.fn(() => ({}));

        parent.register(token, { useFactory: factory });

        const child = parent.createChild();
        const fromChild = child.resolve(token);
        const fromParent = parent.resolve(token);

        expect(fromChild).toBe(fromParent);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should support grandchild containers', () => {
        const root = new Container();
        const token = new TypedToken<string>('val');

        root.register(token, { useValue: 'root' });

        const child = root.createChild();
        const grandchild = child.createChild();

        expect(grandchild.resolve(token)).toBe('root');
    });

    it('should pass child container to factory (not parent)', () => {
        const parent = new Container();
        const depToken = new TypedToken<string>('dep');
        const svcToken = new TypedToken<string>('svc');

        parent.register(depToken, { useValue: 'parent-dep' });
        parent.register(svcToken, { useFactory: (c) => c.resolve(depToken) });

        const child = parent.createChild();
        child.register(depToken, { useValue: 'child-dep' });

        // Factory in parent should use child's dep when resolved from child
        expect(child.resolve(svcToken)).toBe('child-dep');
    });

    it('should create transient instances per resolve in child', () => {
        const parent = new Container();
        const token = new TypedToken<object>('obj');

        parent.register(token, { useFactory: () => ({}) }, { lifetime: 'transient' });

        const child = parent.createChild();
        const a = child.resolve(token);
        const b = child.resolve(token);

        expect(a).not.toBe(b);
    });
});
