import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode2, History, AlertCircle, ChevronRight, Search, Filter } from 'lucide-react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Using same fadeUp as TeamHealth
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function ReviewHistory() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [selectedReviewDetails, setSelectedReviewDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/api/reviews');
      setReviews(res.data);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewDetails = async (id) => {
    setSelectedReviewId(id);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/reviews/${id}`);
      setSelectedReviewDetails(res.data);
    } catch (err) {
      console.error("Failed to load review details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const severityColors = {
    critical: "text-red-400 border-red-500/30 bg-red-500/10",
    high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    low: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    suggestion: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
  };

  if (loading) {
     return (
        <div className="flex h-screen items-center justify-center p-8 mt-16">
           <div className="animate-pulse flex flex-col items-center">
             <History className="w-8 h-8 opacity-50 mb-4" />
             <p>Loading History...</p>
           </div>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto px-4 py-8 mt-16 pb-24 relative z-10">
      
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ color: '#fff' }}>
          Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">History</span>
        </h1>
        <p className="text-lg opacity-70 max-w-2xl" style={{ color: '#fff' }}>
          Browse past pull request analyses, inspect AI-generated diffs, and review historically suggested fixes.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
         {/* Left col: List of reviews */}
         <motion.div 
            initial="hidden" animate="visible" variants={fadeUp}
            className="w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto pr-2"
         >
            {reviews.length === 0 ? (
               <div className="p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center opacity-70" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <History className="w-12 h-12 mb-4 opacity-50" />
                  <p>No reviews yet.</p>
                  <p className="text-sm mt-2">Trigger a webhook to see reviews here.</p>
               </div>
            ) : (
               reviews.map((rev) => (
                  <button
                     key={rev.id}
                     onClick={() => loadReviewDetails(rev.id)}
                     className={`p-4 rounded-xl border text-left transition-all ${selectedReviewId === rev.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
                     style={{ background: selectedReviewId !== rev.id ? 'rgba(255,255,255,0.05)' : undefined }}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-white/90 truncate tracking-tight">{rev.repo}</span>
                        <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${selectedReviewId === rev.id ? 'translate-x-1 text-blue-400' : ''}`} />
                     </div>
                     <div className="flex items-center gap-3 text-sm opacity-70">
                        <span className="flex items-center gap-1">
                           <FileCode2 className="w-3.5 h-3.5" />
                           PR #{rev.prNumber}
                        </span>
                        <span className="flex items-center gap-1">
                           <AlertCircle className="w-3.5 h-3.5" />
                           {rev.issueCount} issues
                        </span>
                     </div>
                     <div className="text-xs opacity-50 mt-3">
                        {new Date(rev.reviewedAt).toLocaleString()}
                     </div>
                  </button>
               ))
            )}
         </motion.div>

         {/* Right col: Details */}
         <motion.div 
            initial="hidden" animate="visible" variants={fadeUp}
            className="w-full lg:w-2/3 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.02)' }}
         >
            {loadingDetails ? (
               <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
               </div>
            ) : !selectedReviewDetails ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                  <Search className="w-12 h-12 mb-4 opacity-30" />
                  <p>Select a review to view details</p>
               </div>
            ) : (
               <div className="flex-1 overflow-y-auto flex flex-col h-full">
                  <div className="p-6 border-b border-white/10 sticky top-0 backdrop-blur-md z-10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                     <h2 className="text-xl font-bold mb-1">{selectedReviewDetails.repo}</h2>
                     <p className="opacity-70 text-sm flex items-center gap-2">
                        PR #{selectedReviewDetails.prNumber} • {new Date(selectedReviewDetails.reviewedAt).toLocaleString()}
                     </p>
                  </div>
                  
                  <div className="p-6 flex-1">
                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                        Identified Issues ({selectedReviewDetails.issues?.length || 0})
                     </h3>
                     
                     <div className="flex flex-col gap-4 mb-8">
                        {selectedReviewDetails.issues?.length === 0 ? (
                           <div className="p-4 rounded-xl border border-white/10 opacity-70 text-sm text-center">
                              No issues identified in this review.
                           </div>
                        ) : (
                           selectedReviewDetails.issues?.map((issue, idx) => (
                              <div key={idx} className={`p-4 rounded-xl border ${severityColors[issue.severity] || 'border-white/10 bg-white/5'}`}>
                                 <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold flex items-center gap-2">
                                       <span className="capitalize">{issue.severity}</span>: {issue.title}
                                    </span>
                                    <span className="text-xs opacity-70 font-mono">Line {issue.line || 'N/A'}</span>
                                 </div>
                                 <p className="opacity-90 text-sm mb-3 leading-relaxed">{issue.description}</p>
                                 
                                 {issue.suggestion && (
                                    <div className="mt-2 bg-black/20 rounded-lg p-3 text-sm opacity-90 border border-current/10">
                                       <span className="font-semibold block mb-1">💡 Suggestion:</span>
                                       {issue.suggestion}
                                    </div>
                                 )}

                                 {issue.fix && (
                                    <div className="mt-3 bg-black/40 rounded-lg overflow-hidden border border-current/20">
                                       <div className="px-3 py-1.5 bg-black/20 border-b border-current/10 text-xs font-semibold opacity-90">
                                          ✅ Fix Code
                                       </div>
                                       <pre className="p-3 text-xs overflow-x-auto opacity-90 leading-relaxed whitespace-pre-wrap font-mono">
                                          {issue.fix}
                                       </pre>
                                    </div>
                                 )}
                              </div>
                           ))
                        )}
                     </div>

                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-t border-white/10 pt-8 mt-8">
                        <FileCode2 className="w-5 h-5 text-emerald-400" />
                        Analyzed Diff Context
                     </h3>
                     <div className="rounded-xl border border-white/10 overflow-hidden bg-black/30">
                        <pre className="p-4 text-xs overflow-x-auto font-mono text-emerald-300/80 whitespace-pre-wrap leading-relaxed">
                           {selectedReviewDetails.diffText || "Diff context unavailable"}
                        </pre>
                     </div>
                  </div>
               </div>
            )}
         </motion.div>
      </div>
    </div>
  );
}
