import React from 'react';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { Label } from '@workspace/ui/components/label';

export interface IRadioOption {
  id: string;
  value: string | number;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface IRadioOptionsProps {
  options: IRadioOption[];
  name: string;
  checked: string | number | undefined;
  onChange: (value: any) => void;
}

const RadioOptions = ({
  options,
  name,
  checked,
  onChange,
}: IRadioOptionsProps) => {
  return (
    <RadioGroup
      value={checked?.toString()}
      onValueChange={(value) => onChange(isNaN(Number(value)) ? value : Number(value))}
      className="mt-4 pl-2"
    >
      {options.map((option) => (
        <div
          key={option.id}
          className={`relative my-2 ${option.disabled ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value={option.value.toString()}
              id={option.id}
              disabled={option.disabled}
            />
            <Label htmlFor={option.id} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
          {option.description && (
            <p className="text-xs text-destructive pl-6">
              {option.description}
            </p>
          )}
        </div>
      ))}
    </RadioGroup>
  );
};

export default RadioOptions;
