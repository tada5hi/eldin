/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export class TypedToken<T> {
    declare readonly _type: T;

    readonly id: symbol;

    readonly name: string;

    constructor(name: string) {
        this.name = name;
        this.id = Symbol(name);
    }

    toString(): string {
        return `TypedToken(${this.name})`;
    }
}
