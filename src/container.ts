/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Lifetime } from './constants.ts';
import { ContainerError } from './error.ts';
import { TypedToken } from './token.ts';
import type {
    ContainerKey, IContainer, Provider, RegistrationOptions, Result,
} from './types.ts';

type MapKey = symbol | string | (abstract new (...args: any[]) => any);

function isValueProvider<T>(provider: Provider<T>): provider is { useValue: T } {
    return 'useValue' in provider;
}

export class Container implements IContainer {
    protected providers: Map<MapKey, Provider<any>>;

    protected instances: Map<MapKey, any>;

    protected lifetimes: Map<MapKey, `${Lifetime}`>;

    protected parent?: Container;

    protected isScope: boolean;

    // ----------------------------------------------------

    constructor() {
        this.providers = new Map();
        this.instances = new Map();
        this.lifetimes = new Map();
        this.isScope = false;
    }

    // ----------------------------------------------------

    register<T>(key: ContainerKey<T>, provider: Provider<T>, options: RegistrationOptions = {}): void {
        const k = this.normalizeKey(key);
        this.providers.set(k, provider);
        this.lifetimes.set(k, options.lifetime ?? Lifetime.SINGLETON);
        this.instances.delete(k);
    }

    resolve<T>(key: ContainerKey<T>): T {
        return this.resolveInternal(key, this);
    }

    tryResolve<T>(key: ContainerKey<T>): Result<T> {
        try {
            const data = this.resolve<T>(key);

            return { success: true, data };
        } catch (e) {
            return { success: false, error: e as Error };
        }
    }

    has(key: ContainerKey): boolean {
        const k = this.normalizeKey(key);

        if (this.providers.has(k)) {
            return true;
        }

        if (this.parent) {
            return this.parent.has(key);
        }

        return false;
    }

    unregister(key: ContainerKey): void {
        const k = this.normalizeKey(key);
        this.providers.delete(k);
        this.instances.delete(k);
        this.lifetimes.delete(k);
    }

    createChild(): Container {
        const child = new Container();
        child.parent = this;

        return child;
    }

    createScope(): Container {
        const child = this.createChild();
        child.isScope = true;

        for (const [k, lifetime] of this.lifetimes) {
            if (lifetime === Lifetime.SCOPED) {
                child.providers.set(k, this.providers.get(k)!);
                child.lifetimes.set(k, Lifetime.SCOPED);
            }
        }

        return child;
    }

    // ----------------------------------------------------

    protected resolveInternal<T>(key: ContainerKey<T>, origin: Container): T {
        const k = this.normalizeKey(key);

        if (this.instances.has(k)) {
            return this.instances.get(k) as T;
        }

        if (this.providers.has(k)) {
            const provider = this.providers.get(k)!;
            const lifetime = this.lifetimes.get(k)!;

            if (lifetime === Lifetime.SCOPED && !origin.isScope) {
                throw new ContainerError(`Cannot resolve scoped registration outside a scope: ${String(key)}`);
            }

            const instance = isValueProvider(provider) ?
                provider.useValue as T :
                provider.useFactory(origin) as T;

            if (lifetime === Lifetime.SINGLETON) {
                this.instances.set(k, instance);
            } else if (lifetime === Lifetime.SCOPED) {
                origin.instances.set(k, instance);
            }

            return instance;
        }

        if (this.parent) {
            return this.parent.resolveInternal(key, origin);
        }

        throw new ContainerError(`No registration found for: ${String(key)}`);
    }

    protected normalizeKey(key: ContainerKey): MapKey {
        return key instanceof TypedToken ? key.id : key;
    }
}
