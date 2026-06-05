import React, { useState } from 'react';
import { Button } from '@workspace/ui/components/button';

import FormView from '@/components/polls/create/form-view';
import Modal from '@/helpers/ui/modal';

export interface CreatePollOptions {
  id: number;
  text: string;
}

const Create = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <Modal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        title="Tạo bình chọn"
        maxWidth="max-w-xl"
        customBodyClass="rounded-b-xl"
      >
        <FormView setIsOpen={setIsOpen} />
      </Modal>
      <div className="button-wrap px-3 3xl:px-5 py-2 md:py-4 border-t border-border">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-10 3xl:h-11 cursor-pointer px-5 flex items-center justify-center w-full rounded-lg text-sm 3xl:text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-300 shadow-sm"
        >
          Tạo bình chọn
        </Button>
      </div>
    </>
  );
};

export default Create;
