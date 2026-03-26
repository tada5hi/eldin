/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Lifetime } from './constants.ts';
import type { TypedToken } from './token.ts';

type ClassConstructor<T = any> = {
    new (...args: any[]): T;
};

export type ContainerKey<T = any> = TypedToken<T> | ClassConstructor<T> | symbol | string;

export interface RegistrationOptions {
    lifetime?: `${Lifetime}`;
}

export interface ValueProvider<T> {
    useValue: T;
}

export interface FactoryProvider<T> {
    useFactory: (container: IContainer) => T;
}

export interface AsyncFactoryProvider<T> {
    useAsyncFactory: (container: IContainer) => Promise<T>;
}

export type Provider<T> = ValueProvider<T> | FactoryProvider<T> | AsyncFactoryProvider<T>;

export type Result<T, E extends Error = Error> = { success: true; data: T } | { success: false; error: E };

export interface IContainer {
    register<T>(key: TypedToken<T>, provider: Provider<T>, options?: RegistrationOptions): void;
    register(key: ClassConstructor | symbol | string, provider: Provider<unknown>, options?: RegistrationOptions): void;

    resolve<T>(key: TypedToken<T>): T;
    resolve<T>(key: ClassConstructor | symbol | string): T;

    tryResolve<T>(key: TypedToken<T>): Result<T>;
    tryResolve<T>(key: ClassConstructor | symbol | string): Result<T>;

    resolveAsync<T>(key: TypedToken<T>): Promise<T>;
    resolveAsync<T>(key: ClassConstructor | symbol | string): Promise<T>;

    tryResolveAsync<T>(key: TypedToken<T>): Promise<Result<T>>;
    tryResolveAsync<T>(key: ClassConstructor | symbol | string): Promise<Result<T>>;

    has(key: ContainerKey): boolean;

    unregister(key: ContainerKey): void;

    createChild(): IContainer;
    createScope(): IContainer;
}

