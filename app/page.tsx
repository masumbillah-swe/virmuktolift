"use client";
import { db } from "./firebase";
import { useState, useEffect } from "react";
import { 
  ArrowUpCircle, ArrowDownCircle, Users, Zap, RefreshCcw, 
  MapPin, Clock, Info, ChevronRight, AlertTriangle 
} from "lucide-react";

// লিফট ডাটা স্ট্রাকচার
interface Lift {
  id: number;
  label: string;
  floor: string;
  status: "ফাঁকা" | "ভিড়" | "জ্যাম";
  trend: "up" | "down" | "idle";
  updates: number;
  time: string;
}

export default function VirmuktoLift() {
  const [lifts, setLifts] = useState<Lift[]>([
    { id: 1, label: "লিফট ০১", floor: "G", status: "ফাঁকা", trend: "idle", updates: 12, time: "২ মি. আগে" },
    { id: 2, label: "লিফট ০২", floor: "৪", status: "ভিড়", trend: "up", updates: 45, time: "এখন" },
    { id: 3, label: "লিফট ০৩", floor: "৯", status: "জ্যাম", trend: "down", updates: 89, time: "১ মি. আগে" },
    { id: 4, label: "লিফট ০৪", floor: "G", status: "ফাঁকা", trend: "idle", updates: 5, time: "৫ মি. আগে" },
    { id: 5, label: "লিফট ০৫", floor: "৬", status: "ভিড়", trend: "up", updates: 23, time: "এখন" },
    { id: 6, label: "লিফট ০৬", floor: "G", status: "জ্যাম", trend: "idle", updates: 120, time: "এখন" },
  ]);

  const [loading, setLoading] = useState(false);

  const reportStatus = (id: number, newStatus: any) => {
    setLoading(true);
    setLifts(prev => prev.map(l => 
      l.id === id ? { ...l, status: newStatus, time: "এইমাত্র" } : l
    ));
    setTimeout(() => setLoading(false), 600);
  };

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
            <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
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
              <span className="text-[11px] font-bold uppercase tracking-widest">লাইভ ডাটা আপডেট হচ্ছে</span>
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
                      <Clock size={12}/> {lift.time} আপডেট করা হয়েছে
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest ${
                  lift.status === 'ফাঁকা' ? 'bg-green-100 text-green-600' :
                  lift.status === 'ভিড়' ? 'bg-orange-100 text-orange-600' :
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
                <button onClick={() => reportStatus(lift.id, "ফাঁকা")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-green-600 hover:text-white transition-all active:scale-95">ফাঁকা</button>
                <button onClick={() => reportStatus(lift.id, "ভিড়")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-orange-500 hover:text-white transition-all active:scale-95">ভিড়</button>
                <button onClick={() => reportStatus(lift.id, "জ্যাম")} className="py-4 rounded-2xl bg-slate-50 text-[11px] font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95">জ্যাম</button>
              </div>
            </div>
          ))}
        </div>

        {/* --- কুইক গাইড --- */}
        <div className="mt-12 p-8 bg-orange-50 rounded-[40px] border border-orange-100 flex items-start gap-4">
          <AlertTriangle className="text-orange-500 shrink-0" size={24}/>
          <div>
            <h4 className="text-sm font-bold text-orange-900 mb-1">সঠিক তথ্য দিন</h4>
            <p className="text-[11px] font-bold text-orange-600/70 leading-relaxed italic">
              এই অ্যাপটি সবার উপকারের জন্য। লিফটে উঠার সময় জাস্ট একটি বাটন চেপে আপনার বন্ধুদের সময় বাঁচাতে সাহায্য করুন।
            </p>
          </div>
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