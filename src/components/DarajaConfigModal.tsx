import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone,
  Server,
  Zap
} from 'lucide-react';
import { 
  DarajaConfig, 
  getStoredDarajaConfig, 
  saveDarajaConfig, 
  testDarajaCredentials 
} from '../services/stkService';
import { sounds } from '../utils/audio';

interface DarajaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: DarajaConfig) => void;
}

export const DarajaConfigModal: React.FC<DarajaConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<DarajaConfig>(getStoredDarajaConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message?: string; error?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync latest configuration from database when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const stored = getStoredDarajaConfig();
      setConfig(stored);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPaymentSuccess();
    await saveDarajaConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved(config);
  };

  const handleTestConnection = async () => {
    if (!config.consumerKey || !config.consumerSecret) {
      setTestResult({ valid: false, error: 'Please enter both Consumer Key and Consumer Secret.' });
      sounds.playWarning();
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    sounds.playClick();

    const res = await testDarajaCredentials(config);
    setIsTesting(false);
    setTestResult(res);

    if (res.valid) {
      sounds.playPaymentSuccess();
    } else {
      sounds.playWarning();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="daraja-config-modal"
        className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Safaricom Daraja API Gateway
              </h2>
              <p className="text-xs text-stone-500">
                Push STK PIN prompts directly to physical Safaricom mobile phones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Quick Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900">
            <p className="font-semibold flex items-center gap-1.5 mb-1 text-emerald-800">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Live Push to Handsets vs. Built-in Gateway
            </p>
            <p className="text-emerald-700 leading-relaxed text-[11px]">
              You can push to <strong>your phone</strong> or <strong>customer phones</strong>. Entering your Safaricom Daraja credentials triggers real telecom SIM ToolKit alerts. If left blank, the app uses the built-in Gateway Switch with instant simulation.
            </p>
          </div>

          {/* Target Phone Preference (My Phone) */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <label className="text-xs font-bold text-stone-800 block mb-1">
              My Phone Number (Merchant / Default)
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={config.myPhoneNumber || ''}
                onChange={e => setConfig({ ...config, myPhoneNumber: e.target.value })}
                placeholder="0712345678 or 2547XXXXXXXX"
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-emerald-600 bg-white"
              />
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block">
              Quickly prefill this number whenever selecting "Push to My Phone" at checkout.
            </span>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Gateway Environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  config.environment === 'sandbox'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                Safaricom Sandbox (Test)
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, environment: 'production' })}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  config.environment === 'production'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                Live Production (Active)
              </button>
            </div>
          </div>

          {/* Shortcode */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Business Shortcode (Till / Paybill)
            </label>
            <input
              type="text"
              value={config.shortcode || ''}
              onChange={e => setConfig({ ...config, shortcode: e.target.value })}
              placeholder="e.g. 174379 (Sandbox) or your Paybill/Till"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-emerald-600"
            />
          </div>

          {/* Consumer Key */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Daraja Consumer Key
            </label>
            <input
              type="password"
              value={config.consumerKey || ''}
              onChange={e => setConfig({ ...config, consumerKey: e.target.value })}
              placeholder="Enter Safaricom Consumer Key"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-emerald-600"
            />
          </div>

          {/* Consumer Secret */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Daraja Consumer Secret
            </label>
            <input
              type="password"
              value={config.consumerSecret || ''}
              onChange={e => setConfig({ ...config, consumerSecret: e.target.value })}
              placeholder="Enter Safaricom Consumer Secret"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-emerald-600"
            />
          </div>

          {/* Passkey */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Online Passkey (Lipa na M-Pesa Online)
            </label>
            <input
              type="password"
              value={config.passkey || ''}
              onChange={e => setConfig({ ...config, passkey: e.target.value })}
              placeholder="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-emerald-600"
            />
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.valid 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />}
              <div>
                <p className="font-semibold">{testResult.valid ? 'Authentication Succeeded!' : 'Authentication Failed'}</p>
                <p className="text-[11px] mt-0.5">{testResult.message || testResult.error}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Gateway credentials saved successfully!</span>
            </div>
          )}

          {/* Portal Link */}
          <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1">
            <span>Need Daraja credentials?</span>
            <a 
              href="https://developer.safaricom.co.ke" 
              target="_blank" 
              rel="noreferrer"
              className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Safaricom Developer Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors"
            >
              {isTesting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-stone-700 border-t-transparent rounded-full animate-spin"></span>
                  Testing...
                </>
              ) : (
                <>
                  <Server className="w-3.5 h-3.5 text-stone-600" />
                  Test Daraja Handshake
                </>
              )}
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Save Gateway Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
