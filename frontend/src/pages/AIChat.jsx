import { useState, useRef, useEffect } from 'react';
import api from '../api';
import Icon from '../components/icons';

const AI_RESPONSE_DELAY = 500;

const CONVERSATION_STEPS = [
  { key: 'name', pattern: /(?:my name is|i'm|i am|this is|call me)\s+(\w+)/i, field: 'name' },
  { key: 'city', pattern: /(?:i'm from|i live in|city is|located in|from)\s+([a-zA-Z\s]+?)(?:\.|,|$)/i, field: 'city' },
  { key: 'consumption', pattern: /(\d+)\s*(?:kwh|units?)/i, field: 'consumption' },
  { key: 'budget', pattern: /(?:budget|range|around|about|spend)\s*(?:is|of)?\s*(?:rs\.?|pkr)?\s*([\d,]+)/i, field: 'budget' },
  { key: 'systemType', pattern: /(?:on[\s-]?grid|hybrid|off[\s-]?grid)/i, field: 'systemType' },
];

function getAIResponse(message, collectedInfo) {
  const lower = message.toLowerCase();

  if (/generate\s*(quotation|quote|quotation)/i.test(lower)) {
    const size = collectedInfo.consumption
      ? Math.ceil(parseInt(collectedInfo.consumption) / 120)
      : 5;
    return {
      text: `I'll prepare a quotation for you. Based on your requirements, I recommend a ${size}kW system. Let me generate that now.`,
      quotation: {
        systemSize: `${size} kW`,
        systemType: collectedInfo.systemType || 'Hybrid',
        estimatedCost: `Rs ${(size * 180000).toLocaleString()}`,
        monthlySavings: `Rs ${(parseInt(collectedInfo.consumption || 300) * 18).toLocaleString()}`,
        paybackYears: 4.5,
      },
    };
  }

  for (const step of CONVERSATION_STEPS) {
    const match = message.match(step.pattern);
    if (match && !collectedInfo[step.field]) {
      const value = match[1]?.trim();
      if (step.key === 'name') {
        return { text: `Nice to meet you, ${value}! What city are you located in?`, update: { name: value } };
      }
      if (step.key === 'city') {
        return { text: `Great, ${value}! What's your monthly electricity consumption in kWh?`, update: { city: value } };
      }
      if (step.key === 'consumption') {
        return { text: `Got it. What's your budget range?`, update: { consumption: value } };
      }
      if (step.key === 'budget') {
        return { text: `Perfect. Do you prefer on-grid, hybrid, or off-grid?`, update: { budget: value } };
      }
      if (step.key === 'systemType') {
        const sysType = lower.includes('on-grid') || lower.includes('on grid') ? 'on_grid'
          : lower.includes('off-grid') || lower.includes('off grid') ? 'off_grid'
          : 'hybrid';
        return { text: `Great choice! A ${sysType.replace('_', '-')} system is excellent. Would you like me to generate a quotation?`, update: { systemType: sysType } };
      }
    }
  }

  if (collectedInfo.name && !collectedInfo.city) {
    return { text: `Thanks ${collectedInfo.name}! Which city are you located in?` };
  }
  if (collectedInfo.city && !collectedInfo.consumption) {
    return { text: `What's your monthly electricity consumption in kWh?` };
  }
  if (collectedInfo.consumption && !collectedInfo.budget) {
    return { text: `What's your budget range?` };
  }
  if (collectedInfo.budget && !collectedInfo.systemType) {
    return { text: `Do you prefer on-grid, hybrid, or off-grid?` };
  }

  return { text: "I understand. Could you tell me more about your solar requirements?" };
}

function MessageBubble({ message }) {
  const isAI = message.sender === 'ai';
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mr-2 mt-1 shrink-0">
          <Icon name="sun" size={14} className="text-amber-400" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isAI
            ? 'bg-amber-500/10 border border-amber-500/20 text-slate-200'
            : 'bg-sky-500/10 border border-sky-500/20 text-slate-200'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        {message.quotation && (
          <div className="mt-3 p-3 rounded-xl bg-surface-3 border border-surface-4">
            <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">Mock Quotation</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500">System:</span> <span className="text-white font-medium">{message.quotation.systemSize}</span></div>
              <div><span className="text-slate-500">Type:</span> <span className="text-white font-medium capitalize">{message.quotation.systemType.replace('_', '-')}</span></div>
              <div><span className="text-slate-500">Cost:</span> <span className="text-amber-400 font-medium">{message.quotation.estimatedCost}</span></div>
              <div><span className="text-slate-500">Savings/mo:</span> <span className="text-emerald-400 font-medium">{message.quotation.monthlySavings}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Payback:</span> <span className="text-white font-medium">{message.quotation.paybackYears} years</span></div>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-500 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collectedInfo, setCollectedInfo] = useState({
    name: '', city: '', consumption: '', budget: '', systemType: '',
  });
  const [creatingLead, setCreatingLead] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const greeting = {
      id: Date.now(),
      sender: 'ai',
      text: "Hello! I'm SolarOS AI Assistant. I help you qualify leads and generate solar quotations. How can I help today?",
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise((r) => setTimeout(r, AI_RESPONSE_DELAY));

    const result = getAIResponse(text, collectedInfo);
    if (result.update) {
      setCollectedInfo((prev) => ({ ...prev, ...result.update }));
    }

    const aiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      text: result.text,
      quotation: result.quotation || null,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createLead = async () => {
    if (!collectedInfo.name) {
      alert('Please collect at least a name before creating a lead.');
      return;
    }
    setCreatingLead(true);
    try {
      await api.post('/leads', {
        customer_name: collectedInfo.name,
        customer_city: collectedInfo.city,
        monthly_consumption: collectedInfo.consumption ? parseFloat(collectedInfo.consumption) : null,
        system_type: collectedInfo.systemType || 'hybrid',
      });
      alert('Lead created successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setCreatingLead(false);
    }
  };

  const collectedFields = [
    { label: 'Name', value: collectedInfo.name, icon: 'user' },
    { label: 'City', value: collectedInfo.city, icon: 'mapPin' },
    { label: 'Consumption', value: collectedInfo.consumption ? `${collectedInfo.consumption} kWh` : '', icon: 'zap' },
    { label: 'Budget', value: collectedInfo.budget ? `Rs ${Number(collectedInfo.budget).toLocaleString()}` : '', icon: 'wallet' },
    { label: 'System Type', value: collectedInfo.systemType?.replace(/_/g, ' ') || '', icon: 'sun' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-heading">AI Sales Agent</h1>
          <p className="page-sub mt-1">Conversational lead qualification & quotation generation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Chat Area */}
        <div className="lg:col-span-3 flex flex-col card" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          <div className="p-4 border-b border-surface-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Icon name="sun" size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">SolarOS AI</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Online
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Icon name="sun" size={14} className="text-amber-400" />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-surface-4">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="input flex-1"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="btn-brand px-5"
              >
                <Icon name="send" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Collected Info */}
        <div className="bg-surface-3 rounded-2xl border border-surface-4 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Icon name="info" size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Collected Info</h2>
          </div>

          <div className="space-y-3 flex-1">
            {collectedFields.map((field) => (
              <div key={field.label} className="p-3 rounded-xl bg-surface-2 border border-surface-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={field.icon} size={12} className="text-slate-500" />
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{field.label}</span>
                </div>
                <p className={`text-sm font-medium ${field.value ? 'text-white' : 'text-slate-600'}`}>
                  {field.value || 'Not provided'}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={createLead}
            disabled={creatingLead || !collectedInfo.name}
            className="btn-primary w-full mt-5"
          >
            <Icon name="plus" size={16} />
            {creatingLead ? 'Creating...' : 'Create Lead'}
          </button>

          <button
            onClick={() => {
              setCollectedInfo({ name: '', city: '', consumption: '', budget: '', systemType: '' });
              setMessages([{
                id: Date.now(),
                sender: 'ai',
                text: "Hello! I'm SolarOS AI Assistant. I help you qualify leads and generate solar quotations. How can I help today?",
                timestamp: new Date(),
              }]);
            }}
            className="btn-secondary w-full mt-2"
          >
            <Icon name="activity" size={16} />
            New Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
