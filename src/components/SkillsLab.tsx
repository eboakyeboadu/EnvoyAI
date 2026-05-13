import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, TrendingUp, Target, MapPin, Building2, BrainCircuit, Loader2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface SkillsLabProps {
  userProfile: any;
}

export function SkillsLab({ userProfile }: SkillsLabProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    fetchInsights();
  }, [userProfile.jobTitleGoal]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze skill market trends for: "${userProfile.jobTitleGoal || 'Software Engineer'}".
        Context:
        - Job Title Goal: ${userProfile.jobTitleGoal}
        - Current Skills: ${userProfile.skills?.join(', ')}
        - Preferences: ${userProfile.preferences}
        
        Provide a JSON response with:
        1. trendingSkills: Array of { name: string, growth: number (0-100), reason: string }
        2. regionalDemand: Array of { region: string, score: number (0-100) }
        3. industryInsights: string (short paragraph)
        4. gapAnalysis: Array of string (skills missing to reach the goal)
        5. topCompanies: Array of string
        
        Return ONLY valid JSON.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error('Insights fetch failed');
      const result = await response.json();
      const cleanJson = result.text.replace(/```json|```/g, "").trim();
      setInsights(JSON.parse(cleanJson));
    } catch (err) {
      console.error('Failed to fetch skill insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <BrainCircuit className="w-8 h-8 text-indigo-500" />
        </motion.div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Synthesizing Market Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-12 pb-20">
      <header className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-serif font-light tracking-tight text-zinc-100">Skills Lab</h1>
            <div className="px-2 py-0.5 border border-indigo-500/30 rounded text-indigo-400 text-[8px] font-bold uppercase tracking-widest mt-2">v2.0 Beta</div>
          </div>
          <p className="text-zinc-500 font-serif italic text-lg max-w-2xl">
            Real-time industry telemetry and cognitive gap analysis for the {userProfile.jobTitleGoal || 'target'} vector.
          </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Growth Chart */}
        <section className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <TrendingUp className="w-5 h-5 text-emerald-400" />
               <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Skill Velocity Index</h2>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights?.trendingSkills}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '4px' }}
                  itemStyle={{ fontSize: '10px', color: '#a1a1aa' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                  {insights?.trendingSkills?.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`rgba(99, 102, 241, ${0.4 + (index * 0.15)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Global Demand Heat */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
             <MapPin className="w-5 h-5 text-indigo-400" />
             <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Regional Gravity</h2>
          </div>
          
          <div className="space-y-6 flex-1">
            {insights?.regionalDemand?.map((region: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-zinc-300">{region.region}</span>
                  <span className="text-indigo-400">{region.score}% Demand</span>
                </div>
                <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${region.score}%` }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Industry Narrative */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
             <BrainCircuit className="w-5 h-5 text-amber-400" />
             <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Cognitive Gap Analysis</h2>
          </div>
          <div className="space-y-4">
            {insights?.gapAnalysis?.map((gap: string, i: number) => (
              <div key={i} className="flex gap-3 text-xs text-zinc-400 italic">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                <p>{gap}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Top Entities */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
             <Building2 className="w-5 h-5 text-zinc-400" />
             <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">Leading Nodes [Companies]</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
            {insights?.topCompanies?.map((company: string, i: number) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 p-3 rounded text-zinc-500 uppercase tracking-tighter">
                {company}
              </div>
            ))}
          </div>
        </section>

        {/* Industry Signal */}
        <section className="bg-indigo-600 p-8 rounded-lg shadow-2xl text-white space-y-6">
           <div className="flex items-center gap-3 border-b border-white/20 pb-4">
             <Sparkles className="w-5 h-5" />
             <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold">Strategic Synthesis</h2>
          </div>
          <p className="text-xl font-serif italic leading-relaxed opacity-90">
            "{insights?.industryInsights}"
          </p>
        </section>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={fetchInsights}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 hover:text-indigo-400 transition-all flex items-center gap-2 group"
        >
          <Loader2 className="w-3 h-3 group-hover:animate-spin" /> Recalibrate Market Feed
        </button>
      </div>
    </div>
  );
}
