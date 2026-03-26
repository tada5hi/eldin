/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export class ContainerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ContainerError';
    }
}
