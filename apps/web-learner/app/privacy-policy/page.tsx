'use client';

import React from 'react';
import Link from 'next/link';
import {
    Database,
    UserCheck,
    Gavel,
    Cookie,
    Mail,
    ChevronRight,
    Calendar,
    HelpCircle,
    GraduationCap,
    List,
    School,
    LogIn,
    Download,
    Printer
} from 'lucide-react';

export default function PrivacyPolicyPage() {
    const tableOfContents = [
        { id: 'collection', label: 'Thu thập và sử dụng dữ liệu', icon: Database },
        { id: 'rights', label: 'Quyền của người dùng', icon: UserCheck },
        { id: 'terms', label: 'Điều khoản sử dụng dịch vụ', icon: Gavel },
        { id: 'cookie', label: 'Chính sách Cookie', icon: Cookie },
        { id: 'contact', label: 'Liên hệ hỗ trợ', icon: Mail },
    ];

    return (
        <div className="bg-background dark:bg-background min-h-screen text-foreground dark:text-foreground antialiased font-sans">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-background/80 dark:bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-primary">
                                <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                                    <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-normal">Edutech Japan</span>
                        </div>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">Trang chủ</Link>
                            <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">Danh sách khóa học</Link>
                            <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">Trợ giúp</Link>
                            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                                <LogIn className="size-4" />
                                Đăng nhập
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Persistent Left Sidebar / Table of Contents */}
                    <aside className="lg:w-72 flex-shrink-0">
                        <div className="sticky top-28 space-y-6">
                            <div className="p-6 bg-card dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <List className="text-primary size-5" />
                                    <h2 className="text-lg font-bold">Mục lục</h2>
                                </div>
                                <nav className="flex flex-col gap-1">
                                    {tableOfContents.map((item, index) => (
                                        <Link
                                            key={item.id}
                                            href={`#${item.id}`}
                                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${index === 0
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}
                                        >
                                            <item.icon className="size-[20px]" />
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Thông báo cập nhật</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
                                    Khi có thay đổi về điều khoản, chúng tôi sẽ gửi thông báo đến địa chỉ email đã đăng ký của bạn.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <article className="flex-1 max-w-3xl">
                        {/* Header Info */}
                        <div className="mb-12">
                            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                                <Link className="hover:text-primary" href="#">Trang chủ</Link>
                                <ChevronRight className="size-3" />
                                <span className="text-slate-900 dark:text-slate-100 font-medium">Chính sách bảo mật</span>
                            </nav>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
                                Chính sách bảo mật
                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                    <Calendar className="size-4" />
                                    <p className="text-sm font-medium leading-normal">Cập nhật lần cuối: 15 tháng 3 năm 2024</p>
                                </div>
                            </h1>
                        </div>

                        {/* Policy Content */}
                        <div className="space-y-8 text-slate-700 dark:text-slate-300">
                            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                                Edutech Japan (sau đây gọi là “nền tảng”) coi việc bảo vệ thông tin cá nhân của người dùng là trách nhiệm quan trọng nhất. Chính sách bảo mật này giải thích chi tiết về các loại thông tin nền tảng thu thập, mục đích sử dụng và phương thức bảo vệ thông tin đó.
                            </p>

                            <section id="collection">
                                <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 mb-6 mt-12 text-slate-900 dark:text-slate-100">
                                    1. Thu thập và sử dụng dữ liệu
                                </h2>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Nền tảng thu thập các thông tin sau để cung cấp, cải thiện dịch vụ và nâng cao trải nghiệm người dùng.
                                </p>
                                <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 dark:text-slate-300">
                                    <li><strong>Thông tin tài khoản:</strong> Họ tên, địa chỉ email, mật khẩu và ảnh đại diện.</li>
                                    <li><strong>Dữ liệu học tập:</strong> Tiến độ khóa học, điểm số bài kiểm tra, bài tập đã hoàn thành và thời gian học.</li>
                                    <li><strong>Thông tin thanh toán:</strong> 4 chữ số cuối thẻ tín dụng, ngày hết hạn và lịch sử giao dịch (việc xử lý thanh toán được thực hiện an toàn bởi đơn vị trung gian thanh toán).</li>
                                    <li><strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, thông tin thiết bị và nhật ký truy cập thông qua Cookie.</li>
                                </ul>

                                <h3 className="text-xl font-bold mb-4 mt-8 text-slate-800 dark:text-slate-200">Mục đích sử dụng thông tin</h3>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">Thông tin thu thập được sử dụng cho các mục đích sau:</p>
                                <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 dark:text-slate-300">
                                    <li>Cung cấp trải nghiệm học tập cá nhân hóa</li>
                                    <li>Gửi các thông báo quan trọng và bản tin</li>
                                    <li>Ngăn chặn lạm dụng và tăng cường bảo mật</li>
                                    <li>Phát triển tính năng mới và cải thiện tính năng hiện có</li>
                                </ul>
                            </section>

                            <section id="rights">
                                <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 mb-6 mt-12 text-slate-900 dark:text-slate-100">
                                    2. Quyền của người dùng
                                </h2>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Người dùng có các quyền sau đây đối với thông tin cá nhân của mình trong phạm vi pháp luật cho phép.
                                </p>
                                <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 dark:text-slate-300">
                                    <li><strong>Yêu cầu tiết lộ:</strong> Xem dữ liệu của bạn mà chúng tôi lưu trữ.</li>
                                    <li><strong>Chỉnh sửa & Xóa:</strong> Sửa thông tin sai hoặc xóa dữ liệu khi đóng tài khoản.</li>
                                    <li><strong>Từ chối sử dụng:</strong> Từ chối việc sử dụng dữ liệu cho mục đích tiếp thị.</li>
                                </ul>
                            </section>

                            <section id="terms">
                                <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 mb-6 mt-12 text-slate-900 dark:text-slate-100">
                                    3. Điều khoản sử dụng dịch vụ
                                </h2>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Khi sử dụng dịch vụ này, các hành vi sau đây bị cấm.
                                </p>
                                <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 dark:text-slate-300">
                                    <li>Sao chép, tái bản hoặc phân phối lại nội dung mà không có sự cho phép</li>
                                    <li>Sử dụng trái phép hoặc chia sẻ tài khoản của người khác</li>
                                    <li>Các hành vi cản trở hoạt động nền tảng (tấn công DoS, scraping, v.v.)</li>
                                </ul>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Khi phát hiện vi phạm, chúng tôi bảo lưu quyền tạm ngưng hoặc xóa tài khoản mà không cần báo trước.
                                </p>
                            </section>

                            <section id="cookie">
                                <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 mb-6 mt-12 text-slate-900 dark:text-slate-100">
                                    4. Chính sách Cookie
                                </h2>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Nền tảng sử dụng Cookie để cải thiện trải nghiệm người dùng và phân tích truy cập. Bạn có thể vô hiệu hóa Cookie qua cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đúng.
                                </p>
                            </section>

                            <section id="contact">
                                <h2 className="text-2xl font-bold border-l-4 border-primary pl-4 mb-6 mt-12 text-slate-900 dark:text-slate-100">
                                    5. Liên hệ hỗ trợ
                                </h2>
                                <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                                    Nếu bạn có câu hỏi về chính sách này hoặc cách xử lý thông tin cá nhân, vui lòng liên hệ qua:
                                </p>
                                <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                            <HelpCircle className="text-primary size-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-slate-100">Bộ phận hỗ trợ bảo vệ dữ liệu - Edutech Japan</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Email: privacy@edutech-japan.example.com</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Giờ tiếp nhận: Thứ 2 - Thứ 6, 10:00 - 18:00 (JST)</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer Action */}
                        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-slate-500">© 2024 Edutech Japan Inc. All rights reserved.</p>
                            <div className="flex gap-4">
                                <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                                    <Download className="size-4" />
                                    Tải xuống PDF
                                </button>
                                <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1">
                                    <Printer className="size-4" />
                                    In trang
                                </button>
                            </div>
                        </div>
                    </article>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="bg-slate-100 dark:bg-slate-900/50 py-12 mt-20 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-400 mb-6">
                        <School className="size-6" />
                        <span className="font-bold tracking-normal">Edutech Japan</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-8">
                        <Link className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Về chúng tôi</Link>
                        <Link className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Thông tin kinh doanh</Link>
                        <Link className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">§iều khoản dịch vụ</Link>
                        <Link className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Trung tâm hỗ trợ</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
