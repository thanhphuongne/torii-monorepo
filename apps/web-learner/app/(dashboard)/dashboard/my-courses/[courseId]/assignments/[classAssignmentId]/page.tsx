'use client'

import { useParams } from 'next/navigation'
import { AcademyAssignmentDetail } from '@/components/courses/academy-assignment-detail'

export default function AssignmentDetailPage() {
  const params = useParams<{ courseId: string; classAssignmentId: string }>()
  const courseId = params.courseId
  const classAssignmentId = params.classAssignmentId

  return (
    <div className="space-y-6 pb-8">
      <AcademyAssignmentDetail
        liveClassId={courseId}
        classAssignmentId={classAssignmentId}
      />
    </div>
  )
}

