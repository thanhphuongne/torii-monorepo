import React, {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { create } from '@bufbuild/protobuf';
import { CreatePollReqSchema } from '@workspace/protocol';

import { useCreatePollMutation } from '@/store/services/polls-api';
import { CreatePollOptions } from '@/components/polls/create/index';
import OptionsView from '@/components/polls/create/options-view';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { useAppDispatch } from '@/store';
import { Loader2 } from 'lucide-react';
import {Label} from "@workspace/ui/components/label";
import {Button} from "@workspace/ui/components/button";
import {Input} from "@workspace/ui/components/input";

interface FormViewProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const FormView = ({ setIsOpen }: FormViewProps) => {
  const dispatch = useAppDispatch();
  const [question, setQuestion] = useState<string>('');
  const [createPoll, { isLoading, data }] = useCreatePollMutation();

  const [options, setOptions] = useState<CreatePollOptions[]>([
    {
      id: 1,
      text: '',
    },
    {
      id: 2,
      text: '',
    },
  ]);

  useEffect(() => {
    if (data) {
      if (data.status) {
        // On success
        dispatch(
          addUserNotification({
            message: 'Tạo bình chọn thành công',
            typeOption: 'info',
          }),
        );
        setIsOpen(false);
      } else {
        // On failure
        dispatch(
          addUserNotification({
            message: data.msg,
            typeOption: 'error',
          }),
        );
      }
    }
  }, [data, dispatch, setIsOpen]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }

    // Prevent submission if any option is empty
    if (options.some((opt) => opt.text.trim() === '')) {
      dispatch(
        addUserNotification({
          message: 'Vui lòng điền đầy đủ các lựa chọn',
          typeOption: 'error',
        }),
      );
      return;
    }

    const body = create(CreatePollReqSchema, {
      question,
      options,
    });
    createPoll(body);
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="question-area border-b border-border pb-6 bg-card">
        <Label className="mb-2 inline-block">
          Nhập câu hỏi
        </Label>
        <Input
          type="text"
          name="question"
          value={question}
          required={true}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder="Nhập câu hỏi tại đây"
          autoComplete="off"
        />
      </div>
      <OptionsView options={options} setOptions={setOptions} />
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto">
          <Loader2
            className={'inline w-10 h-10 me-3 text-primary animate-spin'}
          />
        </div>
      )}
      <div className="button-section flex items-center gap-2 md:gap-5 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          Đóng
        </Button>
        <Button
          className="flex-1"
          type="submit"
          disabled={isLoading}
        >
          Tạo bình chọn
        </Button>
      </div>
    </form>
  );
};

export default FormView;
