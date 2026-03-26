/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ContainerError } from './error.ts';
import { TypedToken } from './token.ts';
import type {
    ContainerKey, IContainer, Lifetime, Provider, RegistrationOptions, Result,
} from './types.ts';

type MapKey = symbol | string | (abstract new (...args: any[]) => any);

function isValueProvider<T>(provider: Provider<T>): provider is { useValue: T } {
    return 'useValue' in provider;
}

export class Container implements IContainer {
    protected providers: Map<MapKey, Provider<any>>;

    protected instances: Map<MapKey, any>;

    protected lifetimes: Map<MapKey, Lifetime>;

    // ----------------------------------------------------

    constructor() {
        this.providers = new Map();
        this.instances = new Map();
        this.lifetimes = new Map();
    }

    // ----------------------------------------------------

    register<T>(key: ContainerKey<T>, provider: Provider<T>, options?: RegistrationOptions): void {
        const k = this.normalizeKey(key);
        this.providers.set(k, provider);
        this.lifetimes.set(k, options?.lifetime ?? 'singleton');
        this.instances.delete(k);
    }

    resolve<T>(key: ContainerKey<T>): T {
        const k = this.normalizeKey(key);

        if (this.instances.has(k)) {
            return this.instances.get(k) as T;
        }

        const factory = this.providers.get(k);
        if (!factory) {
            throw new ContainerError(`No registration found for: ${String(key)}`);
        }

        const instance = isValueProvider(factory) ?
            factory.useValue as T :
            factory.useFactory(this) as T;

        if (this.lifetimes.get(k) === 'singleton') {
            this.instances.set(k, instance);
        }

        return instance;
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
        return this.providers.has(this.normalizeKey(key));
    }

    unregister(key: ContainerKey): void {
        const k = this.normalizeKey(key);
        this.providers.delete(k);
        this.instances.delete(k);
        this.lifetimes.delete(k);
    }

    // ----------------------------------------------------

    protected normalizeKey(key: ContainerKey): MapKey {
        return key instanceof TypedToken ? key.id : key;
    }
}
