import { useState, useEffect, useRef, useId } from 'react';
import { generateAds, evaluateAd, generateImagePrompt, rewriteAd, runEnsembleEval } from './services/marketing-agent';
import type { AdIdea, AdEvaluation, VisualPrompt } from './services/marketing-agent';
import type { RewriteState } from './components/PersonaScoreCard';
import type { PersonaId, ParsedAdIdea } from './lib/schemas';
import { fetchTrends, type TrendsSnapshot } from './services/trends';
import { Loader2, Target, Image as ImageIcon, BarChart, CheckCircle, Copy, Check, Bookmark, Trash2, Download, Palette, TrendingUp, Settings, ThumbsUp, ThumbsDown, Microscope, MessageSquareQuote } from 'lucide-react';
import { InlineError } from './components/InlineError';
import { useToast } from './components/Toast';
import { PersonaPanelGroup } from './components/PersonaPanelGroup';
import { StructureBreakdown } from './components/StructureBreakdown';
import { ChannelFitPanel } from './components/ChannelFitPanel';
import { EnsembleBadge } from './components/EnsembleBadge';
import { CompetitorInput } from './components/CompetitorInput';
import { CompetitorPanel } from './components/CompetitorPanel';
import { BrandFactsPanel } from './components/BrandFactsPanel';
import { BrandFactsBanner } from './components/BrandFactsBanner';
import { CustomerQuotesPanel } from './components/CustomerQuotesPanel';
import { ExamplePicker } from './components/ExamplePicker';
import { useBrandFacts } from './hooks/useBrandFacts';
import { useCustomerQuotes } from './hooks/useCustomerQuotes';
import { PERSONA_LABELS } from './lib/schemas';
import { PRODUCT_EXAMPLES, PROMO_EXAMPLES } from './lib/example-prompts';

type Outcome = 'used-good' | 'used-bad';

interface SavedAd extends AdIdea {
  id: string;
  evaluation: AdEvaluation | null;
  outcome?: Outcome;        // ผู้ใช้ mark หลังเอา ad ไปใช้จริง — feedback loop
}

const errorMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : 'Unexpected error';

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

