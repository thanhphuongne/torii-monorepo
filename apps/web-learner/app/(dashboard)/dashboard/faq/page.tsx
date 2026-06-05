import { Button } from '@workspace/ui/components/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@workspace/ui/components/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { MessageCircle } from 'lucide-react'

const faqs = [
    {
        question: 'Torii Nihongo là gì?',
        answer: 'Torii Nihongo là nền tảng học tiếng Nhật toàn diện, kết hợp giữa các khóa học chất lượng cao, trợ lý AI thông minh và hệ thống luyện tập thực hành được cá nhân hóa để giúp bạn chinh phục tiếng Nhật hiệu quả nhất.',
    },
    {
        question: 'Người mới bắt đầu nên bắt đầu từ đâu?',
        answer: 'Nếu bạn là người mới hoàn toàn, hãy bắt đầu từ lộ trình N5. Torii cung cấp đầy đủ từ bảng chữ cái (Hiragana, Katakana) đến các mẫu câu giao tiếp cơ bản thông qua các bài giảng video và tài liệu đi kèm.',
    },
    {
        question: 'Tôi có thể học thử trước khi đăng ký không?',
        answer: 'Có, bạn có thể xem danh mục khóa học và các thông tin giới thiệu. Một số bài học đầu tiên của các khóa tự học thường được mở miễn phí để bạn trải nghiệm chất lượng giảng dạy trước khi quyết định đăng ký.',
    },
    {
        question: 'Làm thế nào để theo dõi tiến độ học tập?',
        answer: 'Sau khi đăng nhập, Dashboard sẽ hiển thị chi tiết tiến độ hoàn thành bài học, số lượng điểm XP bạn đã tích lũy và các huy chương đạt được. Bạn cũng có thể xem lại lịch sử các buổi học trực tiếp đã tham gia.',
    },
    {
        question: 'Đăng ký lớp trực tiếp và khóa tự học khác nhau như thế nào?',
        answer: 'Lớp trực tiếp là hình thức học trực tuyến tương tác với giảng viên theo lịch cố định. Khóa tự học là các bài giảng quay sẵn, giúp bạn linh hoạt học mọi lúc theo thời gian biểu cá nhân.',
    },
]

export default function DashboardFAQPage() {
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Hỗ trợ & Giải đáp</h1>
                <p className="text-sm text-muted-foreground">
                    Mọi thông tin bạn cần để bắt đầu hành trình chinh phục tiếng Nhật tại Torii Academy.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">Câu hỏi thường gặp</CardTitle>
                            <CardDescription>
                                Chọn câu hỏi để xem câu trả lời.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem 
                                key={index} 
                                value={`item-${index}`} 
                                className="border-b last:border-b-0"
                            >
                                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm pb-4">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4 lg:col-span-4">
                    <Card>
                        <CardHeader className="space-y-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <MessageCircle className="size-4 text-primary" />
                                Bạn vẫn còn thắc mắc?
                            </CardTitle>
                            <CardDescription>
                                Đội ngũ giảng viên luôn sẵn sàng lắng nghe và giải đáp mọi vấn đề của bạn qua hệ thống Ticket.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button className="w-full">
                                Gửi yêu cầu hỗ trợ
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                Facebook Messenger
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                Zalo Official
                            </Button>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}
