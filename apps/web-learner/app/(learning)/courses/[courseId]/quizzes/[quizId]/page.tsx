'use client'

// Legacy route for Course Quiz based on QuizTemplate has been deprecated.
// All quizzes are now represented as Exam assessments and started directly from /exams/[examId]/take.
// We keep this route as a thin redirect in case of old links.

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function TakeCourseQuizPage() {
    const params = useParams()
    const router = useRouter()
    const courseId = params.courseId as string
    const quizId = params.quizId as string

    useEffect(() => {
        // Fallback: send learner back to quizzes list (which now links to /exams)
        router.replace(`/courses/${courseId}/quizzes`)
    }, [router, courseId, quizId])

    return null
}

