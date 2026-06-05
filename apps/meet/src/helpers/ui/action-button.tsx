import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface IActionButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  buttonType?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  children: React.ReactNode;
  custom?: string;
}

const ActionButton = ({
  onClick,
  isLoading = false,
  buttonType = 'submit',
  disabled = false,
  children,
  custom,
}: IActionButtonProps) => {
  return (
    <Button
      type={buttonType}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={custom}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );
};

export default ActionButton;
