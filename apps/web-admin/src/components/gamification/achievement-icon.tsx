import { Trophy, Star, Target, Zap, Flame, Award, HelpCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const iconMap: Record<string, any> = {
    Trophy,
    Star,
    Target,
    Zap,
    Flame,
    Award,
    HelpCircle
};

interface AchievementIconProps {
    icon: string | null;
    className?: string;
}

export function AchievementIcon({ icon, className }: AchievementIconProps) {
    if (!icon) return <Award className={className} />;

    if (icon.startsWith('http')) {
        return (
            <img 
                src={icon} 
                alt="Achievement Icon" 
                className={cn("object-contain", className)} 
            />
        );
    }

    const Icon = iconMap[icon] || Award;
    return <Icon className={className} />;
}
