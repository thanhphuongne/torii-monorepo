'use client'

import { LessonDiscussion } from './lesson-discussion'

export function CourseDiscussion({ deliveryScopeId }: { deliveryScopeId: string }) {
  // Course-level board: discussion entity is LiveClass.id or VodPackage.id.
  return (
    <LessonDiscussion deliveryScopeId={deliveryScopeId} lessonId={deliveryScopeId} />
  )
}