export default function App() {
  const toast = useToast();
  const brandFactsApi = useBrandFacts();
  const customerQuotesApi = useCustomerQuotes();
  const [factsPanelOpen, setFactsPanelOpen] = useState(false);
  const [quotesPanelOpen, setQuotesPanelOpen] = useState(false);
  const productId = useId();
  const promoId = useId();
  const savedHeadingId = useId();
  const resultsHeadingId = useId();
  const [product, setProduct] = useState('');
  const [promo, setPromo] = useState('');
  const [competitorAd, setCompetitorAd] = useState('');
  const [ads, setAds] = useState<AdIdea[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [evaluations, setEvaluations] = useState<Record<number, AdEvaluation>>({});
  const [evalLoading, setEvalLoading] = useState<number | null>(null);
  
  // State ใหม่สำหรับ Visual Prompts
  const [visualPrompts, setVisualPrompts] = useState<Record<number, VisualPrompt>>({});
  const [visualLoading, setVisualLoading] = useState<number | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [savedAds, setSavedAds] = useState<SavedAd[]>([]);

  const [generateError, setGenerateError] = useState<string | null>(null);
  const [evalErrors, setEvalErrors] = useState<Record<number, string>>({});
  const [visualErrors, setVisualErrors] = useState<Record<number, string>>({});

  const generateAbortRef = useRef<AbortController | null>(null);
  const evalAbortsRef = useRef<Map<number, AbortController>>(new Map());
  const visualAbortsRef = useRef<Map<number, AbortController>>(new Map());
  const rewriteAbortsRef = useRef<Map<string, AbortController>>(new Map());
  const ensembleAbortsRef = useRef<Map<number, AbortController>>(new Map());
  const trendsRef = useRef<TrendsSnapshot | null>(null);

  // keyed by `${ad.clientId}::${personaId}`
  const [rewrites, setRewrites] = useState<Record<string, RewriteState>>({});
  const [ensembleLoading, setEnsembleLoading] = useState<number | null>(null);
  const [ensembleErrors, setEnsembleErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const localData = localStorage.getItem('mtr_saved_ads');
    if (localData) {
      try {
        setSavedAds(JSON.parse(localData));
      } catch (e) {
        console.error("Failed to load saved ads");
      }
    }
  }, []);

  useEffect(() => {
    const evalAborts = evalAbortsRef.current;
    const visualAborts = visualAbortsRef.current;
    const rewriteAborts = rewriteAbortsRef.current;
    const ensembleAborts = ensembleAbortsRef.current;
    return () => {
      generateAbortRef.current?.abort();
      evalAborts.forEach(c => c.abort());
      visualAborts.forEach(c => c.abort());
      rewriteAborts.forEach(c => c.abort());
      ensembleAborts.forEach(c => c.abort());
    };
  }, []);

  const handleGenerate = async () => {
    if (!product) return;

    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;

    setLoading(true);
    setGenerateError(null);
    setEvaluations({});
    setVisualPrompts({});
    setEvalErrors({});
    setVisualErrors({});
    setRewrites({});
    rewriteAbortsRef.current.forEach(c => c.abort());
    rewriteAbortsRef.current.clear();
    setEnsembleLoading(null);
    setEnsembleErrors({});
    ensembleAbortsRef.current.forEach(c => c.abort());
    ensembleAbortsRef.current.clear();
    try {
      const [results, trends] = await Promise.all([
        generateAds(product, promo, controller.signal, { brandFacts: brandFactsApi.facts }),
        fetchTrends(product, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      trendsRef.current = trends;
      setAds(results);
      if (results.length === 0) {
        setGenerateError('The AI returned no usable ad ideas. Try rewording your input.');
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to generate ads:', err);
      setAds([]);
      setGenerateError(errorMessage(err));
    } finally {
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleEvaluate = async (index: number, ad: AdIdea) => {
    evalAbortsRef.current.get(index)?.abort();
    const controller = new AbortController();
    evalAbortsRef.current.set(index, controller);

    setEvalLoading(index);
    setEvalErrors(prev => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    try {
      const result = await evaluateAd(ad, controller.signal, {
        trends: trendsRef.current,
        brandFacts: brandFactsApi.facts,
        competitorAd,
        customerQuotes: customerQuotesApi.quotes,
      });
      if (controller.signal.aborted) return;
      if (result) {
        setEvaluations(prev => ({ ...prev, [index]: result }));
      } else {
        setEvalErrors(prev => ({
          ...prev,
          [index]: 'The AI returned an unparseable evaluation. Try again.',
        }));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to evaluate ad:', err);
      setEvalErrors(prev => ({ ...prev, [index]: errorMessage(err) }));
    } finally {
      if (evalAbortsRef.current.get(index) === controller) {
        evalAbortsRef.current.delete(index);
        setEvalLoading(prev => (prev === index ? null : prev));
      }
    }
  };

  const handleGenerateVisual = async (index: number, visualIdea: string) => {
    visualAbortsRef.current.get(index)?.abort();
    const controller = new AbortController();
    visualAbortsRef.current.set(index, controller);

    setVisualLoading(index);
    setVisualErrors(prev => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    try {
      const result = await generateImagePrompt(visualIdea, controller.signal);
      if (controller.signal.aborted) return;
      if (result) {
        setVisualPrompts(prev => ({ ...prev, [index]: result }));
      } else {
        setVisualErrors(prev => ({
          ...prev,
          [index]: 'The AI returned an unparseable visual prompt. Try again.',
        }));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to generate visual prompt:', err);
      setVisualErrors(prev => ({ ...prev, [index]: errorMessage(err) }));
    } finally {
      if (visualAbortsRef.current.get(index) === controller) {
        visualAbortsRef.current.delete(index);
        setVisualLoading(prev => (prev === index ? null : prev));
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('คัดลอกข้อความแล้ว');
  };

  const handleCopyRewrite = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกข้อความแล้ว');
  };

  const handleRunEnsemble = async (idx: number, ad: AdIdea) => {
    const baseline = evaluations[idx];
    if (!baseline || baseline.ensemble) return;

    ensembleAbortsRef.current.get(idx)?.abort();
    const controller = new AbortController();
    ensembleAbortsRef.current.set(idx, controller);

    setEnsembleLoading(idx);
    setEnsembleErrors(prev => {
      if (!(idx in prev)) return prev;
      const next = { ...prev };
      delete next[idx];
      return next;
    });

    try {
      const result = await runEnsembleEval(ad, baseline, controller.signal, {
        trends: trendsRef.current,
        brandFacts: brandFactsApi.facts,
        competitorAd,
        customerQuotes: customerQuotesApi.quotes,
      });
      if (controller.signal.aborted) return;
      if (result) {
        setEvaluations(prev => ({ ...prev, [idx]: result }));
        const stable = result.ensemble?.variance.unstable_fields.length === 0;
        toast.success(stable ? 'วิเคราะห์ลึกเสร็จ — คะแนนนิ่ง' : 'วิเคราะห์ลึกเสร็จ — คะแนนยังกระจาย');
      } else {
        setEnsembleErrors(prev => ({ ...prev, [idx]: 'รวมผลล้มเหลว ลองใหม่' }));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to run ensemble:', err);
      setEnsembleErrors(prev => ({ ...prev, [idx]: errorMessage(err) }));
    } finally {
      if (ensembleAbortsRef.current.get(idx) === controller) {
        ensembleAbortsRef.current.delete(idx);
        setEnsembleLoading(prev => (prev === idx ? null : prev));
      }
    }
  };

  const handleRewrite = async (ad: AdIdea, personaId: PersonaId) => {
    const evaluation = Object.values(evaluations).find(ev =>
      ev.personas.some(p => p.id === personaId),
    );
    const persona = evaluation?.personas.find(p => p.id === personaId);
    if (!persona) return;

    const key = `${ad.clientId}::${personaId}`;
    rewriteAbortsRef.current.get(key)?.abort();
    const controller = new AbortController();
    rewriteAbortsRef.current.set(key, controller);

    setRewrites(prev => ({ ...prev, [key]: { status: 'loading' } }));
    try {
      const result: ParsedAdIdea | null = await rewriteAd(ad, persona, controller.signal, {
        brandFacts: brandFactsApi.facts,
      });
      if (controller.signal.aborted) return;
      if (result) {
        setRewrites(prev => ({ ...prev, [key]: { status: 'ready', result } }));
      } else {
        setRewrites(prev => ({ ...prev, [key]: { status: 'error' } }));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to rewrite ad:', err);
      setRewrites(prev => ({ ...prev, [key]: { status: 'error' } }));
    } finally {
      if (rewriteAbortsRef.current.get(key) === controller) {
        rewriteAbortsRef.current.delete(key);
      }
    }
  };

  const handleSaveAd = (index: number, ad: AdIdea) => {
    const newSavedAd: SavedAd = {
      ...ad,
      id: crypto.randomUUID(),
      evaluation: evaluations[index] || null
    };
    const updatedLibrary = [newSavedAd, ...savedAds];
    setSavedAds(updatedLibrary);
    localStorage.setItem('mtr_saved_ads', JSON.stringify(updatedLibrary));
    toast.success('บันทึกลงคลังแล้ว');
  };

  const handleRemoveSaved = (idToRemove: string) => {
    const updatedLibrary = savedAds.filter(ad => ad.id !== idToRemove);
    setSavedAds(updatedLibrary);
    localStorage.setItem('mtr_saved_ads', JSON.stringify(updatedLibrary));
    toast.info('ลบออกจากคลังแล้ว');
  };

  const handleToggleOutcome = (id: string, next: Outcome) => {
    const updated = savedAds.map(ad => {
      if (ad.id !== id) return ad;
      // tap same outcome → clear it; otherwise switch
      const newOutcome: Outcome | undefined = ad.outcome === next ? undefined : next;
      return { ...ad, outcome: newOutcome };
    });
    setSavedAds(updated);
    localStorage.setItem('mtr_saved_ads', JSON.stringify(updated));
    const target = updated.find(a => a.id === id);
    if (target?.outcome === 'used-good') toast.success('บันทึก: ผลดี 👍');
    else if (target?.outcome === 'used-bad') toast.info('บันทึก: ผลไม่ดี 👎');
    else toast.info('ล้างสถานะแล้ว');
  };

  const handleExportObsidian = (ad: SavedAd) => {
    const date = new Date().toISOString().split('T')[0];
    const evalData = ad.evaluation;
    const avg = evalData?.average_score;
    const scoreText = typeof avg === 'number' ? avg.toFixed(1) : 'N/A';

    const personaLines = evalData
      ? evalData.personas
          .map(p => {
            const personaAvg = ((p.scroll_stop_score + p.focused_score + p.memory_score) / 3).toFixed(1);
            return `- **${PERSONA_LABELS[p.id]}** (${personaAvg}/10) — ${p.verdict}\n  - 💡 ${p.suggestion}`;
          })
          .join('\n')
      : '- N/A';

    const verdictLine = evalData?.panel_verdict ? `\n> ${evalData.panel_verdict}\n` : '';
    const trendsLine = evalData && evalData.trends_used.length > 0
      ? `\n**เทรนด์ที่ใช้:** ${evalData.trends_used.join(', ')}\n`
      : '';
    const ensembleLine = evalData?.ensemble
      ? `\n**Ensemble:** ${evalData.ensemble.runs} รอบ · std สูงสุด ${evalData.ensemble.variance.max_std.toFixed(1)} · ฟิลด์กระจาย: ${
          evalData.ensemble.variance.unstable_fields.length === 0
            ? 'ไม่มี (นิ่ง)'
            : evalData.ensemble.variance.unstable_fields.join(', ')
        }\n`
      : '';

    const structureLines = evalData
      ? `\n### 🧱 โครงสร้าง
- **Hook** (${evalData.structure.hook_score}/10): ${evalData.structure.hook_critique}
- **Body** (${evalData.structure.body_score}/10): ${evalData.structure.body_critique}
- **CTA** (${evalData.structure.cta_score}/10): ${evalData.structure.cta_critique}
`
      : '';

    const channelLines = evalData
      ? `\n### 📱 ช่องทางที่เหมาะ
- **แนะนำ:** ${evalData.channel_fit.best.replace('_', ' ')}
- **เหตุผล:** ${evalData.channel_fit.reasoning}
- คะแนนทุกช่อง: ${evalData.channel_fit.ranked
          .map(r => `${r.channel.replace('_', ' ')} ${r.score}/10`)
          .join(' · ')}
`
      : '';

    const competitorLines = evalData?.competitor
      ? `\n### ⚔️ เทียบกับ ad คู่แข่ง
- **ผล:** ${
          evalData.competitor.winner === 'ours'
            ? 'เราชนะ'
            : evalData.competitor.winner === 'theirs'
              ? 'คู่แข่งชนะ'
              : 'เสมอ'
        } (margin ${evalData.competitor.margin}/10)
- **ของเราเด่นกว่า:**
${evalData.competitor.ours_strengths.map(s => `  - ${s}`).join('\n')}
- **คู่แข่งเด่นกว่า:**
${evalData.competitor.theirs_strengths.map(s => `  - ${s}`).join('\n')}
- **ลองปรับ:** ${evalData.competitor.recommendation}
`
      : '';

    const mdContent = `---
title: "MTR Ad - ${ad.style}"
date: ${date}
tags: ["#Marketing", "#FacebookAds", "#Marnthara"]
score: ${scoreText}
style: "${ad.style}"
---

# 🎯 โฆษณา: ${ad.style}

## 📝 Ad Copy
${ad.copy}

## 🖼️ Visual Idea
${ad.visual_idea}

## 📊 การประเมิน (The Judge)
${verdictLine}**คะแนนเฉลี่ย**: ${scoreText}/10
${ensembleLine}${trendsLine}${structureLines}${channelLines}${competitorLines}
${personaLines}
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MTR_Ad_${date}_${ad.id.slice(-4)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export เรียบร้อย');
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold [letter-spacing:-0.02em]">
          <span className="text-hermes">MTR</span> Marketing Lab
        </h1>
        <p className="text-gray-400 mt-2">AI-Driven Ad Copy &amp; Evaluation System</p>
      </header>

      <main className="grid md:grid-cols-3 gap-8">
        <aside
          aria-label="ตัวควบคุมการสร้างโฆษณา"
          className="md:col-span-1 space-y-6 bg-panel p-6 rounded-xl border border-gray-800 h-fit sticky top-6"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor={productId} className="block text-sm font-medium text-gray-400">
                สินค้า / บริการเป้าหมาย
              </label>
              <ExamplePicker
                examples={PRODUCT_EXAMPLES}
                onPick={setProduct}
                label="สินค้า"
              />
            </div>
            <input
              id={productId}
              type="text"
              required
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="เช่น ม่านลอนเทปผ้า Blackout"
              className="min-h-[44px] w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor={promoId} className="block text-sm font-medium text-gray-400">
                โปรโมชัน / จุดขาย
              </label>
              <ExamplePicker
                examples={PROMO_EXAMPLES}
                onPick={setPromo}
                label="โปรโมชัน"
              />
            </div>
            <textarea
              id={promoId}
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              rows={3}
              placeholder="เช่น ประเมินหน้างานฟรี ท่าศาลา-ลพบุรี"
              className="w-full min-h-[80px] resize-y"
            />
          </div>
          <CompetitorInput value={competitorAd} onChange={setCompetitorAd} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !product}
            aria-busy={loading}
            className="w-full bg-hermes hover:bg-orange-600 text-white font-medium py-3 min-h-[44px] rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" aria-hidden="true" />
            ) : (
              <Target className="w-5 h-5" aria-hidden="true" />
            )}
            {loading ? 'Processing...' : 'Generate Ads'}
          </button>
          <button
            type="button"
            onClick={() => setFactsPanelOpen(true)}
            className="w-full text-sm text-gray-400 hover:text-gray-100 hover:bg-black/30 py-2 min-h-[44px] rounded-md inline-flex items-center justify-center gap-2 transition-colors border border-gray-800"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            ข้อมูลร้าน ({brandFactsApi.facts.filter(f => f.enabled).length})
          </button>
          <button
            type="button"
            onClick={() => setQuotesPanelOpen(true)}
            className="w-full text-sm text-gray-400 hover:text-gray-100 hover:bg-black/30 py-2 min-h-[44px] rounded-md inline-flex items-center justify-center gap-2 transition-colors border border-gray-800"
          >
            <MessageSquareQuote className="w-4 h-4" aria-hidden="true" />
            เสียงลูกค้าจริง ({customerQuotesApi.quotes.filter(q => q.enabled && q.quote.trim().length > 0).length})
          </button>
          <BrandFactsBanner
            facts={brandFactsApi.facts}
            onOpenPanel={() => setFactsPanelOpen(true)}
          />
        </aside>

        <section
          aria-labelledby={resultsHeadingId}
          className="md:col-span-2 space-y-6"
        >
          <h2 id={resultsHeadingId} className="sr-only">ผลลัพธ์โฆษณา</h2>
          {generateError && (
            <InlineError
              message={generateError}
              onRetry={handleGenerate}
              onDismiss={() => setGenerateError(null)}
            />
          )}

          {ads.length === 0 && !loading && !generateError && savedAds.length === 0 && (
            <div
              role="status"
              className="h-full flex items-center justify-center border-2 border-dashed border-gray-800 rounded-xl p-12 text-gray-500"
            >
              กรอกข้อมูลด้านซ้ายเพื่อเริ่มสร้างโฆษณา
            </div>
          )}

          {ads.map((ad, idx) => {
            const headingId = `ad-${ad.clientId}-heading`;
            return (
            <article
              key={ad.clientId}
              aria-labelledby={headingId}
              className="bg-panel border border-gray-800 rounded-xl overflow-hidden shadow-card"
            >
              <div className="bg-gray-800/50 px-6 py-3 border-b border-gray-800 flex justify-between items-center">
                <h3 id={headingId} className="font-semibold text-hermes">{ad.style}</h3>
                <button
                  type="button"
                  onClick={() => handleSaveAd(idx, ad)}
                  className="text-gray-400 hover:text-white flex items-center gap-1 text-sm px-3 min-h-[44px] rounded-md"
                  title="บันทึกเก็บไว้ใช้"
                >
                  <Bookmark className="w-4 h-4" aria-hidden="true" /> Save
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" aria-hidden="true" /> Ad Copy
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(ad.copy, `copy-${idx}`)}
                      aria-label="คัดลอกข้อความโฆษณา"
                      className="text-gray-400 hover:text-hermes transition-colors inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md"
                    >
                      {copiedIndex === `copy-${idx}` ? (
                        <Check className="w-5 h-5 text-green-500" aria-hidden="true" />
                      ) : (
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-200 bg-black/20 p-4 rounded-lg text-sm leading-relaxed border border-gray-800">
                    {ad.copy}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" aria-hidden="true" /> Visual &amp; Infographic Idea
                  </p>
                  <p className="text-sm text-gray-300">
                    {ad.visual_idea}
                  </p>

                  {visualErrors[idx] && (
                    <div className="mt-2">
                      <InlineError
                        message={visualErrors[idx]}
                        onRetry={() => handleGenerateVisual(idx, ad.visual_idea)}
                      />
                    </div>
                  )}

                  {!visualPrompts[idx] ? (
                    <button
                      type="button"
                      onClick={() => handleGenerateVisual(idx, ad.visual_idea)}
                      disabled={visualLoading === idx}
                      aria-busy={visualLoading === idx}
                      className="mt-2 text-xs px-3 py-2 min-h-[44px] bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {visualLoading === idx ? (
                        <Loader2 className="animate-spin w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Palette className="w-3 h-3" aria-hidden="true" />
                      )}
                      แปลงเป็นคำค้นหา (Canva / AI Image)
                    </button>
                  ) : (
                    <div className="mt-3 p-3 bg-black/40 border border-gray-700 rounded-lg space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-hermes font-semibold">🎨 AI Image Prompt (Midjourney/DALL-E)</p>
                          <button
                            type="button"
                            onClick={() => handleCopy(visualPrompts[idx].ai_prompt, `ai-${idx}`)}
                            aria-label="คัดลอก AI image prompt"
                            className="text-gray-500 hover:text-white inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md"
                          >
                            {copiedIndex === `ai-${idx}` ? (
                              <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3 h-3" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 bg-black/50 p-2 rounded font-mono leading-relaxed">{visualPrompts[idx].ai_prompt}</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-blue-400 font-semibold">🔍 Canva Search Keywords</p>
                          <button
                            type="button"
                            onClick={() => handleCopy(visualPrompts[idx].canva_keywords, `canva-${idx}`)}
                            aria-label="คัดลอก Canva keywords"
                            className="text-gray-500 hover:text-white inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md"
                          >
                            {copiedIndex === `canva-${idx}` ? (
                              <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3 h-3" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 bg-black/50 p-2 rounded font-mono leading-relaxed">{visualPrompts[idx].canva_keywords}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-800 space-y-3">
                  {evalErrors[idx] && (
                    <InlineError
                      message={evalErrors[idx]}
                      onRetry={() => handleEvaluate(idx, ad)}
                    />
                  )}
                  {!evaluations[idx] ? (
                    <button
                      type="button"
                      onClick={() => handleEvaluate(idx, ad)}
                      disabled={evalLoading === idx}
                      aria-busy={evalLoading === idx}
                      className="text-sm px-4 py-2 min-h-[44px] bg-gray-800 hover:bg-gray-700 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {evalLoading === idx ? (
                        <Loader2 className="animate-spin w-4 h-4" aria-hidden="true" />
                      ) : (
                        <BarChart className="w-4 h-4" aria-hidden="true" />
                      )}
                      ประเมินความโดนใจ (The Judge)
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-black/40 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Panel Verdict</p>
                            {evaluations[idx].ensemble && (
                              <EnsembleBadge meta={evaluations[idx].ensemble!} />
                            )}
                          </div>
                          <span className="text-2xl font-bold text-hermes leading-none">
                            {evaluations[idx].average_score.toFixed(1)}<span className="text-xs text-gray-500 font-normal">/10</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 leading-snug">{evaluations[idx].panel_verdict}</p>
                        {evaluations[idx].trends_used.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
                            <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
                            <span>เทรนด์ที่ Judge ใช้: <span className="text-blue-300">{evaluations[idx].trends_used.join(' · ')}</span></span>
                          </p>
                        )}
                        {trendsRef.current && trendsRef.current.new_in_window.length > 0 && (
                          <p
                            className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5"
                            title={trendsRef.current.daily_top_previous.length
                              ? `ก่อน 30 นาที: ${trendsRef.current.daily_top_previous.slice(0, 5).join(' · ')}`
                              : undefined}
                          >
                            <span className="text-orange-400" aria-hidden="true">🔥</span>
                            <span>เพิ่งมาแรง (30 นาที): <span className="text-orange-300">{trendsRef.current.new_in_window.slice(0, 5).join(' · ')}</span></span>
                          </p>
                        )}
                        {!evaluations[idx].ensemble && (
                          <div className="mt-2.5 pt-2.5 border-t border-gray-800">
                            {ensembleErrors[idx] && (
                              <p className="text-[11px] text-red-300 mb-1.5">{ensembleErrors[idx]}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRunEnsemble(idx, ad)}
                              disabled={ensembleLoading === idx}
                              aria-busy={ensembleLoading === idx}
                              className="text-[11px] text-gray-400 hover:text-hermes inline-flex items-center gap-1.5 min-h-[36px] px-2 -mx-2 disabled:opacity-50 transition-colors"
                            >
                              {ensembleLoading === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Microscope className="w-3 h-3" aria-hidden="true" />
                              )}
                              {ensembleLoading === idx
                                ? 'กำลังประเมินเพิ่ม 2 รอบ...'
                                : 'วิเคราะห์ลึก (3-run ensemble)'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <StructureBreakdown structure={evaluations[idx].structure} />
                        <ChannelFitPanel channelFit={evaluations[idx].channel_fit} />
                      </div>
                      {evaluations[idx].competitor && (
                        <CompetitorPanel comparison={evaluations[idx].competitor!} />
                      )}
                      <PersonaPanelGroup
                        personas={evaluations[idx].personas}
                        rewriteStateOf={(pid) => rewrites[`${ad.clientId}::${pid}`]}
                        onRewrite={(pid) => handleRewrite(ad, pid)}
                        onCopyRewrite={handleCopyRewrite}
                      />
                    </div>
                  )}
                </div>
              </div>
            </article>
            );
          })}

          {savedAds.length > 0 && (
            <section
              aria-labelledby={savedHeadingId}
              className="mt-12 pt-8 border-t border-gray-800"
            >
              <h2
                id={savedHeadingId}
                className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-300"
              >
                <Bookmark className="w-5 h-5 text-hermes" aria-hidden="true" />
                คลังโฆษณาที่บันทึกไว้ (Saved Library)
              </h2>
              <ul className="space-y-4 list-none p-0">
                {savedAds.map((savedAd) => (
                  <li
                    key={savedAd.id}
                    className="bg-black/40 border border-gray-800 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold bg-gray-800 px-2 py-1 rounded text-hermes">
                          {savedAd.style}
                        </span>
                        {savedAd.evaluation && (
                          <span className="text-xs font-semibold bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-800/50">
                            Score: {savedAd.evaluation.average_score.toFixed(1)}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{savedAd.copy}</p>
                    </div>
                    <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                      <button
                        type="button"
                        onClick={() => handleToggleOutcome(savedAd.id, 'used-good')}
                        aria-label={`บันทึกว่าโฆษณาสไตล์ ${savedAd.style} ใช้แล้วได้ผลดี`}
                        aria-pressed={savedAd.outcome === 'used-good'}
                        title="ใช้แล้วผลดี"
                        className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border transition-colors ${
                          savedAd.outcome === 'used-good'
                            ? 'bg-green-900/40 border-green-700/50 text-green-300'
                            : 'bg-transparent border-gray-800 text-gray-500 hover:text-green-300 hover:border-green-800/50'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleOutcome(savedAd.id, 'used-bad')}
                        aria-label={`บันทึกว่าโฆษณาสไตล์ ${savedAd.style} ใช้แล้วผลไม่ดี`}
                        aria-pressed={savedAd.outcome === 'used-bad'}
                        title="ใช้แล้วผลไม่ดี"
                        className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border transition-colors ${
                          savedAd.outcome === 'used-bad'
                            ? 'bg-orange-900/40 border-orange-700/50 text-orange-300'
                            : 'bg-transparent border-gray-800 text-gray-500 hover:text-orange-300 hover:border-orange-800/50'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportObsidian(savedAd)}
                        aria-label={`ส่งออกโฆษณาสไตล์ ${savedAd.style} เป็นไฟล์ Markdown`}
                        title="Export to Obsidian (.md)"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] bg-blue-900/30 hover:bg-blue-900/50 border border-blue-900/50 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(savedAd.copy);
                          toast.success('คัดลอกข้อความแล้ว');
                        }}
                        aria-label={`คัดลอกข้อความโฆษณาสไตล์ ${savedAd.style}`}
                        title="Copy"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-300" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(savedAd.id)}
                        aria-label={`ลบโฆษณาสไตล์ ${savedAd.style}`}
                        title="Delete"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </main>

      <BrandFactsPanel
        open={factsPanelOpen}
        onClose={() => setFactsPanelOpen(false)}
        facts={brandFactsApi.facts}
        onUpdate={brandFactsApi.update}
        onAdd={brandFactsApi.add}
        onRemove={brandFactsApi.remove}
        onResetAll={brandFactsApi.resetAll}
        onResetField={brandFactsApi.resetField}
      />
      <CustomerQuotesPanel
        open={quotesPanelOpen}
        onClose={() => setQuotesPanelOpen(false)}
        quotes={customerQuotesApi.quotes}
        onUpdate={customerQuotesApi.update}
        onAdd={customerQuotesApi.add}
        onRemove={customerQuotesApi.remove}
        onResetAll={customerQuotesApi.resetAll}
        onResetField={customerQuotesApi.resetField}
      />
    </div>
  );
}