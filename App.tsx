import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadStatus, DownloadItem, Settings, ChatMessage } from './types';
import { analyzeVideoTopic, chatWithAssistant } from './services/geminiService';
import { DownloadIcon, PlayIcon, PauseIcon, SettingsIcon, BrainCircuitIcon, TrashIcon, DesktopIcon } from './components/Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

// --- COMPONENTS ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for the 'beforeinstallprompt' event to enable PWA installation
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DownloadIcon className="w-5 h-5" /> },
    { id: 'player', label: 'Media Player', icon: <PlayIcon className="w-5 h-5" /> },
    { id: 'ai-assistant', label: 'AI Assistant', icon: <BrainCircuitIcon className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          UniversalStream
        </h1>
        <span className="text-xs text-slate-500 font-mono tracking-widest">PRO EDITION</span>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Install App Button - Only shows if PWA is installable */}
      {installPrompt && (
        <div className="px-4 mb-2">
           <button
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform"
          >
            <DesktopIcon className="w-5 h-5" />
            <span className="font-bold text-sm">Install App</span>
          </button>
        </div>
      )}

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 p-4 rounded-lg">
          <p className="text-xs text-slate-400 mb-2">Storage Used</p>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[65%]"></div>
          </div>
          <p className="text-xs text-right text-slate-400 mt-1">12.5GB / 20GB</p>
        </div>
      </div>
    </div>
  );
};

