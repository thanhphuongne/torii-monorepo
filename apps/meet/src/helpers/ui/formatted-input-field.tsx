import React from 'react';
import clsx from 'clsx';
import { Field, Label } from '@headlessui/react';

interface IFormattedInputFieldProps {
  label?: string;
  id: string;
  value?: string | number;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

const FormattedInputField = ({
  label,
  id,
  value,
  readOnly = false,
  placeholder,
  onChange,
  type = 'text',
}: IFormattedInputFieldProps) => {
  const inputClasses = clsx(
    'flex-1 h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-1 focus:ring-primary outline-hidden transition-all',
    {
      'bg-muted cursor-default':
        readOnly,
    },
    label ? 'max-w-full sm:max-w-[250px]' : '',
  );

  return (
    <Field
      as="div"
      className="flex flex-wrap items-center justify-between mb-2"
    >
      {label ? (
        <Label
          htmlFor={id}
          className="pb-2 sm:pb-0 sm:pr-4 flex-1 text-sm text-foreground ltr:text-left rtl:text-right"
        >
          {label}
        </Label>
      ) : null}
      <input
        type={type}
        name={id}
        id={id}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={onChange}
        className={inputClasses}
        placeholder={placeholder}
      />
    </Field>
  );
};

export default FormattedInputField;
