import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
} from 'react';
import { Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';

import { CreatePollOptions } from '@/components/polls/create/index';

interface OptionsProps {
  options: CreatePollOptions[];
  setOptions: Dispatch<SetStateAction<CreatePollOptions[]>>;
}

const OptionsView = ({ options, setOptions }: OptionsProps) => {

  // update option text
  const onChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const newOptions = options.map((option, i) =>
        i === index ? { ...option, text: e.target.value } : option,
      );
      setOptions(newOptions);
    },
    [options, setOptions],
  );

  const removeOption = useCallback(
    (idToRemove: number) => {
      // Prevent removing below 2 options
      if (options.length <= 2) return;
      setOptions(options.filter((option) => option.id !== idToRemove));
    },
    [options, setOptions],
  );

  const addOption = useCallback(() => {
    setOptions((prev) => [
      ...prev,
      {
        id: (prev[prev.length - 1]?.id ?? 0) + 1,
        text: '',
      },
    ]);
  }, [setOptions]);

  const canRemove = useMemo(() => options.length > 2, [options.length]);

  return (
    <div className="option-field-wrapper pt-5 pb-6">
      <p className="text-sm text-foreground font-medium mb-2 inline-block">
        Các lựa chọn
      </p>
      <div className="overflow-auto h-full max-h-[345px] scrollBar scrollBar2 mb-5">
        <div className="option-field-inner grid gap-5">
          {options.map((elm, index) => (
            <div className="form-inline" key={elm.id}>
              <div className="input-wrapper w-full flex items-center gap-2">
                <Input
                  type="text"
                  required={true}
                  name={`opt_${elm.id}`}
                  value={elm.text}
                  onChange={(e) => onChange(index, e)}
                  placeholder={`Lựa chọn ${index + 1}`}
                  className="flex-1"
                  autoComplete="off"
                />
                {canRemove && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeOption(elm.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full gap-2"
        type="button"
        onClick={addOption}
      >
        Thêm lựa chọn
        <PlusCircle className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default OptionsView;
