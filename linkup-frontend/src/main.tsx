import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pushNotifications";
import { initSentry } from "./lib/sentry";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

initSentry();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

// Hide the native splash screen as soon as JS boots and React's first frame paints.
// launchAutoHide:true/launchShowDuration:3000 is the absolute fallback if this never runs.
if (Capacitor.isNativePlatform()) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    });
  });
}
