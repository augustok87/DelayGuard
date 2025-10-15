// Toast component for displaying temporary messages
import React from 'react';
import { Button } from '../../ui';
import { TOAST_STYLES, TOAST_BUTTON_STYLES } from '../constants';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  return (
    <div style={TOAST_STYLES}>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={TOAST_BUTTON_STYLES}
        aria-label="Close toast"
      >
        ×
      </button>
    </div>
  );
};
