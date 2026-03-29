/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  LayoutDashboard, 
  Truck, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Menu,
  X,
  Search,
  LogIn,
  LogOut,
  RefreshCcw,
  Cloud,
  Map as MapIcon,
  List as ListIcon,
  MessageSquare,
  MapPin,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---
type Role = 'cliente' | 'admin' | 'parceiro' | null;
type MenuType = 'cliente' | 'dashboard' | 'parceiro' | 'cotacoes';

type RequestStatus = 
  | 'Pendente de Precificação'
  | 'Disponível para Parceiros'
  | 'Contraproposta Enviada'
  | 'Aguardando Coleta' 
  | 'Em Rota' 
  | 'Coletado' 
  | 'Em Trânsito'
  | 'Em Processamento' 
  | 'Finalizado (Financeiro)';

interface HistoryEntry {
  status: RequestStatus;
  timestamp: string;
  user?: string;
  note?: string;
}

interface Request {
  id: string;
  status: RequestStatus;
  sla: string;
  priority: 'baixa' | 'media' | 'alta';
  clientName?: string;
  address?: string;
  collectorName?: string;
  origin?: string;
  destination?: string;
  price?: number;
  deadline?: string;
  counterOffer?: {
    price: number;
    deadline: string;
    partnerName: string;
  };
  history: HistoryEntry[];
}

interface Quote {
  id: string;
  driverName: string;
  vehiclePlate: string;
  price: number;
  pickupLocation: string;
  deliveryLocation: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  createdAt: string;
}

// --- Mock Data ---
const INITIAL_REQUESTS: Request[] = [
  { 
    id: '#101', 
    status: 'Pendente de Precificação', 
    sla: '2 dias', 
    priority: 'media', 
    clientName: 'Ana Souza', 
    address: 'Rua A, 123',
    history: [
      { status: 'Pendente de Precificação', timestamp: '29/03/2026, 09:00:00', note: 'Solicitação criada pelo cliente' }
    ]
  },
  { 
    id: '#102', 
    status: 'Disponível para Parceiros', 
    sla: '1 dia', 
    priority: 'alta', 
    clientName: 'Carlos Lima', 
    address: 'Av. B, 456', 
    origin: 'Av. B, 456', 
    destination: 'Centro Logístico Sul', 
    price: 150.00, 
    deadline: 'Hoje, 18:00',
    history: [
      { status: 'Pendente de Precificação', timestamp: '29/03/2026, 08:30:00' },
      { status: 'Disponível para Parceiros', timestamp: '29/03/2026, 10:15:00', note: 'Precificado pelo administrador' }
    ]
  },
  { 
    id: '#103', 
    status: 'Contraproposta Enviada', 
    sla: '3 dias', 
    priority: 'baixa', 
    clientName: 'Julia Rosa', 
    address: 'Rua C, 789', 
    origin: 'Rua C, 789', 
    destination: 'Centro Logístico Norte', 
    price: 200.00, 
    deadline: 'Amanhã', 
    counterOffer: { price: 250.00, deadline: 'Hoje, 20:00', partnerName: 'Ricardo Oliveira' },
    history: [
      { status: 'Pendente de Precificação', timestamp: '28/03/2026, 14:00:00' },
      { status: 'Disponível para Parceiros', timestamp: '28/03/2026, 16:00:00' },
      { status: 'Contraproposta Enviada', timestamp: '29/03/2026, 07:45:00', note: 'Contraproposta de R$ 250,00 enviada por Ricardo Oliveira' }
    ]
  },
  { 
    id: '#104', 
    status: 'Em Rota', 
    sla: '4 horas', 
    priority: 'alta', 
    clientName: 'Marcos Paz', 
    address: 'Rua D, 101', 
    collectorName: 'Ricardo Oliveira',
    history: [
      { status: 'Pendente de Precificação', timestamp: '29/03/2026, 06:00:00' },
      { status: 'Disponível para Parceiros', timestamp: '29/03/2026, 07:00:00' },
      { status: 'Aguardando Coleta', timestamp: '29/03/2026, 07:30:00', note: 'Aceito por Ricardo Oliveira' },
      { status: 'Em Rota', timestamp: '29/03/2026, 08:00:00', note: 'Parceiro a caminho' }
    ]
  },
];

const INITIAL_QUOTES: Quote[] = [
  { 
    id: 'Q-001', 
    driverName: 'Roberto Santos', 
    vehiclePlate: 'ABC-1234', 
    price: 450.00, 
    pickupLocation: 'São Paulo, SP', 
    deliveryLocation: 'Campinas, SP', 
    status: 'Pendente',
    createdAt: '2026-03-29T10:00:00Z'
  },
  { 
    id: 'Q-002', 
    driverName: 'Marcos Oliveira', 
    vehiclePlate: 'XYZ-9876', 
    price: 380.00, 
    pickupLocation: 'Rio de Janeiro, RJ', 
    deliveryLocation: 'Niterói, RJ', 
    status: 'Pendente',
    createdAt: '2026-03-29T11:30:00Z'
  }
];

