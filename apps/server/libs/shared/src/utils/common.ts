import { Response } from 'express';
import { readdirSync } from 'fs';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import {
  WebhookEvent,
  CommonNotifyEvent,
  CommonNotifyEventSchema,
  NotifyEventRoomSchema,
  CommonResponseSchema,
} from '@workspace/protocol';
import { create, toBinary, toJson } from '@bufbuild/protobuf';

/**
 * PrepareCommonWebhookNotifyEvent converts a LiveKit WebhookEvent to a CommonNotifyEvent
 * @param event - LiveKit WebhookEvent
 * @returns CommonNotifyEvent protobuf message
 */
export function prepareCommonWebhookNotifyEvent(
  event: WebhookEvent,
): CommonNotifyEvent {
  const ct = event.room?.creationTime
    ? event.room.creationTime.toString()
    : '0';

  // Create NotifyEventRoom using create()
  const room = create(NotifyEventRoomSchema, {
    sid: event.room?.sid,
    roomId: event.room?.name,
    emptyTimeout: event.room?.emptyTimeout,
    maxParticipants: event.room?.maxParticipants,
    creationTime: ct, // string type in protobuf (JS_STRING)
    enabledCodecs: event.room?.enabledCodecs || [],
    metadata: event.room?.metadata,
    numParticipants: event.room?.numParticipants,
  });

  return create(CommonNotifyEventSchema, {
    event: event.event,
    room: room,
    participant: event.participant, // ✅ Same source, no casting needed
    track: event.track, // ✅ Same source, no casting needed
    id: event.id,
    createdAt: event.createdAt ? event.createdAt.toString() : '0', // string type in protobuf (JS_STRING)
  });
}

/**
 * SendCommonProtobufResponse sends a CommonResponse in protobuf binary format
 * @param res - Express Response object
 * @param status - Response status
 * @param msg - Response message
 */
export function sendCommonProtobufResponse(
  res: Response,
  status: boolean,
  msg: string,
): void {
  const response = create(CommonResponseSchema, {
    status,
    msg,
  });

  const bytes = toBinary(CommonResponseSchema, response);
  res.setHeader('Content-Type', 'application/protobuf');
  res.send(Buffer.from(bytes));
}

/**
 * SendProtobufResponse sends a protobuf message in binary format
 * @param res - Express Response object
 * @param schema - Protobuf schema for the message
 * @param message - Protobuf message to send
 */
export function sendProtobufResponse(
  res: Response,
  schema: any,
  message: any,
): void {
  const bytes = toBinary(schema, message);
  res.setHeader('Content-Type', 'application/protobuf');
  res.send(Buffer.from(bytes));
}

/**
 * SendCommonProtoJsonResponse sends a CommonResponse in JSON format (proto3 JSON mapping)
 * @param res - Express Response object
 * @param status - Response status
 * @param msg - Response message
 */
export function sendCommonProtoJsonResponse(
  res: Response,
  status: boolean,
  msg: string,
): void {
  const response = create(CommonResponseSchema, {
    status,
    msg,
  });

  const json = toJson(CommonResponseSchema, response);
  res.setHeader('Content-Type', 'application/json');
  res.json(json);
}

/**
 * SendProtoJsonResponse sends a protobuf message in JSON format (proto3 JSON mapping)
 * @param res - Express Response object
 * @param schema - Protobuf schema for the message
 * @param message - Protobuf message to send
 */
export function sendProtoJsonResponse(
  res: Response,
  schema: any,
  message: any,
): void {
  const json = toJson(schema, message);
  res.setHeader('Content-Type', 'application/json');
  res.json(json);
}

/**
 * GetFilesFromDir retrieves files from a directory with optional filtering and sorting
 * @param path - Directory path
 * @param ext - File extension filter (e.g., '.js')
 * @param sortOrder - Sort order: 'asc', 'desc', or empty string for no sorting
 * @returns Array of file names
 */
export function getFilesFromDir(
  path: string,
  ext: string,
  sortOrder: string,
): string[] {
  try {
    const entries = readdirSync(path, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (
        entry.isFile() &&
        extname(entry.name) === ext &&
        checkIfAllowedFilePrefix(entry.name)
      ) {
        files.push(entry.name);
      }
    }

    if (sortOrder === 'asc') {
      files.sort();
    } else if (sortOrder === 'desc') {
      files.sort().reverse();
    }

    return files;
  } catch (error) {
    throw new Error(`Failed to read directory: ${error}`);
  }
}

/**
 * checkIfAllowedFilePrefix checks if a file name starts with allowed prefixes
 * @param filename - File name to check
 * @returns true if file name has an allowed prefix
 */
function checkIfAllowedFilePrefix(filename: string): boolean {
  const allowedPrefixes = ['main', 'runtime', 'vendor', 'tflite'];
  return allowedPrefixes.some((prefix) => filename.startsWith(prefix));
}

/**
 * GenerateSecureRandomString generates a cryptographically secure random string
 * @param n - Length of the string to generate
 * @returns Random string
 */
export function generateSecureRandomString(n: number): string {
  const letters =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const lettersLength = letters.length;
  let result = '';

  // Generate random bytes
  const randomBytesBuffer = randomBytes(n);

  for (let i = 0; i < n; i++) {
    // Use modulo to convert each byte to a valid index in the letters string
    const index = randomBytesBuffer[i] % lettersLength;
    result += letters[index];
  }

  return result;
}

/**
 * GenerateRandomString generates a random string (less secure, faster)
 * @param n - Length of the string to generate
 * @returns Random string
 */
export function generateRandomString(n: number): string {
  const bytes = randomBytes(n + 2);
  const hex = bytes.toString('hex');
  return hex.substring(2, n + 2);
}
