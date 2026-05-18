import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Galerij', path: '/galerij' },
    { name: 'Gegevens', path: '/technisch' },
    { name: 'Omgeving', path: '/omgeving' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-8 h-12 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <motion.div 
            whileHover={{ rotate: 10 }}
            className="w-10 h-10 bg-primary-950 rounded-xl flex items-center justify-center text-white font-extrabold italic font-serif text-xl shadow-lg border border-white/10"
          >
            EU
          </motion.div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-xl tracking-tighter text-primary-950 uppercase leading-none">
              APPARTEMENT <span className="italic font-medium lowercase">met</span> GARAGE
            </span>
            <span className="text-[9px] uppercase tracking-[0.4em] text-primary-600 font-bold mt-1">Geraardsbergen</span>
          </div>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-primary-600 pb-1",
                location.pathname === item.path && "text-primary-600 border-b-2 border-primary-600"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <Link 
          to="/contact" 
          className="hidden md:block bg-primary-600 text-white px-5 py-2 rounded font-bold text-xs hover:bg-primary-700 transition-colors uppercase tracking-widest"
        >
          Plan Bezichtiging
        </Link>

        <div className="md:hidden">
          <button className="p-2">
            <div className="w-6 h-0.5 bg-slate-800 mb-1"></div>
            <div className="w-6 h-0.5 bg-slate-800"></div>
          </button>
        </div>
      </div>
    </nav>
  );
}
