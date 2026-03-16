/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Zap, History, Layout, BarChart3, Settings, HelpCircle, 
  ChevronRight, Copy, Download, Save, RefreshCw, Search, Bell, Menu, X,
  AlertCircle, CheckCircle2, Info, AlertTriangle, Globe, User, Shield,
  CreditCard, MessageSquare, Megaphone, Flag, Send
} from 'lucide-react';

// --- Types ---
interface HistoryEntry {
  id: number;
  situation: string;
  subject: string;
  urgency: 'low' | 'medium' | 'high';
  channel: string;
  action: string;
  language: string;
  tone: string;
  notifType: string;
  audience: string;
  brand: string;
  tags: string[];
  message: string;
  allVersions: string[];
  ts: string;
}

interface AppSettings {
  autoSave: boolean;
  typingEffect: boolean;
  bgEffect: boolean;
  confirmDelete: boolean;
}

// --- Constants ---
const TEMPLATES = [
  {
    id: 1, category: 'Kỹ thuật', icon: '🔧', name: 'Bảo trì định kỳ',
    urgency: 'medium', channel: 'email', type: 'maintenance', tone: 'professional',
    situation: 'Hệ thống sẽ tạm dừng để bảo trì nâng cấp định kỳ.',
    timeStart: '22:00 tối nay', timeEnd: '06:00 sáng mai',
    action: 'Vui lòng hoàn tất các giao dịch trước 22:00'
  },
  {
    id: 2, category: 'Khẩn cấp', icon: '🚨', name: 'Sự cố hệ thống khẩn',
    urgency: 'high', channel: 'sms', type: 'incident', tone: 'concise',
    situation: 'Hệ thống đang gặp sự cố kỹ thuật nghiêm trọng, dịch vụ bị gián đoạn.',
    action: 'Liên hệ hotline 1800-xxxx để được hỗ trợ khẩn cấp'
  },
  {
    id: 3, category: 'Tính năng', icon: '✨', name: 'Ra mắt tính năng mới',
    urgency: 'low', channel: 'app', type: 'update', tone: 'friendly',
    situation: 'Chúng tôi vừa ra mắt tính năng mới giúp bạn quản lý tài khoản dễ dàng hơn.',
    action: 'Khám phá ngay trong ứng dụng'
  },
  {
    id: 4, category: 'Thanh toán', icon: '💳', name: 'Lỗi thanh toán',
    urgency: 'high', channel: 'email', type: 'payment', tone: 'empathetic',
    situation: 'Hệ thống thanh toán đang gặp lỗi kỹ thuật. Một số giao dịch có thể bị trì hoãn.',
    action: 'Kiểm tra trạng thái giao dịch trong 24h, liên hệ CSKH nếu cần'
  },
  {
    id: 5, category: 'Bảo mật', icon: '🔒', name: 'Cảnh báo bảo mật',
    urgency: 'high', channel: 'email', type: 'security', tone: 'formal',
    situation: 'Chúng tôi phát hiện hoạt động đăng nhập bất thường trên tài khoản của bạn.',
    action: 'Đặt lại mật khẩu ngay và bật xác thực 2 lớp'
  }
];

const TIPS = [
  { icon: '📏', text: 'SMS: Giữ dưới 160 ký tự, chỉ thông tin cốt lõi.' },
  { icon: '🎯', text: 'Luôn có Call-to-Action rõ ràng, cụ thể.' },
  { icon: '⏰', text: 'Ghi rõ thời gian bắt đầu và kết thúc.' },
  { icon: '🤝', text: 'Thể hiện sự xin lỗi và đồng cảm với khách.' },
  { icon: '📞', text: 'Luôn cung cấp kênh hỗ trợ: hotline/email.' }
];

