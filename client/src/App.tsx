import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Concierge from "./components/Concierge";
import { CartProvider } from "./lib/cart";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Reserve from "./pages/Reserve";
import TrackOrder from "./pages/TrackOrder";

export default function App() {
  const { pathname } = useLocation();
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/order/:code" element={<TrackOrder />} />
        <Route path="/reserve" element={<Reserve />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-cream/40">
        Ember & Saffron is a fictional restaurant built as a portfolio project by Hanzala Saqib · photos from Unsplash
      </footer>
      {!pathname.startsWith("/admin") && <Concierge />}
    </CartProvider>
  );
}
