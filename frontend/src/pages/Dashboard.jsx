import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitPullRequest, Loader2, GitBranch, CheckCircle2, AlertTriangle, Info, Copy, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function Dashboard() {
  // connection state
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('mergemind_token'));
  
  // GitHub Data state
  const [repos, setRepos] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingPulls, setIsLoadingPulls] = useState(false);

  // Form selections
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedPr, setSelectedPr] = useState('');
  
  // review state
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  
  // parsed review data
  const [reviews, setReviews] = useState([]);
  const [analyzedChunks, setAnalyzedChunks] = useState([]);
  
  const bottomRef = useRef(null);

  // 1. Handle OAuth token extraction from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
      const extractedToken = hash.replace('#token=', '');
      localStorage.setItem('mergemind_token', extractedToken);
      setToken(extractedToken);
      // Clean up the URL
      window.history.replaceState(null, '', '/dashboard');
    }
  }, []);

  // 2. Fetch Repositories when logged in
  useEffect(() => {
    if (!token) return;

    const fetchRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const res = await axios.get('http://localhost:3000/api/repos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRepos(res.data);
      } catch (err) {
        console.error('Failed to load repos:', err);
        // If unauthorized, clear the dead token
        if (err.response?.status === 401) {
          localStorage.removeItem('mergemind_token');
          setToken(null);
        }
      } finally {
        setIsLoadingRepos(false);
      }
    };
    
    fetchRepos();
  }, [token]);

  // 3. Fetch Pull Requests when a repository is selected
  useEffect(() => {
    if (!token || !selectedRepo) {
       setPulls([]);
       return;
    }

    const fetchPulls = async () => {
      setIsLoadingPulls(true);
      try {
        const repoObj = repos.find(r => r.full_name === selectedRepo);
        if (!repoObj) return;

        const res = await axios.get(`http://localhost:3000/api/repos/${repoObj.owner.login}/${repoObj.name}/pulls`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPulls(res.data);
         // Auto-select the first PR if available
        if (res.data.length > 0) setSelectedPr(res.data[0].number.toString());
        else setSelectedPr(''); // Reset if no PRs
      } catch (err) {
        console.error('Failed to load PRs:', err);
      } finally {
        setIsLoadingPulls(false);
      }
    };

    fetchPulls();
  }, [selectedRepo, token, repos]);

  // 4. WebSocket connection logic
  useEffect(() => {
    // connect to backend express server
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('review-update', (data) => {
      // Automatically update the UI inputs to match whatever PR is streaming in
      if (data.repo && data.repo !== selectedRepo) setSelectedRepo(data.repo);
      if (data.prNumber && String(data.prNumber) !== String(selectedPr)) setSelectedPr(data.prNumber);
      
      if (data.status) setMessage(data.status);
      if (data.progress !== undefined) setProgress(data.progress);
      
      if (data.log) {
        setLogs(prev => [...prev, data.log]);
      }

      if (data.newReviews && data.newReviews.length > 0) {
        setReviews(prev => [...prev, ...data.newReviews]);
      }
      
      if (data.chunkDiff) {
         setAnalyzedChunks(prev => [...prev, data.chunkDiff]);
      }
      
      if (data.progress === 100 && (!data.status || !data.status.includes('Error'))) {
        setStatus('success');
      } else if (data.status && data.status.includes('Error')) {
        setStatus('error');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedRepo, selectedPr]);

  // auto scroll logs
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, analyzedChunks]);

  const handleReviewTrigger = async (e) => {
    e.preventDefault();
    if (!selectedRepo || !selectedPr) return;

    setStatus('loading');
    setProgress(0);
    setLogs([]);
    setReviews([]);
    setAnalyzedChunks([]);
    setMessage('Triggering webhook on backend...');

    try {
      // Even manual tiggers now go through the secure API route
      await axios.post('http://localhost:3000/api/trigger-review', {
        repository: { full_name: selectedRepo },
        pull_request: { number: Number(selectedPr) },
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      // the websocket events will take over progress updates
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to trigger review. Is the backend running?');
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText('https://mirna-uncrated-autodidactically.ngrok-free.dev/webhook');
    alert('Webhook URL copied to clipboard');
  };

  const severityColors = {
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    suggestion: 'text-green-500 bg-green-500/10 border-green-500/20',
  };

  return (
    <div className="relative pt-32 pb-20 px-6 max-w-6xl mx-auto min-h-screen flex flex-col items-center">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Real-time Review Console</h1>
        <p className="text-text-muted text-lg flex items-center justify-center gap-2">
          Test PRs and watch MergeMind analyze them chunk-by-chunk. 
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${socketConnected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
            {socketConnected ? 'Connected to Backend' : 'Disconnected'}
          </span>
        </p>
      </motion.div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Trigger form (Left Column) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col h-fit lg:col-span-1"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">Test Real PR</h2>
          </div>
          
          <form onSubmit={handleReviewTrigger} className="flex flex-col gap-4">
            
            {!token ? (
               <div className="flex flex-col items-center justify-center p-6 bg-surface/50 rounded-2xl border border-white/5 text-center">
                 <GitBranch className="w-10 h-10 text-text-muted mb-3 opacity-50" />
                 <h3 className="font-semibold mb-2">Authentication Required</h3>
                 <p className="text-sm text-text-muted mb-4">Connect your GitHub account to access your repositories and trigger reviews.</p>
                 <a 
                   href="http://localhost:3000/auth/github/login"
                   className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all shadow-lg"
                 >
                    Sign in with GitHub
                 </a>
               </div>
            ) : (
              <>
                {/* Repository Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Repository</label>
                  <div className="relative">
                    <GitBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" />
                    <select 
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      disabled={isLoadingRepos}
                      className="w-full bg-surface border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Select a repository...</option>
                      {repos.map(r => (
                        <option key={r.id} value={r.full_name}>{r.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50 pointer-events-none" />
                    {isLoadingRepos && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
                
                {/* Pull Request Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Pull Request</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/50 font-mono">#</span>
                    <select 
                      value={selectedPr}
                      onChange={(e) => setSelectedPr(e.target.value)}
                      disabled={!selectedRepo || isLoadingPulls || pulls.length === 0}
                      className="w-full bg-surface border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {pulls.length === 0 ? (
                        <option value="">No open PRs found</option>
                      ) : (
                        pulls.map(pr => (
                          <option key={pr.id} value={pr.number}>PR #{pr.number}: {pr.title.slice(0, 30)}{pr.title.length > 30 ? '...' : ''}</option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50 pointer-events-none" />
                    {isLoadingPulls && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
              </>
            )}
            
            <button 
              type="submit"
              disabled={status === 'loading' || !token || !selectedRepo || !selectedPr}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-text text-background hover:bg-white disabled:bg-text/50 py-3 rounded-xl font-medium transition-all duration-200 shadow-xl shadow-white/5 disabled:shadow-none"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Reviewing...
                </>
              ) : (
                'Trigger Analysis'
              )}
            </button>
          </form>

          {/* Webhook Info Block */}
          <div className="mt-6 pt-5 border-t border-white/5">
             <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
              <Info className="w-4 h-4" />
              <span>Your Endpoint:</span>
            </div>
            <div className="flex items-center justify-between bg-surface border border-white/10 p-2.5 rounded-lg font-mono text-xs overflow-hidden group">
               <span className="truncate text-primary-hover mr-2">https://mirna-uncrated-autodidactically.ngrok-free.dev/webhook</span>
               <button onClick={copyWebhookUrl} className="shrink-0 p-1.5 hover:bg-white/5 rounded text-text-muted hover:text-white transition-colors">
                 <Copy className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
        </motion.div>

        {/* Live Feed (Right Column) */}
        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
           className="glass-panel rounded-3xl p-6 flex flex-col lg:col-span-2 overflow-hidden h-[500px]"
        >
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <Terminal className="w-5 h-5 text-indigo-400" />
               <h2 className="text-xl font-semibold">Live Analysis Stream</h2>
             </div>
             {status !== 'idle' && (
                <div className="text-sm font-medium text-text-muted flex items-center gap-2">
                   {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                   {message}
                </div>
             )}
          </div>

          <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden mb-6 border border-white/5">
            <motion.div 
               className="h-full bg-gradient-to-r from-primary to-indigo-400"
               animate={{ width: `${progress}%` }}
               transition={{ duration: 0.5 }}
            />
          </div>

          {/* Log Window */}
          <div className="flex-1 bg-surface border border-white/10 rounded-2xl p-4 overflow-y-auto font-mono text-sm space-y-4">
            {status === 'idle' && (
               <div className="h-full flex items-center justify-center text-text-muted/50 italic">
                  Waiting for webhook trigger...
               </div>
            )}
            
            <AnimatePresence>
               {analyzedChunks.map((chunk, idx) => (
                 <motion.div 
                   key={`chunk-${idx}`}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-2"
                 >
                   <div className="text-indigo-400">[{new Date().toLocaleTimeString()}] Extracted Chunk {idx + 1}...</div>
                   <pre className="bg-background/80 p-3 rounded-xl overflow-x-auto text-xs border border-white/5 text-gray-300">
                     {chunk.split('\n').slice(0, 10).join('\n')}
                     {chunk.split('\n').length > 10 && '\n... (truncated)'}
                   </pre>
                 </motion.div>
               ))}
               
               {reviews.map((rev, idx) => (
                  <motion.div 
                    key={`rev-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-3 rounded-xl border ${severityColors[rev.severity] || 'border-white/10 bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="capitalize">{rev.severity}</span>: {rev.title}
                      </span>
                      <span className="text-xs opacity-70">Line {rev.line || 'N/A'}</span>
                    </div>
                    <p className="opacity-90 mt-1 mb-2 leading-relaxed">{rev.description}</p>
                    {rev.suggestion && (
                       <div className="mt-2 bg-background/50 rounded-lg p-2 text-xs opacity-90 border border-current/10">
                          <span className="font-semibold block mb-1">Suggestion:</span>
                          {rev.suggestion}
                       </div>
                    )}
                  </motion.div>
               ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
