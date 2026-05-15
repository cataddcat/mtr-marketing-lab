import { useState, useEffect, useRef, useId } from 'react';
import { generateAds, evaluateAd, generateImagePrompt } from './services/marketing-agent';
import type { AdIdea, AdEvaluation, VisualPrompt } from './services/marketing-agent';
import { Loader2, Target, Image as ImageIcon, BarChart, CheckCircle, Copy, Check, Bookmark, Trash2, Download, Palette } from 'lucide-react';
import { InlineError } from './components/InlineError';
import { useToast } from './components/Toast';

interface SavedAd extends AdIdea {
  id: string;
  evaluation: AdEvaluation | null;
}

const errorMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : 'Unexpected error';

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

export default function App() {
  const toast = useToast();
  const productId = useId();
  const promoId = useId();
  const savedHeadingId = useId();
  const resultsHeadingId = useId();
  const [product, setProduct] = useState('');
  const [promo, setPromo] = useState('');
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
    return () => {
      generateAbortRef.current?.abort();
      evalAborts.forEach(c => c.abort());
      visualAborts.forEach(c => c.abort());
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
    try {
      const results = await generateAds(product, promo, controller.signal);
      if (controller.signal.aborted) return;
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
      const result = await evaluateAd(ad, controller.signal);
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

  const handleExportObsidian = (ad: SavedAd) => {
    const date = new Date().toISOString().split('T')[0];
    const score = ad.evaluation?.average_score || 'N/A';
    
    const mdContent = `---
title: "MTR Ad - ${ad.style}"
date: ${date}
tags: ["#Marketing", "#FacebookAds", "#Marnthara"]
score: ${score}
style: "${ad.style}"
---

# 🎯 โฆษณา: ${ad.style}

## 📝 Ad Copy
${ad.copy}

## 🖼️ Visual Idea
${ad.visual_idea}

## 📊 การประเมิน (The Judge)
- **คะแนนเฉลี่ย**: ${score}/10
- **พ่อบ้าน**: ${ad.evaluation?.family_man_score || 'N/A'}/10
- **แม่บ้าน**: ${ad.evaluation?.housewife_score || 'N/A'}/10
- **เจ้าของธุรกิจ**: ${ad.evaluation?.businessman_score || 'N/A'}/10
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
            <label htmlFor={productId} className="block text-sm font-medium text-gray-400 mb-2">
              สินค้า / บริการเป้าหมาย
            </label>
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
            <label htmlFor={promoId} className="block text-sm font-medium text-gray-400 mb-2">
              โปรโมชัน / จุดขาย
            </label>
            <textarea
              id={promoId}
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              rows={3}
              placeholder="เช่น ประเมินหน้างานฟรี ท่าศาลา-ลพบุรี"
              className="w-full min-h-[80px] resize-y"
            />
          </div>
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
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-black/30 p-3 rounded-lg border border-gray-700">
                        <dt className="text-xs text-gray-500 mb-1">เฉลี่ยรวม</dt>
                        <dd className="text-2xl font-bold text-hermes">{evaluations[idx].average_score.toFixed(1)}/10</dd>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-gray-700">
                        <dt className="text-xs text-gray-500 mb-1">พ่อบ้าน</dt>
                        <dd className="text-lg font-semibold text-gray-100">{evaluations[idx].family_man_score}</dd>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-gray-700">
                        <dt className="text-xs text-gray-500 mb-1">แม่บ้าน</dt>
                        <dd className="text-lg font-semibold text-gray-100">{evaluations[idx].housewife_score}</dd>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-gray-700">
                        <dt className="text-xs text-gray-500 mb-1">เจ้าของธุรกิจ</dt>
                        <dd className="text-lg font-semibold text-gray-100">{evaluations[idx].businessman_score}</dd>
                      </div>
                    </dl>
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
    </div>
  );
}