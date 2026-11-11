import { createRoot } from "react-dom/client";
// One hand-drawn face for every word on the site, matching the campaign art.
import "@fontsource/short-stack/400.css";
import "./style.css";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
