export enum AcademyExamType {
    QUIZ = 'QUIZ',
    MODULE_TEST = 'MODULE_TEST',
    FINAL_EXAM = 'FINAL_EXAM',
}

export enum AcademyExamStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}

export enum AcademyQuestionType {
    SINGLE_CHOICE = 'SINGLE_CHOICE',
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    TRUE_FALSE = 'TRUE_FALSE',
    SHORT_TEXT = 'SHORT_TEXT',
    SHORT_ANSWER = 'SHORT_ANSWER',
    GROUP_PARENT = 'GROUP_PARENT',
}

export enum AcademyQuestionReviewStatus {
    DRAFT = 'DRAFT',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum AcademyQuestionCategoryType {
    VOCABULARY = 'VOCABULARY',
    GRAMMAR = 'GRAMMAR',
    KANJI = 'KANJI',
    READING = 'READING',
    LISTENING = 'LISTENING',
}

export enum AcademyAssessmentKind {
    LESSON_CHECKPOINT = 'LESSON_CHECKPOINT',
    MODULE_CHECKPOINT = 'MODULE_CHECKPOINT',
    FINAL_EXAM = 'FINAL_EXAM',
}

export enum AcademyAttemptStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    SUBMITTED = 'SUBMITTED',
    CANCELLED = 'CANCELLED',
}

export enum ExamSessionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    SUBMITTED = 'SUBMITTED',
    COMPLETED = 'COMPLETED',
}

export enum RefundStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
}

export enum AcademyFolderType {
    LIVE_CLASS_SHARED = 'LIVE_CLASS_SHARED',
    GENERAL = 'GENERAL',
    SHARED = 'SHARED',
    PRIVATE = 'PRIVATE',
}

export enum AcademyFolderOwnerType {
    SYSTEM = 'SYSTEM',
    LECTURER = 'LECTURER',
    LIVE_CLASS = 'LIVE_CLASS',
    COURSE_VOD = 'COURSE_VOD',
    USER = 'USER',
}

export enum AcademyResourceType {
    FILE = 'FILE',
    LINK = 'LINK',
}

export enum AcademyResourceVisibility {
    ENROLLED_ONLY = 'ENROLLED_ONLY',
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}
