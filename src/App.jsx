import { BrowserRouter } from "react-router-dom";
import RedirectMobile from "./components/RedirectMobile";
import AnimatedRoutes from "./AnimatedRoutes";

function App() {
  return (
    <BrowserRouter>
      <RedirectMobile />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;