import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Code2,
  Copy,
  Check,
  ChevronDown,
  Layers,
  ShoppingBag,
  UserCheck,
  Megaphone,
  ArrowRight,
  Key,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface LandingSectionsProps {
  currentLang: Language;
  onTriggerUpload: () => void;
  onOpenBatch: () => void;
}

export const LandingSections: React.FC<LandingSectionsProps> = ({
  currentLang,
  onTriggerUpload,
  onOpenBatch,
}) => {
  const t = translations[currentLang];

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // API Key Demo State
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'python' | 'node'>('curl');

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await fetch('/api/auth/generate-key', { method: 'POST' });
      const data = await res.json();
      setGeneratedKey(data.apiKey);
    } catch {
      setGeneratedKey('sk_cutout_live_9a8fbc72d14e05b9');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const faqItems = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
    { q: t.faqQ4, a: t.faqA4 },
  ];

  const codeSnippets = {
    curl: `curl -X POST https://api.cutoutpro.ai/v1/remove-bg \\
  -H "X-API-Key: ${generatedKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "model": "BiRefNet-General",
    "feather": 2
  }'`,
    python: `import requests

url = "https://api.cutoutpro.ai/v1/remove-bg"
headers = {
    "X-API-Key": "${generatedKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json"
}
payload = {
    "image": base64_image_string,
    "model": "BiRefNet-General"
}

response = requests.post(url, json=payload, headers=headers)
cutout_png = response.json()["data"]["image"]`,
    node: `import fetch from 'node-fetch';

const response = await fetch('https://api.cutoutpro.ai/v1/remove-bg', {
  method: 'POST',
  headers: {
    'X-API-Key': '${generatedKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image: base64Data,
    model: 'BiRefNet-General'
  })
});

const data = await response.json();
console.log('Processed image:', data.data.image);`,
  };

  return (
    <div className="space-y-24 py-12">
      {/* SECTION 1: HOW IT WORKS (3 Steps) */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Workflow
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.navHowItWorks}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Transform raw snapshots into clean, isolated catalog-ready assets in 3 simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-display font-bold flex items-center justify-center">
              01
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.howStep1Title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.howStep1Desc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-display font-bold flex items-center justify-center">
              02
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.howStep2Title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.howStep2Desc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-display font-bold flex items-center justify-center">
              03
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.howStep3Title}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.howStep3Desc}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURES BENTO GRID */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Capabilities
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.featuresTitle}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.feat1Title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.feat1Desc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.feat2Title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.feat2Desc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.feat3Title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.feat3Desc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.feat4Title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.feat4Desc}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: USE CASES */}
      <section id="use-cases" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Industries
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.useCasesTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {t.useCaseEcommerce}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.useCaseEcommerceDesc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {t.useCasePortraits}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.useCasePortraitsDesc}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {t.useCaseMarketing}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t.useCaseMarketingDesc}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: DEVELOPER REST API */}
      <section id="api-docs" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-10 border border-neutral-800 shadow-xl space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-indigo-400 bg-indigo-950/80 border border-indigo-800/80">
                <Code2 className="w-3.5 h-3.5" />
                <span>REST API v1</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {t.apiSectionTitle}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                {t.apiSectionSubtitle}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={handleGenerateKey}
                disabled={isGeneratingKey}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 shadow-md"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{generatedKey ? 'Regenerate API Key' : t.generateApiKeyBtn}</span>
              </button>

              {generatedKey && (
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700 text-xs font-mono text-emerald-400">
                  <span className="truncate max-w-[180px]">{generatedKey}</span>
                  <button
                    onClick={() => handleCopy(generatedKey)}
                    className="text-neutral-400 hover:text-white transition-colors"
                    title="Copy API Key"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Code Tabs */}
          <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5 bg-neutral-900/60 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveCodeTab('curl')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeCodeTab === 'curl' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveCodeTab('python')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeCodeTab === 'python' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Python
                </button>
                <button
                  onClick={() => setActiveCodeTab('node')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeCodeTab === 'node' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Node.js
                </button>
              </div>

              <button
                onClick={() => handleCopy(codeSnippets[activeCodeTab])}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs transition-colors"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>

            <pre className="p-4 sm:p-6 overflow-x-auto text-xs font-mono text-neutral-300 leading-relaxed">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 5: PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.pricingTitle}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t.pricingSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
          {/* Free Tier */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 space-y-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {t.tierFreeTitle}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">
                    {t.tierFreePrice}
                  </span>
                  <span className="text-xs text-neutral-500">/{t.tierFreePeriod}</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierFreeFeat1}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierFreeFeat2}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierFreeFeat3}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierFreeFeat4}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onTriggerUpload}
              className="w-full py-3 rounded-xl font-semibold text-xs text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Start Free (No Sign Up)
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border-2 border-indigo-600 dark:border-indigo-500 space-y-6 shadow-lg relative flex flex-col justify-between">
            <div className="absolute -top-3 right-8 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              100% Free · No Payment Ever
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {t.tierProTitle}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">
                    {t.tierProPrice}
                  </span>
                  <span className="text-xs text-neutral-500">/{t.tierProPeriod}</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierProFeat1}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierProFeat2}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierProFeat3}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierProFeat4}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.tierProFeat5}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenBatch}
              className="w-full py-3 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Start Free Batch Mode
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 6: FAQ ACCORDION */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Questions
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.faqTitle}
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 7: QUIET FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 pt-12 pb-8 bg-white dark:bg-neutral-900/60 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="font-display font-bold text-base text-neutral-900 dark:text-neutral-100">
                {t.brand}
              </div>
              <p className="max-w-md text-xs">{t.privacyNote}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs">
              <a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {t.navHowItWorks}
              </a>
              <a href="#features" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {t.navFeatures}
              </a>
              <a href="#use-cases" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {t.navUseCases}
              </a>
              <a href="#pricing" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {t.navPricing}
              </a>
              <a href="#api-docs" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                {t.navApi}
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div>© {new Date().getFullYear()} Fast BG Remover. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-Storage Guarantee · EXIF Sanitized</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
