import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
  AcademyLiveClassQueryDTO,
  StandardApiResponse,
  PaginatedApiResponse,
} from '@workspace/schemas';
import { computeLearnerProductDisplay } from '@/lib/utils/learner-product-display';

function normalizeProductForLearner(item: any) {
  if (!item) return null;

  const primaryClass = item.class ?? null;
  const profile =
    primaryClass?.courseProfile ||
    item.class?.courseProfile ||
    item.courseProfile;

  // Map CourseProfile (modules/lessons) → curriculum.chapters
  let curriculum = null;

  if (profile?.modules && Array.isArray(profile.modules)) {
    const chapters = profile.modules.map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      description: null,
      items: (mod.lessons ?? []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.type || 'VIDEO',
      })),
      estimatedMinutes: null,
    }));
    curriculum = { chapters };
  }

  const isLive = item.mode === 'LIVE' || item.type === 'LIVE' || !!item.liveClasses || !!item.cohortId;

  let classes =
    item.classes && Array.isArray(item.classes) && item.classes.length > 0
      ? item.classes
      : primaryClass
        ? [primaryClass]
        : [];

  const siblingClasses = Array.isArray(item.siblingClasses)
    ? item.siblingClasses
    : (item.cohort?.liveClasses && Array.isArray(item.cohort.liveClasses))
      ? item.cohort.liveClasses
      : [];
  // Gói LIVE gắn cohort: API trả siblingClasses (lớp cùng đợt), không set item.class
  if (isLive && siblingClasses.length > 0) {
    classes = siblingClasses;
  }

  // Derive price from classes if it's a LIVE product
  let rawPrice = item.originalPrice ?? item.price ?? 0;
  let rawDiscountPrice = item.discountPrice ?? null;

  if (isLive && classes.length > 0) {
    // Try to find selected class from URL to show correct initial price
    let sampleClass = primaryClass || classes[0];

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const liveClassIdFromUrl = urlParams.get('liveClassId');
      if (liveClassIdFromUrl) {
        const found = classes.find((c: any) => c.id === liveClassIdFromUrl);
        if (found) sampleClass = found;
      }
    }

    if (sampleClass) {
      rawPrice = sampleClass.price ?? rawPrice;
      rawDiscountPrice = sampleClass.discountPrice ?? rawDiscountPrice;
    }
  }

  const parsedPrice = Number(rawPrice);
  const parsedDiscountPrice = rawDiscountPrice ? Number(rawDiscountPrice) : null;

  const normalizedClasses = classes.map((cls: any) => {
    let liveEnrollment = cls.liveEnrollment;
    if (!liveEnrollment && cls._count?.enrollments !== undefined) {
      liveEnrollment = {
        activeEnrollmentCount: cls._count.enrollments,
        maxStudents: cls.maxStudents ?? null,
        isFull: cls.maxStudents != null ? cls._count.enrollments >= cls.maxStudents : false,
        spotsLeft: cls.maxStudents != null ? Math.max(0, cls.maxStudents - cls._count.enrollments) : null,
      };
    }

    if (curriculum && !Array.isArray(cls.curriculum?.chapters)) {
      return { ...cls, curriculum, liveEnrollment };
    }
    if (cls === primaryClass && curriculum) {
      return { ...cls, curriculum, liveEnrollment };
    }
    return { ...cls, liveEnrollment };
  });

  const display = computeLearnerProductDisplay(item, {
    isLive,
    primaryClass,
    profile,
    classesForCohort: normalizedClasses,
  });

  const firstClassWithThumbnail = normalizedClasses.find((cls: any) => !!cls?.thumbnailUrl);

  return {
    ...item,
    classes: normalizedClasses,
    class: primaryClass,
    siblingClasses,
    /** UUID lớp LIVE gợi ý từ API (`defaultLiveClassId`). */
    defaultLiveClassId: item.defaultLiveClassId ?? null,
    /** Luôn có khi curriculum lấy từ courseProfile (kể cả LIVE không có class 1:1) */
    curriculum: curriculum ?? null,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    discountPrice: parsedDiscountPrice,
    thumbnailUrl:
      item.thumbnailUrl ||
      primaryClass?.thumbnailUrl ||
      firstClassWithThumbnail?.thumbnailUrl ||
      profile?.thumbnailUrl ||
      item.metadata?.thumbnailUrl ||
      null,
    jlptLevel:
      item.jlptLevel ||
      profile?.level ||
      item.metadata?.level ||
      null,
    isLive,
    type: isLive ? 'LIVE' : 'VOD',
    learnerDisplayTitle: display.learnerDisplayTitle,
    learnerMarketingSubtitle: display.learnerMarketingSubtitle,
    liveContextLine: display.liveContextLine,
  };
}

/** Chỉ dùng cho checkout/preview và chi tiết khóa học. Hỗ trợ cả Cohort (LIVE) và VodPackage (VOD). */
export const academyProductApi = {
  getPublicById: async (id: string, type: 'LIVE' | 'VOD' = 'LIVE'): Promise<any | null> => {
    const endpoint = type === 'LIVE' ? `/api/academy/cohorts/public/${id}` : `/api/academy/vod-packages/public/${id}`;
    const response = await apiClient.get<StandardApiResponse<{ item: any }>>(endpoint);
    const item = response.data.data!.item as any;
    // Cohort/VOD public detail có thể chưa có field mode từ backend.
    return normalizeProductForLearner({
      ...item,
      mode: item?.mode ?? type,
      // LIVE detail trả liveClasses, normalize dùng siblingClasses/classes.
      siblingClasses:
        type === 'LIVE'
          ? (Array.isArray(item?.siblingClasses) ? item.siblingClasses : item?.liveClasses ?? [])
          : item?.siblingClasses,
      classes:
        type === 'LIVE'
          ? (Array.isArray(item?.classes) ? item.classes : item?.liveClasses ?? [])
          : item?.classes,
    });
  },
};