const DownloadCard: React.FC<{ item: DownloadItem; onCancel: (id: string) => void }> = ({ item, onCancel }) => {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm flex items-center gap-4 animate-fadeIn">
      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="thumb" className="w-full h-full object-cover" />
        ) : (
          <DownloadIcon className="text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-medium text-white truncate pr-4">{item.title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            item.status === DownloadStatus.COMPLETED ? 'bg-emerald-500/10 text-emerald-500' :
            item.status === DownloadStatus.DOWNLOADING ? 'bg-blue-500/10 text-blue-500' :
            'bg-slate-700 text-slate-400'
          }`}>
            {item.status}
          </span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
          <div 
            className={`h-full transition-all duration-500 ${
              item.status === DownloadStatus.ERROR ? 'bg-red-500' : 'bg-blue-500'
            }`} 
            style={{ width: `${item.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>{item.size} • {item.format}</span>
          <span>{item.speed}/s</span>
        </div>
      </div>
      <button 
        onClick={() => onCancel(item.id)}
        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const Dashboard = ({ queue, onAddUrl, onCancel }: { queue: DownloadItem[], onAddUrl: (url: string) => void, onCancel: (id: string) => void }) => {
  const [urlInput, setUrlInput] = useState('');
  
  // Data for Charts
  const statusData = [
    { name: 'Completed', value: queue.filter(i => i.status === DownloadStatus.COMPLETED).length, color: '#10b981' },
    { name: 'Active', value: queue.filter(i => i.status === DownloadStatus.DOWNLOADING).length, color: '#3b82f6' },
    { name: 'Queued', value: queue.filter(i => i.status === DownloadStatus.QUEUED).length, color: '#64748b' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onAddUrl(urlInput);
      setUrlInput('');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-slate-400">Manage your downloads and monitor performance.</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 col-span-2">
           <h3 className="text-lg font-semibold mb-4 text-white">Download Queue</h3>
           <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
              {queue.length === 0 ? (
                <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  No downloads active. Paste a URL below.
                </div>
              ) : (
                queue.map(item => (
                  <DownloadCard key={item.id} item={item} onCancel={onCancel} />
                ))
              )}
           </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-white mb-2 self-start w-full">Statistics</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-4">
            {statusData.map((entry) => (
               <div key={entry.name} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                 <span className="text-sm text-slate-300">{entry.name}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste URL from YouTube, Vimeo, TikTok, etc..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Download
          </button>
        </form>
        <div className="mt-4 flex gap-2 text-xs text-slate-500">
          <span>Supported:</span>
          <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">YouTube</span>
          <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">Vimeo</span>
          <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">TikTok</span>
          <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">Facebook</span>
        </div>
      </div>
    </div>
  );
};

const MediaPlayer = ({ queue }: { queue: DownloadItem[] }) => {
  const completed = queue.filter(i => i.status === DownloadStatus.COMPLETED);
  const [currentVideo, setCurrentVideo] = useState<DownloadItem | null>(null);

  // Mock Play functionality (in real app, this would be a file path or blob URL)
  // For demo, we use a placeholder if no real video is available
  const videoSrc = currentVideo ? "https://www.w3schools.com/html/mov_bbb.mp4" : "";

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl flex-1 relative group">
        {currentVideo ? (
          <video 
            src={videoSrc} 
            className="w-full h-full object-contain bg-black" 
            controls 
            autoPlay
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <PlayIcon className="w-16 h-16 mb-4 opacity-50" />
            <p>Select a video from the library to play</p>
          </div>
        )}
      </div>

      <div className="h-48 mt-6 bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col">
        <h3 className="text-white font-medium mb-3 ml-1">Library</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {completed.length === 0 && <p className="text-slate-500 text-sm">No downloaded videos yet.</p>}
          {completed.map(item => (
            <div 
              key={item.id}
              onClick={() => setCurrentVideo(item)}
              className="min-w-[200px] cursor-pointer group"
            >
              <div className="aspect-video bg-slate-700 rounded-lg mb-2 overflow-hidden relative">
                {item.thumbnail ? (
                  <img src={item.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full bg-slate-600 flex items-center justify-center">
                    <PlayIcon className="text-slate-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayIcon className="text-white fill-white w-8 h-8" />
                </div>
              </div>
              <p className="text-sm text-slate-200 truncate">{item.title}</p>
              <p className="text-xs text-slate-500">{item.format.toUpperCase()} • {item.size}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AIAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am your UniversalStream Assistant. I can help you summarize videos, suggest playlists, or troubleshoot downloads.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const context = messages.map(m => `${m.role}: ${m.text}`);
    const responseText = await chatWithAssistant(userMsg.text, context);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="p-8 h-screen flex flex-col max-w-5xl mx-auto">
       <header className="mb-6 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-2 rounded-lg">
          <BrainCircuitIcon className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
          <p className="text-slate-400 text-sm">Powered by Gemini 2.5 Flash</p>
        </div>
      </header>

      <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-slate-700 text-slate-200 rounded-bl-none'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
                <span className="text-[10px] opacity-50 mt-2 block">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-slate-700 text-slate-200 p-4 rounded-2xl rounded-bl-none">
                 <div className="flex space-x-2">
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-700">
          <form onSubmit={handleSend} className="flex gap-4">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a video topic or for help..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={isTyping}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => (
  <div className="p-8 max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold text-white mb-8">Settings</h2>
    
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Downloads</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-slate-300">Default Download Path</label>
            <input type="text" disabled value="/Users/Home/Downloads/UniversalStream" className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-slate-400 text-sm w-64" />
          </div>
          <div className="flex justify-between items-center">
             <label className="text-slate-300">Max Concurrent Downloads</label>
             <select className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-white text-sm">
                <option>1</option>
                <option>3</option>
                <option selected>5</option>
                <option>Unlimited</option>
             </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quality & Format</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500" />
             <label className="text-slate-300">Always convert to MP4</label>
          </div>
          <div className="flex items-center gap-3">
             <input type="checkbox" className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500" />
             <label className="text-slate-300">Extract Audio (MP3) automatically</label>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [queue, setQueue] = useState<DownloadItem[]>([]);

  // Simulation Logic: Updates progress of downloads
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(currentQueue => {
        return currentQueue.map(item => {
          if (item.status === DownloadStatus.DOWNLOADING) {
            const newProgress = Math.min(item.progress + Math.random() * 5, 100);
            
            // If download completes, invoke AI analysis (Simulated trigger)
            if (newProgress >= 100 && item.progress < 100) {
               // In a real app, this would trigger a file save
            }

            return {
              ...item,
              progress: newProgress,
              status: newProgress >= 100 ? DownloadStatus.COMPLETED : DownloadStatus.DOWNLOADING,
              speed: newProgress >= 100 ? '0 KB' : `${(Math.random() * 5 + 2).toFixed(1)} MB`
            };
          }
          return item;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addUrlToQueue = useCallback(async (url: string) => {
    // 1. Create initial item
    const newItem: DownloadItem = {
      id: Date.now().toString(),
      url,
      title: 'Fetching metadata...',
      progress: 0,
      speed: '0 KB',
      size: '--',
      status: DownloadStatus.QUEUED,
      format: 'MP4',
      addedAt: new Date()
    };
    
    setQueue(prev => [newItem, ...prev]);

    // 2. Simulate Metadata Fetch (and potentially AI analysis)
    setTimeout(async () => {
      // Use Gemini to guess title context or categorize (Optional enhancement)
      // For now, we simulate a successful metadata fetch
      const mockTitles = [
        "Amazing Nature Documentary 4K",
        "React Tutorial: 2024 Crash Course",
        "Lo-Fi Hip Hop Radio - Beats to Relax/Study to",
        "Top 10 Goals of the Season"
      ];
      const randomTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)];
      
      // Analyze title with Gemini
      let aiAnalysis = {};
      try {
         const analysisStr = await analyzeVideoTopic(randomTitle);
         aiAnalysis = JSON.parse(analysisStr);
         console.log("AI Analysis:", aiAnalysis);
      } catch (e) {
         console.log("AI Analysis failed or skipped");
      }

      setQueue(prev => prev.map(item => {
        if (item.id === newItem.id) {
          return {
            ...item,
            title: randomTitle,
            status: DownloadStatus.DOWNLOADING,
            size: `${(Math.random() * 500 + 50).toFixed(0)} MB`,
            thumbnail: `https://picsum.photos/seed/${item.id}/200/200`
          };
        }
        return item;
      }));
    }, 1500);

  }, []);

  const cancelDownload = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 bg-slate-950 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <Dashboard queue={queue} onAddUrl={addUrlToQueue} onCancel={cancelDownload} />
        )}
        {activeTab === 'player' && (
          <MediaPlayer queue={queue} />
        )}
        {activeTab === 'ai-assistant' && (
          <AIAssistant />
        )}
        {activeTab === 'settings' && (
          <SettingsView />
        )}
      </main>
    </div>
  );
};

export default App;