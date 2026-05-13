import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { User as UserIcon, Mail, FileText, Save, CheckCircle2, Loader2, Info, Linkedin, Briefcase, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { PDFUploader } from './PDFUploader';

interface ProfileProps {
  user: User;
  userProfile: any;
  onProfileUpdate: (updated: any) => void;
}

export function ProfileSettings({ user, userProfile, onProfileUpdate }: ProfileProps) {
  const [resumeText, setResumeText] = useState(userProfile?.resumeText || '');
  const [preferences, setPreferences] = useState(userProfile?.preferences || '');
  const [linkedinUrl, setLinkedinUrl] = useState(userProfile?.linkedinUrl || '');
  const [jobTitleGoal, setJobTitleGoal] = useState(userProfile?.jobTitleGoal || '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS') {
        const { profile } = event.data;
        // LinkedIn OpenID profile often has 'sub' as id, 'name' or 'given_name'/'family_name'
        // This depends on exactly which response you get from OpenID
        // We'll use a placeholder URL if we don't have the vanity URL
        setLinkedinUrl(profile.picture || `https://linkedin.com/`);
        alert(`KRONOS LINKED: Synchronized with LinkedIn identity: ${profile.name || 'User'}`);
      }
      if (event.data?.type === 'LINKEDIN_AUTH_ERROR') {
        alert("LINKEDIN SYNC FAILED: Check parameters and authority permissions.");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectLinkedIn = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/auth/linkedin/url');
      const { url } = await response.json();
      
      if (!url || url === '') {
        alert("LinkedIn Integration not configured. Set VITE_LINKEDIN_CLIENT_ID in settings.");
        return;
      }

      const authWindow = window.open(url, 'linkedin_auth', 'width=600,height=700');
      if (!authWindow) alert("Popup blocked. Authorized signals require active popups.");
    } catch (err) {
      console.error('LinkedIn auth error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        resumeText,
        preferences,
        linkedinUrl,
        jobTitleGoal,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updatedData);
      onProfileUpdate({ ...userProfile, ...updatedData });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-12 h-full pb-20">
      <header>
          <h1 className="text-4xl font-serif font-light tracking-tight text-zinc-100 mb-2">Neural Lab</h1>
          <p className="text-zinc-500 font-serif italic text-lg">Power your agent with your cognitive background and search parameters.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
           <section className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                 <div className="w-10 h-10 bg-zinc-950 rounded flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-zinc-600" />
                 </div>
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 font-sans">Cognitive Identity</h3>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">Entity Name</label>
                    <div className="bg-zinc-950 px-4 py-3 rounded border border-zinc-800 italic transition-all font-serif text-zinc-300">
                      {user.displayName}
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">Communication Node</label>
                    <div className="flex items-center gap-3 bg-zinc-950 px-4 py-3 rounded border border-zinc-800 italic transition-all font-serif text-zinc-300">
                      <Mail className="w-4 h-4 opacity-30" /> {user.email}
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">LinkedIn Vector (URL)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input 
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 pl-11 text-xs font-mono text-zinc-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleConnectLinkedIn}
                        disabled={connecting}
                        className="bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 px-4 rounded hover:bg-indigo-600/20 transition-all flex items-center justify-center disabled:opacity-50"
                        title="Authorize via LinkedIn"
                      >
                        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      </button>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">Search Objective</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="text"
                        value={jobTitleGoal}
                        onChange={(e) => setJobTitleGoal(e.target.value)}
                        placeholder="Target role..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 pl-11 text-xs font-mono text-zinc-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                 </div>
              </div>
           </section>

           <section className="bg-indigo-600 text-white p-8 rounded-lg shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col gap-4">
                 <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                    <Info className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-serif font-light tracking-tight italic">Privacy Protocol</h3>
                 <p className="text-xs text-indigo-100 leading-relaxed font-serif italic opacity-80">
                   Your neural weights (resume) and vector preferences are analyzed in-situ by Gemini models. No data egresses to third-party endpoints without active signal initiation.
                 </p>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/5 rounded-full blur-2xl opacity-50" />
           </section>
        </div>

        <div className="space-y-8">
           <section className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-xl flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-950 rounded flex items-center justify-center">
                       <FileText className="w-5 h-5 text-zinc-600" />
                    </div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 font-sans">Resume Vector</h3>
                 </div>
                 {justSaved && (
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                     <CheckCircle2 className="w-3 h-3" /> PERSISTED
                   </motion.div>
                 )}
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-2 block">Upload Sequence</label>
                    <PDFUploader onTextExtracted={setResumeText} className="mb-4" />
                 </div>

                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">Raw Data Stream</label>
                    <textarea 
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Input resume data sequence..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-6 text-[10px] font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all resize-none leading-relaxed text-zinc-400 placeholder:opacity-30 h-48"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 mb-1 block">Optimization Parameters</label>
                    <textarea 
                      value={preferences}
                      onChange={(e) => setPreferences(e.target.value)}
                      placeholder="e.g. Filter for Distributed Systems, Senior Level..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-6 py-4 text-[10px] font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all resize-none text-zinc-400 placeholder:opacity-30 h-24"
                    />
                 </div>

                 <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-[0.3em] py-4 px-6 rounded transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                 >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Commit to Core
                 </button>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
