import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { Search, ExternalLink, Trash2, Calendar, CheckCircle2, XCircle, Clock, MessageSquare, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface TrackerProps {
  user: User;
}

const STATUS_COLORS: any = {
  potential: 'bg-neutral-100 text-neutral-600',
  interested: 'bg-blue-100 text-blue-700',
  reviewing_resume: 'bg-amber-100 text-amber-700',
  applied: 'bg-emerald-100 text-emerald-700',
  interviewing: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
  offer: 'bg-green-100 text-green-700'
};

export function ApplicationTracker({ user }: TrackerProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'applications'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/applications`));

    return unsubscribe;
  }, [user.uid]);

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      const appRef = doc(db, 'users', user.uid, 'applications', appId);
      await updateDoc(appRef, { status: newStatus, updatedAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/applications/${appId}`);
    }
  };

  const deleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to remove this application from your tracker?")) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'applications', appId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/applications/${appId}`);
    }
  };

  const filteredApps = applications.filter(app => filter === 'all' || app.status === filter);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-serif font-light tracking-tight text-zinc-100 mb-1">Application Lifecycle</h1>
           <p className="text-zinc-500 font-serif italic text-lg">Manage and monitor your journey with each signal.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 p-2 border border-zinc-800 rounded-lg shadow-sm">
           <Filter className="w-4 h-4 text-zinc-500 ml-2" />
           <select 
             value={filter} 
             onChange={(e) => setFilter(e.target.value)}
             className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-zinc-400 focus:outline-none pr-8 py-2 appearance-none cursor-pointer"
           >
             <option value="all">Global Pipeline</option>
             <option value="applied">Applied</option>
             <option value="interviewing">Interviewing</option>
             <option value="offer">Offer Received</option>
             <option value="rejected">Rejected</option>
           </select>
        </div>
      </header>

      <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Signal Target</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">Lifecycle Stage</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Match Accuracy</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Activity Log</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <AnimatePresence>
                {filteredApps.map((app, i) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "group hover:bg-zinc-800/30 transition-colors",
                      app.status === 'rejected' && "opacity-40"
                    )}
                  >
                    <td className="px-8 py-4">
                       <div className="flex flex-col">
                          <span className="font-semibold text-zinc-100 tracking-tight">{app.jobTitle}</span>
                          <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-tighter">{app.company}</span>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex justify-center">
                         <div className="relative inline-block">
                           <select
                             value={app.status}
                             onChange={(e) => updateStatus(app.id, e.target.value)}
                             className={cn(
                               "text-[9px] font-bold px-3 py-1 rounded border appearance-none pr-8 cursor-pointer border-zinc-700 bg-zinc-800",
                               STATUS_COLORS[app.status]
                             )}
                           >
                              {Object.keys(STATUS_COLORS).map(s => (
                                <option key={s} value={s} className="bg-zinc-900">{s.replace('_', ' ').toUpperCase()}</option>
                              ))}
                           </select>
                           <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-zinc-400">{app.fitScore}%</span>
                          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                             <div 
                               className={cn(
                                 "h-full rounded-full transition-all duration-1000",
                                 app.fitScore > 80 ? "bg-emerald-500" : app.fitScore > 60 ? "bg-indigo-500" : "bg-zinc-600"
                               )} 
                               style={{ width: `${app.fitScore}%` }} 
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-mono uppercase">
                             <Calendar className="w-3 h-3" />
                             <span>Update: {format(new Date(app.updatedAt), 'MMM dd')}</span>
                          </div>
                          {app.appliedLocally && (
                            <div className="flex items-center gap-1.5 text-indigo-400 text-[9px] font-bold uppercase tracking-widest">
                               <CheckCircle2 className="w-3 h-3" />
                               KRONOS DIRECT
                            </div>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 text-zinc-500 hover:text-zinc-200">
                             <MessageSquare className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => deleteApp(app.id)}
                            className="p-2 rounded border border-zinc-800 hover:border-red-900/50 bg-zinc-950/50 text-zinc-500 hover:text-red-400"
                          >
                             <Trash2 className="w-3 h-3" />
                          </button>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredApps.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 bg-zinc-950 rounded flex items-center justify-center mb-6 border border-zinc-900 shadow-inner">
               <ClipboardList className="w-8 h-8 text-zinc-800" />
            </div>
            <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-700 mb-2">Cycle Empty</h3>
            <p className="text-zinc-800 italic font-serif text-sm max-w-xs mx-auto">No signals detected in the tracker. Deploy a scan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Removed local cn definition

const ClipboardList = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
