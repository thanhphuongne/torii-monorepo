import React, { useState } from 'react';

import { PollDataWithOption, publishPollResultByChat } from '@/components/polls/utils';
import ActionButton from '@/helpers/ui/action-button';

interface PublishResultBtnProps {
  pollDataWithOption: PollDataWithOption;
  onCloseViewDetails: () => void;
}

const PublishResultBtn = ({
  pollDataWithOption,
  onCloseViewDetails,
}: PublishResultBtnProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const publishByChat = () => {
    setIsLoading(true);
    publishPollResultByChat(pollDataWithOption).finally(() =>
      onCloseViewDetails(),
    );
  };

  return (
    <ActionButton
      onClick={publishByChat}
      isLoading={isLoading}
      buttonType="button"
      custom="w-44"
    >
      Công bố kết quả
    </ActionButton>
  );
};
export default PublishResultBtn;
