import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Briefcase, Linkedin, FileText, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { PDFUploader } from './PDFUploader';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface OnboardingProps {
  user: any;
  onComplete: (updatedProfile: any) => void;
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [data, setData] = useState({
    jobTitleGoal: '',
    linkedinUrl: '',
    resumeText: '',
    preferences: ''
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS') {
        const { profile } = event.data;
        updateData('linkedinUrl', profile.picture || `https://linkedin.com/`);
        alert(`KRONOS LINKED: Synchronized with LinkedIn: ${profile.name || 'User'}`);
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
        alert("LinkedIn Integration not configured in Neural settings.");
        return;
      }
      window.open(url, 'linkedin_auth', 'width=600,height=700');
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  const updateData = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedProfile = {
        ...data,
        isOnboarded: true,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updatedProfile);
      onComplete(updatedProfile);
    } catch (err) {
      console.error('Onboarding update failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-900 rounded-full mb-12 overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600"
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center mb-6">
                   <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-serif font-light text-zinc-100">What is your objective?</h1>
                <p className="text-zinc-500 italic font-serif">Tell us the role you are targeting and link your identity.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600 mb-2 block">Target Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Product Engineer"
                    value={data.jobTitleGoal}
                    onChange={(e) => updateData('jobTitleGoal', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-4 text-zinc-100 placeholder:opacity-30 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600 mb-2 block">LinkedIn Identity</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourname"
                        value={data.linkedinUrl}
                        onChange={(e) => updateData('linkedinUrl', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-4 pl-12 text-zinc-100 placeholder:opacity-30 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleConnectLinkedIn}
                      disabled={connecting}
                      className="bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 px-6 rounded hover:bg-indigo-600/20 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!data.jobTitleGoal}
                className="w-full bg-white text-zinc-950 font-bold text-[10px] uppercase tracking-[0.3em] py-5 rounded hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
              >
                Continue Signal Processing <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center mb-6">
                   <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-serif font-light text-zinc-100">Upload your Neural Weights.</h1>
                <p className="text-zinc-500 italic font-serif">Upload your PDF resume so Kronos can analyze your competitive edge.</p>
              </div>

              <PDFUploader 
                onTextExtracted={(text) => updateData('resumeText', text)} 
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-950 px-4 text-zinc-600 tracking-widest font-bold">OR PASTE RAW DATA</span>
                </div>
              </div>

              <textarea
                placeholder="Paste your resume text here..."
                value={data.resumeText}
                onChange={(e) => updateData('resumeText', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-6 text-xs font-mono text-zinc-400 placeholder:opacity-30 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all h-48 resize-none"
              />

              <button
                onClick={handleNext}
                disabled={!data.resumeText}
                className="w-full bg-white text-zinc-950 font-bold text-[10px] uppercase tracking-[0.3em] py-5 rounded hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
              >
                Analyze Experience <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400"
              >
                Modify Identity
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center mb-6">
                   <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-serif font-light text-zinc-100">Optimization Parameters?</h1>
                <p className="text-zinc-500 italic font-serif">Any specific constraints or desires for the search?</p>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600 mb-2 block">Preferences</label>
                <textarea
                  placeholder="e.g. Remote only, Senior level, Fintech, European contracts..."
                  value={data.preferences}
                  onChange={(e) => updateData('preferences', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-6 text-xs font-mono text-zinc-400 placeholder:opacity-30 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all h-32 resize-none"
                />
              </div>

              <div className="bg-zinc-900/50 p-6 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 leading-relaxed italic font-serif text-center">
                  "By completing this sequence, you authorize Kronos Agent to synthesize application narratives and scan the global job pool using your provided cognitive weights."
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-[0.3em] py-5 rounded hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Initialize Agent Core
              </button>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400"
              >
                Verify Data Sequence
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