/** Catalog lớp học (learner): cohort / vodPackage / liveClass — map giá & checkout theo ID sản phẩm hiện tại. */
export const academyClassCatalogApi = {
  /**
   * Lấy đúng `price` / `discountPrice` từ mỗi item trong response catalog (JSON có thể là số hoặc chuỗi Decimal).
   */
  normalizePrice(item: { price?: unknown; discountPrice?: unknown | null }) {
    const amount = (v: unknown): number => {
      if (v == null || v === '') return 0
      if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v)
      const n = Number(String(v).trim())
      return Number.isFinite(n) ? Math.max(0, n) : 0
    }
    const price = amount(item.price)
    const dRaw = item.discountPrice
    const dNum =
      dRaw == null || dRaw === ''
        ? NaN
        : typeof dRaw === 'number' && Number.isFinite(dRaw)
          ? dRaw
          : Number(String(dRaw).trim())
    const discountPrice =
      Number.isFinite(dNum) && dNum > 0 && dNum < price ? dNum : null
    return { price, discountPrice }
  },
  findPublic: async (
    params: AcademyLiveClassQueryDTO & { mode: 'LIVE' | 'VOD' },
  ): Promise<{ items: any[] }> => {
    const response = await apiClient.get<StandardApiResponse<{ items: any[] }>>(
      '/api/academy/live-classes/public',
      { params },
    );
    const data = response.data.data!;
    return {
      ...data,
      items: (data.items ?? []).map((it: any) => {
        const prices = academyClassCatalogApi.normalizePrice(it)
        return {
          ...it,
          ...prices,
        }
      }),
    }
  },

  getPublicById: async (id: string, mode?: 'LIVE' | 'VOD'): Promise<any> => {
    const response = await apiClient.get<StandardApiResponse<{ item: any }>>(
      `/api/academy/live-classes/public/${id}`,
      { params: mode ? { mode } : undefined },
    );
    const item = response.data.data!.item as any;
    const isLive = item?.mode === 'LIVE' || !!item?.cohortId || !!item?.liveSchedules;

    if (isLive) {
      const prices = academyClassCatalogApi.normalizePrice(item)
      return {
        ...item,
        courseProfile: item.cohort?.courseProfile ?? item.courseProfile,
        price: prices.price,
        discountPrice: prices.discountPrice,
        term: item.term ?? {
          openingDate: item.cohort?.startDate ?? item.cohort?.enrollmentOpenAt ?? null,
          name: item.cohort?.name,
          code: item.cohort?.code,
        },
        liveEnrollment: {
          maxStudents: item.maxStudents ?? null,
          activeEnrollmentCount: item._count?.enrollments ?? 0,
          isFull:
            item.maxStudents != null
              ? (item._count?.enrollments ?? 0) >= item.maxStudents
              : false,
        },
      };
    }

    const prices = academyClassCatalogApi.normalizePrice(item)
    return {
      ...item,
      mode: 'VOD',
      name: item.title ?? item.name,
      price: prices.price,
      discountPrice: prices.discountPrice,
    };
  },
};

export const academyCourseApi = {
  /**
   * Get all courses with pagination and filters
   */
  findAll: async (params: {
    page?: number;
    limit?: number;
    level?: string;
    subject?: string;
    q?: string;
    type?: 'VOD' | 'LIVE';
  } = {}): Promise<PaginatedApiResponse<any>> => {
    const response = await apiClient.get<StandardApiResponse<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>>('/api/academy/course-profiles', {
      params,
    });
    const data = response.data.data!;
    return {
      success: response.data.success,
      data: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 10,
      totalPages: data.totalPages ?? 1,
    };
  },

  /**
   * Get course by id
   */
  getCourseById: async (id: string): Promise<any | null> => {
    const response = await apiClient.get<StandardApiResponse<{ item: any }>>(`/api/academy/course-profiles/${id}`);
    return response.data.data!.item;
  },
};

/**
 * Hook: sản phẩm học tập theo id (checkout)
 */
export function useAcademyProduct(id?: string, type: 'LIVE' | 'VOD' = 'LIVE') {
  return useQuery({
    queryKey: ['academy-course-products', 'id', id, type],
    queryFn: () => academyProductApi.getPublicById(id!, type),
    enabled: !!id,
    retry: false,
  });
}

/**
 * Hook: Get course by ID
 */
export function useAcademyCourseById(courseId?: string) {
  return useQuery({
    queryKey: ['academy-course-profiles', 'id', courseId],
    queryFn: () => academyCourseApi.getCourseById(courseId!),
    enabled: !!courseId,
    retry: false,
  });
}

export function useAcademyClassCatalog(
  params: AcademyLiveClassQueryDTO & { mode: 'LIVE' | 'VOD' },
) {
  return useQuery({
    queryKey: ['academy-class-catalog', params],
    queryFn: () => academyClassCatalogApi.findPublic(params),
  })
}

export function useAcademyClassCatalogById(catalogItemId?: string, mode?: 'LIVE' | 'VOD') {
  return useQuery({
    queryKey: ['academy-class-catalog', 'id', catalogItemId, mode],
    queryFn: () => academyClassCatalogApi.getPublicById(catalogItemId!, mode),
    enabled: !!catalogItemId,
    retry: false,
  });
}
