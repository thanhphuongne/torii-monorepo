"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  CircleCheck,
  Clock3,
  GraduationCap,
  Home,
  Languages,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react"
import Image from "next/image"
import { useAppDispatch, useAppSelector } from "@/hooks/hooks"
import { logout } from "@/store/slices/authSlice"
import { useGamificationProfile } from "@/lib/api/services/gamification-api"
import { useLogo } from "@/hooks/useLogo"
import { toast } from "@workspace/ui/components/sonner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@workspace/ui/components/item"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

const homeNavLinks = [
  { href: "#uu-diem", label: "Điểm mạnh" },
  { href: "#lo-trinh", label: "Lộ trình" },
  { href: "#phuong-phap", label: "Phương pháp" },
  { href: "#faq", label: "FAQ" },
]

const highlightStats = [
  { icon: Users, value: "3.000+", label: "Học viên đang học" },
  { icon: Clock3, value: "500+", label: "Giờ nội dung tự học" },
  { icon: Trophy, value: "N5 → N1", label: "Lộ trình đầy đủ" },
  { icon: Target, value: "4 kỹ năng", label: "Nghe - Nói - Đọc - Viết" },
]

const benefits = [
  {
    icon: GraduationCap,
    title: "Lộ trình JLPT từ N5 đến N1",
    description: "Học theo cấp độ, biết rõ cần học gì ở từng giai đoạn để đi đúng hướng ngay từ đầu.",
  },
  {
    icon: PlayCircle,
    title: "Kết hợp lớp trực tiếp + tự học",
    description: "Học trực tiếp với giảng viên và chủ động ôn luyện lại bằng bài giảng ghi hình.",
  },
  {
    icon: Languages,
    title: "Luyện đủ 4 kỹ năng",
    description: "Từ vựng, ngữ pháp, đọc, nghe được tích hợp trong cùng lộ trình để tiến bộ đồng đều.",
  },
]

const jlptLevels = [
  {
    value: "n5",
    label: "N5",
    summary: "Làm quen bảng chữ cái, từ vựng nền tảng và mẫu câu giao tiếp cơ bản.",
    focus: ["Hiragana/Katakana", "Ngữ pháp nhập môn", "Phản xạ nghe - nói cơ bản"],
  },
  {
    value: "n4",
    label: "N4",
    summary: "Mở rộng vốn từ và cấu trúc câu để sử dụng trong học tập, công việc hằng ngày.",
    focus: ["Mẫu ngữ pháp thông dụng", "Đọc hiểu đoạn ngắn", "Luyện hội thoại tình huống"],
  },
  {
    value: "n3",
    label: "N3",
    summary: "Bước chuyển lên trung cấp với nội dung dài hơn và kỹ năng xử lý ngữ cảnh.",
    focus: ["Kanji và từ vựng học thuật", "Đọc hiểu trung cấp", "Nghe hiểu nhiều ngữ điệu"],
  },
  {
    value: "n2",
    label: "N2",
    summary: "Nâng cao khả năng xử lý tiếng Nhật trong môi trường học thuật và công việc thực tế.",
    focus: ["Ngữ pháp nâng cao", "Đọc báo và tài liệu dài", "Rèn tốc độ xử lý đề thi"],
  },
  {
    value: "n1",
    label: "N1",
    summary: "Tối ưu chiến lược làm bài và độ chính xác để chinh phục cấp độ cao nhất JLPT.",
    focus: ["Phân tích văn bản phức tạp", "Nghe hiểu học thuật", "Tổng ôn theo đề mô phỏng"],
  },
]

const learningFlow = [
  {
    icon: Users,
    title: "Học trực tiếp theo lịch lớp",
    description: "Tham gia lớp live để tương tác với giảng viên, hỏi đáp và sửa lỗi ngay trong buổi học.",
  },
  {
    icon: BookOpen,
    title: "Ôn tập chủ động với bài giảng tự học",
    description: "Xem lại bài đã học bất cứ lúc nào để củng cố phần kiến thức còn yếu.",
  },
  {
    icon: Bot,
    title: "AI Sensei hỗ trợ luyện tập",
    description: "Nhận hỗ trợ phản hồi nhanh khi luyện ngữ pháp, từ vựng và hội thoại thực hành.",
  },
  {
    icon: CircleCheck,
    title: "Theo dõi tiến độ rõ ràng",
    description: "Bám sát lộ trình theo từng giai đoạn để duy trì nhịp học và mục tiêu JLPT.",
  },
]

