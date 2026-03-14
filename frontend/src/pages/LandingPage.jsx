import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, Code2, TestTube, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: <Code2 className="w-6 h-6 text-primary" />,
    title: "Logic & Bugs",
    description: "Detect off-by-one errors, null dereferences, and async pitfalls before they hit production.",
    color: "from-primary/20"
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-success" />,
    title: "Security Stance",
    description: "Catch OWASP Top 10 vulnerabilities, leaked secrets, and broken auth mechanisms instantly.",
    color: "from-success/20"
  },
  {
    icon: <Zap className="w-6 h-6 text-warning" />,
    title: "Performance",
    description: "Identify N+1 queries, memory leaks, blocking I/O, and unnecessary render cycles.",
    color: "from-warning/20"
  },
  {
    icon: <TestTube className="w-6 h-6 text-indigo-400" />,
    title: "Test Coverage",
    description: "Spot missing edge cases and untested error paths that codecov might miss.",
    color: "from-indigo-400/20"
  }
];

export default function LandingPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center mt-12 mb-24"
      >
        <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-hover mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">MergeMind v1.0 is live</span>
        </motion.div>
        
        <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-balance bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          The <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Elite AI Reviewer</span> for World-Class Engineering.
        </motion.h1>
        
        <motion.p variants={item} className="text-xl md:text-2xl text-text-muted max-w-2xl mb-10 text-balance leading-relaxed">
          Trained on millions of top-tier pull requests. Catch what humans miss. Merge with absolute confidence.
        </motion.p>
        
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/dashboard">
            <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95">
              Start Reviewing
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <a href="#features" className="px-8 py-4 rounded-full font-medium text-text hover:bg-white/5 transition-colors duration-200">
            See How It Works
          </a>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        id="features"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {features.map((feat, i) => (
           <motion.div 
            key={i} 
            variants={item}
            className="group relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent hover:from-white/20 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" />
            <div className="relative h-full bg-surface/50 backdrop-blur-xl rounded-[23px] p-8 flex flex-col gap-4 border-t border-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  {feat.icon}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{feat.title}</h3>
                <p className="text-text-muted leading-relaxed">{feat.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
