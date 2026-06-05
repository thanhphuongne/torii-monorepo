/**
 * AI SUBSCRIPTION PLAN SEED SCRIPT
 * ==================================
 * Mục đích: Khởi tạo/cập nhật các gói AI Sensei trong bảng `ai_subscription_plans`.
 *
 * Chạy:
 *   cd apps/server
 *   npx ts-node -r tsconfig-paths/register -T prisma/seed-subscriptions.ts
 */

import { PrismaClient } from '@prisma/generated';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadConfig } from '../libs/shared/src/config/app.config';


const config = loadConfig();
const adapter = new PrismaPg({
    connectionString: config.database.url,
});
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding ai_subscription_plans...');

    const tiers = [
        {
            code: 'free',
            name: 'Free',
            description: 'Gói cơ bản để bắt đầu học cùng AI Sensei.',
            price: 0,
            quota: 10,
            features: [
                '10 lượt chat AI mỗi ngày',
                'Chat với AI Sensei theo chủ đề học tập',
                'Dịch & giải thích ngữ pháp cơ bản',
                'Lưu lịch sử hội thoại gần đây',
            ],
        },
        {
            code: 'plus',
            name: 'Plus',
            description: 'Gói nâng cấp cho người học thường xuyên mỗi ngày.',
            price: 50000,
            quota: 100,
            features: [
                '100 lượt chat AI mỗi ngày',
                'Phản hồi ưu tiên nhanh hơn',
                'Phân tích lỗi ngữ pháp chi tiết hơn',
                'Gợi ý lộ trình ôn tập theo điểm yếu',
                'Lưu lịch sử hội thoại dài hạn',
            ],
        },
        {
            code: 'premium',
            name: 'Premium',
            description: 'Gói toàn diện cho người học chuyên sâu và cường độ cao.',
            price: 125000,
            quota: 5000,
            features: [
                '5000 lượt chat AI mỗi ngày (gần như không giới hạn)',
                'Ưu tiên cao nhất về tốc độ phản hồi',
                'Phân tích chuyên sâu ngữ pháp và diễn đạt tự nhiên',
                'Hỗ trợ luyện hội thoại tình huống nâng cao',
                'Gợi ý chiến lược học cá nhân hóa theo mục tiêu JLPT',
                'Truy cập sớm các tính năng AI mới',
            ],
        },
    ];

    for (const tier of tiers) {
        await prisma.aiSubscriptionPlan.upsert({
            where: { code: tier.code },
            update: {
                name: tier.name,
                description: tier.description,
                price: tier.price,
                quotas: { ai_turns: tier.quota } as any,
                features: tier.features,
                isActive: true,
            },
            create: {
                code: tier.code,
                price: tier.price,
                name: tier.name,
                description: tier.description,
                quotas: { ai_turns: tier.quota } as any,
                features: tier.features,
                isActive: true,
            },
        });

        console.log(`✅ Tier [${tier.code}] created/updated.`);
    }

    console.log('✨ Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
