"use client";
import { auth, db } from "./firebase";
import { useState, useEffect, useRef } from "react";
import { ref, onValue, set, update, increment } from "firebase/database";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  ArrowUpCircle, ArrowDownCircle, Zap, MapPin, Clock, ShieldCheck, 
  Sparkles, Navigation, AlertCircle, CheckCircle2, MessageSquare, 
  Activity, Flame, TrendingUp, LogIn, LogOut, Trophy, User, Crown, X
} from "lucide-react";

interface Lift {
  id: number;
  label: string;
  floor: string;
  status: string;
  trend: "up" | "down" | "idle";
  time: string;
  timestamp: number;
  votes?: any; // মেজরিটি ভোটিংয়ের জন্য নতুন ফিল্ড
}

export default function VirmuktoLift() {
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpamming, setIsSpamming] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  
  // Auth & Gamification State
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [authLoading, setAuthLoading] = useState(true);

  // Top Contributors State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  // Anti-Spam State
  const [spamMsg, setSpamMsg] = useState("");
  const updateHistory = useRef<number[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user points
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserPoints(snapshot.val().points || 0);
          } else {
            // New user, initial points
            set(userRef, { name: currentUser.displayName, email: currentUser.email, points: 0 });
            setUserPoints(0);
          }
        });
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Top Users Fetcher
  useEffect(() => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.values(data);
        // Sort by points (highest first) and take top 5
        const sortedUsers = usersArray
          .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
          .slice(0, 5);
        setTopUsers(sortedUsers);
      }
    });
  }, []);

  // Login Function
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // DIU Domain Restriction
    provider.setCustomParameters({ hd: "diu.edu.bd" }); 
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      setSpamMsg("লগইন করা যায়নি। ড্যাফোডিল ইমেইল ব্যবহার করুন।");
      setTimeout(() => setSpamMsg(""), 4000);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // 🧠 MAJORITY VOTE ALGORITHM INCLUDED HERE
  useEffect(() => {
    const liftsRef = ref(db, 'lifts');
    onValue(liftsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liftData = Object.values(data) as any[];
        
        // মেজরিটি ভোট প্রসেস করা হচ্ছে
        const processedLifts = liftData.map((lift: any) => {
          let currentStatus = lift.status;
          let currentFloor = lift.floor;
          let currentTrend = lift.trend;

          if (lift.votes) {
            const now = Date.now();
            // লাস্ট ৫ মিনিটের ভোটগুলো ফিল্টার করা
            const recentVotes = Object.values(lift.votes).filter((v: any) => now - v.timestamp < 300000);

            if (recentVotes.length > 0) {
              const statusCounts: Record<string, number> = {};
              const floorCounts: Record<string, number> = {};
              const trendCounts: Record<string, number> = {};

              recentVotes.forEach((v: any) => {
                if (v.status) statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
                if (v.floor) floorCounts[v.floor] = (floorCounts[v.floor] || 0) + 1;
                if (v.trend) trendCounts[v.trend] = (trendCounts[v.trend] || 0) + 1;
              });

              // সবচেয়ে বেশি ভোট পাওয়া অপশনটি খুঁজে বের করার ফাংশন
              const getMajority = (counts: Record<string, number>) => {
                let max = 0;
                let majorityKey = null;
                for (const key in counts) {
                  if (counts[key] > max) {
                    max = counts[key];
                    majorityKey = key;
                  }
                }
                return majorityKey;
              };

              const majStatus = getMajority(statusCounts);
              const majFloor = getMajority(floorCounts);
              const majTrend = getMajority(trendCounts);

              if (majStatus) currentStatus = majStatus;
              if (majFloor) currentFloor = majFloor;
              if (majTrend) currentTrend = majTrend;
            }
          }

          return {
            ...lift,
            status: currentStatus,
            floor: currentFloor,
            trend: currentTrend
          };
        });

        setLifts(processedLifts.sort((a: any, b: any) => a.id - b.id));
      } else {
        const initialData = [1,2,3,4,5,6].map(id => ({
          id, label: `লিফট ০${id}`, floor: "G", 
          status: "কম লাইন", trend: "idle", time: "এখন", timestamp: Date.now()
        }));
        set(ref(db, 'lifts'), initialData);
      }
      setLoading(false);
    });
  }, []);

  // 🧠 SECURE VOTE UPDATER (Instead of direct overriding)
  const updateLiftData = (id: number, updates: any, uid: string) => {
    const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const liftPath = `lifts/${id - 1}`;
    const currentLift = lifts.find(l => l.id === id);
    
    // ইউজারের আগের কোনো ভোট থাকলে তার সাথে নতুন ভোট মার্জ করা
    const existingVote = currentLift?.votes?.[uid] || {};
    const newVote = { ...existingVote, ...updates, timestamp: Date.now() };

    // ফায়ারবেসে ভোট সেভ করা এবং গ্লোবাল টাইম আপডেট করা
    update(ref(db, liftPath), {
      [`votes/${uid}`]: newVote,
      time: now,
      timestamp: Date.now()
    });
  };

  const handleUpdate = (id: number, updates: any) => {
    if (!user) {
      setSpamMsg("আপডেট দিতে আগে লগইন করুন!");
      setTimeout(() => setSpamMsg(""), 3000);
      return;
    }

    // Anti-Spam Logic: ১ মিনিটে সর্বোচ্চ ৫ বার আপডেট দেওয়া যাবে
    const nowTime = Date.now();
    updateHistory.current = updateHistory.current.filter(time => nowTime - time < 60000);
    
    if (updateHistory.current.length >= 5) {
      setSpamMsg("একটু আস্তে! ১ মিনিট পর আবার আপডেট দিন।");
      setTimeout(() => setSpamMsg(""), 3000);
      return;
    }
    updateHistory.current.push(nowTime);

    // Update lift data with UID
    updateLiftData(id, updates, user.uid);

    // Gamification: Add +10 points to user profile
    const userRef = ref(db, `users/${user.uid}`);
    update(userRef, { points: increment(10) });

    setUpdateSuccess(`${id}`);
    setTimeout(() => setUpdateSuccess(null), 2000);
  };

  // --- স্মার্ট হাইপ লজিক ও রাউটিং ---
  const busyCount = lifts.filter(l => l.status === "বিশাল জ্যাম").length;
  const congestionLevel = lifts.length > 0 ? Math.round((busyCount / lifts.length) * 100) : 0;
  
  // Smart Routing
  const validLifts = lifts.filter(l => (Date.now() - l.timestamp) < 300000);
  const bestLift = validLifts.find(l => l.status === "কম লাইন") || lifts.find(l => l.status === "কম লাইন");
  const takeStairs = busyCount >= 4;

  // Dynamic Greeting based on Time
  const currentHour = new Date().getHours();
  const greeting = currentHour >= 8 && currentHour <= 11 
    ? "সকালের ক্লাসের তাড়া? লিফট চেক করে নিন! 🚀" 
    : currentHour >= 15 && currentHour <= 18 
      ? "বাসায় ফেরার পালা? লিফট চেক করে নিন! 🏡" 
      : "ক্লাস ধরার আগে লিফট এর জ্যাম দেখে নিন! 🚀";

  if (loading || authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE]">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-bold text-slate-600 italic text-sm text-center tracking-tight">ড্যাফোডিল লিফট সিঙ্ক হচ্ছে...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F4F7FE] text-slate-900 pb-20 relative">
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { font-family: 'Hind Siliguri', sans-serif !important; } 
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse-ring { 0% { transform: scale(.33); opacity: 1; } 80%, 100% { opacity: 0; } }
        .live-pulse { position: relative; }
        .live-pulse::before { 
          content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
          background: #22c55e; border-radius: 50%; animation: pulse-ring 2s infinite; 
        }
      `}</style>

      {/* Top Contributors Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[35px] w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowLeaderboard(false)} className="absolute top-5 right-5 bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-none">Top Contributors</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">ক্যাম্পাসের হিরোরা</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                      ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700 leading-none">{u.name?.split(' ')[0] || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="bg-green-100 px-3 py-1 rounded-full text-green-700 font-black text-xs flex items-center gap-1">
                    <Zap size={12} fill="currentColor"/> {u.points}
                  </div>
                </div>
              ))}
              {topUsers.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4 font-bold">এখনো কেউ পয়েন্ট পায়নি!</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Message */}
      {spamMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[11px] font-black shadow-2xl z-[100] flex items-center gap-2 animate-bounce uppercase tracking-wide w-max border-2 border-slate-700">
          <AlertCircle size={16} className="text-orange-400" /> {spamMsg}
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-xl mx-auto px-6 py-4 flex justify-between items-center text-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg"><Zap size={20} fill="white"/></div>
            <h1 className="text-xl font-bold tracking-tight">ভিড়মুক্ত<span className="text-orange-600 italic">লিফট</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                  <Trophy size={14} className="text-orange-600" />
                  <span className="text-[12px] font-black text-orange-700 leading-none pt-0.5">{userPoints}</span>
                </div>
                <button onClick={handleLogout} className="bg-slate-100 p-1.5 rounded-full border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md active:scale-95">
                <LogIn size={14} /> Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 pt-6">
        
        {/* --- EXTRA FEATURE 1: Campus Congestion Meter --- */}
        <div className="bg-white rounded-[40px] p-7 shadow-xl border border-slate-100 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Campus Pulse</p>
              <h2 className="text-2xl font-black italic">{congestionLevel}% জ্যাম এখন</h2>
            </div>
            <div className={`p-4 rounded-3xl ${congestionLevel > 50 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              <Flame size={24} className={congestionLevel > 50 ? 'animate-bounce' : ''} />
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-green-500 via-orange-500 to-red-500 transition-all duration-1000" style={{ width: `${congestionLevel}%` }}></div>
          </div>
          <p className="text-[11px] font-bold text-slate-500 italic leading-none">
            {congestionLevel > 70 ? "🔥 ক্যাম্পাস এখন জ্যামে পুড়ছে! সিঁড়িই একমাত্র ভরসা।" : 
             congestionLevel > 30 ? "⚡ লিফট মোটামুটি ক্লিয়ার। সাবধানে যান।" : "✅ লিফট একদম ফাঁকা! দৌড় দিন।" }
          </p>
        </div>

        {/* স্মার্ট ডিসিশন কার্ড */}
        <div className={`p-7 rounded-[40px] mb-8 shadow-2xl transition-all duration-500 ${
          takeStairs ? "bg-red-600 text-white shadow-red-100" : "bg-slate-900 text-white shadow-slate-200"
        }`}>
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-black italic mb-1 leading-tight tracking-tight">{takeStairs ? "সিঁড়ি দিয়ে যান! 🏃‍♂️" : `${bestLift ? bestLift.label : "চেক করুন"} এ যান! 🚀`}</h2>
              <p className="text-[11px] opacity-80 font-bold uppercase tracking-widest leading-none">{takeStairs ? "সব লিফটে জ্যাম। সিঁড়িই এখন সেরা।" : "এই লিফটে লাইন কম। সময় বাঁচবে।"}</p>
            </div>
            {takeStairs ? <AlertCircle size={40} className="opacity-30" /> : <Navigation size={40} className="opacity-30" />}
          </div>
        </div>

        {/* হিরো কার্ড */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] text-white shadow-2xl mb-6 relative overflow-hidden border border-white/5">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-orange-400" /><p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em]">Daffodil AB4 Building</p>
            </div>
            <h2 className="text-2xl font-bold leading-tight mb-4 text-white" dangerouslySetInnerHTML={{ __html: greeting.replace('লিফট', '<br/>লিফট') }}></h2>
            
            <div className="flex items-center justify-between text-white">
              <div className="flex gap-4">
                 <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10 text-center"><p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter mb-1 leading-none">এক্টিভ ইউজার</p><p className="text-sm font-bold text-orange-400 italic">১২ জন</p></div>
                 <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10 text-center"><p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter mb-1 leading-none">আপনার পয়েন্ট</p><p className="text-sm font-bold text-orange-400 italic">{user ? userPoints : '০'}</p></div>
              </div>
              
              <button onClick={() => setShowLeaderboard(true)} className="flex flex-col items-center gap-1 group">
                <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/30 group-active:scale-90 transition-all border border-orange-400">
                  <Trophy size={20} fill="white" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Top Users</span>
              </button>
            </div>
          </div>
          <Sparkles size={120} className="absolute right-[-20px] bottom-[-20px] opacity-10 text-orange-500" />
        </div>

        {/* লিফট লিস্ট */}
        <div className="space-y-6 mb-12">
          {lifts.map(lift => {
            const isStale = (Date.now() - lift.timestamp) > 300000;
            const floors = ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

            return (
              <div key={lift.id} className="bg-white rounded-[40px] p-7 shadow-sm border border-slate-100 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl text-orange-500 shadow-sm"><MapPin size={24} /></div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-none mb-1 tracking-tight">{lift.label}</h3>
                      <div className="flex items-center gap-1 text-[9px] font-bold uppercase leading-none mt-1">
                        {isStale ? (
                          <span className="text-red-500 flex items-center gap-1"><Clock size={10}/> ডাটা পুরনো ({lift.time})</span>
                        ) : (
                          <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/> লাইভ ভেরিফাইড ({lift.time})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border shadow-xs ${
                    lift.status === 'কম লাইন' ? 'bg-green-50 text-green-600 border-green-100' : 
                    lift.status === 'মাঝারি লাইন' ? 'bg-orange-100 text-orange-600 border-orange-100' : 
                    'bg-red-50 text-red-600 border-red-100'
                  }`}>{lift.status}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Smart Floor Selector (One-Tap Input) */}
                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col justify-center overflow-hidden">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 leading-none tracking-tight">লিফট এখন কত তলায়?</p>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {floors.map(f => (
                        <button 
                          key={f} 
                          onClick={() => handleUpdate(lift.id, { floor: f })} 
                          className={`shrink-0 min-w-[32px] h-[32px] rounded-full text-[11px] font-black transition-all active:scale-90 ${
                            lift.floor === f 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 leading-none tracking-tight">ডিরেকশন</p>
                      <p className="font-black text-[11px] text-slate-700 mt-1 leading-none italic">{lift.trend === 'up' ? 'উপরে যাচ্ছে' : lift.trend === 'down' ? 'নিচে যাচ্ছে' : 'স্থির'}</p>
                    </div>
                    {lift.trend === 'up' ? <ArrowUpCircle size={22} className="text-green-500 animate-bounce"/> : 
                     lift.trend === 'down' ? <ArrowDownCircle size={22} className="text-red-500 animate-bounce"/> : 
                     <div className="w-2 h-2 bg-slate-200 rounded-full"></div>}
                  </div>
                </div>

                {/* --- স্মার্ট আপডেট সেকশন --- */}
                <div className={`rounded-3xl p-5 border mt-6 relative overflow-hidden transition-all duration-300 ${isStale ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                  
                  {/* Authentication Overlay */}
                  {!user && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-3xl">
                      <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 text-center">
                        <User size={24} className="mx-auto text-orange-500 mb-2" />
                        <p className="text-[11px] font-black text-slate-700 leading-tight mb-2 uppercase">আপডেট দিতে লগইন করুন</p>
                        <button onClick={handleLogin} className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95 shadow-md">
                          Google Login
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className={isStale ? "text-red-500 animate-pulse" : "text-orange-500"} />
                      <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">আপনার আপডেট দিন (+১০ পয়েন্ট)</h4>
                    </div>
                    
                    {updateSuccess === `${lift.id}` && (
                      <span className="text-[10px] font-bold text-white bg-green-500 px-3 py-1 rounded-full animate-bounce flex items-center gap-1 shadow-md">
                        <CheckCircle2 size={12} /> আপডেটেড!
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-slate-500 mb-3 leading-none">নিচতলায় এই লিফটের লাইন কেমন?</p>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <button 
                      onClick={() => handleUpdate(lift.id, { status: "কম লাইন" })} 
                      className={`py-3 px-1 rounded-2xl text-[11px] font-black transition-all border flex flex-col items-center gap-1 shadow-sm active:scale-95
                        ${lift.status === 'কম লাইন' 
                          ? 'bg-green-500 text-white border-green-600 ring-2 ring-green-200 ring-offset-1' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'}`}
                    >
                      <span className="text-sm">✅</span> কম
                    </button>
                    <button 
                      onClick={() => handleUpdate(lift.id, { status: "মাঝারি লাইন" })} 
                      className={`py-3 px-1 rounded-2xl text-[11px] font-black transition-all border flex flex-col items-center gap-1 shadow-sm active:scale-95
                        ${lift.status === 'মাঝারি লাইন' 
                          ? 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-200 ring-offset-1' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-orange-400'}`}
                    >
                      <span className="text-sm">⚠️</span> মাঝারি
                    </button>
                    <button 
                      onClick={() => handleUpdate(lift.id, { status: "বিশাল জ্যাম" })} 
                      className={`py-3 px-1 rounded-2xl text-[11px] font-black transition-all border flex flex-col items-center gap-1 shadow-sm active:scale-95
                        ${lift.status === 'বিশাল জ্যাম' 
                          ? 'bg-red-500 text-white border-red-600 ring-2 ring-red-200 ring-offset-1' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-red-400'}`}
                    >
                      <span className="text-sm">🔥</span> জ্যাম
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-slate-500 mb-3 leading-none">লিফট কোন দিকে যাচ্ছে?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdate(lift.id, { trend: "up" })} 
                      className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl text-[11px] font-black transition-all shadow-sm border active:scale-95 uppercase
                        ${lift.trend === 'up' 
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-300 ring-offset-1' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <ArrowUpCircle size={16} className={lift.trend === 'up' ? 'text-green-400' : 'text-slate-400'} /> উপরে
                    </button>
                    <button 
                      onClick={() => handleUpdate(lift.id, { trend: "down" })} 
                      className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-2xl text-[11px] font-black transition-all shadow-sm border active:scale-95 uppercase
                        ${lift.trend === 'down' 
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-300 ring-offset-1' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <ArrowDownCircle size={16} className={lift.trend === 'down' ? 'text-red-400' : 'text-slate-400'} /> নিচে
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- EXTRA FEATURE 2: Dashboard Statistics --- */}
        <div className="bg-white rounded-[35px] p-6 shadow-xl border border-slate-100 grid grid-cols-3 gap-4 mb-10">
          <div className="flex flex-col items-center text-center">
            <div className="bg-green-50 p-3 rounded-2xl text-green-600 mb-2"><Activity size={20} /></div>
            <p className="text-[18px] font-black text-slate-800 leading-none mb-1">{lifts.length}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Active Lifts</p>
          </div>
          <div className="flex flex-col items-center text-center border-x border-slate-100">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600 mb-2"><AlertCircle size={20} /></div>
            <p className="text-[18px] font-black text-slate-800 leading-none mb-1">{busyCount}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Busy Lifts</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 mb-2"><TrendingUp size={20} /></div>
            <p className="text-[18px] font-black text-slate-800 leading-none mb-1">{100 - congestionLevel}%</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Safe Level</p>
          </div>
        </div>

        <footer className="mt-10 pb-10 border-t border-slate-200 pt-10 text-center text-slate-900">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">DIU Smart Campus Solution</p>
            <p className="text-sm font-black uppercase italic">Developed by <span className="text-orange-600 underline decoration-4 underline-offset-4 decoration-orange-100">Masum Billah</span></p>
            <div className="mt-4 flex justify-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                <span>Software Engineering</span><span>|</span><span>Batch 43-E</span>
            </div>
        </footer>
      </div>
    </main>
  );
}