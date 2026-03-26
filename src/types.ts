/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TypedToken } from './token.ts';

type ClassConstructor<T = any> = {
    new (...args: any[]): T;
};

export type ContainerKey<T = any> = TypedToken<T> | ClassConstructor<T> | symbol | string;

export type Lifetime = 'singleton' | 'transient';

export interface RegistrationOptions {
    lifetime?: Lifetime;
}

export interface ValueProvider<T> {
    useValue: T;
}

export interface FactoryProvider<T> {
    useFactory: (container: IContainer) => T;
}

export type Provider<T> = ValueProvider<T> | FactoryProvider<T>;

export type Result<T> = { success: true; data: T } | { success: false; error: Error };

export interface IContainer {
    register<T>(key: TypedToken<T>, provider: Provider<T>, options?: RegistrationOptions): void;
    register(key: ClassConstructor | symbol | string, provider: Provider<unknown>, options?: RegistrationOptions): void;

    resolve<T>(key: TypedToken<T>): T;
    resolve<T>(key: ClassConstructor | symbol | string): T;

    tryResolve<T>(key: TypedToken<T>): Result<T>;
    tryResolve<T>(key: ClassConstructor | symbol | string): Result<T>;

    has(key: ContainerKey): boolean;

    unregister(key: ContainerKey): void;
}

