import React, { useMemo } from 'react';
import { differenceWith } from 'es-toolkit';

import {
  getFormatedRespondents,
  PollDataWithOption,
  Respondents,
} from '@/components/polls/utils';
import { useAppSelector } from '@/store';
import { selectBasicParticipants } from '@/store/slices/participant-slice';

interface NotRespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const NotRespondents = ({ pollDataWithOption }: NotRespondentsProps) => {
  const participants = useAppSelector(selectBasicParticipants);

  const { formattedNotRespondents, notRespondentsCount } = useMemo(() => {
    const notRespondentsList: Respondents[] = differenceWith(
      participants,
      pollDataWithOption.allRespondents,
      (a, b) => a.userId === b.userId,
    ).map((p) => ({ userId: p.userId, name: p.name }));

    return {
      formattedNotRespondents: getFormatedRespondents(notRespondentsList),
      notRespondentsCount: notRespondentsList.length,
    };
  }, [participants, pollDataWithOption]);

  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-foreground mb-3">
        Chưa phản hồi: {notRespondentsCount}
      </p>
      <div className="wrap relative rounded-xl bg-muted border border-border overflow-auto">
        <div className="inner flex">{formattedNotRespondents}</div>
      </div>
    </div>
  );
};

export default NotRespondents;
