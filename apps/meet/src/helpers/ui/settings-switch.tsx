import React from 'react';
import { Field, Label, Switch } from '@headlessui/react';
import clsx from 'clsx';

interface ISettingsSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  customCss?: string;
}

const SettingsSwitch = ({
  label,
  enabled,
  onChange,
  disabled,
  customCss,
}: ISettingsSwitchProps) => {
  return (
    <Field
      as="div"
      className={clsx('flex items-center justify-between', customCss)}
    >
      <Label
        className={`pr-4 w-full text-sm text-foreground ltr:text-left rtl:text-right ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {label}
      </Label>
      <Switch
        disabled={disabled}
        checked={enabled}
        onChange={onChange}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:ring-1 focus:ring-primary cursor-pointer ${enabled ? 'bg-primary' : 'bg-muted'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`${enabled
              ? 'ltr:translate-x-6 rtl:-translate-x-6'
              : 'ltr:translate-x-1 rtl:-translate-x-1'
            } ${disabled ? 'cursor-not-allowed' : ''} inline-block w-4 h-4 transform bg-background rounded-full transition-transform`}
        />
      </Switch>
    </Field>
  );
};

export default SettingsSwitch;
