"use client";
import { db } from "./firebase";
import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { 
  ArrowUpCircle, ArrowDownCircle, Users, Zap, RefreshCcw, 
  MapPin, Clock, ShieldCheck, Sparkles, Navigation, AlertCircle 
} from "lucide-react";

interface Lift {
  id: number;
  label: string;
  floor: string;
  status: string;
  trend: "up" | "down" | "idle";
  time: string;
  timestamp: number;
}

export default function VirmuktoLift() {
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpamming, setIsSpamming] = useState(false);

  useEffect(() => {
    const liftsRef = ref(db, 'lifts');
    onValue(liftsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liftData = Object.values(data) as Lift[];
        setLifts(liftData.sort((a, b) => a.id - b.id));
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

  const updateLiftData = (id: number, updates: any) => {
    if (isSpamming && !updates.floor) return;
    if (!updates.floor) {
      setIsSpamming(true);
      setTimeout(() => setIsSpamming(false), 5000);
    }
    const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    const liftPath = `lifts/${id - 1}`;
    const currentLift = lifts.find(l => l.id === id);
    if (currentLift) {
      set(ref(db, liftPath), { ...currentLift, ...updates, time: now, timestamp: Date.now() });
    }
  };

  const isHighTraffic = lifts.length > 0 && lifts.every(l => l.status === "বিশাল জ্যাম");

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE]">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-bold text-slate-600 italic text-sm text-center">ড্যাফোডিল লিফট সিঙ্ক হচ্ছে...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F4F7FE] text-slate-900 pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`* { font-family: 'Hind Siliguri', sans-serif !important; }`}</style>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-200"><Zap size={20} fill="white"/></div>
            <h1 className="text-xl font-bold tracking-tight">ভিড়মুক্ত<span className="text-orange-600">লিফট</span></h1>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">Live</span>
          </div>
        </div>
      </nav>
      <div className="max-w-xl mx-auto px-6 pt-6">
        {isHighTraffic && (
          <div className="bg-red-600 p-4 rounded-3xl text-white shadow-lg mb-6 flex items-center gap-3 animate-bounce">
            <AlertCircle size={24} /><p className="text-xs font-bold uppercase tracking-tight">সবগুলো লিফটে বিশাল জ্যাম!</p>
          </div>
        )}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[40px] text-white shadow-2xl mb-8 relative overflow-hidden border border-white/5">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-orange-400" /><p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em]">Daffodil AB4 Verified</p>
            </div>
            <h2 className="text-2xl font-bold leading-tight mb-4 text-white">ক্লাস ধরার আগে লিফট এর <br/>জ্যাম দেখে নিন! 🚀</h2>
            <div className="flex gap-4">
               <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10"><p className="text-[9px] text-slate-400 uppercase font-bold">এক্টিভ ইউজার</p><p className="text-sm font-bold">১২ জন</p></div>
               <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10"><p className="text-[9px] text-slate-400 uppercase font-bold">আজকের রিপোর্ট</p><p className="text-sm font-bold">১১৫+</p></div>
            </div>
          </div>
          <Sparkles size={120} className="absolute right-[-20px] bottom-[-20px] opacity-10 text-orange-500" />
        </div>
        <div className="space-y-6">
          {lifts.map(lift => (
            <div key={lift.id} className="bg-white rounded-[40px] p-7 shadow-sm border border-slate-100 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl text-orange-500"><MapPin size={24} /></div>
                  <div><h3 className="text-lg font-bold text-slate-800">{lift.label}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">{lift.time} এ আপডেট</p></div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase ${lift.status === 'কম লাইন' ? 'bg-green-100 text-green-600' : lift.status === 'মাঝারি লাইন' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>{lift.status}</div>
              </div>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-slate-50 rounded-3xl p-4 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ফ্লোর দিন:</p>
                  <input type="text" className="bg-transparent font-black text-slate-800 w-full focus:outline-none" onBlur={(e) => updateLiftData(lift.id, { floor: e.target.value })} defaultValue={lift.floor} />
                </div>
                <div className="flex-1 bg-slate-50 rounded-3xl p-4 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">ডিরেকশন</p>
                  <p className="font-bold text-[11px] text-slate-700">{lift.trend === 'up' ? 'উপরে যাচ্ছে' : lift.trend === 'down' ? 'নিচে যাচ্ছে' : 'স্থির'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button onClick={() => updateLiftData(lift.id, { status: "কম লাইন" })} className="py-4 rounded-2xl bg-slate-50 text-[10px] font-bold border border-slate-100 hover:bg-green-600 hover:text-white transition-all">কম লাইন</button>
                <button onClick={() => updateLiftData(lift.id, { status: "মাঝারি লাইন" })} className="py-4 rounded-2xl bg-slate-50 text-[10px] font-bold border border-slate-100 hover:bg-orange-500 hover:text-white transition-all">মাঝারি</button>
                <button onClick={() => updateLiftData(lift.id, { status: "বিশাল জ্যাম" })} className="py-4 rounded-2xl bg-slate-50 text-[10px] font-bold border border-slate-100 hover:bg-red-600 hover:text-white transition-all">বিশাল জ্যাম</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateLiftData(lift.id, { trend: "up" })} className="flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 tracking-tighter transition-all"><ArrowUpCircle size={14} /> উপরে যাচ্ছে</button>
                <button onClick={() => updateLiftData(lift.id, { trend: "down" })} className="flex-1 py-4 flex items-center justify-center gap-2 rounded-2xl bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 tracking-tighter transition-all"><ArrowDownCircle size={14} /> নিচে যাচ্ছে</button>
              </div>
            </div>
          ))}
        </div>
        <footer className="mt-20 pb-10 border-t border-slate-200 pt-10 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Daffodil International University</p>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">ডেভেলপার: <span className="text-orange-600 italic">মাসুম বিল্লাহ</span></p>
            <div className="mt-4 flex justify-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Software Engineering</span><span className="text-slate-200">|</span><span>Batch 43</span>
            </div>
        </footer>
      </div>
    </main>
  );
}