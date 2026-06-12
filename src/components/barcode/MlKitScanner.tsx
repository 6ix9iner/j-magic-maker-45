import { registerPlugin } from '@capacitor/core';

export interface MlKitScannerPlugin {
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
}

const MlKitScanner = registerPlugin<MlKitScannerPlugin>('MlKitScanner');

export default MlKitScanner;
