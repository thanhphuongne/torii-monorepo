import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { create } from '@bufbuild/protobuf';
import {
  DataMsgBodyType,
  SubmitPollResponseReqSchema,
} from '@workspace/protocol';

import { store, useAppDispatch } from '@/store';
import {
  useAddResponseMutation,
  useGetUserSelectedOptionQuery,
} from '@/store/services/polls-api';
import { getNatsConn } from '@/helpers/nats';
import { PollDataWithOption } from '@/components/polls/utils';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { Loader2 } from 'lucide-react';
import {Button} from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';

interface PollFormProps {
  pollDataWithOption: PollDataWithOption;
  isRunning: boolean;
}

const PollForm = ({ pollDataWithOption, isRunning }: PollFormProps) => {
  const dispatch = useAppDispatch();
  const [selectedOption, setSelectedOption] = useState<number>();
  const conn = getNatsConn();
  const currentUser = useMemo(() => store.getState().session.currentUser, []);

  const [voted, setVoted] = useState<boolean>(false);
  const { data: userVoteData } = useGetUserSelectedOptionQuery({
    pollId: pollDataWithOption.pollId,
    userId: currentUser?.userId || '',
  });
  useEffect(() => {
    if (
      userVoteData &&
      userVoteData.status &&
      userVoteData.voted &&
      Number(userVoteData.voted) > 0
    ) {
      // only when we've valid vote
      setVoted(true);
      setSelectedOption(Number(userVoteData.voted));
    }
  }, [userVoteData]);

  const [addResponse, { isLoading, data: addReqResponse }] =
    useAddResponseMutation();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOption || isLoading) {
      return;
    }
    addResponse(
      create(SubmitPollResponseReqSchema, {
        pollId: pollDataWithOption.pollId,
        userId: currentUser?.userId ?? '',
        name: currentUser?.name ?? '',
        selectedOption: `${selectedOption}`,
      }),
    );

    // notify to everyone
    if (conn) {
      conn.sendDataMessage(
        DataMsgBodyType.NEW_POLL_RESPONSE,
        pollDataWithOption.pollId,
      );
    }
  };

  useEffect(() => {
    if (addReqResponse) {
      const message = addReqResponse.status
        ? 'Đã thêm phản hồi'
        : addReqResponse.msg;
      const typeOption = addReqResponse.status ? 'info' : 'error';

      dispatch(
        addUserNotification({
          message,
          typeOption,
        }),
      );
    }
    // We only want this to run when the response comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addReqResponse]);

  const onClickSelectOption = useCallback(
    (val: number) => {
      if (voted || !isRunning) {
        return;
      }
      setSelectedOption(val);
    },
    [isRunning, voted],
  );

  const canViewPercentage = () => {
    if (!isRunning) {
      return true;
    }
    return !!currentUser?.metadata?.isAdmin;
  };

  const pollOption = useMemo(() => {
    const elms: Array<ReactElement> = [];
    for (const key in pollDataWithOption.options) {
      const o = pollDataWithOption.options[key];
      // Determine bar color based on percentage
      let barColor = 'rgba(0, 161, 242, 0.1)'; // default light blue
      if (o.responsesPercentage >= 50) {
        barColor = 'rgba(0, 161, 242, 0.2)'; // green for high percentages
      }
      elms.push(
        <div
          key={`option-${pollDataWithOption.pollId}-${o.id}`}
          className="relative flex items-center border border-border min-h-[42px] bg-muted/10 hover:bg-muted/20 transition-all rounded-xl px-2 overflow-hidden my-2 cursor-pointer shadow-sm"
          onClick={() => onClickSelectOption(o.id)}
        >
          <RadioGroupItem
            id={`option-${pollDataWithOption.pollId}-${o.id}`}
            value={`${o.id}`}
            className="polls-checkbox relative rounded-md border border-border shadow-xs data-[checked=true]:bg-primary data-[checked=true]:border-primary"
          />
          <Label
            className="text-sm text-foreground w-full h-full pl-7 z-10 flex items-center cursor-pointer font-medium"
            htmlFor={`option-${pollDataWithOption.pollId}-${o.id}`}
          >
            {o.text}
          </Label>
          {canViewPercentage() && (
            <>
              <div
                className="shape absolute top-0 left-0 h-full bg-primary/20 transition-all"
                style={{
                  width: `${o.responsesPercentage}%`,
                }}
              ></div>
              <div className="per absolute top-1/2 -translate-y-1/2 right-4 text-xs font-bold text-foreground/70">
                {o.responsesPercentage + '%'}
              </div>
            </>
          )}
        </div>,
      );
    }
    return elms;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [onClickSelectOption, pollDataWithOption.options, selectedOption]);

  return (
    <form
      className="group"
      onSubmit={onSubmit}
      name={`voteForm-${pollDataWithOption.pollId}`}
    >
      <RadioGroup
        value={selectedOption ? `${selectedOption}` : undefined}
        onValueChange={(val) => onClickSelectOption(Number(val))}
      >
        {pollOption}
      </RadioGroup>
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
          <Loader2
            className={'inline w-10 h-10 me-3 text-primary animate-spin'}
          />
        </div>
      )}
      {!isRunning || voted || !selectedOption ? null : (
        <div className="button-section flex items-center justify-end mt-3">
          <Button type="submit">
            Gửi
          </Button>
        </div>
      )}
    </form>
  );
};

export default PollForm;
