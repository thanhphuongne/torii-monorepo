import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import type { Mapper } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { createMap, forMember, mapFrom } from '@automapper/core';
import type { User } from '@prisma/generated';
import type { UserResponseDTO } from '@workspace/schemas';

/**
 * User AutoMapper Profile
 * Maps User entity (Prisma) to UserResponseDTO
 * Excludes password field for security
 */
@Injectable()
export class UserProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper) => {
      createMap(
        mapper,
        'User',
        'UserResponseDTO',
        // Map all fields explicitly to ensure compatibility with Prisma plain objects
        forMember(
          (dest: UserResponseDTO) => dest.id,
          mapFrom((src: User) => src.id),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.email,
          mapFrom((src: User) => src.email),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.displayName,
          mapFrom((src: User) => src.displayName),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.role,
          mapFrom((src: User) => src.role),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.avatarUrl,
          mapFrom((src: User) => src.avatarUrl || undefined),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.appMetadata,
          mapFrom((src: User) => {
            if (!src.appMetadata) return undefined;
            if (
              typeof src.appMetadata === 'object' &&
              src.appMetadata !== null &&
              !Array.isArray(src.appMetadata)
            ) {
              return src.appMetadata as Record<string, unknown>;
            }
            return undefined;
          }),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.userMetadata,
          mapFrom((src: User) => {
            if (!src.userMetadata) return undefined;
            if (
              typeof src.userMetadata === 'object' &&
              src.userMetadata !== null &&
              !Array.isArray(src.userMetadata)
            ) {
              return src.userMetadata as Record<string, unknown>;
            }
            return undefined;
          }),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.verifiedAt,
          mapFrom((src: User) => src.verifiedAt || undefined),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.bannedUntil,
          mapFrom((src: User) => src.bannedUntil || undefined),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.lastSignInAt,
          mapFrom((src: User) => src.lastSignInAt || undefined),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.createdAt,
          mapFrom((src: User) => src.createdAt),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.updatedAt,
          mapFrom((src: User) => src.updatedAt),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.deletedAt,
          mapFrom((src: User) => src.deletedAt || undefined),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.linkedMethods,
          mapFrom((src: User & { identities?: { provider: string }[] }) => {
            const methods: string[] = [];

            // Check for password (local auth)
            if (src.password) {
              methods.push('password');
            }

            // Check for linked identities
            if (src.identities && Array.isArray(src.identities)) {
              src.identities.forEach((identity) => {
                methods.push(identity.provider);
              });
            }

            return [...new Set(methods)];
          }),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.isOnboarded,
          mapFrom((src: User) => src.isOnboarded || false),
        ),
        forMember(
          (dest: UserResponseDTO) => dest.points,
          mapFrom((src: any) => src.gamification?.points || 0),
        ),
      );
    };
  }
}
