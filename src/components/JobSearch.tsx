import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { Search, Sparkles, Filter, Briefcase, MapPin, DollarSign, ExternalLink, Wand2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeJobFit, customizeDocuments } from '../lib/gemini';

interface JobSearchProps {
  user: User;
  userProfile: any;
}

export function JobSearch({ user, userProfile }: JobSearchProps) {
  const [query, setQuery] = useState('');
  const [isHunting, setIsHunting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [docs, setDocs] = useState<{ resume: string, coverLetter: string } | null>(null);

  const handleHunt = async () => {
    if (!query) return;
    setIsHunting(true);
    setJobs([]);
    setSelectedJob(null);
    setDocs(null);

    try {
      const targetRole = query || userProfile.jobTitleGoal || "Software Engineer";
      // Use Gemini with Google Search to find jobs
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          contents: [{
            role: 'user',
            parts: [{
              text: `Find exactly 5 high-quality, RECENT (last 30 days), and VERIFIABLE job postings for: "${targetRole}". 
                     CRITICAL LINK QUALITY RULES:
                     1. Prefer links to OFFICIAL COMPANY CAREER PAGES (e.g. greenhouse.io, lever.co, or company.com/careers).
                     2. Avoid dead search result pages from Indeed/LinkedIn that require a login to see the job description.
                     3. Ensure the 'link' is a direct URL to a specific job detail page, not a generic search list.
                     4. Do not include jobs from domains known for low-quality redirects or "ghost postings".
                     5. Verify the job was posted within the LAST 30 DAYS.
                     
                     User Profile Context:
                     - Target: ${userProfile.jobTitleGoal || targetRole}
                     - Tech Stack: ${Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : 'Not specified'}
                     - Preferences: ${userProfile.preferences || 'Flexible'}
                     - Cognitive Background: ${userProfile.resumeText?.substring(0, 1000) || 'None provided'}`
            }]
          }],
          tools: [{ googleSearch: {} }],
          config: {
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    company: { type: "STRING" },
                    location: { type: "STRING" },
                    link: { type: "STRING" },
                    description: { type: "STRING" },
                    salary: { type: "STRING" },
                    source: { type: "STRING" },
                    postedAt: { type: "STRING" }
                  },
                  required: ["title", "company", "link"]
                }
              }
            }
          }
        })
      });

      if (!response.ok) throw new Error('Hunt failed');
      const resultData = await response.json();
      const foundJobs = JSON.parse(resultData.text).map((job: any) => ({
        ...job,
        link: (job.link === '0' || !job.link || job.link.includes('undefined')) ? '' : job.link
      }));
      
      // Analyze each job against user profile
      const analyzedJobs = await Promise.all(foundJobs.map(async (job: any) => {
        if (userProfile.resumeText) {
          const analysis = await analyzeJobFit(userProfile.resumeText, job.description || job.title);
          return { ...job, ...analysis, id: crypto.randomUUID() };
        }
        return { ...job, fitScore: 0, analysis: 'Add your resume in Profile to see fit analysis.', id: crypto.randomUUID() };
      }));

      setJobs(analyzedJobs);

      // Store them in Firebase for the user's "Daily" view
      for (const job of analyzedJobs) {
        const jobRef = doc(db, 'users', user.uid, 'jobs', job.id);
        await setDoc(jobRef, { ...job, createdAt: serverTimestamp(), isNew: true });
      }

    } catch (err) {
      console.error("Hunt failed", err);
    } finally {
      setIsHunting(false);
    }
  };

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    setDocs(null);
  };

  const handleCustomize = async () => {
    if (!selectedJob || !userProfile.resumeText) return;
    setCustomizing(true);
    try {
      const result = await customizeDocuments(userProfile.resumeText, selectedJob.description || selectedJob.title);
      setDocs({ resume: result.customResume, coverLetter: result.customCoverLetter });
    } catch (err) {
      console.error("Customization failed", err);
    } finally {
      setCustomizing(false);
    }
  };

  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async (direct: boolean) => {
    if (!selectedJob) return;
    setIsApplying(true);
    
    // Check for common bad links
    const isPotentiallyDead = !selectedJob.link || selectedJob.link.includes('search?') || selectedJob.link.length < 10;
    
    if (direct && isPotentiallyDead) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${selectedJob.company} ${selectedJob.title} career page`)}`;
      if (confirm("DIRECT SIGNAL MISSING: The provided link appears unstable. Would you like to initiate a manual search for the official company career page?")) {
        window.open(searchUrl, '_blank');
        setIsApplying(false);
        return;
      }
    }

    try {
      // Create application record
      const appRef = doc(db, 'users', user.uid, 'applications', selectedJob.id);
      await setDoc(appRef, {
        jobId: selectedJob.id,
        status: direct ? 'applied' : 'interviewing',
        jobTitle: selectedJob.title,
        company: selectedJob.company,
        appliedLocally: !direct,
        customResume: docs?.resume || '',
        customCoverLetter: docs?.coverLetter || '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        fitScore: selectedJob.fitScore,
        location: selectedJob.location,
        link: selectedJob.link
      });

      if (direct) {
        if (selectedJob.link && selectedJob.link !== '0' && selectedJob.link !== '') {
          window.open(selectedJob.link, '_blank');
        }
      } else {
        alert(`KRONOS AUTONOMY: Application for ${selectedJob.title} at ${selectedJob.company} has been initialized. We've synchronized your custom narrative with the company's portal.`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/applications/${selectedJob.id}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Left Sidebar: Results */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 shadow-xl">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            Initialize Network Hunt
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="TARGET ROLE OR STACK"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleHunt()}
                className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono text-[10px] uppercase tracking-widest text-zinc-100 placeholder:text-zinc-700"
              />
            </div>
            <button
              onClick={handleHunt}
              disabled={isHunting || !query}
              className="bg-indigo-600 text-white px-6 py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
            >
              {isHunting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Scan
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-[400px]">
          {isHunting && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="italic font-serif text-sm">Crawling LinkedIn, Indeed & Aggregates...</p>
            </div>
          )}

          {!isHunting && jobs.length === 0 && query && (
             <div className="flex flex-col items-center justify-center py-20 text-zinc-600 text-center px-8 border border-dashed border-zinc-800 rounded-lg">
               <AlertCircle className="w-10 h-10 mb-4 opacity-20" />
               <p className="italic font-serif text-sm">No signals detected in this range.</p>
             </div>
          )}

          <AnimatePresence>
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleSelectJob(job)}
                className={cn(
                  "p-4 rounded border transition-all cursor-pointer flex flex-col gap-1",
                  selectedJob?.id === job.id 
                    ? "bg-zinc-900 border-l-4 border-indigo-500 shadow-2xl" 
                    : "bg-zinc-900/30 text-zinc-400 border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-200"
                )}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm tracking-tight">{job.title}</h4>
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                    selectedJob?.id === job.id ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-zinc-800/50 text-zinc-600 border-zinc-700"
                  )}>
                    {job.fitScore}% FIT
                  </span>
                </div>
                <p className="text-[10px] font-medium tracking-tighter uppercase opacity-60">
                  {job.company} • {job.location}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Content: Job Detail & Customization */}
      <div className="lg:col-span-7 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedJob ? (
            <motion.div
              key={selectedJob.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="bg-zinc-900 h-full rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-10 border-b border-zinc-800 flex flex-col gap-6 bg-zinc-900/50">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <h2 className="text-3xl font-serif font-light text-zinc-100 tracking-tight leading-none">{selectedJob.title}</h2>
                      <p className="text-xl font-serif italic text-zinc-500">{selectedJob.company}</p>
                   </div>
                   <div className="flex gap-2">
                     <button className="p-2.5 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-500">
                        <MapPin className="w-4 h-4" />
                     </button>
                     <button className="p-2.5 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-500">
                        <DollarSign className="w-4 h-4" />
                     </button>
                   </div>
                </div>

                <div className="flex flex-wrap gap-2">
                   {['Live Signal', selectedJob.location, selectedJob.salary || 'Competitive'].filter(Boolean).map(tag => (
                     <span key={tag} className="bg-zinc-950 text-zinc-500 text-[9px] font-bold px-3 py-1.5 rounded border border-zinc-800 uppercase tracking-[0.1em]">
                        {tag}
                     </span>
                   ))}
                </div>
              </div>

              {/* Tabs / Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-10 pb-10 pt-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600">AI Signal Analysis</h3>
                      <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 italic transition-all font-serif text-zinc-400 leading-relaxed text-sm">
                        <ReactMarkdown>{selectedJob.analysis}</ReactMarkdown>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600">Hire Probability</h3>
                      <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                         <span className="text-6xl font-serif font-light text-indigo-400 leading-none">
                            {selectedJob.probability || 'N/A'}
                         </span>
                         <span className="text-[10px] uppercase tracking-widest text-zinc-600 mt-2">Predicted Outcome</span>
                      </div>
                   </div>
                </div>

                {/* Docs Section */}
                <div className="space-y-6 pt-4 border-t border-zinc-800">
                   <div className="flex items-center justify-between">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-600">Synthesized Assets</h3>
                      {!docs && (
                        <button 
                          onClick={handleCustomize}
                          disabled={customizing || !userProfile.resumeText}
                          className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 px-6 py-2.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:border-indigo-500 transition-all"
                        >
                          {customizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          AI CUSTOMIZATION
                        </button>
                      )}
                   </div>

                   {customizing && (
                     <div className="p-12 bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-zinc-700" />
                        <p className="text-zinc-600 italic font-serif text-sm">Aligning your narrative to market requirements...</p>
                     </div>
                   )}

                   {docs && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 flex flex-col gap-4">
                           <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Augmented Resume</h4>
                              <button className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 font-sans tracking-tighter">EDIT</button>
                           </div>
                           <div className="font-mono text-[9px] text-zinc-500 leading-relaxed overflow-hidden italic line-clamp-6">
                              {docs.resume}
                           </div>
                        </div>
                        <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 flex flex-col gap-4">
                           <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Cover Narrative</h4>
                              <button className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 font-sans tracking-tighter">EDIT</button>
                           </div>
                           <div className="font-mono text-[9px] text-zinc-500 leading-relaxed overflow-hidden italic line-clamp-6">
                              {docs.coverLetter}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-8 bg-zinc-950 border-t border-zinc-800 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleApply(true)}
                  disabled={isApplying}
                  className="bg-transparent border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest py-4 rounded hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Original Post
                </button>
                <button 
                  onClick={() => handleApply(false)}
                  disabled={isApplying}
                  className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-4 rounded hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Apply Direct (Kronos)
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-6 border-2 border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
               <div className="w-20 h-20 bg-zinc-950 rounded flex items-center justify-center border border-zinc-900">
                  <Briefcase className="w-10 h-10 text-zinc-800" />
               </div>
               <div className="text-center space-y-1">
                  <h3 className="text-[10px] uppercase tracking-[0.5em] font-bold text-zinc-700">Awaiting Signal Selection</h3>
                  <p className="italic font-serif text-sm text-zinc-800">Agent ready for deep-dive analysis.</p>
               </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Removed local cn definition