const CHART_DATA = [
  { name: 'Seg', coletas: 4 },
  { name: 'Ter', coletas: 7 },
  { name: 'Qua', coletas: 5 },
  { name: 'Qui', coletas: 8 },
  { name: 'Sex', coletas: 6 },
];

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-[#2ECC71] text-white shadow-lg shadow-green-200" 
        : "text-slate-600 hover:bg-slate-100"
    )}
  >
    <Icon size={20} />
    <span className="font-medium whitespace-nowrap overflow-hidden">{label}</span>
  </button>
);

const MetricCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{label}</h3>
    <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
  </div>
);

const StatusTimelineItem = ({ 
  label, 
  description, 
  active, 
  completed 
}: { 
  label: string, 
  description: string, 
  active: boolean, 
  completed: boolean,
  key?: any
}) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
        completed ? "bg-[#2ECC71] border-[#2ECC71] text-white" : 
        active ? "bg-white border-[#2980B9] text-[#2980B9] shadow-lg shadow-blue-100" : 
        "bg-white border-slate-200 text-slate-300"
      )}>
        {completed ? <CheckCircle2 size={16} /> : <div className={cn("w-2 h-2 rounded-full", active ? "bg-[#2980B9]" : "bg-slate-200")} />}
      </div>
      <div className={cn("w-0.5 flex-1 my-1", completed ? "bg-[#2ECC71]" : "bg-slate-100")} />
    </div>
    <div className="pb-8">
      <h4 className={cn("font-bold transition-colors", active ? "text-[#2980B9]" : completed ? "text-slate-800" : "text-slate-400")}>
        {label}
      </h4>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </div>
  </div>
);

const RequestHistory = ({ history }: { history: HistoryEntry[] }) => (
  <div className="space-y-4">
    {history.map((entry, idx) => (
      <div key={idx} className="flex gap-4 relative">
        {idx !== history.length - 1 && (
          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100" />
        )}
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
          idx === history.length - 1 ? "bg-blue-500 border-blue-500" : "bg-white border-slate-200"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            idx === history.length - 1 ? "bg-white" : "bg-slate-300"
          )} />
        </div>
        <div className="pb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{entry.timestamp}</p>
          <p className="font-bold text-slate-800">{entry.status}</p>
          {entry.note && <p className="text-sm text-slate-500 mt-1">{entry.note}</p>}
        </div>
      </div>
    ))}
  </div>
);

