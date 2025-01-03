declare module 'react-input-mask' {
  import { ComponentType, InputHTMLAttributes } from 'react';

  export interface Props extends InputHTMLAttributes<HTMLInputElement> {
    mask: string;
    maskChar?: string | null;
    formatChars?: { [key: string]: string };
    alwaysShowMask?: boolean;
    inputRef?: (el: HTMLInputElement | null) => void;
  }

  const InputMask: ComponentType<Props>;
  export default InputMask;
}
