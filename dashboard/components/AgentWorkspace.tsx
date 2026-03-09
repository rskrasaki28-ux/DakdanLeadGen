import React, { useState, useEffect, useRef } from 'react';
import { Agent, ChatMessage, AgentRole, Campaign } from '../types';
import { Lead } from '../models/ui/Lead';
import { getGeminiChatResponse } from '../services/geminiService';
import { db } from '../services/dbService';
import { leadService } from '../services/leadService';
import { Send, Bot, User, Loader2, Sparkles, Plus, Briefcase, Mail, Mic, Paperclip, X, Headphones, ExternalLink, Video, Image as ImageIcon, Save, CheckCircle2, AlertCircle, Database, Network } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import ReactMarkdown from 'react-markdown';


const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const getRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
  
    if (diff < MINUTE_MS) return "Just now"
    if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`
    if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`
  
    return date.toLocaleDateString()
  }
  
  const getFullTime = (date: Date) => {
    return date.toLocaleString()
  }

  const groupMessagesByDate = (messages: ChatMessage[]): Map<string, ChatMessage[]> => {
    const grouped = new Map<string, ChatMessage[]>();
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateKey = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(msg);
    });
    
    return grouped;
  };

interface AgentWorkspaceProps {
  agent: Agent;
  globalLeads: Lead[];
  setGlobalLeads: (leads: Lead[]) => void;
  compactMode: boolean;
}

// Audio helpers for Live API
const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
};

const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ agent, globalLeads, setGlobalLeads, compactMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); // Dynamic status
  const [now, setNow] = useState(Date.now());
  
  // Attachments
  const [attachment, setAttachment] = useState<{file: File, base64: string, type: 'image' | 'video'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Sonny's Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const refreshData = async () => {
      // Refresh Leads using leadService
      const leads = await leadService.fetchLeads();
      setGlobalLeads(leads);
      // Refresh Campaigns
      if (agent.role === AgentRole.OUTREACH) {
          const loadedCampaigns = await db.getCampaigns();
          setCampaigns(loadedCampaigns);
          // If active campaign was updated, reflect it
          if (activeCampaign) {
             const updatedActive = loadedCampaigns.find(c => c.id === activeCampaign.id);
             if (updatedActive) setActiveCampaign(updatedActive);
          }
      }
  };

  // Load chat history and campaigns when agent changes
  useEffect(() => {
    const loadData = async () => {
      // 1. Chat History
      const history = await db.getChatHistory(agent.id);
      
      if (history.length === 0) {
        const welcomeMsg: ChatMessage = {
          id: `welcome-${agent.id}`,
          sender: 'agent',
          text: `Hi! I'm ${agent.name}. ${agent.description} How can I assist you?`,
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);
      } else {
        setMessages(history);
      }

      // 2. Campaigns (Only for Sonny)
      if (agent.role === AgentRole.OUTREACH) {
          const loadedCampaigns = await db.getCampaigns();
          setCampaigns(loadedCampaigns);
          if (loadedCampaigns.length === 0) {
              const template: Campaign = {
                  id: 'temp-1',
                  name: 'ZooMedia Q3 Expansion',
                  status: 'Draft',
                  targetAudience: 'Mid-sized Aquariums',
                  content: 'Subject: Partnership opportunity...\n\nHi [Name], ...',
                  createdAt: new Date().toISOString()
              };
              setActiveCampaign(template);
          } else {
              setActiveCampaign(loadedCampaigns[0]);
          }
      }
    };
    loadData();
    setAttachment(null);
  }, [agent.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, attachment, statusMessage]);

  // Refresh relative timestamps every minute
useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  // --- Campaign Handlers (Sonny) ---
  const handleSaveCampaign = async () => {
      if (!activeCampaign) return;
      await db.saveCampaign(activeCampaign);
      await refreshData();
      alert('Campaign saved!');
  };

  // --- Live API Handlers ---
  const stopLiveSession = () => {
      if (liveSessionRef.current) {
          // No direct close method on session object in some versions
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      setIsLiveActive(false);
      setIsLiveConnected(false);
  };

  const startLiveSession = async () => {
      if (isLiveActive) {
          stopLiveSession();
          return;
      }

      try {
          setIsLiveActive(true);
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Connect
          const sessionPromise = aiClient.live.connect({
             model: 'gemini-2.5-flash-native-audio-preview-12-2025',
             config: {
                 responseModalities: [Modality.AUDIO],
                 speechConfig: {
                     voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                 },
                 systemInstruction: agent.systemPrompt, // Pass specific persona
             },
             callbacks: {
                 onopen: () => {
                     console.log("Live Session Connected");
                     setIsLiveConnected(true);
                 },
                 onmessage: async (msg: LiveServerMessage) => {
                     // Handle Audio Output
                     const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                     if (audioData) {
                         const audioBytes = base64ToUint8Array(audioData);
                         playAudioChunk(audioBytes);
                     }
                 },
                 onclose: () => {
                     console.log("Live Session Closed");
                     setIsLiveConnected(false);
                     setIsLiveActive(false);
                 },
                 onerror: (err) => {
                     console.error("Live Session Error", err);
                     setIsLiveActive(false);
                 }
             }
          });
          
          liveSessionRef.current = sessionPromise;

          // Setup Audio Input Processing
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
              setVolumeLevel(Math.sqrt(sum/inputData.length));

              const pcm16 = floatTo16BitPCM(inputData);
              const uint8 = new Uint8Array(pcm16);
              // Base64 encode manually or use btoa with string conversion
              let binary = '';
              const len = uint8.byteLength;
              for (let i = 0; i < len; i++) binary += String.fromCharCode(uint8[i]);
              const base64 = btoa(binary);

              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64
                      }
                  });
              });
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
          
          inputSourceRef.current = source;
          processorRef.current = processor;

      } catch (e) {
          console.error("Failed to start Live session", e);
          setIsLiveActive(false);
          alert("Could not access microphone.");
      }
  };

  const playAudioChunk = async (pcmData: Uint8Array) => {
      if (!audioContextRef.current) return;
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const int16 = new Int16Array(pcmData.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
      }
      const buffer = outCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
      const source = outCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(outCtx.destination);
      source.start();
  };

  // --- Text Chat & Attachments Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const isVideo = file.type.startsWith('video/');
          const isImage = file.type.startsWith('image/');
          if (!isVideo && !isImage) {
              alert("Please upload an image or video file.");
              return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const base64String = (ev.target.result as string).split(',')[1];
                  setAttachment({ file, base64: base64String, type: isVideo ? 'video' : 'image' });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !attachment) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
      attachment: attachment ? {
          type: attachment.type,
          url: URL.createObjectURL(attachment.file)
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    db.saveChatMessage(agent.id, userMsg);
    
    setInputValue('');
    const currentAttachment = attachment;
    setAttachment(null); 
    setIsTyping(true);
    setStatusMessage(''); // Reset status

    // Build history for API
    const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
        parts: [{ text: m.text }] 
    }));
    history.push({ role: 'user', parts: [{ text: userMsg.text }]});

    // Call API with potential Tool Execution
    const response = await getGeminiChatResponse(
        agent, 
        userMsg.text, 
        history, 
        currentAttachment ? { base64: currentAttachment.base64, mimeType: currentAttachment.file.type } : undefined,
        0,
        (status) => setStatusMessage(status) // Update status message during execution
    );

    // After response, refresh data (in case agent added leads/campaigns via tools)
    await refreshData();

    const agentMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'agent',
      text: response.text,
      timestamp: new Date(),
      groundingMetadata: response.groundingMetadata,
      executedTasks: response.executedTasks // Store task logs
    };

    setIsTyping(false);
    setStatusMessage('');
    setMessages(prev => [...prev, agentMsg]);
    db.saveChatMessage(agent.id, agentMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to get icon for tool task
  const getTaskIcon = (tool: string) => {
     switch(tool) {
         case 'ask_agent': return <Network size={14} className="text-purple-600" />;
         case 'add_lead': return <Database size={14} className="text-blue-600" />;
         case 'create_campaign': return <Mail size={14} className="text-green-600" />;
         default: return <Bot size={14} className="text-slate-500" />;
     }
  };

  // Compact Styles
  const chatPadding = compactMode ? 'px-3 py-2 text-sm' : 'px-5 py-3.5 text-base';
  const inputPadding = compactMode ? 'py-2 pl-3' : 'py-3.5 pl-4';
  const headerSize = compactMode ? 'text-base' : 'text-lg';

  return (
    <div className={`flex h-[calc(100vh-${compactMode ? '48px' : '64px'})] relative`}>
      
      {/* Live Mode Overlay */}
      {isLiveActive && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center text-white backdrop-blur-sm">
              <div className="mb-8 relative">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(59,130,246,0.5)]`}>
                       <Headphones size={48} />
                  </div>
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-white opacity-50 transition-all duration-75 ease-out"
                    style={{ transform: `scale(${1 + volumeLevel * 5})` }}
                  />
              </div>
              <h2 className="text-2xl font-bold mb-2">Talking with {agent.name}</h2>
              <p className="text-slate-400 mb-8">{isLiveConnected ? "Listening..." : "Connecting..."}</p>
              
              <button 
                onClick={stopLiveSession}
                className="px-6 py-3 bg-red-600 rounded-full font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                  <X size={20} /> End Call
              </button>
          </div>
      )}

      {/* Chat Column */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col border-r border-slate-200 bg-white">
        
        {/* Chat History */}
<div className={`flex-1 overflow-y-auto ${compactMode ? 'p-2 space-y-3' : 'p-4 space-y-6'} scrollbar-hide`}>

{Array.from(groupMessagesByDate(messages).entries()).map(([dateKey, dayMessages]) => (
  <div key={dateKey}>

    {/* Date Divider */}
    <div className="my-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <div className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
        {dateKey}
      </div>
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    {dayMessages.map((msg) => (
      <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
        
        <div className={`${compactMode ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.sender === 'agent' ? agent.color : 'bg-slate-200'}`}>
          {msg.sender === 'agent'
            ? <Bot size={compactMode ? 16 : 20} className="text-white" />
            : <User size={compactMode ? 16 : 20} className="text-slate-600" />}
        </div>

        <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  {/* Attachment Display */}
                  {msg.attachment && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          {msg.attachment.type === 'image' ? (
                              <img src={msg.attachment.url} alt="User upload" className="max-w-full h-auto max-h-48 object-cover" />
                          ) : (
                              <div className="bg-slate-900 flex items-center justify-center w-48 h-32">
                                  <Video className="text-white" size={32} />
                              </div>
                          )}
                      </div>
                  )}

                  {/* Executed Tasks Log (Transparent UI) */}
                  {msg.executedTasks && msg.executedTasks.length > 0 && (
                      <div className="mb-2 w-full space-y-2">
                          {msg.executedTasks.map((task) => (
                              <div key={task.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs shadow-sm">
                                  <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                                      {getTaskIcon(task.tool)}
                                      <span>{task.summary}</span>
                                      {task.status === 'success' ? <CheckCircle2 size={12} className="text-green-500 ml-auto" /> : <AlertCircle size={12} className="text-red-500 ml-auto" />}
                                  </div>
                                  <div className="pl-6 border-l-2 border-slate-200 text-slate-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                      {task.details}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  <div 
                    className={`${chatPadding} rounded-2xl shadow-sm leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                    }`}
                  >
                    <ReactMarkdown 
                        className={`prose ${compactMode ? 'prose-xs' : 'prose-sm'} max-w-none ${msg.sender === 'user' ? 'prose-invert text-white' : 'text-slate-800'}`}
                        components={{
                            // Custom renderer for links to ensure they open in new tabs
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80" />,
                            p: ({node, ...props}) => <p {...props} className="mb-1 last:mb-0" />
                        }}
                    >
                        {msg.text}
                    </ReactMarkdown>

                    {/* Timestamp */}
                    <div
                        className={`mt-1 text-[10px] ${
                        msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'
                        }`}
                    title={getFullTime(new Date(msg.timestamp))}
                        >
                    {getRelativeTime(new Date(msg.timestamp))}
                        </div>
                    
                    {msg.groundingMetadata?.chunks && (
                        <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-wrap gap-2">
                            {msg.groundingMetadata.chunks.map((chunk: any, i: number) => 
                                chunk.web?.uri ? (
                                    <a 
                                        key={i} 
                                        href={chunk.web.uri} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-full text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                                    >
                                        <ExternalLink size={8} /> {chunk.web.title || 'Source'}
                                    </a>
                                ) : null
                            )}
                        </div>
                    )}
                  </div>
                  {msg.sender === 'agent' && (
                      <div className="mt-1 ml-1 text-[10px] text-slate-400">
                          {agent.name}
                      </div>
                  )}
              </div>
            </div>
                    ))}       
                    </div>       
                  ))}            
                        
          {isTyping && (
             <div className="flex gap-2">
                <div className={`${compactMode ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center flex-shrink-0 ${agent.color}`}>
                   <Loader2 size={compactMode ? 16 : 20} className="text-white animate-spin" />
                </div>
                <div className={`flex items-center ${compactMode ? 'h-8' : 'h-10'}`}>
                    <span className="text-xs text-slate-500 font-medium animate-pulse">{statusMessage || `${agent.name} is working...`}</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`${compactMode ? 'p-2' : 'p-4'} border-t border-slate-200 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-10`}>
          
          {attachment && (
              <div className="mb-2 flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-lg w-fit">
                  {attachment.type === 'image' ? <ImageIcon size={14} className="text-blue-500" /> : <Video size={14} className="text-purple-500" />}
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{attachment.file.name}</span>
                  <button onClick={() => setAttachment(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500"><X size={12} /></button>
              </div>
          )}

          <div className="relative flex items-end gap-2">
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden" 
                accept="image/*,video/*"
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className={`${compactMode ? 'p-1.5' : 'p-2.5'} text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 mb-1`}
                title="Add Image or Video"
             >
                 <Paperclip size={compactMode ? 16 : 20} />
             </button>

             <button 
                onClick={startLiveSession}
                className={`${compactMode ? 'p-1.5' : 'p-2.5'} text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 mb-1`}
                title="Start Voice Chat (Live API)"
             >
                 <Mic size={compactMode ? 16 : 20} />
             </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              className={`flex-1 ${inputPadding} pr-10 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none overflow-y-auto ${compactMode ? 'text-sm' : 'text-base'}`}
              style={{ minHeight: compactMode ? '38px' : '46px', maxHeight: '150px' }}
            />
            <button 
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && !attachment) || isTyping}
                className={`absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95`}
            >
              <Send size={compactMode ? 14 : 18} />
            </button>
          </div>
          <div className="mt-1 text-[10px] text-center text-slate-400 font-medium">
             Gemini Pro & Live enabled. AI can make mistakes.
          </div>
        </div>
      </div>

      {/* Workspace/Results Column */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col bg-slate-50 overflow-hidden">
         <div className={`${compactMode ? 'p-4' : 'p-6'} h-full overflow-y-auto`}>
             
             {/* Dynamic Content based on Role */}
             {agent.role === AgentRole.LEAD_GEN && (
                 <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <h3 className={`${headerSize} font-bold text-slate-800 flex items-center gap-2`}>
                             <Sparkles className="text-dakdan-gold" size={compactMode ? 16 : 20} />
                             Recent Findings
                         </h3>
                         <button className={`text-sm bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-600 shadow-sm flex items-center gap-2 ${compactMode ? 'text-xs' : ''}`}>
                             <Plus size={16} /> Add Criteria
                         </button>
                     </div>

                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                         {globalLeads.map((lead) => (
                             <div key={lead.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative ${compactMode ? 'p-3' : 'p-4'}`}>
                                 <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-2">
                                        <div className={`bg-blue-50 rounded text-blue-600 flex items-center justify-center font-bold text-xs ${compactMode ? 'w-6 h-6' : 'w-8 h-8'}`}>
                                            {lead.companyName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={`font-semibold text-slate-900 leading-tight ${compactMode ? 'text-sm' : ''}`}>{lead.companyName}</div>
                                            <div className="text-xs text-slate-500">{lead.industry}</div>
                                        </div>
                                     </div>
                                     <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                         lead.score > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                     }`}>
                                         Score: {lead.score}
                                     </div>
                                 </div>
                                 <div className="mt-3 text-sm text-slate-600 space-y-1">
                                     <div className="flex items-center gap-2">
                                         <User size={14} className="text-slate-400" /> {lead.contactPerson}
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <Mail size={14} className="text-slate-400" /> {lead.email}
                                     </div>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                     <span className="text-xs text-slate-400">Source: {lead.source}</span>
                                     <button className={`text-xs bg-dakdan-navy text-white rounded hover:bg-blue-900 ${compactMode ? 'px-2 py-1' : 'px-3 py-1.5'}`}>Enrich</button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

            {agent.role === AgentRole.OUTREACH && activeCampaign && (
                 <div className="space-y-4">
                    <h3 className={`${headerSize} font-bold text-slate-800`}>Draft Campaigns</h3>
                    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${compactMode ? 'p-4' : 'p-6'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-full mr-4">
                                <input 
                                    className={`font-semibold text-slate-900 bg-transparent border-none focus:ring-0 p-0 w-full ${compactMode ? 'text-base' : 'text-lg'}`}
                                    value={activeCampaign.name}
                                    onChange={(e) => setActiveCampaign({...activeCampaign, name: e.target.value})}
                                />
                                <input 
                                    className="text-sm text-slate-500 bg-transparent border-none focus:ring-0 p-0 w-full"
                                    value={activeCampaign.targetAudience}
                                    onChange={(e) => setActiveCampaign({...activeCampaign, targetAudience: e.target.value})}
                                    placeholder="Target Audience..."
                                />
                            </div>
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">{activeCampaign.status}</span>
                        </div>
                        <textarea 
                            className={`w-full bg-slate-50 rounded border border-slate-200 font-mono text-slate-600 mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed ${compactMode ? 'h-48 text-xs p-3' : 'h-64 text-sm p-4'}`}
                            value={activeCampaign.content}
                            onChange={(e) => setActiveCampaign({...activeCampaign, content: e.target.value})}
                        />
                        <div className="flex gap-2">
                            <button className="flex-1 bg-dakdan-navy text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors">Generate Variations</button>
                            <button 
                                onClick={handleSaveCampaign}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Save Draft
                            </button>
                        </div>
                    </div>
                 </div>
             )}

            {/* Default View for other agents */}
            {agent.role !== AgentRole.LEAD_GEN && agent.role !== AgentRole.OUTREACH && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className={`rounded-full ${agent.color} opacity-20 flex items-center justify-center mb-4 ${compactMode ? 'w-12 h-12' : 'w-16 h-16'}`}>
                        <Briefcase size={compactMode ? 24 : 32} className="text-slate-900" />
                    </div>
                    <p className={`max-w-xs text-center ${compactMode ? 'text-xs' : 'text-sm'}`}>Use the chat on the left to instruct {agent.name}. Outputs will appear here.</p>
                </div>
            )}

         </div>
      </div>
    </div>
  );
};

export default AgentWorkspace;
