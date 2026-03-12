"use client";
import { db } from "./firebase";
import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database"; // ফিক্স: ইমপোর্ট যোগ করা হয়েছে
import { 
  ArrowUpCircle, ArrowDownCircle, Users, Zap, RefreshCcw, 
  MapPin, Clock, Info, ChevronRight, AlertTriangle 
} from "lucide-react";

// লিফট ডাটা স্ট্রাকচার
interface Lift {
  id: number;
  label: string;
  floor: string;
  status: "ফাঁকা" | "ভিড়" | "জ্যাম";
  trend: "up" | "down" | "idle";
  updates: number;
  time: string;
}

export default function VirmuktoLift() {
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [loading, setLoading] = useState(true); // ফিক্স: লোডিং স্টেট

  // ফিক্স: ডাটাবেজ থেকে রিয়েল-টাইম ডাটা রিড করা
  useEffect(() => {
    const liftsRef = ref(db, 'lifts');
    onValue(liftsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLifts(Object.values(data));
      } else {
        // প্রথমবার ডাটাবেজ খালি থাকলে ইনিশিয়ালাইজ করা
        const initial = [1,2,3,4,5,6].map(id => ({
          id, label: `লিফট ০${id}`, floor: "G", status: "ফাঁকা", trend: "idle", updates: 0, time: "এখন"
        }));
        set(ref(db, 'lifts'), initial);
      }
      setLoading(false);
    });
  }, []);

  // ফিক্স: ডাটাবেজে স্ট্যাটাস আপডেট পাঠানো
  const reportStatus = (id: number, newStatus: any) => {
    const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    
    // ডাটাবেজের সঠিক পাথে ডাটা রাইট করা (এটিই পিসি-মোবাইল সিঙ্ক করবে)
    set(ref(db, `lifts/${id - 1}/status`), newStatus);
    set(ref(db, `lifts/${id - 1}/time`), now);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">সিঙ্ক হচ্ছে...</div>;

  return (
    <main className="min-h-screen bg-[#F4F7FE] text-slate-900 pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`* { font-family: 'Hind Siliguri', sans-serif !important; }`}</style>

      {/* --- স্মার্ট নেভিগেশন --- */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-200 animate-pulse">
              <Zap size={20} fill="white"/>
            </div>
            <h1 className="text-xl font-bold tracking-tight">ভিড়মুক্ত<span className="text-orange-600">লিফট</span></h1>
          </div>
          <button className="p-2 bg-slate-100 rounded-full text-slate-500 hover:rotate-180 transition-all duration-500">
            <RefreshCcw size={18} />
          </button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 pt-8">
        
        {/* --- ক্যাম্পাস অ্যালার্ট কার্ড --- */}
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] mb-2">Daffodil AB4 বিল্ডিং</p>
            <h2 className="text-2xl font-bold leading-tight mb-4">ক্লাস ধরার আগে লিফট এর <br/>জ্যাম দেখে নিন! 🚀</h2>
            <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white">লাইভ ডাটা আপডেট হচ্ছে</span>
            </div>
          </div>
          <Users size={120} className="absolute right-[-20px] bottom-[-20px] opacity-10" />
        </div>

        {/* --- লিফট কার্ড সেকশন --- */}
        <div className="space-y-6">
          {lifts.map(lift => (
            <div key={lift.id} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl text-slate-400">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{lift.label}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mt-1">
                      <Clock size={12}/> {lift.time} আপডেট করা হয়েছে
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest ${
                  lift.status === 'ফাঁকা' ? 'bg-green-100 text-green-600' :
                  lift.status === 'ভিড়' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {lift.status}
                </div>
              </div>

              {/* লাইভ ফ্লোর স্ট্যাটাস */}
              <div className="bg-slate-50 p-4 rounded-3xl mb-6 flex justify-between items-center border border-slate-100">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">বর্তমান অবস্থান</p>
                  <span className="text-lg font-black text-slate-800">{lift.floor} তলা</span>
                </div>
                {lift.trend === 'up' ? <ArrowUpCircle className="text-green-500"/> : <ArrowDownCircle className="text-red-500"/>}
              </div>

              {/* রিপোর্ট করার বাটন */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">আপনার রিপোর্ট দিন</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => reportStatus(lift.id, "ফাঁকা")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-green-600 hover:text-white transition-all active:scale-95 border border-slate-100">ফাঁকা</button>
                <button onClick={() => reportStatus(lift.id, "ভিড়")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-orange-500 hover:text-white transition-all active:scale-95 border border-slate-100">ভিড়</button>
                <button onClick={() => reportStatus(lift.id, "জ্যাম")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-slate-100">জ্যাম</button>
              </div>
            </div>
          ))}
        </div>

        {/* --- ফুটার --- */}
        <footer className="mt-20 text-center">
            <div className="w-12 h-1 bg-orange-200 mx-auto mb-6 rounded-full"></div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em] mb-2">Made for DIU Students</p>
            <p className="text-sm font-bold text-slate-900 uppercase">ডেভেলপার: <span className="underline decoration-orange-500 decoration-4 underline-offset-4">মাসুম বিল্লাহ</span></p>
        </footer>

      </div>
    </main>
  );
}