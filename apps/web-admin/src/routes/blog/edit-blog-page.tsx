import { useNavigate, useParams } from "react-router-dom"
import { BlogSheet } from "@/components/blogs/blog-sheet"

export default function EditBlogPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  return (
    <BlogSheet
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate("/blogs")
      }}
      blogId={id || null}
    />
  )
}

