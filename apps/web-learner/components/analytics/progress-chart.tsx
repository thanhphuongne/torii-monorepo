"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@workspace/ui/components/chart"

const defaultData = [
    { date: "Mon", score: 65, lessons: 2 },
    { date: "Tue", score: 72, lessons: 3 },
    { date: "Wed", score: 68, lessons: 1 },
    { date: "Thu", score: 75, lessons: 4 },
    { date: "Fri", score: 82, lessons: 2 },
    { date: "Sat", score: 85, lessons: 5 },
    { date: "Sun", score: 88, lessons: 3 },
]

const chartConfig = {
    score: {
        label: "Năng lực",
        color: "#10b981", // Emerald-500: Bright green for score
    },
    lessons: {
        label: "Bài học",
        color: "#8b5cf6", // Violet-500: Bright purple for lessons
    },
}

interface ProgressChartProps {
    data?: Array<{ date: string; score: number; lessons: number }>;
}

export function ProgressChart({ data = defaultData }: ProgressChartProps) {
    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Tiến trình học tập</CardTitle>
                <CardDescription>So sánh năng lực với số bài học đã hoàn thành</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-lessons)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-lessons)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            fontSize={12}
                            stroke="hsl(var(--muted-foreground))"
                            className="font-medium"
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            fontSize={12}
                            stroke="hsl(var(--muted-foreground))"
                            className="font-medium"
                        />
                        <ChartTooltip
                            content={<ChartTooltipContent indicator="dot" />}
                            cursor={{ strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="lessons"
                            stroke="var(--color-lessons)"
                            fillOpacity={1}
                            fill="url(#colorLessons)"
                            strokeWidth={3}
                            stackId="1"
                            dot={{ r: 4, fill: "var(--color-lessons)", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="var(--color-score)"
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            strokeWidth={3}
                            stackId="2"
                            dot={{ r: 4, fill: "var(--color-score)", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
