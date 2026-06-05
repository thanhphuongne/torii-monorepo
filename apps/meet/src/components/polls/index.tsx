import React from 'react';

import Create from '@/components/polls/create/index';
import PollsList from '@/components/polls/polls-list';

import { store, useAppDispatch } from '@/store';
import { X } from 'lucide-react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';

const PollsComponent = () => {
  const dispatch = useAppDispatch();
  const isAdmin = store.getState().session.currentUser?.metadata?.isAdmin;

  return (
    <div className="side-panel-bg-color relative z-10 w-full bg-card border-l border-border h-full">
      <div
        className="inline-block absolute z-50 right-3 3xl:right-5 top-[10px] 3xl:top-[18px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => dispatch(setActiveSidePanel(null))}
      >
        <X className="w-5 h-5" />
      </div>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5 border-b border-border">
          <p className="text-sm 3xl:text-base text-foreground font-semibold leading-tight">
            Bình chọn
          </p>
        </div>
        <PollsList />
        {isAdmin && <Create />}
      </div>
    </div>
  );
};

export default PollsComponent;
