import { z } from "zod"

export const academyStudySetCreateDTOSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
})
export type AcademyStudySetCreateDTO = z.infer<typeof academyStudySetCreateDTOSchema>

export const academyStudySetUpdateDTOSchema = academyStudySetCreateDTOSchema.partial()
export type AcademyStudySetUpdateDTO = z.infer<typeof academyStudySetUpdateDTOSchema>

export const academySetCardCreateDTOSchema = z.object({
    term: z.string().min(1),
    definition: z.string().min(1),
    hint: z.string().optional(),
    mediaUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    languageDetails: z.record(z.any()).optional(),
})
export type AcademySetCardCreateDTO = z.infer<typeof academySetCardCreateDTOSchema>

export const academySetCardUpdateDTOSchema = academySetCardCreateDTOSchema.partial()
export type AcademySetCardUpdateDTO = z.infer<typeof academySetCardUpdateDTOSchema>

export const academySetCardReviewDTOSchema = z.object({
    quality: z.number().int().min(0).max(1),
})
export type AcademySetCardReviewDTO = z.infer<typeof academySetCardReviewDTOSchema>

export const academyClonePublicStudySetDTOSchema = z.object({
    sourceSetId: z.string().uuid(),
    title: z.string().min(1).optional(),
})
export type AcademyClonePublicStudySetDTO = z.infer<typeof academyClonePublicStudySetDTOSchema>

export const academyStudySetShareDTOSchema = z.object({
    isPublic: z.boolean(),
})
export type AcademyStudySetShareDTO = z.infer<typeof academyStudySetShareDTOSchema>

export type AcademyStudySetSourceType = "USER" | "SYSTEM"

export type AcademyStudySetModel = {
    id: string
    userId: string
    title: string
    description?: string | null
    isPublic: boolean,
    sourceType?: AcademyStudySetSourceType
    shareToken?: string | null
    settings?: Record<string, any> | null
    createdAt: string
    updatedAt: string
    _count?: {
        setCards: number
    }
    isCatalog?: boolean
}

export type AcademyPublicStudySetModel = {
    id: string
    title: string
    description?: string | null
    shareToken?: string | null
    setCards: AcademySetCardModel[]
    createdAt: string
    updatedAt: string
}

export type AcademySetCardModel = {
    id: string
    studySetId: string
    term: string
    definition: string
    hint?: string | null
    mediaUrl?: string | null
    tags: string[]
    languageDetails?: Record<string, any> | null
    srsState: string
    interval: number
    nextReviewAt: string
    createdAt: string
    updatedAt: string
}