export default function App() {
  const [userRole, setUserRole] = useState<Role>(null);
  const [activeMenu, setActiveMenu] = useState<MenuType>('cliente');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'info', message: string } | null>(null);
  const [requests, setRequests] = useState<Request[]>(INITIAL_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [userRequestId, setUserRequestId] = useState<string | null>(null);
  const [dashboardFilterStatus, setDashboardFilterStatus] = useState<RequestStatus | 'Todos'>('Todos');
  const [dashboardFilterCollector, setDashboardFilterCollector] = useState<string | 'Todos'>('Todos');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardSortBy, setDashboardSortBy] = useState<'id' | 'status' | 'sla'>('id');
  const [dashboardViewMode, setDashboardViewMode] = useState<'list' | 'map'>('list');
  const [parceiroTab, setParceiroTab] = useState<'coletas' | 'fretes'>('coletas');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [quotingRequestId, setQuotingRequestId] = useState<string | null>(null);
  const [pricingRequestId, setPricingRequestId] = useState<string | null>(null);
  const [reviewingCounterOfferId, setReviewingCounterOfferId] = useState<string | null>(null);
  const [counterOfferingId, setCounterOfferingId] = useState<string | null>(null);
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [counterOfferDay, setCounterOfferDay] = useState<'hoje' | 'amanha' | 'outro'>('hoje');
  const [counterOfferDate, setCounterOfferDate] = useState<string>('');
  const [counterOfferTime, setCounterOfferTime] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    stopCamera();
  }, [activeMenu]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      showNotification('info', "Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        showNotification('success', 'Foto carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const showNotification = (type: 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `#${Math.floor(100 + Math.random() * 900)}`;
    const newRequest: Request = {
      id: newId,
      status: 'Pendente de Precificação',
      sla: '3 dias',
      priority: 'media',
      clientName: 'Você',
      address: 'Seu Endereço',
      history: [
        { status: 'Pendente de Precificação', timestamp: new Date().toLocaleString('pt-BR'), note: 'Solicitação criada pelo cliente' }
      ]
    };
    setRequests([newRequest, ...requests]);
    setUserRequestId(newId);
    showNotification('success', `Solicitação ${newId} enviada! Acompanhe o status em tempo real.`);
  };

  const handleAcceptOrder = (id: string, collectorName: string = 'João Silva') => {
    setRequests(requests.map(r => r.id === id ? { 
      ...r, 
      status: 'Em Rota', 
      collectorName,
      history: [...r.history, { status: 'Em Rota', timestamp: new Date().toLocaleString('pt-BR'), note: `Aceito por ${collectorName}` }]
    } : r));
    setSelectedRequestId(id);
    showNotification('info', `Você assumiu a coleta ${id}!`);
  };

  const handleQuoteSubmit = (quote: Omit<Quote, 'id' | 'status' | 'createdAt'>) => {
    const newQuote: Quote = {
      ...quote,
      id: `Q-${Math.floor(100 + Math.random() * 900)}`,
      status: 'Pendente',
      createdAt: new Date().toISOString()
    };
    setQuotes([newQuote, ...quotes]);
    showNotification('success', 'Cotação enviada com sucesso!');
  };

  const handleCounterOfferSubmit = (id: string, price: number, deadline: string, partnerName: string) => {
    setRequests(requests.map(r => r.id === id ? { 
      ...r, 
      status: 'Contraproposta Enviada', 
      counterOffer: { price, deadline, partnerName },
      history: [...r.history, { status: 'Contraproposta Enviada', timestamp: new Date().toLocaleString('pt-BR'), note: `Contraproposta de R$ ${price.toFixed(2)} enviada por ${partnerName}` }]
    } : r));
    showNotification('success', 'Contraproposta enviada ao administrador!');
  };

  const handlePricingSubmit = (id: string, origin: string, destination: string, price: number, deadline: string) => {
    setRequests(requests.map(r => r.id === id ? { 
      ...r, 
      status: 'Disponível para Parceiros', 
      origin, 
      destination, 
      price, 
      deadline,
      history: [...r.history, { status: 'Disponível para Parceiros', timestamp: new Date().toLocaleString('pt-BR'), note: `Precificado em R$ ${price.toFixed(2)}` }]
    } : r));
    showNotification('success', 'Solicitação precificada e liberada para parceiros!');
  };

  const handleCounterOfferDecision = (id: string, decision: 'Aprovar' | 'Reprovar') => {
    setRequests(requests.map(r => {
      if (r.id === id) {
        if (decision === 'Aprovar') {
          return { 
            ...r, 
            status: 'Aguardando Coleta', 
            price: r.counterOffer?.price, 
            deadline: r.counterOffer?.deadline,
            collectorName: r.counterOffer?.partnerName,
            counterOffer: undefined,
            history: [...r.history, { status: 'Aguardando Coleta', timestamp: new Date().toLocaleString('pt-BR'), note: `Contraproposta aprovada pelo administrador` }]
          };
        } else {
          return { 
            ...r, 
            status: 'Disponível para Parceiros', 
            counterOffer: undefined,
            history: [...r.history, { status: 'Disponível para Parceiros', timestamp: new Date().toLocaleString('pt-BR'), note: `Contraproposta reprovada pelo administrador` }]
          };
        }
      }
      return r;
    }));
    showNotification(decision === 'Aprovar' ? 'success' : 'info', `Contraproposta ${decision.toLowerCase()}da.`);
  };

  const handleFinalizeOrder = () => {
    if (!selectedRequestId) return;
    
    // Simulate the journey
    setRequests(prev => prev.map(r => r.id === selectedRequestId ? { 
      ...r, 
      status: 'Coletado',
      history: [...r.history, { status: 'Coletado', timestamp: new Date().toLocaleString('pt-BR'), note: 'Coleta finalizada pelo parceiro' }]
    } : r));
    showNotification('success', 'Pedido coletado com sucesso!');
    
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === selectedRequestId ? { 
        ...r, 
        status: 'Em Processamento',
        history: [...r.history, { status: 'Em Processamento', timestamp: new Date().toLocaleString('pt-BR'), note: 'Chegada no centro logístico' }]
      } : r));
      showNotification('info', 'Pedido em processamento no centro logístico.');
    }, 3000);

    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === selectedRequestId ? { 
        ...r, 
        status: 'Finalizado (Financeiro)',
        history: [...r.history, { status: 'Finalizado (Financeiro)', timestamp: new Date().toLocaleString('pt-BR'), note: 'Processamento concluído' }]
      } : r));
      showNotification('success', 'Tratativas concluídas. O financeiro entrará em contato.');
      setSelectedRequestId(null);
    }, 6000);
  };

  const selectedRequest = requests.find(r => r.id === selectedRequestId);
  const availableOrders = requests.filter(r => r.status === 'Aguardando Coleta');

  const handleLogout = () => {
    setUserRole(null);
    setActiveMenu('cliente');
    setCapturedImage(null);
    stopCamera();
    showNotification('info', 'Você saiu do sistema. Voltando para a tela inicial...');
  };

  const handleLogin = (role: Role) => {
    setUserRole(role);
    if (role === 'admin') setActiveMenu('dashboard');
    if (role === 'parceiro') setActiveMenu('parceiro');
    if (role === 'cliente') setActiveMenu('cliente');
    showNotification('success', `Bem-vindo! Logado como ${role === 'admin' ? 'Administrador' : role === 'parceiro' ? 'Parceiro Logístico' : 'Cliente'}`);
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white"
        >
          <div className="bg-[#2980B9] p-12 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-[#2ECC71] rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                <Package size={32} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4 tracking-tight">RetiraAqui</h1>
              <p className="text-blue-100 text-lg leading-relaxed">
                A solução inteligente para logística reversa. Simples para quem devolve, eficiente para quem coleta.
              </p>
            </div>
          </div>
          
          <div className="p-12 flex flex-col justify-center bg-white">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Seja bem-vindo!</h2>
            <p className="text-slate-500 mb-8">Escolha seu perfil para acessar a plataforma:</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => handleLogin('cliente')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-[#2ECC71] hover:bg-green-50 transition-all text-left"
              >
                <div className="bg-slate-100 group-hover:bg-[#2ECC71] p-3 rounded-xl transition-colors">
                  <Package className="text-slate-500 group-hover:text-white" size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Sou Cliente</p>
                  <p className="text-xs text-slate-500">Quero devolver um produto</p>
                </div>
              </button>

              <button 
                onClick={() => handleLogin('parceiro')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-[#2980B9] hover:bg-blue-50 transition-all text-left"
              >
                <div className="bg-slate-100 group-hover:bg-[#2980B9] p-3 rounded-xl transition-colors">
                  <Truck className="text-slate-500 group-hover:text-white" size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Sou Parceiro Logístico</p>
                  <p className="text-xs text-slate-500">Quero realizar coletas ou fretes</p>
                </div>
              </button>

              <button 
                onClick={() => handleLogin('admin')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-800 hover:bg-slate-50 transition-all text-left"
              >
                <div className="bg-slate-100 group-hover:bg-slate-800 p-3 rounded-xl transition-colors">
                  <LayoutDashboard className="text-slate-500 group-hover:text-white" size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Administrador</p>
                  <p className="text-xs text-slate-500">Gestão e Dashboard Logístico</p>
                </div>
              </button>
            </div>
            
            <p className="mt-8 text-center text-xs text-slate-400">
              MVP desenvolvido para demonstração técnica.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-900 relative overflow-x-hidden">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50",
        "fixed inset-y-0 left-0 h-full md:sticky md:top-0 md:h-screen",
        isSidebarOpen 
          ? "w-72 translate-x-0" 
          : "w-72 -translate-x-full md:w-20 md:translate-x-0"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 h-20">
          <div className="bg-[#2980B9] p-2 rounded-lg shrink-0">
            <Package className="text-white" size={24} />
          </div>
          {isSidebarOpen && <h1 className="text-xl font-bold text-[#2980B9] truncate">RetiraAqui</h1>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={LogIn} 
            label={isSidebarOpen ? "Trocar Perfil" : ""} 
            active={false} 
            onClick={handleLogout} 
          />
          <div className="h-px bg-slate-100 my-4 mx-2" />
          
          {userRole === 'cliente' && (
            <SidebarItem 
              icon={Package} 
              label={isSidebarOpen ? "Área do Cliente" : ""} 
              active={activeMenu === 'cliente'} 
              onClick={() => setActiveMenu('cliente')} 
            />
          )}
          {userRole === 'admin' && (
            <>
              <SidebarItem 
                icon={LayoutDashboard} 
                label={isSidebarOpen ? "Dashboard Logístico" : ""} 
                active={activeMenu === 'dashboard'} 
                onClick={() => setActiveMenu('dashboard')} 
              />
              <SidebarItem 
                icon={ListIcon} 
                label={isSidebarOpen ? "Todas as Cotações" : ""} 
                active={activeMenu === 'cotacoes'} 
                onClick={() => setActiveMenu('cotacoes')} 
              />
            </>
          )}
          {userRole === 'parceiro' && (
            <>
              <SidebarItem 
                icon={Truck} 
                label={isSidebarOpen ? "Área do Parceiro" : ""} 
                active={activeMenu === 'parceiro'} 
                onClick={() => setActiveMenu('parceiro')} 
              />
              <SidebarItem 
                icon={ListIcon} 
                label={isSidebarOpen ? "Minhas Cotações" : ""} 
                active={activeMenu === 'cotacoes'} 
                onClick={() => setActiveMenu('cotacoes')} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl text-red-500 transition-all duration-200 group",
              !isSidebarOpen && "justify-center"
            )}
            title="Sair e voltar ao início"
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span className="font-bold">Sair do Sistema</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex justify-center p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-100 p-4 flex items-center justify-between md:hidden sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="bg-[#2980B9] p-1.5 rounded-lg">
              <Package className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold text-[#2980B9]">RetiraAqui</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
          {activeMenu === 'cliente' && (
            <motion.div
              key="cliente"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {!userRequestId ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800">📦 Solicitar Devolução</h2>
                    <p className="text-slate-500 mt-2">Preencha os dados abaixo para agendar sua coleta reversa.</p>
                  </div>

                  <form 
                    onSubmit={handleClientSubmit}
                    className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Foto do produto</label>
                      <div className="relative border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50 min-h-[240px] flex flex-col items-center justify-center">
                        {capturedImage ? (
                          <div className="relative w-full h-full">
                            <img src={capturedImage} alt="Captura" className="w-full h-64 object-cover" />
                            <button 
                              type="button"
                              onClick={() => {
                                setCapturedImage(null);
                                startCamera();
                              }}
                              className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full shadow-lg hover:bg-white transition-colors"
                            >
                              <RefreshCcw size={20} className="text-slate-600" />
                            </button>
                          </div>
                        ) : isCameraActive ? (
                          <div className="relative w-full h-64 bg-black">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                            />
                            <button 
                              type="button"
                              onClick={capturePhoto}
                              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#2ECC71] text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform"
                            >
                              <Camera size={24} />
                            </button>
                          </div>
                        ) : (
                          <div className="p-8 flex flex-col items-center justify-center gap-4 text-center w-full">
                            <div className="bg-white p-4 rounded-full shadow-sm">
                              <Camera className="text-slate-400" size={32} />
                            </div>
                            <div>
                              <p className="text-slate-600 font-medium">Nenhuma foto capturada</p>
                              <p className="text-slate-400 text-xs mt-1">Escolha como deseja registrar o produto</p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                              <button 
                                type="button"
                                onClick={startCamera}
                                className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Camera size={18} />
                                Tirar foto com a câmera
                              </button>
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Cloud size={18} className="text-[#2980B9]" />
                                Fazer o upload direto do Google Drive
                              </button>
                            </div>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileUpload} 
                              accept="image/*" 
                              className="hidden" 
                            />
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Motivo da Devolução</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none transition-all">
                        <option>Defeito</option>
                        <option>Arrependimento</option>
                        <option>Tamanho Errado</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Descrição do Problema</label>
                      <textarea 
                        rows={4}
                        placeholder="Conte-nos mais sobre o que aconteceu..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none transition-all resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-1 active:scale-95"
                    >
                      Enviar Solicitação
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-800">Acompanhar Pedido</h2>
                      <p className="text-slate-500 mt-1">Status da solicitação {userRequestId}</p>
                    </div>
                    <button 
                      onClick={() => setUserRequestId(null)}
                      className="text-[#2980B9] font-bold text-sm hover:underline"
                    >
                      Nova Solicitação
                    </button>
                  </div>

                  <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    {(() => {
                      const req = requests.find(r => r.id === userRequestId);
                      if (!req) return null;

                      const stages = [
                        { status: 'Aguardando Coleta', label: 'Solicitação Registrada', desc: 'Sua solicitação foi recebida e está aguardando um coletor.' },
                        { status: 'Em Rota', label: 'Motorista a Caminho', desc: 'Um motorista aceitou sua coleta e está se deslocando.' },
                        { status: 'Coletado', label: 'Pedido Retirado', desc: 'O item foi coletado com sucesso pelo motorista.' },
                        { status: 'Em Processamento', label: 'Tratativas da Retirada', desc: 'O item está sendo processado em nosso centro logístico.' },
                        { status: 'Finalizado (Financeiro)', label: 'Financeiro em Contato', desc: 'Processo concluído. Nosso time financeiro entrará em contato para o reembolso/troca.' }
                      ];

                      const currentIdx = stages.findIndex(s => s.status === req.status);

                      return (
                        <div className="space-y-8">
                          <div className="space-y-2">
                            {stages.map((stage, idx) => (
                              <StatusTimelineItem 
                                key={idx}
                                label={stage.label}
                                description={stage.desc}
                                active={idx === currentIdx}
                                completed={idx < currentIdx}
                              />
                            ))}
                          </div>
                          
                          <div className="pt-8 border-t border-slate-100">
                            <h4 className="text-lg font-bold text-slate-800 mb-6">Histórico Detalhado</h4>
                            <RequestHistory history={req.history} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeMenu === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">📊 Painel de Controle</h2>
                  <p className="text-slate-500 mt-2">Visão geral das operações de logística reversa.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Última atualização</p>
                  <p className="text-slate-600 font-bold">Hoje, 10:45</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Pendentes Precificação" value={requests.filter(r => r.status === 'Pendente de Precificação').length.toString()} icon={Package} color="bg-orange-500" />
                <MetricCard label="SLA em Alerta" value={requests.filter(r => r.priority === 'alta' && !['Finalizado (Financeiro)'].includes(r.status)).length.toString()} icon={AlertCircle} color="bg-red-500" />
                <MetricCard label="Coletas Hoje" value={requests.filter(r => r.status === 'Finalizado (Financeiro)').length.toString()} icon={Truck} color="bg-[#2ECC71]" />
              </div>

              {/* Seção de Precificação (ADM) */}
              {requests.some(r => r.status === 'Pendente de Precificação') && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <AlertCircle className="text-orange-500" size={20} />
                    Solicitações Pendentes de Precificação
                  </h3>
                  <div className="space-y-4">
                    {requests.filter(r => r.status === 'Pendente de Precificação').map(req => (
                      <div key={req.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{req.id}</p>
                            <p className="text-sm text-slate-500">Endereço: {req.address}</p>
                          </div>
                          <button 
                            onClick={() => setPricingRequestId(pricingRequestId === req.id ? null : req.id)}
                            className="bg-[#2980B9] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#2471a3] transition-all"
                          >
                            {pricingRequestId === req.id ? 'Fechar' : 'Precificar'}
                          </button>
                        </div>

                        {pricingRequestId === req.id && (
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              handlePricingSubmit(
                                req.id,
                                formData.get('origin') as string,
                                formData.get('destination') as string,
                                Number(formData.get('price')),
                                formData.get('deadline') as string
                              );
                              setPricingRequestId(null);
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200"
                          >
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Destino Inicial</label>
                              <input name="origin" required defaultValue={req.address} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Destino Final</label>
                              <input name="destination" required placeholder="Ex: Centro Logístico Norte" className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Valor do Frete (R$)</label>
                              <input name="price" type="number" step="0.01" required placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Prazo</label>
                              <input name="deadline" required placeholder="Ex: Hoje, 18:00" className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <button type="submit" className="md:col-span-2 bg-[#2ECC71] text-white py-3 rounded-xl font-bold hover:bg-[#27ae60] transition-all">
                              Liberar para Parceiros
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de Contrapropostas (ADM) */}
              {requests.some(r => r.status === 'Contraproposta Enviada') && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <MessageSquare className="text-blue-500" size={20} />
                    Contrapropostas de Parceiros
                  </h3>
                  <div className="space-y-4">
                    {requests.filter(r => r.status === 'Contraproposta Enviada').map(req => (
                      <div key={req.id} className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{req.id}</p>
                            <p className="text-sm text-slate-600">Proposta de: <span className="font-bold">{req.counterOffer?.partnerName}</span></p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleCounterOfferDecision(req.id, 'Aprovar')}
                              className="bg-[#2ECC71] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#27ae60] transition-all"
                            >
                              Aprovar
                            </button>
                            <button 
                              onClick={() => handleCounterOfferDecision(req.id, 'Reprovar')}
                              className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-all"
                            >
                              Reprovar
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-white p-3 rounded-xl border border-blue-100">
                            <p className="text-slate-400 uppercase text-[10px] font-bold">Valor Original</p>
                            <p className="font-bold text-slate-700">R$ {req.price?.toFixed(2)}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-blue-100">
                            <p className="text-blue-400 uppercase text-[10px] font-bold">Nova Oferta</p>
                            <p className="font-bold text-blue-700">R$ {req.counterOffer?.price.toFixed(2)}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-blue-100">
                            <p className="text-slate-400 uppercase text-[10px] font-bold">Prazo Original</p>
                            <p className="font-bold text-slate-700">{req.deadline}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-blue-100">
                            <p className="text-blue-400 uppercase text-[10px] font-bold">Novo Prazo</p>
                            <p className="font-bold text-blue-700">{req.counterOffer?.deadline}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Volume de Coletas (Semana)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={CHART_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="coletas" radius={[4, 4, 0, 0]}>
                          {CHART_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 3 ? '#2ECC71' : '#2980B9'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-6 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-bold text-slate-800">Solicitações Recentes</h3>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
                        <Search size={16} className="text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Buscar por ID ou Cliente..."
                          value={dashboardSearchQuery}
                          onChange={(e) => setDashboardSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-sm w-full sm:w-48"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <select 
                        value={dashboardFilterCollector}
                        onChange={(e) => setDashboardFilterCollector(e.target.value)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Todos">Todos Coletores</option>
                        {Array.from(new Set(requests.map(r => r.collectorName).filter(Boolean))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <select 
                        value={dashboardFilterStatus}
                        onChange={(e) => setDashboardFilterStatus(e.target.value as any)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Todos">Todos Status</option>
                        <option value="Pendente de Precificação">Pendente de Precificação</option>
                        <option value="Disponível para Parceiros">Disponível para Parceiros</option>
                        <option value="Contraproposta Enviada">Contraproposta Enviada</option>
                        <option value="Aguardando Coleta">Aguardando Coleta</option>
                        <option value="Em Rota">Em Rota</option>
                        <option value="Coletado">Coletado</option>
                        <option value="Em Trânsito">Em Trânsito</option>
                        <option value="Em Processamento">Em Processamento</option>
                        <option value="Finalizado (Financeiro)">Finalizado</option>
                      </select>
                      <select 
                        value={dashboardSortBy}
                        onChange={(e) => setDashboardSortBy(e.target.value as any)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="id">Ordenar por ID</option>
                        <option value="status">Ordenar por Status</option>
                        <option value="sla">Ordenar por SLA</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                          <th className="pb-4 font-semibold">ID</th>
                          <th className="pb-4 font-semibold">Cliente</th>
                          <th className="pb-4 font-semibold">Coletor</th>
                          <th className="pb-4 font-semibold">Status</th>
                          <th className="pb-4 font-semibold">SLA Restante</th>
                          <th className="pb-4 font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {requests
                          .filter(r => {
                            const matchesStatus = dashboardFilterStatus === 'Todos' || r.status === dashboardFilterStatus;
                            const matchesCollector = dashboardFilterCollector === 'Todos' || r.collectorName === dashboardFilterCollector;
                            const matchesSearch = r.id.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || 
                                                r.clientName?.toLowerCase().includes(dashboardSearchQuery.toLowerCase());
                            return matchesStatus && matchesCollector && matchesSearch;
                          })
                          .sort((a, b) => {
                            if (dashboardSortBy === 'id') return b.id.localeCompare(a.id);
                            if (dashboardSortBy === 'status') return a.status.localeCompare(b.status);
                            if (dashboardSortBy === 'sla') return a.sla.localeCompare(b.sla);
                            return 0;
                          })
                          .slice(0, 10)
                          .map((req) => (
                          <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-4 font-bold text-slate-700">{req.id}</td>
                            <td className="py-4 text-sm text-slate-600 font-medium">{req.clientName}</td>
                            <td className="py-4 text-sm text-slate-600 font-medium">
                              {req.collectorName || <span className="text-slate-300 italic">Não atribuído</span>}
                            </td>
                            <td className="py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                req.status === 'Em Rota' ? "bg-blue-50 text-blue-600" : 
                                req.status === 'Finalizado (Financeiro)' ? "bg-green-50 text-green-600" :
                                req.status === 'Coletado' ? "bg-purple-50 text-purple-600" :
                                req.status === 'Em Trânsito' ? "bg-teal-50 text-teal-600" :
                                req.status === 'Em Processamento' ? "bg-amber-50 text-amber-600" :
                                req.status === 'Pendente de Precificação' ? "bg-orange-50 text-orange-600" :
                                req.status === 'Disponível para Parceiros' ? "bg-blue-50 text-blue-600" :
                                req.status === 'Contraproposta Enviada' ? "bg-indigo-50 text-indigo-600" :
                                "bg-slate-50 text-slate-600"
                              )}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Clock size={14} />
                                {req.status === 'Finalizado (Financeiro)' ? '-' : req.sla}
                              </div>
                            </td>
                            <td className="py-4">
                              <button 
                                onClick={() => setViewHistoryId(req.id)}
                                className="text-xs font-bold text-[#2980B9] hover:underline"
                              >
                                Ver Histórico
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeMenu === 'parceiro' && (
            <motion.div
              key="parceiro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">🤝 Área do Parceiro</h2>
                  <p className="text-slate-500 mt-2">Gerencie suas coletas rápidas e negocie fretes de longa distância.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => setParceiroTab('coletas')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      parceiroTab === 'coletas' ? "bg-white text-[#2980B9] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Coletas Rápidas
                  </button>
                  <button 
                    onClick={() => setParceiroTab('fretes')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      parceiroTab === 'fretes' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Fretes (Cotação)
                  </button>
                </div>
              </div>

              {parceiroTab === 'coletas' ? (
                /* Mural de Solicitações Liberadas */
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-700">Mural de Solicitações</h3>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {requests.filter(r => r.status === 'Disponível para Parceiros').length} Disponíveis
                    </span>
                  </div>

                  {requests.filter(r => r.status === 'Disponível para Parceiros').length > 0 ? (
                    <div className="grid gap-6">
                      {requests.filter(r => r.status === 'Disponível para Parceiros').map(req => (
                        <div key={req.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-lg">
                                  <Package className="text-[#2980B9]" size={20} />
                                </div>
                                <p className="font-bold text-slate-800 text-xl">{req.id}</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                  <MapPin size={16} className="text-red-500 mt-1 shrink-0" />
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Retirada</p>
                                    <p className="text-sm text-slate-700 font-medium">{req.origin || req.address}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin size={16} className="text-green-500 mt-1 shrink-0" />
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p>
                                    <p className="text-sm text-slate-700 font-medium">{req.destination}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 pt-2">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                  <DollarSign size={14} className="text-[#2ECC71]" />
                                  <span className="text-sm font-bold text-slate-700">R$ {req.price?.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                  <Clock size={14} className="text-blue-500" />
                                  <span className="text-sm font-bold text-slate-700">{req.deadline}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                              <button 
                                onClick={() => handleAcceptOrder(req.id, 'Parceiro Logístico')}
                                className="w-full bg-[#2ECC71] text-white py-3 rounded-xl font-bold hover:bg-[#27ae60] transition-all shadow-lg shadow-green-100"
                              >
                                Aceitar Frete
                              </button>
                              <button 
                                onClick={() => setCounterOfferingId(counterOfferingId === req.id ? null : req.id)}
                                className="w-full bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
                              >
                                {counterOfferingId === req.id ? 'Cancelar' : 'Fazer Contraproposta'}
                              </button>
                            </div>
                          </div>

                          {counterOfferingId === req.id && (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                let finalDeadline = '';
                                if (counterOfferDay === 'hoje') finalDeadline = `Hoje, ${counterOfferTime}`;
                                else if (counterOfferDay === 'amanha') finalDeadline = `Amanhã, ${counterOfferTime}`;
                                else finalDeadline = `${counterOfferDate}, ${counterOfferTime}`;

                                handleCounterOfferSubmit(
                                  req.id,
                                  Number(formData.get('price')),
                                  finalDeadline,
                                  'Parceiro Logístico'
                                );
                                setCounterOfferingId(null);
                                setCounterOfferDay('hoje');
                                setCounterOfferDate('');
                                setCounterOfferTime('');
                              }}
                              className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Seu Valor (R$)</label>
                                <input name="price" type="number" step="0.01" required placeholder="Ex: 180,00" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Seu Prazo (Dia)</label>
                                <select 
                                  value={counterOfferDay}
                                  onChange={(e) => setCounterOfferDay(e.target.value as any)}
                                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="hoje">Hoje</option>
                                  <option value="amanha">Amanhã</option>
                                  <option value="outro">Outro Dia</option>
                                </select>
                              </div>

                              {counterOfferDay === 'outro' && (
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Data Específica</label>
                                  <input 
                                    type="date" 
                                    required 
                                    value={counterOfferDate}
                                    onChange={(e) => setCounterOfferDate(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                  />
                                </div>
                              )}

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Horário Estimado</label>
                                <input 
                                  type="time" 
                                  required 
                                  value={counterOfferTime}
                                  onChange={(e) => setCounterOfferTime(e.target.value)}
                                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                              </div>

                              <button type="submit" className="md:col-span-2 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-all">
                                Enviar Contraproposta
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-16 rounded-[40px] border border-dashed border-slate-200 text-center">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="text-slate-300" size={40} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800">Mural Vazio</h4>
                      <p className="text-slate-400 mt-2 max-w-xs mx-auto">Aguarde novas solicitações serem liberadas pelo administrador.</p>
                    </div>
                  )}

                  {/* Atendimento Atual */}
                  {selectedRequestId && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-8 mt-12">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">Em Atendimento</span>
                          <h3 className="text-2xl font-bold text-slate-800 mt-2">Ordem {selectedRequestId}</h3>
                        </div>
                        <button onClick={() => setSelectedRequestId(null)} className="text-slate-400 hover:text-red-500">Fechar Detalhes</button>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-3 rounded-full">
                            <Truck className="text-[#2980B9]" size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Status da Coleta</p>
                            <p className="text-xs text-slate-500">Atualize o andamento do pedido</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <button 
                            onClick={() => setRequests(prev => prev.map(r => r.id === selectedRequestId ? { 
                              ...r, 
                              status: 'Em Rota',
                              history: [...r.history, { status: 'Em Rota', timestamp: new Date().toLocaleString('pt-BR'), note: 'Parceiro chegou no local' }]
                            } : r))}
                            className={cn(
                              "py-3 rounded-xl font-bold text-sm transition-all",
                              requests.find(r => r.id === selectedRequestId)?.status === 'Em Rota' 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            Cheguei no Local
                          </button>
                          <button 
                            onClick={handleFinalizeOrder}
                            className="bg-[#2ECC71] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#27ae60] transition-all"
                          >
                            Finalizar Coleta
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unified Motorista/Fretes View */
                <div className="space-y-6">
                  {quotingRequestId ? (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Nova Cotação para {quotingRequestId}</h3>
                        <button onClick={() => setQuotingRequestId(null)} className="text-slate-400 hover:text-red-500">Cancelar</button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleQuoteSubmit({
                          driverName: formData.get('driverName') as string,
                          vehiclePlate: formData.get('vehiclePlate') as string,
                          price: Number(formData.get('price')),
                          pickupLocation: formData.get('pickupLocation') as string,
                          deliveryLocation: formData.get('deliveryLocation') as string,
                        });
                        setQuotingRequestId(null);
                      }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Seu Nome</label>
                          <input name="driverName" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" placeholder="Nome completo" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Placa do Veículo</label>
                          <input name="vehiclePlate" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" placeholder="AAA-0000" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Preço do Frete (R$)</label>
                          <input name="price" type="number" step="0.01" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Local de Retirada</label>
                          <input name="pickupLocation" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" defaultValue={requests.find(r => r.id === quotingRequestId)?.address} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Local de Entrega (Centro Logístico)</label>
                          <input name="deliveryLocation" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" defaultValue="Centro de Distribuição Norte - SP" />
                        </div>
                        <button type="submit" className="md:col-span-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
                          Enviar Cotação de Frete
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-slate-700">Fretes Disponíveis para Cotação</h3>
                      <div className="grid gap-4">
                        {availableOrders.map(order => (
                          <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                              <p className="font-bold text-slate-800 text-lg">{order.id}</p>
                              <p className="text-sm text-slate-600">{order.address}</p>
                              <p className="text-xs text-slate-400 mt-1">Cliente: {order.clientName}</p>
                            </div>
                            <button 
                              onClick={() => setQuotingRequestId(order.id)}
                              className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition-all"
                            >
                              Fazer Cotação
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeMenu === 'cotacoes' && (
            <motion.div
              key="cotacoes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-slate-800">
                  {userRole === 'admin' ? '📋 Todas as Cotações' : '📦 Minhas Cotações'}
                </h2>
                <p className="text-slate-500 mt-2">
                  {userRole === 'admin' 
                    ? 'Analise as propostas de frete enviadas pelos motoristas.' 
                    : 'Acompanhe o status das suas propostas de frete.'}
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50">
                        <th className="px-6 py-4 font-semibold">Motorista</th>
                        <th className="px-6 py-4 font-semibold">Veículo</th>
                        <th className="px-6 py-4 font-semibold">Preço</th>
                        <th className="px-6 py-4 font-semibold">Rota</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        {userRole === 'admin' && <th className="px-6 py-4 font-semibold">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{quote.driverName}</p>
                            <p className="text-xs text-slate-400">{quote.id}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{quote.vehiclePlate}</td>
                          <td className="px-6 py-4 font-bold text-[#2ECC71]">
                            R$ {quote.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-500">De: {quote.pickupLocation}</p>
                            <p className="text-xs text-slate-500">Para: {quote.deliveryLocation}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                              quote.status === 'Pendente' ? "bg-amber-50 text-amber-600" :
                              quote.status === 'Aprovado' ? "bg-green-50 text-green-600" :
                              "bg-red-50 text-red-600"
                            )}>
                              {quote.status}
                            </span>
                          </td>
                          {userRole === 'admin' && (
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'Aprovado' } : q));
                                    showNotification('success', 'Cotação aprovada!');
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Aprovar"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'Recusado' } : q));
                                    showNotification('info', 'Cotação recusada.');
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Recusar"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {/* History Modal */}
        {viewHistoryId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Histórico da Solicitação {viewHistoryId}</h3>
                <button onClick={() => setViewHistoryId(null)} className="text-slate-400 hover:text-red-500">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <RequestHistory history={requests.find(r => r.id === viewHistoryId)?.history || []} />
              </div>
            </motion.div>
          </div>
        )}

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 min-w-[320px]",
              notification.type === 'success' ? "bg-[#2ECC71] text-white" : "bg-[#2980B9] text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <Truck size={24} />}
            <p className="font-medium">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
