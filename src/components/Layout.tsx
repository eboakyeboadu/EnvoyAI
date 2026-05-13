import { User } from 'firebase/auth';
import { Home, Search, ClipboardList, User as UserIcon, LogOut, Sparkles, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function Layout({ children, user, activeTab, onTabChange, onLogout }: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Intelligence', icon: Home },
    { id: 'search', label: 'Hunter', icon: Search },
    { id: 'tracker', label: 'Tracker', icon: ClipboardList },
    { id: 'skills', label: 'Skills Lab', icon: BrainCircuit },
    { id: 'profile', label: 'Neural Lab', icon: UserIcon },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight uppercase">Kronos<span className="text-indigo-500 font-black italic">Agent</span></span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all uppercase tracking-widest",
                activeTab === item.id
                  ? "bg-zinc-900 text-indigo-400 border-l-2 border-indigo-500"
                  : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-800 italic font-serif text-sm text-zinc-600 bg-zinc-900/30">
           "The best way to predict the future is to create it."
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3 p-3 mb-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-100 truncate uppercase tracking-tighter">{user.displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Deactivate Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-zinc-950">
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-12 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
           <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              Agent Status: <span className="text-emerald-500">Live</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Global Job Pool</p>
                <p className="text-[10px] font-mono text-indigo-400">SYNCED</p>
              </div>
           </div>
        </div>
        <div className="max-w-7xl mx-auto p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
