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
    AsyncFactoryProvider, ContainerKey, IContainer, Provider, RegistrationOptions, Result, ValueProvider,
} from './types.ts';

type MapKey = symbol | string | (abstract new (...args: any[]) => any);

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

    unregister(key: ContainerKey): void {
        const k = this.normalizeKey(key);
        this.providers.delete(k);
        this.instances.delete(k);
        this.lifetimes.delete(k);
    }

    // ----------------------------------------------------

    resolve<T>(key: ContainerKey<T>): T {
        return this.resolveInternal(key, this);
    }

    tryResolve<T>(key: ContainerKey<T>): Result<T, ContainerError> {
        try {
            const data = this.resolve<T>(key);

            return { success: true, data };
        } catch (e) {
            return { success: false, error: e as ContainerError };
        }
    }

    // ----------------------------------------------------

    async resolveAsync<T>(key: ContainerKey<T>): Promise<T> {
        return this.resolveAsyncInternal(key, this);
    }

    async tryResolveAsync<T>(key: ContainerKey<T>): Promise<Result<T, ContainerError>> {
        try {
            const data = await this.resolveAsync<T>(key);

            return { success: true, data };
        } catch (e) {
            return { success: false, error: e as ContainerError };
        }
    }

    // ----------------------------------------------------

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

    // ----------------------------------------------------

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

            if (this.isAsyncFactoryProvider(provider)) {
                throw new ContainerError(`Cannot resolve async provider synchronously: ${String(key)}. Use resolveAsync() instead.`);
            }

            const instance = this.isValueProvider(provider) ?
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

    protected async resolveAsyncInternal<T>(key: ContainerKey<T>, origin: Container): Promise<T> {
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

            let instance: T;
            if (this.isValueProvider(provider)) {
                instance = provider.useValue as T;
            } else if (this.isAsyncFactoryProvider(provider)) {
                instance = await provider.useAsyncFactory(origin);
            } else {
                instance = provider.useFactory(origin) as T;
            }

            if (lifetime === Lifetime.SINGLETON) {
                this.instances.set(k, instance);
            } else if (lifetime === Lifetime.SCOPED) {
                origin.instances.set(k, instance);
            }

            return instance;
        }

        if (this.parent) {
            return this.parent.resolveAsyncInternal(key, origin);
        }

        throw new ContainerError(`No registration found for: ${String(key)}`);
    }

    private isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
        return 'useValue' in provider;
    }

    private isAsyncFactoryProvider<T>(provider: Provider<T>): provider is AsyncFactoryProvider<T> {
        return 'useAsyncFactory' in provider;
    }

    protected normalizeKey(key: ContainerKey): MapKey {
        return key instanceof TypedToken ? key.id : key;
    }
}
