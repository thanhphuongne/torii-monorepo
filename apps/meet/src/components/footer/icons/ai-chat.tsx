import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { Bot } from 'lucide-react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';
import { Button } from '@workspace/ui/components/button';

const AiChatIcon = () => {
    const dispatch = useAppDispatch();
    const { showTooltip } = useMemo(() => {
        const session = store.getState().session;
        return {
            showTooltip: session.userDeviceType === 'desktop',
        };
    }, []);

    const isActiveAiChatPanel = useAppSelector(
        (state) => state.bottomIconsActivity.activeSidePanel === 'AI_CHAT',
    );

    const toggleAiChatPanel = useCallback(() => {
        dispatch(setActiveSidePanel('AI_CHAT'));
    }, [dispatch]);

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleAiChatPanel}
            className={clsx(
                'ai-chat footer-icon relative h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]',
                {
                    'has-tooltip': showTooltip,
                    'bg-muted': isActiveAiChatPanel,
                },
            )}
        >
            <span className="tooltip">
                {isActiveAiChatPanel ? 'Ẩn AI Sensei' : 'Hỏi AI Sensei'}
            </span>
            <Bot className="h-4 w-4 md:h-5 md:w-5 3xl:h-6 3xl:w-6 text-primary" />
        </Button>
    );
};

export default AiChatIcon;
