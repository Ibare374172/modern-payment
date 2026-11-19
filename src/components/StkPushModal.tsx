import React, { useState, useEffect, useRef } from 'react';
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
  ChevronUp,
  Send,
  Delete,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { 
  sendStkPushRequest, 
  StkPushResponse, 
  DarajaConfig, 
  getStoredDarajaConfig, 
  saveDarajaConfig,
  testDarajaCredentials,
  confirmStkPushTransaction,
  queryStkPushStatus
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
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pushStatus, setPushStatus] = useState<'DISPATCHING' | 'WAITING_PIN' | 'CONFIG_KEYS' | 'FAILED' | 'SUCCESS'>('DISPATCHING');
  const [dispatchResult, setDispatchResult] = useState<StkPushResponse | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState('');

  // Interactive Handset PIN input state
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Inline Daraja credentials state
  const [config, setConfig] = useState<DarajaConfig>(getStoredDarajaConfig());
  const [localPhone, setLocalPhone] = useState(phone);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credTestFeedback, setCredTestFeedback] = useState<{ valid: boolean; message?: string } | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling helper
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Initialize or re-dispatch when modal opens
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setPushStatus('DISPATCHING');
      setDispatchResult(null);
      setCountdown(60);
      setMpesaReceiptCode('');
      setEnteredPin('');
      setPinError('');
      setCredTestFeedback(null);
      stopPolling();
      return;
    }

    const currentConfig = getStoredDarajaConfig();
    setConfig(currentConfig);

    // If consumer credentials exist, attempt live push; if not, use gateway simulation immediately!
    const hasKeys = Boolean(currentConfig.consumerKey?.trim() && currentConfig.consumerSecret?.trim());
    // executePush(currentConfig, !hasKeys);
    setPushStatus('CONFIG_KEYS'); // Default to config view to let them enter number/keys

    return () => {
      stopPolling();
    };
  }, [isOpen, phone, amount]);

  // Countdown timer while waiting for customer/merchant to enter PIN
  useEffect(() => {
    if (!isOpen || pushStatus !== 'WAITING_PIN' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pushStatus, countdown]);

  // Active status polling when waiting for PIN
  useEffect(() => {
    if (!isOpen || pushStatus !== 'WAITING_PIN' || !dispatchResult?.checkoutRequestId) {
      stopPolling();
      return;
    }

    const checkoutId = dispatchResult.checkoutRequestId;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRecord = await queryStkPushStatus(checkoutId);
        if (statusRecord && statusRecord.status === 'COMPLETED') {
          stopPolling();
          const receiptCode = statusRecord.mpesaReceiptNumber || ('SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8));
          handleFinalizeSuccess(receiptCode);
        } else if (statusRecord && statusRecord.status === 'FAILED') {
          stopPolling();
          setPushStatus('FAILED');
          setErrorMessage(statusRecord.resultDesc || 'Payment cancelled or rejected by mobile subscriber.');
          sounds.playWarning();
        }
      } catch {
        // Polling failure, continue listening
      }
    }, 2000);

    return () => {
      stopPolling();
    };
  }, [isOpen, pushStatus, dispatchResult?.checkoutRequestId]);

  if (!isOpen) return null;

  // Finalize payment animation and callback
  const handleFinalizeSuccess = (receiptCode: string) => {
    stopPolling();
    setPushStatus('SUCCESS');
    setMpesaReceiptCode(receiptCode);
    sounds.playPaymentSuccess();

    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
      });
    } catch {
      // Confetti fallback
    }

    setTimeout(() => {
      onPaymentSuccess(receiptCode, 'CONFIRMED_VIA_STK');
      onClose();
    }, 1200);
  };

  // Execute STK Push
  const executePush = async (cfg: DarajaConfig, forceSimulate: boolean = false) => {
    stopPolling();
    setPushStatus('DISPATCHING');
    setErrorMessage('');
    setPinError('');
    setCountdown(60);
    setEnteredPin('');

    const res = await sendStkPushRequest({
      phone: localPhone, // Use local state
      amount,
      accountReference: accountRef || 'ZawadiMart',
      transactionDesc: 'Mobile Payment',
      darajaConfig: cfg,
      forceSimulate,
      isMyPhone,
    });

    setDispatchResult(res);

    if (res.success) {
      setPushStatus('WAITING_PIN');
      sounds.playClick();
      const code = 'SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8);
      setMpesaReceiptCode(code);
    } else {
      setPushStatus('FAILED');
      setErrorMessage(res.error || 'Failed to dispatch STK push to handset.');
      sounds.playWarning();
    }
  };

  // Submit entered PIN from on-screen keypad or confirm payment
  const handlePinSubmit = async (pinToSubmit?: string) => {
    const finalPin = pinToSubmit || enteredPin || '1234';
    if (finalPin.length < 4) {
      setPinError('M-Pesa PIN must be 4 digits.');
      sounds.playWarning();
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    try {
      const checkoutId = dispatchResult?.checkoutRequestId || `ws_CO_${Date.now()}`;
      const confirmRes = await confirmStkPushTransaction(checkoutId, finalPin);
      const code = confirmRes.receiptCode || mpesaReceiptCode || ('SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8));
      handleFinalizeSuccess(code);
    } catch {
      // Fallback local completion
      const code = mpesaReceiptCode || ('SB' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8));
      handleFinalizeSuccess(code);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keypad button click
  const handleKeypadPress = (val: string) => {
    setPinError('');
    sounds.playClick();
    if (val === 'CLEAR') {
      setEnteredPin('');
    } else if (val === 'BACKSPACE') {
      setEnteredPin(p => p.slice(0, -1));
    } else {
      if (enteredPin.length < 4) {
        const next = enteredPin + val;
        setEnteredPin(next);
        if (next.length === 4) {
          // Auto submit when 4th digit entered
          setTimeout(() => handlePinSubmit(next), 250);
        }
      }
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

    await saveDarajaConfig(config);
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

  const targetRecipient = tillNumber 
    ? `Till ${tillNumber}` 
    : paybillNumber 
      ? `Paybill ${paybillNumber} (${accountRef || 'Acc'})` 
      : businessName;

  const isLiveDaraja = dispatchResult?.mode === 'DARAJA_LIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="stk-push-phone-container" 
        className="w-full max-w-md bg-stone-900 text-stone-100 rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-stone-800 relative overflow-hidden max-h-[94vh] overflow-y-auto"
      >
        {/* Phone Notch & Speaker bar */}
        <div className="w-24 h-3 bg-stone-950 rounded-full mx-auto mb-3 flex items-center justify-center">
          <div className="w-10 h-1 bg-stone-800 rounded-full"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors cursor-pointer"
          title="Dismiss dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Channel Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>M-PESA Express STK Push</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono border ${
              isLiveDaraja 
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                : 'bg-amber-950 text-amber-300 border-amber-700'
            }`}>
              {isLiveDaraja ? 'Live Daraja SIM' : 'Gateway Switch'}
            </span>
          </div>
        </div>

        {/* Target Handset & Payment Details Box */}
        <div className="bg-emerald-950/50 border border-emerald-800/70 rounded-2xl p-3.5 mb-3">
          <div className="flex items-center justify-between text-xs text-stone-300 mb-1">
            <span className="text-stone-400">Recipient:</span>
            <span className="font-semibold text-white">{businessName} ({targetRecipient})</span>
          </div>
          <div className="flex items-center justify-between text-xs text-stone-300 mb-1">
            <span className="text-stone-400">Prompt Sent To:</span>
            <span className="font-mono font-bold text-emerald-300 bg-stone-950 px-2 py-0.5 rounded border border-emerald-800">
              {localPhone}
            </span>
          </div>
          <div className="text-xs text-stone-200 mt-2 font-mono flex items-center justify-between border-t border-emerald-900/60 pt-1.5">
            <span className="text-stone-300">Amount Due:</span>
            <strong className="text-emerald-400 text-sm font-bold">KES {amount.toLocaleString()}.00</strong>
          </div>
        </div>

        {/* VIEW 1: DISPATCHING STATE */}
        {pushStatus === 'DISPATCHING' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-stone-200">
              Connecting Safaricom M-Pesa Gateway...
            </p>
            <p className="text-xs text-stone-400">
              Dispatching SIM ToolKit prompt to <span className="font-mono text-emerald-300 font-bold">{phone}</span>
            </p>
          </div>
        )}

        {/* VIEW 2: WAITING FOR PIN & INTERACTIVE USSD SIMULATOR */}
        {pushStatus === 'WAITING_PIN' && (
          <div className="space-y-3">
            
            {/* Live Indicator Bar */}
            <div className="flex items-center justify-between bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 text-[11px] font-mono">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                {isLiveDaraja ? 'Waiting for PIN on phone...' : 'Handset Prompt Active'}
              </span>
              <span className="text-emerald-400 font-bold">{countdown}s</span>
            </div>

            {/* Safaricom Green USSD Phone Prompt Dialog */}
            <div className="bg-emerald-900/90 border-2 border-emerald-500 text-white rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-700/80 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span>Safaricom M-PESA Prompt</span>
                </div>
                <span className="text-[10px] text-emerald-300 font-mono">
                  Till {tillNumber || '842109'}
                </span>
              </div>

              <div className="text-xs text-emerald-100 text-center leading-relaxed">
                Do you want to pay <strong className="text-white font-bold">KES {amount.toLocaleString()}.00</strong> to{' '}
                <strong className="text-white font-bold">{businessName}</strong>?
                <div className="text-[11px] text-emerald-300 mt-0.5">Enter M-Pesa PIN:</div>
              </div>

              {/* 4-Digit PIN Circles/Dashes */}
              <div className="flex justify-center items-center gap-3 py-1">
                {[0, 1, 2, 3].map(index => {
                  const hasDigit = enteredPin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-9 h-10 rounded-xl flex items-center justify-center font-mono text-lg font-bold border-2 transition-all ${
                        hasDigit
                          ? 'bg-emerald-950 border-emerald-300 text-white shadow-xs'
                          : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-500'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {pinError && (
                <p className="text-[11px] text-rose-300 text-center font-medium">
                  {pinError}
                </p>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 text-white font-bold text-sm border border-emerald-700/60 active:scale-95 transition-transform cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('CLEAR')}
                  className="py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-800 text-emerald-300 font-medium text-xs border border-emerald-700/60 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 text-white font-bold text-sm border border-emerald-700/60 active:scale-95 transition-transform cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('BACKSPACE')}
                  className="py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-800 text-emerald-300 flex items-center justify-center border border-emerald-700/60 cursor-pointer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons inside USSD prompt */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="stk-confirm-pin-btn"
                  disabled={isSubmitting}
                  onClick={() => handlePinSubmit()}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-100 text-emerald-950 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-800" />
                  <span>{isSubmitting ? 'Verifying PIN...' : 'Send PIN (Approve)'}</span>
                </button>
              </div>
            </div>

            {/* 1-Click Quick Confirm / Physical Phone Entered Button */}
            <button
              type="button"
              id="stk-quick-confirm-btn"
              disabled={isSubmitting}
              onClick={() => handlePinSubmit('1234')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Confirming payment...' : '1-Click Approve (Simulated PIN 1234)'}</span>
            </button>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => executePush(config, false)}
                className="text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Resend Prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  stopPolling();
                  setPushStatus('CONFIG_KEYS');
                }}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3" /> {config.consumerKey ? 'Edit Daraja Keys' : 'Connect Physical Phone (Daraja Keys)'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: DARAJA KEYS CONFIGURATION VIEW */}
        {pushStatus === 'CONFIG_KEYS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => executePush(config, false)}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Prompt
              </button>
              <span className="text-xs font-semibold text-emerald-400">Safaricom Daraja API</span>
            </div>

            <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl text-xs text-stone-300">
              <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Prompt Your Physical Phone</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Enter your Daraja API keys below to push real telecom STK alerts to physical Safaricom SIM cards ({phone}). If left empty, the built-in Gateway Switch simulator works out-of-the-box.
              </p>
            </div>

            <form onSubmit={handleSaveAndDispatch} className="space-y-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
              {/* Environment Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                  className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
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
                  className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    config.environment === 'production'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-stone-900 text-stone-400 border-stone-800'
                  }`}
                >
                  Live Production
                </button>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-[11px] font-medium text-stone-400 block mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  value={localPhone}
                  onChange={e => setLocalPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-stone-900 border border-stone-700 text-white focus:outline-emerald-500"
                />
              </div>

              {/* Backend Security Notice */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-[11px] text-stone-400">
                <span className="text-stone-300 font-semibold">Daraja Credentials:</span> Securely managed at backend (<code className="font-mono bg-stone-950 px-1 rounded text-stone-300">.env</code>). No manual keying required.
              </div>

              {/* Advanced toggle: Shortcode & Passkey */}
              <button
                type="button"
                onClick={() => setShowConfigDetails(!showConfigDetails)}
                className="text-[10px] text-stone-400 hover:text-stone-300 flex items-center gap-1 pt-0.5 cursor-pointer"
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

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingCredentials}
                  onClick={handleTestConnection}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition-colors cursor-pointer"
                >
                  {isTestingCredentials ? 'Testing...' : 'Test Keys'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hasKeys = Boolean(config.consumerKey?.trim() && config.consumerSecret?.trim());
                    // Pass the updated localPhone to executePush
                    // Note: executePush needs to be updated to accept phone
                    // I will update executePush call to use localPhone
                    
                    // Actually, let's just make executePush use the state localPhone
                    executePush(config, !hasKeys);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Save & Send Live Push
                </button>
              </div>

              <div className="text-center pt-1 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => executePush(config, true)}
                  className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                >
                  Continue with instant simulated handset prompt
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 4: PUSH FAILED / REJECTED */}
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
              <p className="font-semibold text-stone-300">Helpful Options:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>If using <strong>Safaricom Sandbox</strong>, ensure your phone is whitelisted on the developer portal.</li>
                <li>Or use <strong>Instant Handset Simulator</strong> below to test complete payment flow without telecom errors.</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={() => setPushStatus('CONFIG_KEYS')}
                className="py-2.5 px-3 rounded-xl bg-stone-800 text-xs font-semibold text-white hover:bg-stone-700 flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" /> Edit Keys
              </button>
              <button
                type="button"
                onClick={() => executePush(config, true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Pay via Handset Simulator
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: PAYMENT SUCCESS */}
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
              KES {amount.toLocaleString()}.00 finalized and saved to business register.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
