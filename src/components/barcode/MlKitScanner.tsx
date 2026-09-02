import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface MlKitScannerPlugin {
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  addListener(
    eventName: 'mlkitBarcodeDetected',
    listenerFunc: (data: { code: string; symbology?: string }) => void
  ): Promise<PluginListenerHandle>;
}

const MlKitScanner = registerPlugin<MlKitScannerPlugin>('MlKitScanner');

export default MlKitScanner;
