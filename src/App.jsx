import { BrowserRouter } from "react-router-dom";
import RedirectMobile from "./components/RedirectMobile";
import AnimatedRoutes from "./AnimatedRoutes";
import AnalyticsTracker from "./components/AnalyticsTracker";

function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <RedirectMobile />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;