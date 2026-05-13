/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/utils';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { JobSearch } from './components/JobSearch';
import { ApplicationTracker } from './components/ApplicationTracker';
import { ProfileSettings } from './components/ProfileSettings';
import { Onboarding } from './components/Onboarding';
import { SkillsLab } from './components/SkillsLab';
import { LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await ensureUserProfile(user);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const ensureUserProfile = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const initialProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          resumeText: '',
          skills: [],
          preferences: '',
          isOnboarded: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
      } else {
        setUserProfile(userSnap.data());
      }
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setUserProfile(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-12 relative z-10"
        >
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center shadow-2xl shadow-indigo-600/20">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-sans font-bold tracking-tight text-white uppercase">
                 Kronos<span className="text-indigo-500 italic font-black">Agent</span>
              </h1>
              <p className="text-zinc-500 font-serif italic text-lg opacity-80">Autonomous Job Intelligence & Career Synthesis.</p>
            </div>
          </div>

          <div className="bg-zinc-900 p-10 rounded-xl border border-zinc-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col gap-8">
            <div className="space-y-3">
               <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-500 text-center">Session Authentication</h2>
               <p className="text-xs text-zinc-400 text-center leading-relaxed italic font-serif">
                 Access your cognitive profile and global hunt pipeline via secure Google node.
               </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 font-bold text-[10px] uppercase tracking-[0.2em] py-4 px-6 rounded hover:bg-zinc-100 transition-all shadow-xl"
            >
              <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
              Authenticate with Google
            </button>
            
            <div className="pt-4 border-t border-zinc-800">
               <div className="flex justify-between text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">
                  <span>Status: READY</span>
                  <span>Ver: 2.1.0-K</span>
               </div>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            © 2026 KRONOS TECHNOLOGIES • SECURED BY GEN-AI
          </p>
        </motion.div>
      </div>
    );
  }

  if (userProfile && !userProfile.isOnboarded) {
    return <Onboarding user={user} onComplete={(updated) => setUserProfile({ ...userProfile, ...updated })} />;
  }

  return (
    <Layout user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          {activeTab === 'dashboard' && <Dashboard user={user} userProfile={userProfile} onSwitchTab={setActiveTab} />}
          {activeTab === 'search' && <JobSearch user={user} userProfile={userProfile} />}
          {activeTab === 'tracker' && <ApplicationTracker user={user} />}
          {activeTab === 'skills' && <SkillsLab userProfile={userProfile} />}
          {activeTab === 'profile' && (
            <ProfileSettings 
              user={user} 
              userProfile={userProfile} 
              onProfileUpdate={(updated) => setUserProfile(updated)} 
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

