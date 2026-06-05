import React, { Fragment, useMemo } from 'react';
import {
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react';

import { ChevronDown, Check } from 'lucide-react';

export interface ISelectOption {
  value: string | number;
  text: string;
}

interface ISelectProps {
  label?: string;
  id: string;
  value: string | number | Array<string>;
  onChange: (value: any) => void;
  options: ISelectOption[];
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  multiple?: boolean;
}

const Dropdown = ({
  label,
  id,
  value,
  onChange,
  options,
  direction = 'vertical',
  disabled = false,
  multiple = false,
}: ISelectProps) => {
  const displayValue = useMemo(() => {
    if (multiple) {
      if (Array.isArray(value) && value.length > 0) {
        return value
          .map((v) => options.find((o) => o.value === v)?.text)
          .filter(Boolean)
          .map((text) => (
            <span
              key={text}
              className="inline-block bg-secondary text-secondary-foreground text-xs font-medium mr-2 mb-1 px-2.5 py-1 rounded-full"
            >
              {text}
            </span>
          ));
      }
      return null; // Placeholder can be handled in JSX
    }
    return options.find((o) => o.value === value)?.text;
  }, [multiple, value, options]);

  if (direction === 'horizontal') {
    return (
      <Field as="div" className="mb-2">
        <div className="flex flex-wrap items-center justify-between">
          {label && label !== '' && (
            <Label
              htmlFor={id}
              className="pb-2 sm:pb-0 sm:pr-4 flex-1 text-sm text-foreground ltr:text-left rtl:text-right"
            >
              {label}
            </Label>
          )}
          <Listbox
            value={value}
            onChange={onChange}
            disabled={disabled}
            multiple={multiple}
          >
            <div
              className={`relative w-full ${label ? 'max-w-full sm:max-w-[250px]' : ''}`}
            >
              <ListboxButton
                id={id}
                className={`min-h-10 full cursor-pointer rounded-lg border border-border bg-card shadow-sm w-full px-3 py-1 outline-hidden focus:ring-1 focus:ring-primary text-left text-sm text-foreground ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                <div className="flex flex-wrap">
                  {displayValue || (
                    <span className="text-muted-foreground">{/* Placeholder */}</span>
                  )}
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </span>
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions
                  static
                  className="absolute z-20 mt-1 max-h-60 w-72 ltr:right-0 rtl:left-0 overflow-auto rounded-xl bg-popover p-1 text-sm shadow-lg border border-border focus:outline-hidden scrollBar scrollBar2 grid gap-0.5"
                >
                  {options.map((option) => (
                    <ListboxOption
                      key={option.value.toString() + option.text}
                      value={option.value}
                      className={({ focus, selected }) =>
                        `relative select-none py-2 px-3 rounded-lg cursor-pointer text-foreground ${focus || selected
                          ? 'bg-muted'
                          : ''
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate`}>
                            {option.text}
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                              <Check className="w-4 h-4" />
                            </span>
                          )}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>
      </Field>
    );
  }

  // default vertical
  return (
    <Field as="div" className="mb-2">
      {label && label !== '' && (
        <Label
          htmlFor={id}
          className="w-full text-sm font-medium text-foreground ltr:text-left rtl:text-right mb-2 block"
        >
          {label}
        </Label>
      )}
      <Listbox
        value={value}
        onChange={onChange}
        disabled={disabled}
        multiple={multiple}
      >
        <div className="relative w-full">
          <ListboxButton
            id={id}
            className={`min-h-10 full cursor-pointer rounded-lg border border-border bg-card shadow-sm w-full px-3 py-1 outline-hidden focus:ring-1 focus:ring-primary text-left text-sm text-foreground ${disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            <div className="flex flex-wrap">
              {displayValue || (
                <span className="text-muted-foreground">{/* Placeholder */}</span>
              )}
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </span>
          </ListboxButton>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions
              static
              className="absolute z-20 mt-1 max-h-60 w-full ltr:right-0 rtl:left-0 overflow-auto rounded-xl bg-popover p-1 text-sm shadow-lg border border-border focus:outline-hidden scrollBar scrollBar2 grid gap-0.5"
            >
              {options.map((option) => (
                <ListboxOption
                  key={option.value.toString() + option.text}
                  value={option.value}
                  className={({ focus, selected }) =>
                    `relative select-none py-2 px-3 rounded-lg cursor-pointer text-foreground ${focus || selected
                      ? 'bg-muted'
                      : ''
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate`}>{option.text}</span>
                      {selected && (
                        <Check className="w-4 h-4" />
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </Field>
  );
};

export default Dropdown;
