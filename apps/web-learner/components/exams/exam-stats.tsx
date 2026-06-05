import { Trophy, Clock, Target, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'

const stats = [
    { label: 'Đề thi đã làm', value: '12', icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Điểm trung bình', value: '145/180', icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Giờ luyện thi', value: '24h', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Chứng chỉ', value: '1', icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
]

export function ExamStats() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
                <Card key={s.label}>
                    <CardContent className="p-5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className="text-lg font-bold">{s.value}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
