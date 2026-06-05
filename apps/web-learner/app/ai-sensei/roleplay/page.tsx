"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RoleplayPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace("/ai-sensei/roleplay/interactive")
    }, [router])

    return null
}
