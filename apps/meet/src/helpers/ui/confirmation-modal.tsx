import React from 'react';
import Modal from '@/helpers/ui/modal';
import { Button } from '@workspace/ui/components/button';

interface IConfirmationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
}

const ConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  title,
  text,
}: IConfirmationModalProps) => {
  const renderButtons = () => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="destructive" onClick={onConfirm}>
        Đồng ý
      </Button>
      <Button onClick={onClose}>
        Đóng
      </Button>
    </div>
  );

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={title}
      renderButtons={renderButtons}
    >
      <p className="text-sm text-foreground">{text}</p>
    </Modal>
  );
};

export default ConfirmationModal;