const HELP_ITEMS = [
  { icon: '✍️', title: 'Bước 1: Nhập Tình Huống', desc: 'Mô tả chi tiết vấn đề đang xảy ra, bao gồm nguyên nhân, phạm vi ảnh hưởng và thời gian dự kiến.' },
  { icon: '🚨', title: 'Bước 2: Chọn Mức Khẩn Cấp', desc: 'Thấp cho cập nhật thông thường, Trung bình cho sự cố nhỏ, Cao cho gián đoạn nghiêm trọng.' },
  { icon: '📡', title: 'Bước 3: Chọn Kênh', desc: 'Email không giới hạn, SMS ≤160 ký tự, Push ≤100 ký tự. AI tự điều chỉnh độ dài theo kênh.' },
  { icon: '⚙️', title: 'Bước 4: Tùy Chỉnh Nâng Cao', desc: 'Chọn giọng điệu, đối tượng khách hàng, ngôn ngữ và số phiên bản muốn tạo để so sánh.' },
  { icon: '⚡', title: 'Mẫu Nhanh', desc: 'Click vào các mẫu có sẵn để điền thông tin tự động. Tiết kiệm thời gian cho các tình huống phổ biến.' },
  { icon: '🔀', title: 'Nhiều Phiên Bản', desc: 'Tạo đến 3 phiên bản khác nhau cùng lúc để chọn phiên bản phù hợp nhất với tình huống.' },
  { icon: '📊', title: 'Phân Tích', desc: 'Xem thống kê hoạt động tạo thông báo, phân bổ theo kênh và biểu đồ theo ngày.' },
  { icon: '💾', title: 'Xuất Dữ Liệu', desc: 'Xuất toàn bộ lịch sử ra JSON, CSV hoặc TXT để sao lưu hoặc sử dụng trong hệ thống khác.' },
];

// --- Components ---

const ParticleBackground = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number = 0; y: number = 0; vx: number = 0; vy: number = 0; r: number = 0; alpha: number = 0; color: string = '';
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.r = Math.random() * 1.8 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.color = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 4)];
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas!.width || this.y < 0 || this.y > canvas!.height) this.reset();
      }
      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx!.fillStyle = this.color + Math.floor(this.alpha * 255).toString(16).padStart(2, '0');
        ctx!.fill();
      }
    }

    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 100; i++) particles.push(new Particle());

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${0.04 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-55" />;
};

