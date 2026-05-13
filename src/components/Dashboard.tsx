import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { Sparkles, TrendingUp, Clock, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  user: User;
  userProfile: any;
  onSwitchTab: (tab: string) => void;
}

export function Dashboard({ user, userProfile, onSwitchTab }: DashboardProps) {
  const [stats, setStats] = useState({
    active: 0,
    interviewing: 0,
    offers: 0
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'jobs'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/jobs`));

    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'applications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => doc.data());
      setStats({
        active: apps.filter(a => ['applied', 'interested'].includes(a.status)).length,
        interviewing: apps.filter(a => a.status === 'interviewing').length,
        offers: apps.filter(a => a.status === 'offer').length
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/applications`));

    return unsubscribe;
  }, [user.uid]);

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-serif font-light tracking-tight text-zinc-100 leading-[1.1]">
          Inbound Intelligence. <br/>
          <span className="text-zinc-600 italic">Analysis for {user.displayName?.split(' ')[0]}.</span>
        </h1>
        {userProfile.jobTitleGoal && (
           <p className="text-[10px] uppercase tracking-[0.4em] text-indigo-400 font-bold">Target Vector: {userProfile.jobTitleGoal}</p>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Pipeline', value: stats.active, icon: TrendingUp, color: 'text-indigo-400' },
          { label: 'Live Interviews', value: stats.interviewing, icon: Clock, color: 'text-amber-400' },
          { label: 'Proposals', value: stats.offers, icon: CheckCircle, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 flex items-center justify-between shadow-xl"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{stat.label}</p>
              <p className="text-4xl font-mono font-medium text-zinc-100">{stat.value.toString().padStart(2, '0')}</p>
            </div>
            <stat.icon className={cn("w-10 h-10 opacity-30", stat.color)} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Daily Picks */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Morning Briefing
            </h2>
          </div>

          <div className="space-y-4">
            {recentJobs.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p className="text-zinc-500 italic font-serif text-sm">Kronos hasn't detected new matches. Scan the network.</p>
                <button 
                  onClick={() => onSwitchTab('search')}
                  className="mt-4 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300"
                >
                  Initiate Hunt
                </button>
              </div>
            ) : (
              recentJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => onSwitchTab('search')} />
              ))
            )}
          </div>
        </section>

        {/* Motivational Card / Quick Actions */}
        <section className="space-y-8">
           <div className="bg-indigo-600 text-white p-12 rounded-lg relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-3xl font-serif font-light mb-4 leading-tight">Augment your strategy.</h3>
                <p className="text-indigo-100 mb-8 max-w-sm text-sm italic font-serif">"The future isn't something you wait for; it's something you build."</p>
                <button 
                  onClick={() => onSwitchTab('search')}
                  className="bg-white text-zinc-950 text-xs font-bold uppercase tracking-widest py-3 px-8 rounded hover:bg-zinc-100 transition-all shadow-xl"
                >
                  Open Hunt Lab
                </button>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50" />
           </div>

           <div className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-xl">
             <h4 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6">Strategic Insight</h4>
             <p className="text-xl font-serif italic text-zinc-300 leading-relaxed">
               "Your narrative is a series of weights in a neural network. Tune them correctly, and the path opens."
             </p>
             <p className="mt-4 text-[10px] font-mono text-zinc-500">— ANALYTIC HUB</p>
           </div>
        </section>
      </div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: any, onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-indigo-500/50 transition-all flex flex-col gap-4 shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-zinc-100 text-base tracking-tight">{job.title}</h4>
            {job.isNew && <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">Live</span>}
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-tighter">{job.company} • {job.location}</p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded text-[10px] font-mono font-bold border",
          job.fitScore > 80 ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : 
          job.fitScore > 60 ? "bg-indigo-500/5 text-indigo-400 border-indigo-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
        )}>
          MATCH: {job.fitScore}%
        </div>
      </div>
      
      <div className="text-sm text-zinc-400 line-clamp-2 italic font-serif">
        <ReactMarkdown>{job.analysis}</ReactMarkdown>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono uppercase">
           <Clock className="w-3 h-3" /> Detect: {job.postedAt || 'Latest'}
        </span>
        <button className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 hover:text-indigo-400 transition-colors uppercase tracking-[0.2em]">
          Inspect <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// Minimal helper repeat for cn (Removed as now imported)
