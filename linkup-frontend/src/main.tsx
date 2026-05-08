import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pushNotifications";
import { initSentry } from "./lib/sentry";

initSentry();
// Register service worker for push notifications (non-blocking)
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
  