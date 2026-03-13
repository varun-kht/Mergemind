import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import TeamHealth from './pages/TeamHealth';
import Navbar from './components/Navbar';

import ReviewHistory from './pages/ReviewHistory';

function App() {
  return (
    <>
      <div className="min-h-screen flex flex-col items-stretch overflow-hidden">
        <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background relative z-10 w-full flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<TeamHealth />} />
            <Route path="/history" element={<ReviewHistory />} />
          </Routes>
        </div>
        
        {/* Background elements */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[130px] opacity-60 mix-blend-screen" />
          <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] opacity-50 mix-blend-screen" />
          <div className="absolute -bottom-[30%] left-[20%] w-[80%] h-[60%] rounded-full bg-purple-500/10 blur-[150px] opacity-40 mix-blend-screen" />
          
          {/* subtle grid texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
          />
        </div>
      </div>
    </>
  );
}

export default App;