const faqs = [
  {
    question: "Torii Nihongo phù hợp với ai?",
    answer: "Nền tảng phù hợp cho cả người mới bắt đầu và học viên đã có nền tảng muốn đi tiếp từ N5 đến N1.",
  },
  {
    question: "Tôi có thể học theo lịch cá nhân không?",
    answer: "Có. Bạn có thể tham gia lớp trực tiếp theo lịch mở lớp và kết hợp bài giảng tự học theo thời gian riêng.",
  },
  {
    question: "Làm sao để bắt đầu ngay hôm nay?",
    answer: "Tạo tài khoản để đăng ký học, sau đó vào danh mục khóa học để chọn lớp hoặc gói học phù hợp.",
  },
  {
    question: "Tôi có thể theo dõi lộ trình JLPT như thế nào?",
    answer: "Sau khi tham gia học, bạn có thể theo dõi tiến độ từng phần để biết mình đang ở đâu trong lộ trình.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45 },
  }),
}

function HomeLandingUserMenu() {
  const { user } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { data: profile } = useGamificationProfile()
  const level = profile?.level ?? 1

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap()
      toast.success("Đăng xuất thành công")
      router.push("/login")
    } catch {
      toast.error("Lỗi khi đăng xuất")
      router.push("/login")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Tài khoản">
          <Avatar className="size-8 ring-2 ring-primary/15 transition-all hover:ring-primary/30">
            <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || "Avatar"} />
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {user?.displayName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2 shadow-lg" align="end" forceMount>
        <DropdownMenuLabel className="space-y-2 px-2 pb-2 font-normal">
          <div className="space-y-1">
            <p className="text-sm font-semibold leading-none">{user?.displayName || "Người dùng"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="h-5 border-none bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-wide text-primary">
              LV.{level}
            </Badge>
            <Badge variant="secondary" className="h-5 border-none bg-muted px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {user?.role === "learner" ? "Học viên" : user?.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-2" />
        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem asChild className="cursor-pointer py-2 font-medium">
            <Link href="/" className="flex items-center">
              <Home className="mr-2 size-4 text-primary" />
              Trang chủ
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer py-2 font-medium">
            <Link href="/dashboard" className="flex items-center">
              <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
              Bảng điều khiển
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer py-2 font-medium">
            <Link href="/dashboard/settings" className="flex items-center">
              <BadgeCheck className="mr-2 size-4 text-primary" />
              Cài đặt cá nhân
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-2 my-2" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer py-2 font-medium text-destructive focus:bg-destructive focus:text-destructive-foreground"
        >
          <LogOut className="mr-2 size-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HomeLandingAuthActions() {
  const { isAuthenticated, user, status } = useAppSelector((s) => s.auth)

  if (status === "loading") {
    return <div className="h-9 w-20 shrink-0 animate-pulse rounded-md bg-muted" aria-hidden />
  }

  if (isAuthenticated && user) {
    return <HomeLandingUserMenu />
  }

  return (
    <>
      <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
        <Link href="/login">Đăng nhập</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/register">Đăng ký</Link>
      </Button>
    </>
  )
}

export function HomeLanding() {
  const logo = useLogo()
  return (
    <main className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="absolute left-1/2 top-[-10%] h-[min(560px,80vh)] w-[min(900px,100vw)] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2">
            <Image
              src={logo}
              alt="Torii Nihongo"
              width={40}
              height={40}
              className="size-9 object-contain"
            />
            <div className="min-w-0 leading-none">
              <p className="truncate text-sm font-bold tracking-tight">Torii Nihongo</p>
              <p className="truncate text-[10px] text-muted-foreground">Nền tảng học trực tuyến</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {homeNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <HomeLandingAuthActions />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10 md:space-y-16 md:py-16">
        <section className="relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_min(380px,100%)] lg:gap-12">
            <div className="space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <Badge variant="outline" className="inline-flex items-center gap-2 rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" />
                  Học JLPT có lộ trình — không học vật vờ
                </Badge>
              </motion.div>
              <motion.h1
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-balance text-3xl font-extrabold tracking-tight md:text-5xl md:leading-[1.1]"
              >
                Học tiếng Nhật bài bản,
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  chinh phục JLPT từ N5 đến N1
                </span>
              </motion.h1>
              <motion.p
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="max-w-xl text-pretty text-sm text-muted-foreground md:text-base md:leading-relaxed"
              >
                Nền tảng học trực tuyến của trung tâm Nhật ngữ Torii — kết hợp lớp trực tiếp và bài giảng tự học để bạn xây
                nền vững và tiến xa trên hành trình tiếng Nhật.
              </motion.p>
              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <Button asChild size="lg" className="shadow-md">
                  <Link href="/register" className="inline-flex items-center gap-2">
                    Đăng ký học ngay
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/dashboard/available-courses">Xem khóa học</Link>
                </Button>
              </motion.div>

              <motion.div
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4"
              >
                {highlightStats.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border/60 bg-card/80 p-3 text-left shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </div>
                      <p className="text-base font-bold leading-none">{item.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  )
                })}
              </motion.div>
            </div>

            <motion.div
              className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="absolute -right-4 -top-4 hidden h-24 w-24 rounded-2xl bg-primary/10 blur-2xl md:block" />
              <Card className="relative overflow-hidden border-primary/20 shadow-lg ring-1 ring-primary/10">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-lg">Trải nghiệm học trên Torii</CardTitle>
                  <CardDescription>Lớp live, bài ghi hình và AI Sensei trong một hệ sinh thái.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <PlayCircle className="size-4 text-primary" />
                      Buổi học trực tiếp
                    </div>
                    <p className="text-xs text-muted-foreground">Tương tác với giảng viên, hỏi đáp và sửa lỗi ngay.</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="size-4 text-primary" />
                      Thư viện tự học
                    </div>
                    <p className="text-xs text-muted-foreground">Ôn lại bài đã học mọi lúc, củng cố điểm yếu.</p>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Bot className="size-4 text-primary" />
                      AI Sensei
                    </div>
                    <p className="text-xs text-muted-foreground">Luyện ngữ pháp, từ vựng và hội thoại có phản hồi nhanh.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section id="uu-diem" className="scroll-mt-24 space-y-4">
          <div className="space-y-2 text-center">
            <Badge variant="secondary">Điểm mạnh</Badge>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Vì sao học viên chọn Torii?</h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
              Nội dung được thiết kế để duy trì nhịp học ổn định và tiến bộ đều theo mục tiêu JLPT.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {benefits.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <Separator className="opacity-60" />

        <section id="lo-trinh" className="scroll-mt-24 space-y-4">
          <div className="space-y-2">
            <Badge variant="secondary">Lộ trình học</Badge>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">JLPT theo từng cấp độ</h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">Chọn cấp độ mục tiêu để xem trọng tâm học tập tương ứng.</p>
          </div>
          <Tabs defaultValue="n5" className="space-y-4">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              {jlptLevels.map((level) => (
                <TabsTrigger key={level.value} value={level.value} className="rounded-md">
                  {level.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {jlptLevels.map((level) => (
              <TabsContent key={level.value} value={level.value}>
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Lộ trình {level.label}</CardTitle>
                    <CardDescription>{level.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {level.focus.map((focus) => (
                      <Item key={focus}>
                        <ItemMedia>
                          <CircleCheck className="size-4 text-primary" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle className="text-sm">{focus}</ItemTitle>
                        </ItemContent>
                      </Item>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <Separator className="opacity-60" />

        <section id="phuong-phap" className="scroll-mt-24 space-y-4">
          <div className="space-y-2">
            <Badge variant="secondary">Phương pháp</Badge>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Học như thế nào trên Torii?</h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Kết hợp hình thức học linh hoạt để tăng hiệu quả và duy trì động lực.
            </p>
          </div>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              {learningFlow.map((step) => {
                const Icon = step.icon
                return (
                  <Item key={step.title}>
                    <ItemMedia>
                      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{step.title}</ItemTitle>
                      <ItemDescription className="leading-relaxed">{step.description}</ItemDescription>
                    </ItemContent>
                  </Item>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <Separator className="opacity-60" />

        <section id="faq" className="scroll-mt-24 space-y-4">
          <div className="space-y-2">
            <Badge variant="secondary">Hỏi đáp</Badge>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Câu hỏi thường gặp</h2>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">Một số thông tin nhanh trước khi bạn bắt đầu.</p>
          </div>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger className="text-left text-sm font-medium md:text-base">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-md ring-1 ring-primary/15">
            <CardContent className="space-y-5 px-5 py-10 text-center md:px-10 md:py-12">
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Sẵn sàng bắt đầu hành trình tiếng Nhật cùng Torii?</h2>
              <p className="mx-auto max-w-lg text-sm text-muted-foreground md:text-base">
                Tạo tài khoản để chọn khóa học phù hợp và bắt đầu lộ trình JLPT ngay hôm nay.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="shadow-md">
                  <Link href="/register" className="inline-flex items-center gap-2">
                    Đăng ký
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/dashboard/available-courses">Xem khóa học</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-base font-semibold">Torii Nihongo</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nền tảng học tiếng Nhật theo lộ trình rõ ràng, kết hợp lớp trực tiếp, bài giảng tự học và công cụ luyện tập thông minh.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Điều hướng nhanh</p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/available-courses" className="transition-colors hover:text-foreground">
                Khóa học
              </Link>
              <Link href="/dashboard/blogs" className="transition-colors hover:text-foreground">
                Blog học tập
              </Link>
              <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
                Chính sách bảo mật
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} Torii Nihongo.</span>
            <span>Đồng hành cùng lộ trình JLPT của bạn.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
