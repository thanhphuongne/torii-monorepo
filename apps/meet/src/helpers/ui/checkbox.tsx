import React from 'react';
import { Checkbox as CheckboxComponent } from '@workspace/ui/components/checkbox';
import { Label } from '@workspace/ui/components/label';

interface ICheckboxProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const Checkbox = ({
  id,
  label,
  description,
  checked,
  onChange,
}: ICheckboxProps) => (
  <div className="item flex items-start gap-2">
    <CheckboxComponent
      id={id}
      name={id}
      checked={checked}
      onCheckedChange={onChange}
      className="mt-1"
    />
    <div className="flex-1">
      <Label htmlFor={id} className="cursor-pointer">
        {label}
        <p className="text-xs md:text-sm opacity-70 dark:opacity-80 font-normal">
          {description}
        </p>
      </Label>
    </div>
  </div>
);

export default Checkbox;
