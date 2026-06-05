/**
 * Proto Parser Utilities
 *
 * Provides flexible protobuf parsing that accepts both JSON and binary formats,
 */

import { fromBinary, fromJson, JsonValue } from '@bufbuild/protobuf';
import { BadRequestException } from '@nestjs/common';

const unmarshalOpts = {
  ignoreUnknownFields: true,
};

/**
 * parseAndValidateRequest parses and validates a protobuf request
 *
 * @param data - Request data (can be Buffer, string, or object)
 * @param schema - Protobuf message schema
 * @returns Parsed and validated protobuf message
 */
export function parseAndValidateRequest<T>(data: any, schema: any): T {
  const parsed = parseProtoRequest<T>(data, schema);
  validateRequest(parsed, schema);
  return parsed;
}

/**
 * validateRequest validates a protobuf message
 *
 * TypeScript would be @bufbuild/protoplugin-validate or manual validation.
 * For now, this is a placeholder that can be extended with actual validation.
 *
 * @param msg - Protobuf message to validate
 * @param schema - Protobuf message schema (for potential validation rules)
 */
export function validateRequest(msg: any, schema?: any): void {
  // TODO: Implement protovalidate equivalent when needed
  // TypeScript could use: @bufbuild/protoplugin-validate or custom validation

  // Basic validation: check if message exists
  if (!msg) {
    throw new BadRequestException('Request message is required');
  }

  // Additional validation can be added here based on schema constraints
  // For now, we rely on fromJson/fromBinary to throw errors for invalid data
}

/**
 * parseProtoRequest parses request body that can be either JSON or Protobuf binary
 *
 * This function mimics flexibility where the same endpoint can accept:
 * - JSON with snake_case fields (auto-converted to camelCase)
 * - Protobuf binary format
 *
 *
 * @param body - Request body (can be Buffer, string, or already parsed object)
 * @param schema - Protobuf schema
 * @returns Parsed protobuf message
 */
export function parseProtoRequest<T>(body: any, schema: any): T {
  // Case 1: Already a parsed JSON object (from NestJS default JSON parser)
  if (
    body &&
    typeof body === 'object' &&
    !Buffer.isBuffer(body) &&
    !ArrayBuffer.isView(body)
  ) {
    try {
      // Use fromJson which handles snake_case → camelCase conversion
      return fromJson(schema, body as JsonValue, unmarshalOpts) as T;
    } catch (jsonError) {
      // If fromJson fails but object looks valid, try as-is
      // This handles cases where the object is already in correct proto format
      if (isValidProtoObject(body)) {
        return body as T;
      }
      throw new BadRequestException(
        `Invalid JSON request: ${jsonError instanceof Error ? jsonError.message : jsonError}`,
      );
    }
  }

  // Case 2: Buffer - try binary protobuf first, then JSON string
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);

    // Try binary protobuf first
    try {
      return fromBinary(schema, buffer) as T;
    } catch (binaryError) {
      // If binary fails, try parsing as JSON string
      try {
        const jsonStr = buffer.toString('utf8');
        const jsonObj = JSON.parse(jsonStr);
        return fromJson(schema, jsonObj, unmarshalOpts) as T;
      } catch (jsonError) {
        // Both failed - provide helpful error
        throw new BadRequestException(
          `Invalid request format. Not valid protobuf binary or JSON. ` +
            `Binary parse error: ${binaryError instanceof Error ? binaryError.message : binaryError}`,
        );
      }
    }
  }

  // Case 3: String - try parse as JSON
  if (typeof body === 'string') {
    if (!body) return fromJson(schema, {} as JsonValue, unmarshalOpts) as T;
    try {
      const jsonObj = JSON.parse(body);
      return fromJson(schema, jsonObj, unmarshalOpts) as T;
    } catch (error) {
      throw new BadRequestException(
        `Invalid JSON string: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // Case 4: Handle undefined/null (some transports might send this for empty body)
  if (!body) {
    return fromJson(schema, {} as JsonValue, unmarshalOpts) as T;
  }

  // Case 4: Unknown format
  throw new BadRequestException(
    `Unsupported request body type: ${typeof body}. Expected JSON object, Buffer, or string.`,
  );
}

/**
 * Helper to check if an object looks like a valid proto object
 */
function isValidProtoObject(obj: any): boolean {
  // Basic check: object should have at least some properties
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
}
