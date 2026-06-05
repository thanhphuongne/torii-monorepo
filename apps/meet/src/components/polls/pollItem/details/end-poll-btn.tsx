import React from 'react';

import { useEndPoll } from '@/components/polls/hooks/use-end-poll';
import ActionButton from '@/helpers/ui/action-button';

interface EndPollBtnProps {
  pollId: string;
}

const EndPollBtn = ({ pollId }: EndPollBtnProps) => {
  const { endPoll, isEndingPoll } = useEndPoll();

  return (
    <ActionButton
      onClick={() => endPoll(pollId)}
      isLoading={isEndingPoll}
      buttonType="button"
      custom="w-44 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-transparent rounded-lg shadow-sm"
    >
      Kết thúc bình chọn
    </ActionButton>
  );
};

export default EndPollBtn;
