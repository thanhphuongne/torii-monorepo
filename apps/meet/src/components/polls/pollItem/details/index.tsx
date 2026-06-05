import React, { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';

import EndPollBtn from '@/components/polls/pollItem/details/end-poll-btn';
import PublishResultBtn from '@/components/polls/pollItem/details/publish-result-btn';
import NotRespondents from '@/components/polls/pollItem/details/not-respondents';
import Respondents from '@/components/polls/pollItem/details/respondents';
import { PollDataWithOption } from '@/components/polls/utils';
import { X } from 'lucide-react';

interface ViewDetailsProps {
  pollDataWithOption: PollDataWithOption;
  isRunning: boolean;
  onCloseViewDetails: () => void;
  serialNum: number;
  refetch: () => void;
}

const DetailsModal = ({
  pollDataWithOption,
  isRunning,
  onCloseViewDetails,
  serialNum,
  refetch,
}: ViewDetailsProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const closeModal = () => {
    setIsOpen(false);
    onCloseViewDetails();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-9999 overflow-y-auto"
        onClose={closeModal}
      >
        <div className="min-h-screen px-4 text-center bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-card rounded-2xl border border-border shadow-2xl">
              <div className="top flex items-center justify-between py-4 px-6">
                <DialogTitle
                  as="h3"
                  className="text-sm 3xl:text-base font-bold text-foreground flex items-center gap-3"
                >
                  <span className="uppercase">
                    Bình chọn #{serialNum}
                  </span>{' '}
                  {!isRunning && (
                    <div className="border border-destructive/20 bg-destructive/10 rounded-full h-[22px] px-2 text-[10px] text-destructive font-bold flex items-center uppercase tracking-wider">
                      Đã đóng
                    </div>
                  )}
                </DialogTitle>
                <button
                  className="close-btn text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer"
                  type="button"
                  onClick={closeModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="q-headline px-6 py-4 border-y border-border bg-muted/30 text-sm font-semibold text-foreground">
                <p className="">Q: {pollDataWithOption.question}</p>
              </div>
              <Respondents pollDataWithOption={pollDataWithOption} />
              <div className="line h-px w-full bg-border"></div>
              <NotRespondents pollDataWithOption={pollDataWithOption} />
              <div className="px-6 py-6 flex justify-end bg-card border-t border-border">
                {isRunning ? (
                  <EndPollBtn pollId={pollDataWithOption.pollId} />
                ) : (
                  <PublishResultBtn
                    onCloseViewDetails={onCloseViewDetails}
                    pollDataWithOption={pollDataWithOption}
                  />
                )}
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DetailsModal;
