import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

// Make sure we're properly initializing React
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = createRoot(rootElement);
root.render(<App />);

// Set status bar to black and do not overlay
StatusBar.setBackgroundColor({ color: '#000000' });
StatusBar.setStyle({ style: Style.Dark });
StatusBar.setOverlaysWebView({ overlay: false });

// Set navigation bar color to black (Android only)
NavigationBar.setNavigationBarColor({ color: '#000000', darkButtons: false });
