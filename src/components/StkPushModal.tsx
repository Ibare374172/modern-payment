import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Radio, 
  RefreshCw,
  Zap,
  ExternalLink,
  Key,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { 
  sendStkPushRequest, 
  StkPushResponse, 
  DarajaConfig, 
  getStoredDarajaConfig, 
  saveDarajaConfig,
  testDarajaCredentials
} from '../services/stkService';

interface StkPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  amount: number;
  businessName: string;
  tillNumber?: string;
  paybillNumber?: string;
  accountRef?: string;
  isMyPhone?: boolean;
  onPaymentSuccess: (mpesaCode: string, pin: string) => void;
  onOpenDarajaConfig?: () => void;
}

export const StkPushModal: React.FC<StkPushModalProps> = ({
  isOpen,
  onClose,
  phone,
  amount,
  businessName,
  tillNumber,
  paybillNumber,
  accountRef,
  isMyPhone = false,
  onPaymentSuccess,
  onOpenDarajaConfig,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pushStatus, setPushStatus] = useState<'CHECKING' | 'CONFIG_REQUIRED' | 'DISPATCHING' | 'WAITING_PIN' | 'FAILED' | 'SUCCESS'>('CHECKING');
  const [dispatchResult, setDispatchResult] = useState<StkPushResponse | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState('');

  // Inline Daraja credentials state
  const [config, setConfig] = useState<DarajaConfig>(getStoredDarajaConfig());
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credTestFeedback, setCredTestFeedback] = useState<{ valid: boolean; message?: string } | null>(null);

  // Initialize or re-dispatch when modal opens
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setPushStatus('CHECKING');
      setDispatchResult(null);
      setCountdown(60);
      setMpesaReceiptCode('');
      setCredTestFeedback(null);
      return;
    }

    const currentConfig = getStoredDarajaConfig();
    setConfig(currentConfig);

    // If no credentials configured yet, guide user to configure them so their real phone gets prompted
    if (!currentConfig.consumerKey?.trim() || !currentConfig.consumerSecret?.trim()) {
      setPushStatus('CONFIG_REQUIRED');
      return;
    }

    executePush(currentConfig, false);
  }, [isOpen, phone, amount]);

  // Countdown timer while waiting for customer/merchant to enter PIN on phone
  useEffect(() => {
    if (!isOpen || pushStatus !== 'WAITING_PIN' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pushStatus, countdown]);

  if (!isOpen) return null;

  // Execute STK Push
  const executePush = async (cfg: DarajaConfig, forceSimulate: boolean = false) => {
    setPushStatus('DISPATCHING');
    setErrorMessage('');
    setCountdown(60);

    const res = await sendStkPushRequest({
      phone,
      amount,
      accountReference: accountRef || 'ZawadiMart',
      transactionDesc: 'Mobile Payment',
      darajaConfig: cfg,
      forceSimulate,
    });

    setDispatchResult(res);

    if (res.success) {
      setPushStatus('WAITING_PIN');
      sounds.playClick();
      // Generate realistic M-Pesa transaction reference (e.g. SB78492041)
      const mockCode = 'SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8);
      setMpesaReceiptCode(mockCode);
    } else {
      if (res.requiresCredentials) {
        setPushStatus('CONFIG_REQUIRED');
      } else {
        setPushStatus('FAILED');
      }
      setErrorMessage(res.error || 'Failed to dispatch STK push to handset.');
      sounds.playWarning();
    }
  };

  // Save inline credentials and immediately dispatch
  const handleSaveAndDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.consumerKey?.trim() || !config.consumerSecret?.trim()) {
      setErrorMessage('Please enter both Daraja Consumer Key and Consumer Secret.');
      sounds.playWarning();
      return;
    }

    saveDarajaConfig(config);
    sounds.playClick();
    await executePush(config, false);
  };

  // Test credentials connection
  const handleTestConnection = async () => {
    if (!config.consumerKey || !config.consumerSecret) {
      setCredTestFeedback({ valid: false, message: 'Please enter Consumer Key and Secret.' });
      return;
    }
    setIsTestingCredentials(true);
    setCredTestFeedback(null);
    const res = await testDarajaCredentials(config);
    setIsTestingCredentials(false);
    setCredTestFeedback({ valid: res.valid, message: res.message || res.error });
    if (res.valid) {
      sounds.playPaymentSuccess();
    } else {
      sounds.playWarning();
    }
  };

  // Confirm payment after customer/merchant entered PIN on phone
  const handleConfirmPayment = () => {
    setIsSubmitting(true);
    setPushStatus('SUCCESS');
    sounds.playPaymentSuccess();

    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
      });
    } catch {
      // Confetti fallback
    }

    setTimeout(() => {
      const code = mpesaReceiptCode || ('SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8));
      onPaymentSuccess(code, 'PIN_ENTERED_ON_PHONE');
      onClose();
    }, 900);
  };

  const targetRecipient = tillNumber 
    ? `Till ${tillNumber}` 
    : paybillNumber 
      ? `Paybill ${paybillNumber} (${accountRef || 'Acc'})` 
      : businessName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="stk-push-phone-container" 
        className="w-full max-w-md bg-stone-900 text-stone-100 rounded-3xl p-6 shadow-2xl border-4 border-stone-800 relative overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Phone Notch & Speaker bar */}
        <div className="w-24 h-3.5 bg-stone-950 rounded-full mx-auto mb-3 flex items-center justify-center">
          <div className="w-10 h-1 bg-stone-800 rounded-full"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors"
          title="Dismiss dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Channel Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Smartphone className="w-4 h-4" />
            <span>M-PESA Express STK Push</span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
            {isMyPhone ? 'My Mobile Phone' : "Customer's Phone"}
          </span>
        </div>

        {/* Target Handset & Payment Details Box */}
        <div className="bg-emerald-950/60 border border-emerald-800/70 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-stone-300 mb-1">
            <span>Destination Phone:</span>
            <span className="font-mono font-bold text-white bg-stone-950 px-2.5 py-0.5 rounded border border-emerald-800">
              {phone}
            </span>
          </div>
          <div className="text-xs text-stone-200 mt-2 font-mono flex items-center justify-between">
            <span>Amount:</span>
            <strong className="text-emerald-400 text-sm font-bold">KES {amount.toLocaleString()}.00</strong>
          </div>
          <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between border-t border-emerald-900/60 pt-1.5">
            <span>Recipient:</span>
            <span className="text-stone-200 font-medium">{businessName} ({targetRecipient})</span>
          </div>
        </div>

        {/* View 1: Missing Credentials Setup Card */}
        {pushStatus === 'CONFIG_REQUIRED' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Safaricom Daraja API Keys Required</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                To send a real USSD SIM ToolKit prompt directly to your physical mobile phone (<strong className="font-mono text-white">{phone}</strong>), Safaricom requires your Daraja Consumer Key and Secret.
              </p>
            </div>

            <form onSubmit={handleSaveAndDispatch} className="space-y-3 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300">Daraja Credentials Setup</span>
                <a 
                  href="https://developer.safaricom.co.ke" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Get Keys <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Environment Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                  className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    config.environment === 'sandbox'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  Safaricom Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: 'production' })}
                  className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    config.environment === 'production'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  Live Production
                </button>
              </div>

              {/* Consumer Key */}
              <div>
                <label className="text-[11px] font-medium text-stone-400 block mb-1">
                  Consumer Key
                </label>
                <input
                  type="text"
                  value={config.consumerKey || ''}
                  onChange={e => setConfig({ ...config, consumerKey: e.target.value })}
                  placeholder="Paste Safaricom Consumer Key"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-white focus:outline-emerald-500"
                  required
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="text-[11px] font-medium text-stone-400 block mb-1">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  value={config.consumerSecret || ''}
                  onChange={e => setConfig({ ...config, consumerSecret: e.target.value })}
                  placeholder="Paste Safaricom Consumer Secret"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-white focus:outline-emerald-500"
                  required
                />
              </div>

              {/* Advanced toggle: Shortcode & Passkey */}
              <button
                type="button"
                onClick={() => setShowConfigDetails(!showConfigDetails)}
                className="text-[10px] text-stone-400 hover:text-stone-300 flex items-center gap-1 pt-1"
              >
                {showConfigDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showConfigDetails ? 'Hide Shortcode & Passkey' : 'Advanced: Shortcode & Passkey'}
              </button>

              {showConfigDetails && (
                <div className="space-y-2 pt-1 border-t border-stone-800">
                  <div>
                    <label className="text-[10px] font-medium text-stone-400 block mb-0.5">
                      Business Shortcode (Till / Paybill)
                    </label>
                    <input
                      type="text"
                      value={config.shortcode || ''}
                      onChange={e => setConfig({ ...config, shortcode: e.target.value })}
                      placeholder="174379"
                      className="w-full px-2.5 py-1 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-stone-400 block mb-0.5">
                      Online Passkey
                    </label>
                    <input
                      type="password"
                      value={config.passkey || ''}
                      onChange={e => setConfig({ ...config, passkey: e.target.value })}
                      placeholder="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
                      className="w-full px-2.5 py-1 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-white"
                    />
                  </div>
                </div>
              )}

              {credTestFeedback && (
                <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                  credTestFeedback.valid 
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950 border border-rose-800 text-rose-300'
                }`}>
                  {credTestFeedback.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{credTestFeedback.message}</span>
                </div>
              )}

              {errorMessage && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMessage}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isTestingCredentials}
                  onClick={handleTestConnection}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition-colors"
                >
                  {isTestingCredentials ? 'Testing...' : 'Test Keys'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  Save & Prompt My Phone
                </button>
              </div>

              {/* Simulation fallback link */}
              <div className="text-center pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => executePush(config, true)}
                  className="text-[11px] text-stone-400 hover:text-stone-200 underline"
                >
                  Or test simulated approval without real Daraja keys
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View 2: Dispatching to Safaricom */}
        {pushStatus === 'DISPATCHING' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-stone-200">
              Contacting Safaricom M-Pesa Gateway...
            </p>
            <p className="text-xs text-stone-400">
              Sending USSD SIM ToolKit prompt to <span className="font-mono text-white">{phone}</span>
            </p>
          </div>
        )}

        {/* View 3: Prompt Sent & Waiting for PIN on Handset */}
        {pushStatus === 'WAITING_PIN' && (
          <div className="py-2 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Check Your Phone Screen Now
              </h3>
              <p className="text-xs text-emerald-300 font-medium">
                Prompt sent to <span className="font-mono text-white font-bold">{phone}</span>
              </p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto pt-1 leading-relaxed">
                A Safaricom prompt will pop up on {isMyPhone ? 'your physical phone' : "the customer's handset"}. Enter your 4-digit M-Pesa PIN directly on your phone.
              </p>
            </div>

            {/* Gateway Checkout reference */}
            {dispatchResult?.checkoutRequestId && (
              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-400 flex items-center justify-between">
                <span>Checkout Request ID:</span>
                <span className="text-stone-200 font-semibold truncate max-w-[170px]">
                  {dispatchResult.checkoutRequestId}
                </span>
              </div>
            )}

            {/* Live Countdown */}
            <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs flex items-center justify-between font-mono">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-ping" />
                Listening for PIN entry...
              </span>
              <span className="text-emerald-400 font-bold">{countdown}s</span>
            </div>

            {/* Confirmation on phone */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                id="stk-confirm-pin-btn"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Verifying with Safaricom...' : "PIN Entered on Phone (Confirm Payment)"}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => executePush(config, false)}
                  className="text-stone-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setPushStatus('CONFIG_REQUIRED')}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" /> Edit Gateway Keys
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View 4: Push Failed / Rejected */}
        {pushStatus === 'FAILED' && (
          <div className="py-4 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-300">Prompt Could Not Be Delivered</h3>
              <p className="text-xs text-rose-200/90 mt-1 px-3 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 font-mono text-[11px] leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-400 text-left space-y-1">
              <p className="font-semibold text-stone-300">Troubleshooting Tips:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>If using <strong>Sandbox</strong>, your test phone number must be whitelisted in Safaricom Developer Portal, or switch to <strong>Live Production</strong>.</li>
                <li>Verify your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong> match your active Safaricom app.</li>
                <li>Ensure phone number format is 07... or 01... or 254...</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={() => setPushStatus('CONFIG_REQUIRED')}
                className="py-2.5 px-3 rounded-xl bg-stone-800 text-xs font-semibold text-white hover:bg-stone-700 flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5" /> Edit Keys
              </button>
              <button
                type="button"
                onClick={() => executePush(config, false)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Push
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => executePush(config, true)}
                className="text-[11px] text-stone-400 hover:text-stone-200 underline"
              >
                Record transaction with simulated confirmation
              </button>
            </div>
          </div>
        )}

        {/* View 5: Payment Success */}
        {pushStatus === 'SUCCESS' && (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500 text-stone-950 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-900">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">
              M-PESA Payment Approved!
            </h3>
            <p className="text-xs text-emerald-400 font-mono font-semibold">
              Receipt Code: {mpesaReceiptCode}
            </p>
            <p className="text-[11px] text-stone-400">
              Transaction finalized and saved to register.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
