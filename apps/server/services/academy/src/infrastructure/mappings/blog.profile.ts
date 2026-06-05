import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import type { Mapper } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { createMap, forMember, mapFrom } from '@automapper/core';
import type { Blog } from '@prisma/generated';
import type { BlogResponseDTO } from '@workspace/schemas';

/**
 * Blog AutoMapper Profile
 * Maps Blog entity (Prisma) to BlogResponseDTO
 */
@Injectable()
export class BlogProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper) => {
      createMap(
        mapper,
        'Blog',
        'BlogResponseDTO',
        forMember(
          (dest: BlogResponseDTO) => dest.id,
          mapFrom((src: Blog) => src.id),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.title,
          mapFrom((src: Blog) => src.title),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.slug,
          mapFrom((src: Blog) => src.slug),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.content,
          mapFrom((src: Blog) => src.content),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.coverImageUrl,
          mapFrom((src: Blog) => src.coverImageUrl || undefined),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.authorId,
          mapFrom((src: Blog) => src.authorId),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.status,
          mapFrom((src: Blog) => src.status as any),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.publishedAt,
          mapFrom((src: Blog) => src.publishedAt || undefined),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.viewCount,
          mapFrom((src: Blog) => src.viewCount),
        ),

        forMember(
          (dest: BlogResponseDTO) => dest.createdAt,
          mapFrom((src: Blog) => src.createdAt),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.updatedAt,
          mapFrom((src: Blog) => src.updatedAt),
        ),
        forMember(
          (dest: BlogResponseDTO) => dest.excerpt,
          mapFrom((src: Blog) => src.excerpt || undefined),
        ),
        // Note: author field is populated separately in service
        forMember(
          (dest: BlogResponseDTO) => dest.author,
          mapFrom((src: any) => src.author),
        ),
      );
    };
  }
}
