declare module 'react-qrcode-logo' {
  import { Component } from 'react';

  export interface QRCodeProps {
    value: string;
    size?: number;
    logoImage?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoOpacity?: number;
    qrStyle?: 'squares' | 'dots';
    eyeRadius?: number;
    [key: string]: any;
  }

  export class QRCode extends Component<QRCodeProps> {}
}
