import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Technical from './pages/Technical';
import Surroundings from './pages/Surroundings';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/galerij" element={<Gallery />} />
            <Route path="/technisch" element={<Technical />} />
            <Route path="/omgeving" element={<Surroundings />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-slate-200 py-12 shrink-0">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-950 rounded-lg flex items-center justify-center text-white font-bold italic font-serif">EU</div>
              <span className="font-black text-sm tracking-tight text-primary-950 uppercase">Duplex Geraardsbergen</span>
            </div>
            <div className="text-[11px] text-slate-400 text-center md:text-left">
              &copy; 2024 EU Duplex Geraardsbergen. Uw partner in transparante verkoop.
            </div>
            <div className="flex space-x-6 uppercase tracking-tighter text-[11px] text-slate-500 font-bold">
              <span className="cursor-pointer hover:text-primary-600 transition-colors">Privacybeleid</span>
              <span className="cursor-pointer hover:text-primary-600 transition-colors">Voorwaarden</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
