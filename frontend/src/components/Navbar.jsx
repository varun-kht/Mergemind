import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BrainCircuit, Github, CodeSquare } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed w-full z-50 top-0 pt-4 px-6 md:px-12 pointer-events-none">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto"
      >
        <div className="glass-panel pointer-events-auto rounded-full px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/50 transition-all duration-300">
              <BrainCircuit className="w-5 h-5 text-primary group-hover:text-primary-hover shadow-primary/50" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              MergeMind
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/team" 
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${location.pathname === '/team' ? 'text-blue-400' : 'text-foreground/80'}`}
            >
              Team Health
            </Link>
            <Link 
              to="/history" 
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${location.pathname === '/history' ? 'text-blue-400' : 'text-foreground/80'}`}
            >
              Review History
            </Link>
            <a href="https://github.com/mchan/MergeMind" target="_blank" rel="noreferrer" className="text-text-muted hover:text-white transition-colors duration-200">
              <Github className="w-5 h-5" />
            </a>
            <Link to="/dashboard">
              <button className="flex items-center gap-2 bg-text text-background hover:bg-white px-5 py-2 rounded-full font-medium transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95">
                <CodeSquare className="w-4 h-4" />
                Launch App
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </nav>
  );
}