export default function App() {
  // --- State ---
  const [activePage, setActivePage] = useState('compose');
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('notifypro_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('notifypro_settings');
    return saved ? JSON.parse(saved) : { autoSave: true, typingEffect: true, bgEffect: true, confirmDelete: true };
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [situation, setSituation] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [action, setAction] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [channel, setChannel] = useState('email');
  const [language, setLanguage] = useState('vi');
  const [tone, setTone] = useState('professional');
  const [notifType, setNotifType] = useState('maintenance');
  const [audience, setAudience] = useState('all');
  const [brandName, setBrandName] = useState('');
  const [numVersions, setNumVersions] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVersions, setGeneratedVersions] = useState<string[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [typingText, setTypingText] = useState('');

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('notifypro_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('notifypro_settings', JSON.stringify(settings));
  }, [settings]);

  // Typing Effect
  useEffect(() => {
    if (!settings.typingEffect || generatedVersions.length === 0) {
      setTypingText(generatedVersions[currentVersionIdx] || '');
      return;
    }

    const text = generatedVersions[currentVersionIdx];
    setTypingText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypingText(prev => text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [generatedVersions, currentVersionIdx, settings.typingEffect]);

  // --- Handlers ---
  const handleGenerate = async () => {
    if (!situation) {
      alert('Vui lòng nhập mô tả tình huống!');
      return;
    }

    setIsGenerating(true);
    setShowResult(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là chuyên gia truyền thông doanh nghiệp. Hãy soạn thông báo gửi khách hàng theo thông tin sau:
• Tiêu đề/chủ đề: ${subject || '(không có)'}
• Tình huống: ${situation}
• Loại thông báo: ${notifType}
• Thời gian: ${timeStart ? 'Bắt đầu ' + timeStart : ''}${timeEnd ? ' – Kết thúc ' + timeEnd : ''}
• Mức khẩn cấp: ${urgency}
• Kênh phân phối: ${channel}
• Giọng điệu: ${tone}
• Đối tượng: ${audience}
${brandName ? '• Tên thương hiệu: ' + brandName : ''}
${action ? '• Hành động yêu cầu khách hàng: ' + action : ''}
${language === 'vi' ? 'Viết Tiếng Việt.' : language === 'en' ? 'Write in English only.' : 'Viết song ngữ: Tiếng Việt đầy đủ trước, sau đó dòng phân cách "---EN---", rồi bản English đầy đủ bên dưới.'}
Tạo ĐÚNG ${numVersions} phiên bản với cách diễn đạt khác nhau. Phân cách bằng dòng "===PHIÊN BẢN 2===" (và "===PHIÊN BẢN 3===" nếu cần).

Chỉ trả về nội dung thông báo hoàn chỉnh, không giải thích, không dùng markdown.`,
      });

      const response = await model;
      const rawText = response.text || '';
      const versions = rawText.split(/===PHIÊN BẢN \d+===/).map(v => v.trim()).filter(Boolean);
      
      setGeneratedVersions(versions);
      setCurrentVersionIdx(0);
      setShowResult(true);

      if (settings.autoSave) {
        const entry: HistoryEntry = {
          id: Date.now(),
          situation, subject, urgency, channel, action,
          language, tone, notifType, audience, brand: brandName,
          tags: [...tags],
          message: versions[0],
          allVersions: versions,
          ts: new Date().toISOString()
        };
        setHistory(prev => [entry, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tạo thông báo. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const loadTemplate = (id: number) => {
    const t = TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setSituation(t.situation);
    setAction(t.action || '');
    setTimeStart(t.timeStart || '');
    setTimeEnd(t.timeEnd || '');
    setUrgency(t.urgency as any);
    setChannel(t.channel);
    setTone(t.tone);
    setNotifType(t.type);
    setActivePage('compose');
  };

  const clearForm = () => {
    setSubject('');
    setSituation('');
    setTimeStart('');
    setTimeEnd('');
    setAction('');
    setTags([]);
    setShowResult(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép vào clipboard!');
  };

  // --- Render Helpers ---
  const renderNav = (id: string, icon: React.ReactNode, label: string, badge?: number) => (
    <div 
      className={`nav-item ${activePage === id ? 'active' : ''}`} 
      onClick={() => { setActivePage(id); setIsMobileMenuOpen(false); }}
    >
      <span className="nav-icon">{icon}</span>
      {!isSidebarCollapsed && <span>{label}</span>}
      {!isSidebarCollapsed && badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
    </div>
  );

  return (
    <div className="flex min-h-screen relative overflow-hidden font-sans">
      <ParticleBackground active={settings.bgEffect} />

      {/* Sidebar */}
      <aside className={`sidebar z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-[68px]' : 'w-[260px]'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:sticky top-0 h-screen bg-[#0d1020] border-r border-white/5 flex flex-col`}>
        <div className="sidebar-brand h-[72px] flex items-center gap-3 px-5 border-b border-white/5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-blue-500/20">📣</div>
          {!isSidebarCollapsed && (
            <div className="brand-text overflow-hidden whitespace-nowrap">
              <h1 className="font-display text-[1.05rem] font-extrabold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">NotifyPro</h1>
              <span className="text-[0.68rem] text-slate-500 font-medium tracking-widest uppercase">Enterprise v2.0</span>
            </div>
          )}
          <button className="ml-auto text-slate-500 hover:text-white transition-colors" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <ChevronRight size={18} /> : '◀'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {!isSidebarCollapsed && <div className="text-[0.62rem] font-bold tracking-[0.14em] uppercase text-slate-500 px-5 py-3">Chính</div>}
          {renderNav('compose', '✍️', 'Soạn Thông Báo')}
          {renderNav('history', '📂', 'Lịch Sử', history.length)}
          {renderNav('templates', '📋', 'Mẫu Thông Báo')}
          {renderNav('analytics', '📊', 'Phân Tích')}

          {!isSidebarCollapsed && <div className="text-[0.62rem] font-bold tracking-[0.14em] uppercase text-slate-500 px-5 py-3 mt-4">Cấu Hình</div>}
          {renderNav('settings', '⚙️', 'Cài Đặt')}
          {renderNav('help', '❓', 'Hướng Dẫn')}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="user-card flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors overflow-hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-500 rounded-full flex items-center justify-center text-[0.85rem] font-bold">NP</div>
            {!isSidebarCollapsed && (
              <div className="user-info overflow-hidden whitespace-nowrap">
                <div className="text-[0.82rem] font-semibold">NotifyPro User</div>
                <div className="text-[0.7rem] text-slate-500">Enterprise Plan</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Topbar */}
        <header className="h-[60px] border-b border-white/5 bg-[#05060d]/80 backdrop-blur-xl flex items-center gap-4 px-7 sticky top-0 z-40">
          <button className="md:hidden text-slate-400" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-[0.82rem] text-slate-500">
            <span>NotifyPro</span>
            <span className="opacity-40">/</span>
            <span className="text-white font-semibold capitalize">{activePage === 'compose' ? 'Soạn Thông Báo' : activePage}</span>
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 bg-[#111525] border border-white/5 rounded-lg px-3.5 py-1.5 text-[0.82rem] text-slate-500 cursor-pointer hover:border-white/10 transition-colors">
            <Search size={14} />
            <span>Tìm kiếm...</span>
            <kbd className="bg-[#161a2e] border border-white/10 rounded px-1.5 text-[0.65rem]">Ctrl K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg bg-[#111525] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Bell size={18} /></button>
            <button className="w-9 h-9 rounded-lg bg-[#111525] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors" onClick={() => setActivePage('settings')}><Settings size={18} /></button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-7">
          <AnimatePresence mode="wait">
            {activePage === 'compose' && (
              <motion.div 
                key="compose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl mx-auto"
              >
                <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
                  <div>
                    <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">✍️ Soạn Thông Báo</h2>
                    <p className="text-[0.88rem] text-slate-400 mt-1">Tạo thông báo chuyên nghiệp với AI trong vài giây</p>
                  </div>
                  <div className="flex gap-2.5">
                    <button className="btn btn-ghost" onClick={clearForm}>🗑 Xóa form</button>
                    <button className="btn btn-primary" onClick={handleGenerate}>⚡ Tạo nhanh</button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                  <div className="stat-card blue">
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-9 h-9 bg-blue-500/15 rounded-lg flex items-center justify-center text-lg">📣</div>
                      <div className="text-[0.72rem] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">↑ 12%</div>
                    </div>
                    <div className="font-display text-[2rem] font-extrabold leading-none">{history.length}</div>
                    <div className="text-[0.78rem] text-slate-400 mt-1">Tổng thông báo đã tạo</div>
                  </div>
                  <div className="stat-card cyan">
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-9 h-9 bg-cyan-500/15 rounded-lg flex items-center justify-center text-lg">⚡</div>
                      <div className="text-[0.72rem] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">↑ 8%</div>
                    </div>
                    <div className="font-display text-[2rem] font-extrabold leading-none">3</div>
                    <div className="text-[0.78rem] text-slate-400 mt-1">Hôm nay</div>
                  </div>
                  <div className="stat-card emerald">
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center text-lg">⏱️</div>
                      <div className="text-[0.72rem] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">↑ 5%</div>
                    </div>
                    <div className="font-display text-[2rem] font-extrabold leading-none">3.2s</div>
                    <div className="text-[0.78rem] text-slate-400 mt-1">Thời gian trung bình</div>
                  </div>
                  <div className="stat-card amber">
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center text-lg">📋</div>
                      <div className="text-[0.72rem] font-bold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">↓ 2%</div>
                    </div>
                    <div className="font-display text-[2rem] font-extrabold leading-none">{history.length}</div>
                    <div className="text-[0.78rem] text-slate-400 mt-1">Đã lưu vào lịch sử</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                  <div className="flex flex-col gap-5">
                    {/* Situation Card */}
                    <div className="card">
                      <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8.5 h-8.5 bg-blue-500/15 rounded-lg flex items-center justify-center text-sm">🎯</div>
                        <div>
                          <h3 className="text-[0.92rem] font-bold">Thông Tin Tình Huống</h3>
                          <p className="text-[0.75rem] text-slate-400">Mô tả chi tiết sự cố hoặc cập nhật dịch vụ</p>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="mb-4.5">
                          <label className="field-label mb-2">Tiêu Đề / Chủ Đề <span className="text-rose-500">*</span></label>
                          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="VD: Bảo trì hệ thống thanh toán định kỳ" />
                        </div>
                        <div className="mb-4.5">
                          <label className="field-label mb-2">Mô Tả Chi Tiết Tình Huống <span className="text-rose-500">*</span></label>
                          <textarea 
                            value={situation} 
                            onChange={e => setSituation(e.target.value)} 
                            placeholder="Mô tả rõ: vấn đề gì đang xảy ra, nguyên nhân, phạm vi ảnh hưởng, thời gian dự kiến khắc phục..."
                            rows={5}
                          />
                          <div className="flex justify-between items-center mt-1.5">
                            <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300" style={{ width: `${Math.min(situation.length / 8, 100)}%` }} />
                            </div>
                            <span className={`text-[0.7rem] ml-3 ${situation.length > 800 ? 'text-rose-500' : 'text-slate-500'}`}>{situation.length} / 800</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4.5">
                          <div>
                            <label className="field-label mb-2">Thời Gian Bắt Đầu</label>
                            <input type="text" value={timeStart} onChange={e => setTimeStart(e.target.value)} placeholder="VD: 23:00 ngày 15/06" />
                          </div>
                          <div>
                            <label className="field-label mb-2">Thời Gian Kết Thúc</label>
                            <input type="text" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} placeholder="VD: 01:00 ngày 16/06" />
                          </div>
                        </div>
                        <div className="mb-4.5">
                          <label className="field-label mb-2">Hành Động Yêu Cầu</label>
                          <input type="text" value={action} onChange={e => setAction(e.target.value)} placeholder="VD: Đặt lại mật khẩu, liên hệ hotline..." />
                        </div>
                        <div>
                          <label className="field-label mb-2">Thẻ / Tag</label>
                          <div className="flex flex-wrap gap-1.5 bg-[#111525] border border-white/5 rounded-xl p-2 min-h-[46px]">
                            {tags.map((tag, i) => (
                              <span key={i} className="bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold flex items-center gap-1.5">
                                {tag}
                                <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="opacity-60 hover:opacity-100">×</button>
                              </span>
                            ))}
                            <input 
                              className="bg-transparent border-none outline-none text-[0.85rem] flex-1 min-w-[80px] p-0.5" 
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={handleTagInput}
                              placeholder="thêm tag..." 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Urgency & Channel */}
                    <div className="card">
                      <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8.5 h-8.5 bg-blue-500/15 rounded-lg flex items-center justify-center text-sm">🚨</div>
                        <div>
                          <h3 className="text-[0.92rem] font-bold">Mức Độ & Kênh Phân Phối</h3>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="mb-6">
                          <label className="field-label mb-3">Mức Độ Khẩn Cấp <span className="text-rose-500">*</span></label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {(['low', 'medium', 'high'] as const).map(u => (
                              <label key={u} className={`urgency-pill ${urgency === u ? 'border-blue-500 bg-blue-500/15' : 'border-white/5'}`} onClick={() => setUrgency(u)}>
                                <span className="text-xl block mb-1">{u === 'low' ? '🟢' : u === 'medium' ? '🟡' : '🔴'}</span>
                                <span className={`text-[0.8rem] font-bold block ${urgency === u ? 'text-blue-400' : ''}`}>{u === 'low' ? 'Thấp' : u === 'medium' ? 'Trung Bình' : 'Khẩn'}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="field-label mb-3">Kênh Thông Báo <span className="text-rose-500">*</span></label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              { id: 'email', icon: '📧', label: 'Email' },
                              { id: 'sms', icon: '💬', label: 'SMS' },
                              { id: 'app', icon: '📱', label: 'In-App' },
                              { id: 'push', icon: '🔔', label: 'Push' },
                              { id: 'zalo', icon: '💙', label: 'Zalo' },
                              { id: 'banner', icon: '🏳️', label: 'Banner' }
                            ].map(c => (
                              <label key={c.id} className={`channel-pill ${channel === c.id ? 'border-blue-500 bg-blue-500/15' : 'border-white/5'}`} onClick={() => setChannel(c.id)}>
                                <span className="text-2xl block mb-1.5">{c.icon}</span>
                                <span className={`text-[0.78rem] font-bold block ${channel === c.id ? 'text-blue-400' : ''}`}>{c.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button 
                      className="btn-generate disabled:opacity-50" 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      <div className="flex items-center gap-2.5">
                        {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                        <span>{isGenerating ? 'AI đang soạn thảo...' : '✨ Tạo Thông Báo với AI'}</span>
                      </div>
                    </button>

                    {/* Result Panel */}
                    {showResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="result-panel show"
                      >
                        <div className="result-card">
                          <div className="result-header">
                            <div className="result-badges">
                              <span className={`badge badge-${urgency}`}>{urgency === 'low' ? '🟢 Thấp' : urgency === 'medium' ? '🟡 Trung Bình' : '🔴 Cao'}</span>
                              <span className="badge badge-channel">{channel.toUpperCase()}</span>
                              <span className="badge badge-success">✅ Thành công</span>
                            </div>
                            <div className="result-actions">
                              <button className="btn-sm primary" onClick={() => copyToClipboard(generatedVersions[currentVersionIdx])}>📋 Sao chép</button>
                              <button className="btn-sm" onClick={() => alert('Đã lưu!')}>💾 Lưu</button>
                            </div>
                          </div>
                          <div className="result-body">
                            {generatedVersions.length > 1 && (
                              <div className="version-tabs flex gap-1.5 mb-3">
                                {generatedVersions.map((_, i) => (
                                  <button 
                                    key={i} 
                                    className={`vtab ${currentVersionIdx === i ? 'active' : ''}`}
                                    onClick={() => setCurrentVersionIdx(i)}
                                  >
                                    Phiên bản {i + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="message-output">
                              {typingText}
                              {typingText.length < (generatedVersions[currentVersionIdx]?.length || 0) && <span className="typing-cursor" />}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Aside */}
                  <div className="flex flex-col gap-5">
                    <div className="card">
                      <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8.5 h-8.5 bg-blue-500/15 rounded-lg flex items-center justify-center text-sm">👁️</div>
                        <div>
                          <h3 className="text-[0.92rem] font-bold">Xem Trước</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className={`preview-box min-h-[160px] p-4.5 rounded-xl bg-[#111525] border border-white/5 text-[0.85rem] leading-relaxed ${typingText ? 'text-white' : 'text-slate-500 flex flex-col items-center justify-center text-center gap-2'}`}>
                          {typingText ? (
                            <div className="whitespace-pre-wrap">{typingText.slice(0, 220)}{typingText.length > 220 ? '...' : ''}</div>
                          ) : (
                            <>
                              <span className="text-3xl animate-bounce">✨</span>
                              <p>Điền thông tin và nhấn<br/><strong>Tạo Thông Báo</strong> để bắt đầu</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8.5 h-8.5 bg-blue-500/15 rounded-lg flex items-center justify-center text-sm">⚡</div>
                        <div>
                          <h3 className="text-[0.92rem] font-bold">Mẫu Nhanh</h3>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {TEMPLATES.map(t => (
                          <div key={t.id} className="template-item group" onClick={() => loadTemplate(t.id)}>
                            <span className="text-xl">{t.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[0.82rem] font-bold">{t.name}</div>
                              <div className="text-[0.73rem] text-slate-400 truncate">{t.situation}</div>
                            </div>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-3">
                        <div className="w-8.5 h-8.5 bg-blue-500/15 rounded-lg flex items-center justify-center text-sm">💡</div>
                        <div>
                          <h3 className="text-[0.92rem] font-bold">Mẹo Viết</h3>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-2.5">
                        {TIPS.map((tip, i) => (
                          <div key={i} className="flex gap-3 items-start p-2 border-b border-white/5 last:border-0">
                            <span className="text-lg">{tip.icon}</span>
                            <span className="text-[0.78rem] text-slate-400 leading-relaxed">{tip.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
                  <div>
                    <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">📂 Lịch Sử Thông Báo</h2>
                    <p className="text-[0.88rem] text-slate-400 mt-1">Xem lại và tái sử dụng các thông báo đã tạo</p>
                  </div>
                  <div className="flex gap-2.5">
                    <button className="btn btn-ghost" onClick={() => { if(confirm('Xóa toàn bộ lịch sử?')) setHistory([]); }}>🗑 Xóa tất cả</button>
                    <button className="btn btn-primary" onClick={() => setActivePage('compose')}>+ Tạo mới</button>
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <span className="text-5xl mb-4">📭</span>
                    <h3 className="text-lg font-semibold text-slate-300">Chưa có lịch sử</h3>
                    <p>Tạo thông báo đầu tiên của bạn để bắt đầu lưu lịch sử.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map(h => (
                      <div key={h.id} className="history-card group">
                        <div className={`h-[3px] w-full ${h.urgency === 'low' ? 'bg-emerald-500' : h.urgency === 'medium' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <div className="p-4.5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`badge badge-${h.urgency} text-[0.65rem]`}>{h.urgency.toUpperCase()}</span>
                            <span className="badge badge-channel text-[0.65rem]">{h.channel.toUpperCase()}</span>
                            <span className="ml-auto text-[0.7rem] text-slate-500">{new Date(h.ts).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[0.83rem] text-slate-300 line-clamp-3 leading-relaxed mb-4">{h.message}</div>
                          <div className="flex justify-between items-center pt-3 border-t border-white/5">
                            <div className="flex gap-1.5">
                              {h.tags.map((t, i) => <span key={i} className="text-[0.65rem] text-blue-400 font-bold">#{t}</span>)}
                            </div>
                            <div className="flex gap-2">
                              <button className="w-7 h-7 rounded bg-white/5 flex items-center justify-center hover:bg-white/10" onClick={() => copyToClipboard(h.message)}><Copy size={12} /></button>
                              <button className="w-7 h-7 rounded bg-white/5 flex items-center justify-center hover:bg-rose-500/20 text-rose-500" onClick={() => setHistory(history.filter(x => x.id !== h.id))}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activePage === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-7">
                  <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">📊 Phân Tích & Báo Cáo</h2>
                  <p className="text-[0.88rem] text-slate-400 mt-1">Thống kê hoạt động tạo thông báo của bạn</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                  <div className="stat-card blue"><div className="text-[2rem] font-extrabold">{history.length}</div><div className="text-slate-400 text-sm">Tổng thông báo</div></div>
                  <div className="stat-card cyan"><div className="text-[2rem] font-extrabold">{history.filter(h => h.channel === 'email').length}</div><div className="text-slate-400 text-sm">Email</div></div>
                  <div className="stat-card emerald"><div className="text-[2rem] font-extrabold">{history.filter(h => h.channel === 'sms').length}</div><div className="text-slate-400 text-sm">SMS</div></div>
                  <div className="stat-card amber"><div className="text-[2rem] font-extrabold">{history.filter(h => h.urgency === 'high').length}</div><div className="text-slate-400 text-sm">Khẩn cấp</div></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <div className="p-6">
                      <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} /> Hoạt động 7 ngày qua</h3>
                      <div className="h-40 flex items-end gap-2">
                        {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-violet-500 rounded-t-md opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-[0.7rem] text-slate-500">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span key={d}>{d}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="p-6">
                      <h3 className="font-bold mb-4 flex items-center gap-2"><Megaphone size={18} /> Phân bổ kênh</h3>
                      <div className="flex flex-col gap-3">
                        {[
                          { label: 'Email', val: history.filter(h => h.channel === 'email').length, color: 'bg-blue-500' },
                          { label: 'SMS', val: history.filter(h => h.channel === 'sms').length, color: 'bg-amber-500' },
                          { label: 'Push', val: history.filter(h => h.channel === 'push').length, color: 'bg-violet-500' },
                          { label: 'Khác', val: history.filter(h => !['email', 'sms', 'push'].includes(h.channel)).length, color: 'bg-emerald-500' }
                        ].map(item => (
                          <div key={item.label}>
                            <div className="flex justify-between text-[0.75rem] mb-1">
                              <span>{item.label}</span>
                              <span className="font-bold">{item.val}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${history.length ? (item.val / history.length) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'templates' && (
              <motion.div 
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-7">
                  <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">📋 Thư Viện Mẫu</h2>
                  <p className="text-[0.88rem] text-slate-400 mt-1">Bộ sưu tập mẫu thông báo chuyên nghiệp theo ngành</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TEMPLATES.map(t => (
                    <div key={t.id} className="card cursor-pointer hover:border-blue-500/30 transition-colors" onClick={() => loadTemplate(t.id)}>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">{t.icon}</span>
                          <div>
                            <div className="font-bold text-[0.88rem]">{t.name}</div>
                            <div className="flex gap-1.5 mt-1">
                              <span className={`badge badge-${t.urgency} text-[0.63rem]`}>{t.urgency.toUpperCase()}</span>
                              <span className="badge badge-channel text-[0.63rem]">{t.channel.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[0.78rem] text-slate-400 leading-relaxed line-clamp-3">{t.situation}</p>
                        <div className="mt-4 text-right text-[0.75rem] text-blue-400 font-semibold">Dùng mẫu này →</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activePage === 'help' && (
              <motion.div 
                key="help"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-7">
                  <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">❓ Hướng Dẫn Sử Dụng</h2>
                  <p className="text-[0.88rem] text-slate-400 mt-1">Làm quen với NotifyPro Enterprise</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {HELP_ITEMS.map((h, i) => (
                    <div key={i} className="card">
                      <div className="p-6">
                        <div className="text-3xl mb-3">{h.icon}</div>
                        <h3 className="text-[0.9rem] font-bold mb-2">{h.title}</h3>
                        <p className="text-[0.78rem] text-slate-400 leading-relaxed">{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activePage === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-7">
                  <h2 className="font-display text-[1.7rem] font-extrabold leading-tight">⚙️ Cài Đặt</h2>
                  <p className="text-[0.88rem] text-slate-400 mt-1">Tùy chỉnh ứng dụng theo nhu cầu của bạn</p>
                </div>
                <div className="card max-w-2xl">
                  <div className="p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">Tự động lưu lịch sử</h4>
                        <p className="text-sm text-slate-500">Lưu mọi thông báo đã tạo vào lịch sử tự động</p>
                      </div>
                      <button 
                        className={`w-11 h-6 rounded-full relative transition-colors ${settings.autoSave ? 'bg-blue-500' : 'bg-slate-700'}`}
                        onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSave ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">Hiệu ứng gõ chữ</h4>
                        <p className="text-sm text-slate-500">Hiển thị văn bản với hiệu ứng typing sinh động</p>
                      </div>
                      <button 
                        className={`w-11 h-6 rounded-full relative transition-colors ${settings.typingEffect ? 'bg-blue-500' : 'bg-slate-700'}`}
                        onClick={() => setSettings({ ...settings, typingEffect: !settings.typingEffect })}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.typingEffect ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">Hiệu ứng nền</h4>
                        <p className="text-sm text-slate-500">Bật/tắt hiệu ứng hạt chuyển động</p>
                      </div>
                      <button 
                        className={`w-11 h-6 rounded-full relative transition-colors ${settings.bgEffect ? 'bg-blue-500' : 'bg-slate-700'}`}
                        onClick={() => setSettings({ ...settings, bgEffect: !settings.bgEffect })}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.bgEffect ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}
