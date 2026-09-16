import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Key, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { aiService } from '../services/aiService';

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const AiApiKeyModal: React.FC<AiApiKeyModalProps> = ({ isOpen, onClose, onKeyUpdated }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(aiService.getCustomApiKey());
      setModel(aiService.getCustomModel());
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    aiService.setCustomApiKey(apiKey.trim());
    if (model.trim()) {
      aiService.setCustomModel(model.trim());
    } else {
      aiService.clearCustomModel();
    }
    onKeyUpdated?.();
    onClose();
  };

  const handleClear = () => {
    aiService.clearCustomApiKey();
    aiService.clearCustomModel();
    setApiKey('');
    setModel('');
    setTestResult(null);
    onKeyUpdated?.();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await aiService.testConnection(apiKey.trim() || undefined, model.trim() || undefined);
      if (response.success) {
        setTestResult({
          success: true,
          message: `Connected successfully! Model responded: "${response.sampleText}"`,
        });
      } else {
        setTestResult({
          success: false,
          message: response.error || 'Connection test failed. Please check your API key.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const quickModels = [
    { label: 'Nex-AGI Mini (Free & Ultra Fast)', id: 'nex-agi/nex-n2.5-mini:free' },
    { label: 'Nemotron 3.5 (Free)', id: 'nvidia/nemotron-3.5-lightning:free' },
    { label: 'Gemma 4 31B (Free)', id: 'google/gemma-4-31b-it:free' },
    { label: 'GPT-4o Mini', id: 'openai/gpt-4o-mini' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Configuration & API Settings">
      <div className="p-6 space-y-6">
        {/* Status Card */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3">
          <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-emerald-950 text-sm sm:text-base flex items-center gap-2">
              System AI is Active
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-200/80 text-emerald-900">
                Ready to use
              </span>
            </h4>
            <p className="text-xs sm:text-sm text-emerald-800/90 mt-1 leading-relaxed">
              LAK PDF provides built-in free AI processing using OpenRouter. You don't need your own key to use the AI tools!
            </p>
          </div>
        </div>

        {/* Custom API Key Input */}
        <div className="space-y-4 pt-2">
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-primary-500" />
                Custom OpenRouter API Key (Optional)
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              If you have your own OpenRouter key, enter it here for unlimited personal rate limits and custom models.
            </p>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Custom Model */}
          <div>
            <label className="text-sm font-semibold text-slate-800 mb-1.5 block">
              AI Model ID (Optional)
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. nex-agi/nex-n2.5-pro:free"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-all"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    model === m.id
                      ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Test button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              )}
              {isTesting ? 'Testing...' : 'Test AI Connection'}
            </button>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Clear Custom Key
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
