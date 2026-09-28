import React, { useState } from 'react';
import { studyBreakdown } from '../utils/mockData';
import { 
  BookOpen, 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  BarChart2, 
  ShieldCheck, 
  Users, 
  FileText, 
  Lightbulb, 
  ArrowRight,
  Database,
  Cpu,
  Monitor
} from 'lucide-react';
import { sounds } from '../utils/audio';

export const ResearchExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'framework' | 'survey' | 'architecture' | 'chapters'>('framework');

  // Interactive TAM / UTAUT simulator sliders
  const [perceivedUsefulness, setPerceivedUsefulness] = useState<number>(88);
  const [perceivedEaseOfUse, setPerceivedEaseOfUse] = useState<number>(92);
  const [securityTrust, setSecurityTrust] = useState<number>(84);
  const [costAffordability, setCostAffordability] = useState<number>(76);

  // Compute calculated adoption propensity index
  const adoptionIndex = Math.round(
    perceivedUsefulness * 0.35 +
    perceivedEaseOfUse * 0.25 +
    securityTrust * 0.25 +
    costAffordability * 0.15
  );

  const [activeChapter, setActiveChapter] = useState<number>(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Academic & System Reference
            </span>
            <span className="text-xs text-stone-500">Research Project Chapters 1 – 5</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1 tracking-tight">
            Mobile Payments in Modern Businesses: Theoretical & Empirical Model
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Evaluating the technological, organizational, and environmental determinants of mobile payment adoption in Kenya.
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 overflow-x-auto">
          {[
            { id: 'framework', label: 'Conceptual TAM Model', icon: Sliders },
            { id: 'survey', label: 'Survey Sample (N=100)', icon: Users },
            { id: 'architecture', label: '3-Tier System Design', icon: Layers },
            { id: 'chapters', label: 'Chapters 1-5 Digest', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as typeof activeSubTab);
                  sounds.playClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-stone-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab 1: Interactive TAM & UTAUT Conceptual Framework */}
      {activeSubTab === 'framework' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="max-w-3xl mb-6">
              <h3 className="text-lg font-bold text-stone-900">
                Interactive Technology Acceptance Model (TAM & UTAUT)
              </h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                As detailed in <strong>Chapter 2.4 (The Conceptual Framework)</strong>, business adoption of mobile payments is governed by independent variables:
                Perceived Usefulness (Fred Davis, 1989), Perceived Ease of Use, Security & Trust, and Cost of Adoption. Adjust the parameters below to evaluate predicted business adoption propensity and operational outcomes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Sliders (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                    <span>Perceived Usefulness (PU) - Weight: 35%</span>
                    <span className="font-mono text-indigo-700">{perceivedUsefulness}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={perceivedUsefulness}
                    onChange={e => setPerceivedUsefulness(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Belief that M-Pesa / mobile pay increases transaction speed, improves record management, and boosts sales.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                    <span>Perceived Ease of Use (PEOU) - Weight: 25%</span>
                    <span className="font-mono text-indigo-700">{perceivedEaseOfUse}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={perceivedEaseOfUse}
                    onChange={e => setPerceivedEaseOfUse(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    User-friendliness, minimal staff training needed, intuitive cashier checkout, and smooth customer STK push.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                    <span>Security & Trust - Weight: 25%</span>
                    <span className="font-mono text-indigo-700">{securityTrust}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={securityTrust}
                    onChange={e => setSecurityTrust(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Protection against SIM-swap fraud, fake customer SMS, encryption, and automatic callback verification.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                    <span>Cost Affordability & Tariffs - Weight: 15%</span>
                    <span className="font-mono text-indigo-700">{costAffordability}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={costAffordability}
                    onChange={e => setCostAffordability(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Merchant discount rates (MDR), hardware investment costs, and transaction fees relative to cash handling.
                  </p>
                </div>
              </div>

              {/* Adoption Score Card (5 cols) */}
              <div className="lg:col-span-5 bg-stone-50 rounded-2xl p-6 border border-stone-200 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Predicted Business Adoption Index
                </span>

                <div className="my-4">
                  <span className="text-5xl font-black text-indigo-700 font-mono">
                    {adoptionIndex}%
                  </span>
                  <span className="text-xs text-stone-500 block mt-1 font-medium">
                    {adoptionIndex >= 80 ? 'High Propensity: Rapid Mass Market Adoption' : adoptionIndex >= 60 ? 'Moderate Adoption: Selective Uptake' : 'Hesitant Adoption: Resistance & Manual Fallback'}
                  </span>
                </div>

                <div className="space-y-2 text-left pt-4 border-t border-stone-200 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Efficiency:</strong> Transaction time reduced from 90s (cash) to 12s.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Customer Satisfaction:</strong> 94% approval for cashless checkout.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Accuracy:</strong> Elimination of manual exercise book discrepancies.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Survey Sample Breakdown (N=100) */}
      {activeSubTab === 'survey' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Target Population & Sample Size Breakdown (N = 100)
                </h3>
                <p className="text-xs text-stone-500">
                  Direct empirical sampling distribution based on Chapter 3.5 of the study
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                100% Target Quota Achieved
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studyBreakdown.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-stone-900 text-sm">{item.category}</h4>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700">
                      Sample: n = {item.sampleSize}
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="flex justify-between text-stone-600 mb-1">
                      <span>Satisfaction Rating</span>
                      <span className="font-bold text-emerald-700 font-mono">{item.satisfactionScore}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${item.satisfactionScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-[11px] pt-1 space-y-1">
                    <p className="text-stone-700">
                      <strong className="text-stone-900">Top Benefit Reported:</strong> {item.topBenefit}
                    </p>
                    <p className="text-rose-700">
                      <strong className="text-stone-900">Primary Challenge Encountered:</strong> {item.primaryChallenge}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
              <strong>Sampling Methodologies Applied (Chapter 3.4):</strong>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-stone-700">
                <li><strong>Purposive Sampling:</strong> Used for Business Owners (20) & Managers (15) due to their executive experience in procurement and operational management.</li>
                <li><strong>Stratified Sampling:</strong> Used across cashiers (25) to evaluate front-line operational ergonomics, error handling, and speed.</li>
                <li><strong>Convenience Sampling:</strong> Used for active customers (40) making real mobile purchases across retail shops.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: 3-Tier System Architecture (Chapter 4.3) */}
      {activeSubTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Three-Tier System Architecture Specification (Chapter 4.3)
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Separating user interaction, business processing logic, and persistent transaction storage for security and scalability.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Tier 1: Presentation Layer */}
              <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">1. Presentation Layer</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">Frontend Client & Interfaces</p>
                </div>
                <ul className="space-y-1 text-stone-700 leading-relaxed list-disc pl-4 text-[11px]">
                  <li>Cashier Checkout Terminal & STK prompt trigger</li>
                  <li>Customer Mobile Wallet & QR Scanner View</li>
                  <li>Manager Executive Reporting & Audit Dashboard</li>
                  <li>Printable Electronic Thermal Receipts</li>
                  <li>Web Audio instant payment sound cues</li>
                </ul>
              </div>

              {/* Tier 2: Business Logic Layer */}
              <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">2. Business Logic Layer</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">Application Core & Rules</p>
                </div>
                <ul className="space-y-1 text-stone-700 leading-relaxed list-disc pl-4 text-[11px]">
                  <li>Anti-Fraud Code Verification Engine</li>
                  <li>Digital Ledger vs Notebook Error Reconciler</li>
                  <li>Safaricom M-Pesa Daraja API Handshake Gateway</li>
                  <li>Transaction state machine (Completed / Pending / Failed)</li>
                  <li>Role-based access control & token verification</li>
                </ul>
              </div>

              {/* Tier 3: Data Layer */}
              <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">3. Data Storage Layer</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">Relational & Audit Tables</p>
                </div>
                <ul className="space-y-1 text-stone-700 leading-relaxed list-disc pl-4 text-[11px]">
                  <li>Transaction Master Table (M-Pesa reference codes)</li>
                  <li>Business Profile (Till 842109, Paybill 522522)</li>
                  <li>Customer Wallet & Loyalty Directory</li>
                  <li>Audit Trail Table for Discrepancies</li>
                  <li>Encrypted Password & Security Credentials</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Chapter 1-5 Synthesis */}
      {activeSubTab === 'chapters' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-stone-200 pb-3 overflow-x-auto">
            {[1, 2, 3, 4, 5].map(ch => (
              <button
                key={ch}
                onClick={() => {
                  setActiveChapter(ch);
                  sounds.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeChapter === ch
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                Chapter {ch}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs text-xs space-y-4">
            {activeChapter === 1 && (
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Chapter 1: Introduction, Problem Statement & Research Objectives
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Focuses on the rapid shift from physical cash to mobile payments in Kenya, spearheaded by Safaricom M-Pesa.
                  Identifies the core challenge: while mobile payment adoption is high, many businesses continue to face
                  security risks (fake SMS), network interruptions, and rely on manual exercise notebooks to record transactions.
                </p>
                <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <div className="font-bold text-stone-900">Key Research Questions:</div>
                  <ol className="list-decimal pl-5 space-y-0.5 text-stone-700">
                    <li>What factors influence the adoption of mobile payment systems in modern businesses?</li>
                    <li>What tangible operational benefits do businesses gain from adopting mobile payments?</li>
                    <li>What challenges (fraud, downtime, fees) do businesses face during implementation?</li>
                  </ol>
                </div>
              </div>
            )}

            {activeChapter === 2 && (
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Chapter 2: Theoretical Literature Review & Conceptual Framework
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Synthesizes foundational technology adoption literature:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-900 block mb-1">TAM (Davis, 1989)</strong>
                    <p className="text-stone-600">Perceived Usefulness & Perceived Ease of Use determine behavioral intention to adopt.</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-900 block mb-1">Diffusion of Innovations (Rogers, 1962)</strong>
                    <p className="text-stone-600">Relative advantage, compatibility, complexity, trialability, and observability.</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <strong className="text-stone-900 block mb-1">UTAUT (Venkatesh et al., 2003)</strong>
                    <p className="text-stone-600">Performance expectancy, effort expectancy, social influence, and facilitating conditions.</p>
                  </div>
                </div>
              </div>
            )}

            {activeChapter === 3 && (
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Chapter 3: Research & System Development Methodology
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Adopted a mixed-methods empirical approach combining quantitative survey frequencies and qualitative operational interviews.
                  Features a sample size of N=100 (20 Owners, 15 Managers, 25 Cashiers, 40 Customers).
                  Selected a <strong>Hybrid Waterfall-Agile development methodology</strong> for structured requirements capture and iterative interface refinement.
                </p>
              </div>
            )}

            {activeChapter === 4 && (
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Chapter 4: System Architecture, Design & Security Engineering
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Detailed specifications for the three-tier system: Authentication Module, Payment Module (STK Push & Till),
                  Transaction Management Module, Customer Loyalty Module, Reports Module, and Notification Module.
                  Solves the critical small retail problem of manually copying SMS messages into a paper notebook.
                </p>
              </div>
            )}

            {activeChapter === 5 && (
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Chapter 5: Anticipated Outcomes, Evaluation Plan & Conclusion
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  Anticipates 90%+ reduction in payment recording errors, complete elimination of counterfeit note losses,
                  accelerated checkout times, and instant end-of-day bank reconciliation for modern enterprises in Kenya.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
