import { useNavigate } from "react-router-dom"
import { BlogSheet } from "@/components/blogs/blog-sheet"

export default function CreateBlogPage() {
  const navigate = useNavigate()

  return (
    <BlogSheet
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate("/blogs")
      }}
      blogId={null}
    />
  )
}

