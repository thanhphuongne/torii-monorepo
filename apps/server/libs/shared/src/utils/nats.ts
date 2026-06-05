/**
 * NATS utilities for NKey authentication
 *
 * Note: This file provides NATS NKey authentication utilities.
 * However, in TypeScript/Node.js with nats.js library, the NKey authentication
 * is handled differently than some other languages.
 *
 * The nats.js library provides built-in NKey support.
 *
 * In NestJS, NATS authentication is typically configured via:
 * 1. Environment variables (NATS_USER, NATS_PASS)
 * 2. JWT/NKey in connection options
 * 3. Credentials file
 *
 * This is a REFERENCE implementation showing the equivalent concepts from tutorials.
 * For actual use in NestJS, use the NATS module configuration.
 *
 * Example NestJS NATS configuration:
 * ```typescript
 * NatsModule.register({
 *   servers: ['nats://localhost:4222'],
 *   nkey: seedText, // NATS client handles this automatically
 * })
 * ```
 */

/**
 * NkeyOptionFromSeedText creates NATS connection option from seed text
 *
 * In nats.js, use seed directly in connection options:
 * ```typescript
 * const nc = await connect({
 *   servers: 'nats://localhost:4222',
 *   nkey: seedText,
 * });
 * ```
 *
 * @param seedText - NKey seed text
 * @returns Seed text for NATS connection (nats.js handles key pair internally)
 */
export function nkeyOptionFromSeedText(seedText: string): string {
  // In nats.js, the library handles key pair creation internally
  // Just return the seed text to use in connection options
  return seedText;
}

/**
 * sigHandler signs a nonce with the seed
 *
 * Note: This is handled automatically by nats.js when you provide a seed
 *
 * @param nonce - Challenge nonce from server
 * @param seed - NKey seed text
 * @returns Signature bytes (placeholder - use nats.js built-in)
 */
export function sigHandler(nonce: Uint8Array, seed: string): Uint8Array {
  throw new Error(
    'sigHandler is not needed - use nats.js built-in NKey authentication',
  );
}

/**
 * nKeyPairFromSeed creates a key pair from seed text
 *
 * Note: This is handled automatically by nats.js
 *
 * @param seedText - NKey seed text
 * @returns Seed text (nats.js handles key pair internally)
 */
export function nKeyPairFromSeed(seedText: string): string {
  // In nats.js, you don't need to manually create key pairs
  // The library handles this when you provide the seed
  return seedText;
}

/**
 * Wipe slice with 'x', for clearing contents of creds or nkey seed file
 *
 * @param buf - Buffer to wipe
 */
export function wipeSlice(buf: Buffer): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 'x'.charCodeAt(0);
  }
}

/**
 * Example usage with NestJS NATS:
 *
 * ```typescript
 * // In meet.module.ts or nats.module.ts
 * import { Module } from '@nestjs/common';
 * import { Client sModule, Transport } from '@nestjs/microservices';
 *
 * @Module({
 *   imports: [
 *     ClientsModule.register([{
 *       name: 'NATS_SERVICE',
 *       transport: Transport.NATS,
 *       options: {
 *         servers: ['nats://localhost:4222'],
 *         // Option 1: NKey authentication (recommended)
 *         nkey: appConfig.nats.nkeySeed,
 *
 *         // Option 2: User/Password
 *         // user: appConfig.nats.user,
 *         // pass: appConfig.nats.pass,
 *
 *         // Option 3: JWT
 *         // jwt: appConfig.nats.jwt,
 *       },
 *     }]),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
