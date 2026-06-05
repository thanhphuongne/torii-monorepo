'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Home, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { useRouter } from 'next/navigation';

interface CourseCompletionModalProps {
    isOpen: boolean;
    courseName?: string;
    onClose: () => void;
}

export function CourseCompletionModal({ isOpen, courseName, onClose }: CourseCompletionModalProps) {
    const router = useRouter();
    const [hasFired, setHasFired] = useState(false);

    useEffect(() => {
        if (isOpen && !hasFired) {
            // Initial blast
            const duration = 15 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than random
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            // Side cannons
            const count = 200;
            const scalar = 2;
            const triangle = confetti.shapeFromPath({ path: 'M0 10 L5 0 L10 10z' });

            confetti({
                particleCount: count,
                spread: 70,
                origin: { y: 0.6 },
                shapes: [triangle, 'circle'],
                scalar
            });

            setHasFired(true);
            return () => clearInterval(interval);
        }
    }, [isOpen, hasFired]);

    const handleGoBack = () => {
        onClose();
        router.push('/dashboard/available-courses'); // Discovery page
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-card text-card-foreground p-8 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-center border border-primary/20"
                    >
                        {/* Background Sparkles */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 90, 180, 270, 360],
                                }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary via-transparent to-primary rounded-full blur-3xl"
                            />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 260,
                                    damping: 20,
                                    delay: 0.2
                                }}
                                className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 relative"
                            >
                                <Trophy className="w-12 h-12 text-primary" />
                                <motion.div
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-primary/20 -z-10"
                                />
                                <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-400" />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent"
                            >
                                Chúc mừng bạn! 🎉
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg text-muted-foreground mb-8 text-balance"
                            >
                                Bạn đã hoàn thành 100% khóa học <br />
                                <span className="font-bold text-foreground">"{courseName}"</span>.
                                <br /> Một hành trình tuyệt vời đã kết thúc!
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-col sm:flex-row gap-3 w-full"
                            >
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1 rounded-xl h-12 text-base font-semibold"
                                >
                                    Xem lại bài học
                                </Button>
                                <Button
                                    onClick={handleGoBack}
                                    className="flex-1 rounded-xl h-12 text-base font-semibold group bg-primary hover:bg-primary/90"
                                >
                                    Khám phá thêm
                                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </motion.div>

                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                onClick={() => { onClose(); router.push('/dashboard'); }}
                                className="mt-6 text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Về trang chủ
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
