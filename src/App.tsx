/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Settings, 
  Play, 
  History, 
  Users, 
  LayoutDashboard,
  Plus,
  Share2,
  Trash2,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  BarChart
} from 'lucide-react';
import { Match, Team, Player, MatchSettings, ExtraType, WicketType } from './types/match';
import { cn, formatOvers, calculateRunRate } from './lib/utils';
import { useScoring } from './hooks/useScoring';
import { Toaster, toast } from 'react-hot-toast';
import { useFirebase } from './context/FirebaseContext';
import { signInWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';

// Initial state for testing
const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  totalOvers: 20,
  venue: 'Lord\'s Cricket Ground',
  date: new Date().toISOString().split('T')[0],
  matchType: 'T20',
};

const EMPTY_TEAM = (name: string): Team => ({
  id: crypto.randomUUID(),
  name,
  players: Array.from({ length: 11 }).map((_, i) => ({
    id: crypto.randomUUID(),
    name: `Player ${i + 1}`,
  })),
});

export default function App() {
  const [view, setView] = useState<'dashboard' | 'setup' | 'live' | 'summary'>('dashboard');
  const [match, setMatch] = useState<Match | null>(null);
  const { user, loading: authLoading } = useFirebase();
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Load user matches
  useEffect(() => {
    if (!user) {
      setMyMatches([]);
      return;
    }

    setLoadingMatches(true);
    const q = query(
      collection(db, 'matches'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map(doc => doc.data() as Match);
      setMyMatches(matches);
      setLoadingMatches(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
      setLoadingMatches(false);
    });

    return unsubscribe;
  }, [user]);

  // Dashboard Actions
  const handleNewMatch = () => {
    if (!user) {
      toast.error('Please sign in to create a match');
      return;
    }
    setView('setup');
  };
  
  const startMatch = async (setupMatch: Match) => {
    if (!user) {
      toast.error('Please sign in to start a match');
      return;
    }

    const matchWithMetadata: Match = {
      ...setupMatch,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'matches', matchWithMetadata.id), matchWithMetadata);
      setMatch(matchWithMetadata);
      setView('live');
      toast.success('Match started and synced!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `matches/${matchWithMetadata.id}`);
    }
  };

  const loadMatch = (selectedMatch: Match) => {
    setMatch(selectedMatch);
    setView(selectedMatch.status === 'completed' ? 'summary' : 'live');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 pb-20">
      <Toaster position="top-right" />
      
      <header className="sticky top-0 z-50 bg-emerald-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
              <Trophy size={20} className="text-emerald-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight">ScorePro</h1>
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest mt-1">Live Cricket Scorer</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setView('dashboard')}
              className={cn("text-xs font-bold uppercase tracking-widest transition-colors", view === 'dashboard' ? "text-white" : "text-emerald-300/60 hover:text-white")}
            >
              Dashboard
            </button>
            <button className="text-xs font-bold uppercase tracking-widest text-emerald-300/60 hover:text-white">Stats</button>
            <button className="text-xs font-bold uppercase tracking-widest text-emerald-300/60 hover:text-white">Teams</button>
            <button className="text-xs font-bold uppercase tracking-widest text-emerald-300/60 hover:text-white">Settings</button>
          </nav>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-white">{user.displayName}</p>
                  <button onClick={() => logout()} className="text-[10px] text-emerald-300 hover:text-red-400 font-bold uppercase tracking-wider">Logout</button>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <button 
                onClick={() => signInWithGoogle()}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard 
                  title="Initialize" 
                  description="Start a scoring session" 
                  icon={<Plus className="text-white" />} 
                  color="bg-emerald-600"
                  onClick={handleNewMatch}
                />
                <DashboardCard 
                  title="Archive" 
                  description="Review previous stats" 
                  icon={<History className="text-slate-900" />} 
                  color="bg-slate-50"
                  darkText
                  onClick={() => {}}
                />
                <DashboardCard 
                  title="Analytics" 
                  description="Player performance" 
                  icon={<BarChart size={24} className="text-emerald-600" />} 
                  color="bg-white"
                  darkText
                  onClick={() => {}}
                />
                <DashboardCard 
                  title="Rosters" 
                  description="Manage team lists" 
                  icon={<Users size={24} className="text-blue-600" />} 
                  color="bg-white"
                  darkText
                  onClick={() => {}}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Match Archive</h2>
                  <button className="text-xs text-emerald-600 font-bold uppercase tracking-wider hover:underline">View All</button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {myMatches.length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Match Details</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Venue</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {myMatches.map((m) => (
                          <tr 
                            key={m.id} 
                            onClick={() => loadMatch(m)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {m.teamA.logo ? <img src={m.teamA.logo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-600">{m.teamA.name[0]}</span>}
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {m.teamB.logo ? <img src={m.teamB.logo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-slate-600">{m.teamB.name[0]}</span>}
                                  </div>
                                </div>
                                <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{m.teamA.name} vs {m.teamB.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-500 font-medium">{m.settings.venue}</td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                                m.status === 'live' ? "bg-emerald-100 text-emerald-700" :
                                m.status === 'completed' ? "bg-slate-900 text-white" :
                                "bg-slate-100 text-slate-400"
                              )}>
                                {m.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-xs text-slate-400 font-mono">{new Date(m.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <LayoutDashboard className="text-slate-200" size={32} />
                      </div>
                      <div className="max-w-xs">
                        <p className="font-bold text-slate-900 text-lg">{user ? "No matches recorded" : "Sign in to sync data"}</p>
                        <p className="text-sm text-slate-500 mt-1">{user ? "Start matches to build your career history." : "Store your match data securely in the cloud."}</p>
                      </div>
                      <button 
                        onClick={handleNewMatch}
                        className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                      >
                        {user ? "Begin First Match" : "Connect with Google"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'setup' && user && (
            <MatchSetup user={user} onCancel={() => setView('dashboard')} onStart={startMatch} />
          )}

          {view === 'live' && match && (
            <LiveScoring 
              match={match} 
              onComplete={(completedMatch) => {
                setMatch(completedMatch);
                setView('summary');
              }}
              onNavigate={(v) => setView(v as 'dashboard' | 'setup' | 'live' | 'summary')}
            />
          )}

          {view === 'summary' && match && (
            <MatchSummary match={match} onBack={() => {
              setMatch(null);
              setView('dashboard');
            }} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DashboardCard({ title, description, icon, color, darkText, onClick }: { title: string, description: string, icon: React.ReactNode, color: string, darkText?: boolean, onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-8 rounded-[2.5rem] text-left transition-all relative overflow-hidden group shadow-lg",
        color
      )}
    >
      <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
        {icon}
      </div>
      <div className="relative z-10 space-y-4">
        <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:bg-white/20 transition-all">
          {icon}
        </div>
        <div>
          <h3 className={cn("text-2xl font-black tracking-tighter mb-1 uppercase italic", darkText ? "text-slate-900" : "text-white")}>{title}</h3>
          <p className={cn("text-sm font-medium leading-snug max-w-[200px]", darkText ? "text-slate-500" : "text-white/80")}>{description}</p>
        </div>
      </div>
    </motion.button>
  );
}

function MatchSetup({ user, onCancel, onStart }: { user: any, onCancel: () => void, onStart: (match: Match) => void }) {
  const [step, setStep] = useState(1);
  const [teamA, setTeamA] = useState<Team>(EMPTY_TEAM('Team A'));
  const [teamB, setTeamB] = useState<Team>(EMPTY_TEAM('Team B'));
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_MATCH_SETTINGS);

  const handleStart = () => {
    const newMatch: Match = {
      id: crypto.randomUUID(),
      ownerId: user.uid,
      teamA,
      teamB,
      settings,
      innings: [
        { battingTeamId: teamA.id, bowlingTeamId: teamB.id, score: 0, wickets: 0, balls: [], isCompleted: false },
        { battingTeamId: teamB.id, bowlingTeamId: teamA.id, score: 0, wickets: 0, balls: [], isCompleted: false },
      ],
      currentInningsIndex: 0,
      status: 'live',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onStart(newMatch);
  };

  return (
    <motion.div
       initial={{ opacity: 0, x: 20 }}
       animate={{ opacity: 1, x: 0 }}
       exit={{ opacity: 0, x: -20 }}
       className="max-w-3xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Initialize</h2>
          <p className="text-slate-500 font-medium">Configure your match parameters</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn("w-12 h-1.5 rounded-full transition-all", step >= s ? "bg-emerald-600" : "bg-slate-200")} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Home Team</label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-emerald-200 focus-within:bg-white transition-all shadow-inner">
                  <div className="relative group">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 overflow-hidden shadow-sm">
                      {teamA.logo ? <img src={teamA.logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs uppercase">Logo</span>}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Plus size={16} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setTeamA({ ...teamA, logo: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={teamA.name} 
                    onChange={e => setTeamA({ ...teamA, name: e.target.value })}
                    className="bg-transparent border-none focus:ring-0 font-bold text-slate-900 w-full placeholder:text-slate-300"
                    placeholder="Team Name"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Away Team</label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-emerald-200 focus-within:bg-white transition-all shadow-inner">
                  <div className="relative group">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 overflow-hidden shadow-sm">
                      {teamB.logo ? <img src={teamB.logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs uppercase">Logo</span>}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Plus size={16} />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setTeamB({ ...teamB, logo: reader.result as string });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={teamB.name} 
                    onChange={e => setTeamB({ ...teamB, name: e.target.value })}
                    className="bg-transparent border-none focus:ring-0 font-bold text-slate-900 w-full placeholder:text-slate-300"
                    placeholder="Opponent Name"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <MapPin size={14} className="text-emerald-600" /> Venue Location
                 </label>
                 <input 
                   type="text" 
                   value={settings.venue}
                   onChange={e => setSettings({...settings, venue: e.target.value})}
                   className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-200 font-medium"
                   placeholder="Stadium Name"
                 />
               </div>
               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Calendar size={14} className="text-emerald-600" /> Match Date
                 </label>
                 <input 
                   type="date" 
                   value={settings.date}
                   onChange={e => setSettings({...settings, date: e.target.value})}
                   className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-200 font-medium"
                 />
               </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users className="text-emerald-600" size={16} /> Roster Management</h3>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter italic">Roles: (C) Captain • (WK) Keeper</div>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-3">
                <p className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-4">{teamA.name}</p>
                {teamA.players.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 group">
                    <input 
                      className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:ring-1 focus:ring-emerald-200 font-medium" 
                      value={p.name}
                      placeholder={`Player ${idx + 1}`}
                      onChange={e => {
                        const newPlayers = [...teamA.players];
                        newPlayers[idx].name = e.target.value;
                        setTeamA({ ...teamA, players: newPlayers });
                      }}
                    />
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          const newPlayers = teamA.players.map((player, i) => ({ ...player, isCaptain: i === idx ? !player.isCaptain : false }));
                          setTeamA({ ...teamA, players: newPlayers });
                        }}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all", p.isCaptain ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-300 border-slate-100 hover:border-emerald-400 hover:text-emerald-400")}
                      >
                        C
                      </button>
                      <button 
                        onClick={() => {
                          const newPlayers = teamA.players.map((player, i) => ({ ...player, isWicketKeeper: i === idx ? !player.isWicketKeeper : false }));
                          setTeamA({ ...teamA, players: newPlayers });
                        }}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all", p.isWicketKeeper ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-300 border-slate-100 hover:border-blue-400 hover:text-blue-400")}
                      >
                        WK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full w-fit mb-4">{teamB.name}</p>
                {teamB.players.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 group">
                    <input 
                      className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:ring-1 focus:ring-emerald-200 font-medium" 
                      value={p.name}
                      placeholder={`Player ${idx + 1}`}
                      onChange={e => {
                        const newPlayers = [...teamB.players];
                        newPlayers[idx].name = e.target.value;
                        setTeamB({ ...teamB, players: newPlayers });
                      }}
                    />
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          const newPlayers = teamB.players.map((player, i) => ({ ...player, isCaptain: i === idx ? !player.isCaptain : false }));
                          setTeamB({ ...teamB, players: newPlayers });
                        }}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all", p.isCaptain ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-300 border-slate-100 hover:border-emerald-400 hover:text-emerald-400")}
                      >
                        C
                      </button>
                      <button 
                        onClick={() => {
                          const newPlayers = teamB.players.map((player, i) => ({ ...player, isWicketKeeper: i === idx ? !player.isWicketKeeper : false }));
                          setTeamB({ ...teamB, players: newPlayers });
                        }}
                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all", p.isWicketKeeper ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-300 border-slate-100 hover:border-blue-400 hover:text-blue-400")}
                      >
                        WK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-12">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Match Format</h3>
              <div className="grid grid-cols-4 gap-4">
                {['T10', 'T20', 'ODI', 'Custom'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setSettings({...settings, matchType: type as any, totalOvers: type === 'T10' ? 10 : type === 'T20' ? 20 : type === 'ODI' ? 50 : settings.totalOvers})}
                    className={cn(
                      "py-6 rounded-2xl border-2 transition-all font-black text-sm uppercase tracking-widest shadow-sm",
                      settings.matchType === type ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-black uppercase text-slate-900 tracking-tight">Overs Configuration</p>
                   <p className="text-xs text-slate-400 font-medium">Standard deliveries per innings</p>
                 </div>
                 <div className="flex items-center gap-6">
                   <button onClick={() => setSettings({...settings, totalOvers: Math.max(1, settings.totalOvers - 1)})} className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center hover:bg-slate-100 hover:border-slate-200 text-slate-400 transition-all">-</button>
                   <span className="text-4xl font-black text-slate-900 w-16 text-center tabular-nums">{settings.totalOvers}</span>
                   <button onClick={() => setSettings({...settings, totalOvers: Math.min(100, settings.totalOvers + 1)})} className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center hover:bg-slate-100 hover:border-slate-200 text-slate-400 transition-all">+</button>
                 </div>
               </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100">
          <button onClick={onCancel} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Back to Dashboard</button>
          <div className="flex gap-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-8 py-3 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Previous
              </button>
            )}
            <button 
              onClick={() => step < 3 ? setStep(step + 1) : handleStart()}
              className="bg-slate-900 text-white px-12 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
            >
              {step === 3 ? "Initialize Match" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Scorecard({ match, stats }: { match: Match, stats: any }) {
  const currentInnings = match.innings[match.currentInningsIndex];
  const battingTeam = currentInnings.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam = currentInnings.bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900"><Users size={80} /></div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            {battingTeam.logo ? <img src={battingTeam.logo} alt="Logo" className="w-full h-full object-cover" /> : <div className="p-1 text-emerald-800"><Trophy size={16} /></div>}
          </div>
          Batting: {battingTeam.name}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black">
                <th className="px-4 py-4">Player</th>
                <th className="px-4 py-4">R</th>
                <th className="px-4 py-4">B</th>
                <th className="px-4 py-4">4s</th>
                <th className="px-4 py-4">6s</th>
                <th className="px-4 py-4">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {battingTeam.players.map(player => {
                const pStats = stats.batsmanStats[player.id];
                if (!pStats && !currentInnings.balls.some(b => b.batsmanId === player.id)) return null;
                return (
                  <tr key={player.id} className="text-xs font-bold">
                    <td className="px-4 py-5">
                      <div className="flex flex-col">
                        <span className="text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{player.name} {player.isCaptain && '(C)'} {player.isWicketKeeper && '(WK)'}</span>
                        <span className={cn("text-[9px] font-black uppercase mt-0.5 tracking-tighter italic", pStats?.out ? "text-slate-400" : "text-emerald-600 animate-pulse")}>
                          {pStats?.out ? "Dismissed" : "Not Out"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 font-black text-sm tabular-nums">{pStats?.runs || 0}</td>
                    <td className="px-4 py-5 text-slate-500 tabular-nums">{pStats?.balls || 0}</td>
                    <td className="px-4 py-5 text-slate-300 tabular-nums">{pStats?.fours || 0}</td>
                    <td className="px-4 py-5 text-slate-300 tabular-nums">{pStats?.sixes || 0}</td>
                    <td className="px-4 py-5 text-emerald-600 font-black tabular-nums">
                      {pStats?.balls ? ((pStats.runs / pStats.balls) * 100).toFixed(1) : '0.0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900"><Trophy size={80} /></div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            {bowlingTeam.logo ? <img src={bowlingTeam.logo} alt="Logo" className="w-full h-full object-cover" /> : <div className="p-1 text-white"><ChevronRight size={16} /></div>}
          </div>
          Bowling: {bowlingTeam.name}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black">
                <th className="px-4 py-4">Player</th>
                <th className="px-4 py-4">O</th>
                <th className="px-4 py-4">M</th>
                <th className="px-4 py-4">R</th>
                <th className="px-4 py-4">W</th>
                <th className="px-4 py-4">ECO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bowlingTeam.players.map(player => {
                const bStats = stats.bowlerStats[player.id];
                if (!bStats) return null;
                return (
                  <tr key={player.id} className="text-xs font-bold">
                    <td className="px-4 py-5 uppercase tracking-tight text-slate-900">{player.name}</td>
                    <td className="px-4 py-5 text-slate-500 tabular-nums">{formatOvers(bStats.balls)}</td>
                    <td className="px-4 py-5 text-slate-300 tabular-nums">{bStats.maidens}</td>
                    <td className="px-4 py-5 text-slate-900 tabular-nums font-black">{bStats.runs}</td>
                    <td className="px-4 py-5 text-red-600 font-black text-sm tabular-nums">{bStats.wickets}</td>
                    <td className="px-4 py-5 text-emerald-600 font-black tabular-nums">
                      {bStats.balls ? ((bStats.runs / bStats.balls) * 6).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MatchSummary({ match, onBack }: { match: Match, onBack: () => void }) {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  
  const winner = match.winnerTeamId === match.teamA.id ? match.teamA : match.teamB;
  const margin = Math.abs(inn1.score - inn2.score);

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-xl mx-auto space-y-8"
    >
      <div className="bg-slate-900 text-white rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Match Concluded</h2>
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">{winner.name} WIN!</h1>
            <p className="text-slate-400 font-medium tracking-tight">by {margin} runs</p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5 my-8">
            <div className="text-left space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.teamA.name}</p>
              <p className="text-3xl font-black tabular-nums">{inn1.score}/{inn1.wickets}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.teamB.name}</p>
              <p className="text-3xl font-black tabular-nums">{inn2.score}/{inn2.wickets}</p>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            Resolution Handled • Return to Dashboard
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Venue Detail</p>
        <p className="text-slate-900 font-bold">{match.settings.venue} • {new Date(match.settings.date).toLocaleDateString()}</p>
      </div>
    </motion.div>
  );
}

function LiveScoring({ match: initialMatch, onComplete, onNavigate }: { match: Match, onComplete: (match: Match) => void, onNavigate: (view: string) => void }) {
  const { match, setMatch, currentInnings, addBall, undoLastBall, stats } = useScoring(initialMatch);
  const [activeTab, setActiveTab] = useState<'scoring' | 'scorecard'>('scoring');
  
  // Teams for current context
  const battingTeam = match.innings[match.currentInningsIndex].battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingTeam = match.innings[match.currentInningsIndex].bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;

  // Scoring UI state
  const [strikerId, setStrikerId] = useState(battingTeam.players[0].id);
  const [nonStrikerId, setNonStrikerId] = useState(battingTeam.players[1].id);
  const [bowlerId, setBowlerId] = useState(bowlingTeam.players[0].id);
  const [showWicketModal, setShowWicketModal] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    // Only sync if match state has changed from initial
    if (match.updatedAt > initialMatch.updatedAt) {
      const syncMatch = async () => {
        try {
          await setDoc(doc(db, 'matches', match.id), {
            ...match,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error('Sync failed:', error);
          // Don't toast on every fail to avoid spam, but log it
        }
      };
      syncMatch();
    }
  }, [match]);

  // Sync state when innings changes
  useEffect(() => {
    setStrikerId(battingTeam.players[0].id);
    setNonStrikerId(battingTeam.players[1].id);
    setBowlerId(bowlingTeam.players[0].id);
  }, [match.currentInningsIndex]);

  const handleScore = (runs: number, extra?: ExtraType) => {
    addBall({
      runs: extra ? (extra === 'wide' || extra === 'noball' ? 0 : runs) : runs,
      batsmanId: strikerId,
      bowlerId: bowlerId,
      extra: extra ? { type: extra, runs: (extra === 'wide' || extra === 'noball') ? runs + 1 : runs } : undefined,
      isBoundary: runs === 4,
      isSix: runs === 6
    });

    // Simple strike rotation
    const isLegalBall = !extra || (extra !== 'wide' && extra !== 'noball');
    if (isLegalBall && runs % 2 !== 0) {
      setStrikerId(nonStrikerId);
      setNonStrikerId(strikerId);
    }
  };

  const handleWicket = (type: WicketType) => {
    addBall({
      runs: 0,
      batsmanId: strikerId,
      bowlerId: bowlerId,
      wicket: {
        type,
        playerOutId: strikerId,
      }
    });
    setShowWicketModal(false);
    
    // Select next player
    const nextPlayer = battingTeam.players.find(p => p.id !== strikerId && p.id !== nonStrikerId && !stats.batsmanStats[p.id]?.out);
    if (nextPlayer) {
      setStrikerId(nextPlayer.id);
    }
    toast.error(`Wicket! ${type.toUpperCase()}`);
  };

  const [showBowlerModal, setShowBowlerModal] = useState(false);

  const handleBowlerChange = (id: string) => {
    setBowlerId(id);
    setShowBowlerModal(false);
    toast.success('Bowler changed');
  };

  const finishInnings = () => {
    if (match.currentInningsIndex === 0) {
      setMatch(prev => ({
        ...prev,
        currentInningsIndex: 1,
        updatedAt: Date.now()
      }));
      toast.success('First Innings Completed!');
    } else {
      const inn1 = match.innings[0].score;
      const inn2 = match.innings[1].score;
      const winnerId = inn1 > inn2 ? match.teamA.id : match.teamB.id;
      onComplete({
        ...match,
        status: 'completed',
        winnerTeamId: winnerId,
        updatedAt: Date.now()
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('scoring')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'scoring' ? "bg-[#1A1A1A] text-white shadow-lg" : "text-gray-400 hover:text-gray-900")}
          >
            Live Scoring
          </button>
          <button 
            onClick={() => setActiveTab('scorecard')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'scorecard' ? "bg-[#1A1A1A] text-white shadow-lg" : "text-gray-400 hover:text-gray-900")}
          >
            Scorecard
          </button>
        </div>
        <button 
          onClick={finishInnings}
          className="bg-red-50 text-red-600 px-6 py-2 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
        >
          {match.currentInningsIndex === 0 ? "End Innings" : "Complete Match"}
        </button>
      </div>

      {activeTab === 'scoring' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Scoring Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Score Plate */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex justify-between items-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-widest">{battingTeam.name} Batting</span>
                  {match.currentInningsIndex === 1 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target: {match.innings[0].score + 1}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                    {currentInnings.score}<span className="text-slate-300 mx-1">/</span>{currentInnings.wickets}
                  </h2>
                  <span className="text-2xl font-bold text-slate-400 font-mono italic">
                    {formatOvers(stats.ballsCount)} <span className="text-[10px] uppercase font-black not-italic opacity-50">Overs</span>
                  </span>
                </div>
                <div className="flex gap-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>CRR: <strong className="text-slate-900">{calculateRunRate(currentInnings.score, stats.ballsCount)}</strong></span>
                  {match.currentInningsIndex === 1 && (
                    <span>RRR: <strong className="text-slate-900">{(( (match.innings[0].score + 1 - currentInnings.score) / ( (match.settings.totalOvers * 6 - stats.ballsCount) / 6 ) ) || 0).toFixed(2)}</strong></span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-4">
                <div className="flex gap-1.5 flex-wrap justify-end max-w-[200px]">
                  {[...currentInnings.balls].slice(-6).map((ball, i) => (
                    <span 
                      key={ball.id} 
                      className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black shadow-sm transition-all",
                        ball.runs === 4 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        ball.runs === 6 ? "bg-emerald-600 border-emerald-700 text-white" :
                        ball.wicket ? "bg-red-100 border-red-200 text-red-600" :
                        ball.extra ? "bg-blue-50 border-blue-200 text-blue-600" :
                        "border-slate-100 text-slate-400"
                      )}
                    >
                      {ball.wicket ? 'W' : ball.extra ? ball.extra.type[0].toUpperCase() : ball.runs || '•'}
                    </span>
                  ))}
                  {currentInnings.balls.length === 0 && Array.from({length: 6}).map((_, i) => (
                    <span key={i} className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-200">•</span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Recent Balls</p>
              </div>
            </div>

            {/* Batsmen & Bowler Mini Stats (Mobile/Tablet visible or for compact view) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Batsmen</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center group cursor-pointer" onClick={() => {}}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-bold text-slate-900">{battingTeam.players.find(p => p.id === strikerId)?.name}*</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-lg text-slate-900">{(stats.batsmanStats[strikerId]?.runs || 0)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({(stats.batsmanStats[strikerId]?.balls || 0)})</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => {
                      setStrikerId(nonStrikerId);
                      setNonStrikerId(strikerId);
                      toast.success('Strike swapped');
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        <span className="font-bold text-slate-900">{battingTeam.players.find(p => p.id === nonStrikerId)?.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-lg text-slate-900">{(stats.batsmanStats[nonStrikerId]?.runs || 0)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({(stats.batsmanStats[nonStrikerId]?.balls || 0)})</span>
                      </div>
                    </div>
                 </div>
               </div>
               
               <div 
                 className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden cursor-pointer group"
                 onClick={() => setShowBowlerModal(true)}
               >
                 <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings size={14} className="text-slate-500" />
                 </div>
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Current Bowler</h3>
                 <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg leading-tight uppercase tracking-tight">{bowlingTeam.players.find(p => p.id === bowlerId)?.name}</p>
                      <p className="text-[10px] text-emerald-400 font-black mt-1 uppercase tracking-widest italic">{formatOvers(stats.bowlerStats[bowlerId]?.balls || 0)} - {(stats.bowlerStats[bowlerId]?.maidens || 0)} - {(stats.bowlerStats[bowlerId]?.runs || 0)} - {(stats.bowlerStats[bowlerId]?.wickets || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono font-bold text-white leading-none">
                        {stats.bowlerStats[bowlerId]?.balls ? ((stats.bowlerStats[bowlerId].runs / stats.bowlerStats[bowlerId].balls) * 6).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1">Economy</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Scoring Pad */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 grid grid-cols-4 gap-4 flex-1">
              {[0, 1, 2, 3].map(runs => (
                <button 
                  key={runs}
                  onClick={() => handleScore(runs)}
                  className="h-24 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all group"
                >
                  <span className="text-3xl font-black text-slate-900 group-active:scale-110 transition-transform">{runs}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1">
                    {runs === 0 ? 'Dot Ball' : runs === 1 ? 'Single' : runs === 2 ? 'Double' : 'Triple'}
                  </span>
                </button>
              ))}
              <button 
                onClick={() => handleScore(4)}
                className="h-24 flex flex-col items-center justify-center bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl hover:bg-emerald-100 font-black text-4xl shadow-inner transition-all active:scale-95"
              >
                4
              </button>
              <button 
                onClick={() => handleScore(6)}
                className="h-24 flex flex-col items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 font-black text-4xl border-b-4 border-emerald-800 transition-all active:translate-y-1 active:border-b-0"
              >
                6
              </button>
              <button 
                onClick={() => handleScore(0, 'wide')}
                className="h-24 flex flex-col items-center justify-center bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl hover:bg-amber-100 transition-all font-black text-xl italic"
              >
                Wide
              </button>
              <button 
                onClick={() => handleScore(0, 'noball')}
                className="h-24 flex flex-col items-center justify-center bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl hover:bg-orange-100 transition-all font-black text-xl italic"
              >
                No Ball
              </button>
              
              <button 
                onClick={() => setShowWicketModal(true)}
                className="col-span-2 h-16 flex items-center justify-center bg-red-50 border border-red-100 text-red-600 rounded-2xl hover:bg-red-100 font-black text-xs uppercase tracking-widest transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                WICKET
              </button>
              <button 
                onClick={undoLastBall}
                className="col-span-2 h-16 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 font-black text-xs uppercase tracking-widest italic transition-all"
              >
                Undo Last Delivery
              </button>
            </div>
          </div>

          {/* Right Column: Match Feed & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Match Progress</h3>
                 <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-tighter">Live</span>
               </div>
               <div className="space-y-4">
                 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner uppercase">
                   <div 
                     className="h-full bg-emerald-600 transition-all duration-1000 ease-out"
                     style={{ width: `${(stats.ballsCount / (match.settings.totalOvers * 6)) * 100}%` }}
                   />
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Start</span>
                   <span className="text-slate-900">{formatOvers(stats.ballsCount)} / {match.settings.totalOvers} OV</span>
                   <span>End</span>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Event Feed</h3>
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {[...currentInnings.balls].reverse().slice(0, 15).map((ball) => (
                  <div key={ball.id} className="flex gap-4 items-center text-xs border-b border-slate-50 pb-3 last:border-0">
                    <span className="w-8 font-mono text-slate-400 font-bold italic tracking-tighter">{formatOvers(match.innings[match.currentInningsIndex].balls.indexOf(ball) + 1)}</span>
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm",
                      ball.runs === 4 || ball.runs === 6 ? "bg-emerald-600 text-white" :
                      ball.wicket ? "bg-red-600 text-white" :
                      ball.extra ? "bg-amber-100 text-amber-800" :
                      "bg-slate-50 text-slate-400"
                    )}>
                      {ball.wicket ? 'W' : ball.extra ? ball.extra.type[0].toUpperCase() : ball.runs}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-600 font-medium">
                        {ball.wicket ? 
                          <span className="text-red-600 font-bold uppercase tracking-tighter">Wicket Fallen!</span> : 
                          ball.runs === 6 ? <span className="text-emerald-600 font-bold uppercase tracking-tighter">Massive Six!</span> :
                          ball.runs === 4 ? <span className="text-emerald-700 font-bold uppercase tracking-tighter">Boundary!</span> :
                          ball.extra ? `Extra (${ball.extra.type})` :
                          `Delivery bowled`
                        }
                      </p>
                    </div>
                  </div>
                ))}
                {currentInnings.balls.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                      <History className="text-slate-200" size={20} />
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Feed is empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Scorecard match={match} stats={stats} />
      )}

      {/* Persistent Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40 shadow-2xl safe-area-inset-bottom">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors">
          <Users size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Teams</span>
        </button>
        <div className="relative -top-6">
           <button 
             onClick={() => onNavigate('setup')}
             className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white hover:bg-emerald-600 transition-all active:scale-95"
           >
             <Plus size={28} />
           </button>
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors">
          <History size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors">
          <Settings size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Setup</span>
        </button>
      </nav>

      <AnimatePresence>
        {showWicketModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-8 shadow-2xl border border-slate-200"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-md">
                   <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Wicket Fallen</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select dismissal type</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket'].map((type) => (
                  <button 
                    key={type}
                    onClick={() => handleWicket(type as WicketType)}
                    className="py-4 rounded-2xl bg-slate-50 hover:bg-red-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 shadow-sm"
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowWicketModal(false)} 
                className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}

        {showBowlerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users className="text-emerald-600" size={16} /> Select New Bowler</h3>
                <button onClick={() => setShowBowlerModal(false)} className="text-slate-300 hover:text-slate-900"><Plus size={20} className="rotate-45" /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {bowlingTeam.players.map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => handleBowlerChange(p.id)}
                    className={cn(
                      "p-4 rounded-2xl text-left transition-all border-2 font-black shadow-sm",
                      bowlerId === p.id ? "bg-emerald-50 border-emerald-600 text-emerald-800" : "bg-white border-slate-100 hover:border-emerald-200 text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <p className="text-xs uppercase tracking-tight">{p.name}</p>
                    <p className="text-[10px] opacity-60 font-medium mt-1">
                      {(stats.bowlerStats[p.id]?.wickets || 0)}W - {(stats.bowlerStats[p.id]?.runs || 0)}R
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
