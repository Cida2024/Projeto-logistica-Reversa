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
  List as ListIcon
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
type Role = 'cliente' | 'admin' | 'coletor' | null;
type MenuType = 'cliente' | 'dashboard' | 'coletor';

type RequestStatus = 
  | 'Aguardando Coleta' 
  | 'Em Rota' 
  | 'Coletado' 
  | 'Em Trânsito'
  | 'Em Processamento' 
  | 'Finalizado (Financeiro)';

interface Request {
  id: string;
  status: RequestStatus;
  sla: string;
  priority: 'baixa' | 'media' | 'alta';
  clientName?: string;
  address?: string;
  collectorName?: string;
}

// --- Mock Data ---
const INITIAL_REQUESTS: Request[] = [
  { id: '#101', status: 'Aguardando Coleta', sla: '2 dias', priority: 'media', clientName: 'Ana Souza', address: 'Rua A, 123' },
  { id: '#102', status: 'Em Rota', sla: '1 dia', priority: 'alta', clientName: 'Carlos Lima', address: 'Av. B, 456', collectorName: 'João Silva' },
  { id: '#103', status: 'Em Trânsito', sla: '3 dias', priority: 'baixa', clientName: 'Julia Rosa', address: 'Rua C, 789', collectorName: 'Ricardo Oliveira' },
  { id: '#104', status: 'Em Rota', sla: '4 horas', priority: 'alta', clientName: 'Marcos Paz', address: 'Rua D, 101', collectorName: 'Ricardo Oliveira' },
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
      status: 'Aguardando Coleta',
      sla: '3 dias',
      priority: 'media',
      clientName: 'Você',
      address: 'Seu Endereço'
    };
    setRequests([newRequest, ...requests]);
    setUserRequestId(newId);
    showNotification('success', `Solicitação ${newId} enviada! Acompanhe o status em tempo real.`);
  };

  const handleAcceptOrder = (id: string, collectorName: string = 'João Silva') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'Em Rota', collectorName } : r));
    setSelectedRequestId(id);
    showNotification('info', `Você assumiu a coleta ${id}!`);
  };

  const handleFinalizeOrder = () => {
    if (!selectedRequestId) return;
    
    // Simulate the journey
    setRequests(prev => prev.map(r => r.id === selectedRequestId ? { ...r, status: 'Coletado' } : r));
    showNotification('success', 'Pedido coletado com sucesso!');
    
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === selectedRequestId ? { ...r, status: 'Em Processamento' } : r));
      showNotification('info', 'Pedido em processamento no centro logístico.');
    }, 3000);

    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === selectedRequestId ? { ...r, status: 'Finalizado (Financeiro)' } : r));
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
    if (role === 'coletor') setActiveMenu('coletor');
    if (role === 'cliente') setActiveMenu('cliente');
    showNotification('success', `Bem-vindo! Logado como ${role === 'admin' ? 'Administrador' : role === 'coletor' ? 'Coletor' : 'Cliente'}`);
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
                onClick={() => handleLogin('coletor')}
                className="w-full group flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-[#2980B9] hover:bg-blue-50 transition-all text-left"
              >
                <div className="bg-slate-100 group-hover:bg-[#2980B9] p-3 rounded-xl transition-colors">
                  <Truck className="text-slate-500 group-hover:text-white" size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Sou Coletor</p>
                  <p className="text-xs text-slate-500">Quero realizar coletas</p>
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
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col sticky top-0 h-screen",
        isSidebarOpen ? "w-72" : "w-20"
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
            <SidebarItem 
              icon={LayoutDashboard} 
              label={isSidebarOpen ? "Dashboard Logístico" : ""} 
              active={activeMenu === 'dashboard'} 
              onClick={() => setActiveMenu('dashboard')} 
            />
          )}
          {userRole === 'coletor' && (
            <SidebarItem 
              icon={Truck} 
              label={isSidebarOpen ? "Área do Coletor" : ""} 
              active={activeMenu === 'coletor'} 
              onClick={() => setActiveMenu('coletor')} 
            />
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
      <main className="flex-1 p-8 overflow-y-auto">
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
                <MetricCard label="Novas Solicitações" value={requests.filter(r => r.status === 'Aguardando Coleta').length.toString()} icon={Package} color="bg-[#2980B9]" />
                <MetricCard label="SLA em Alerta" value={requests.filter(r => r.priority === 'alta' && !['Finalizado (Financeiro)'].includes(r.status)).length.toString()} icon={AlertCircle} color="bg-orange-500" />
                <MetricCard label="Coletas Hoje" value={requests.filter(r => r.status === 'Finalizado (Financeiro)').length.toString()} icon={Truck} color="bg-[#2ECC71]" />
              </div>

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
                                "bg-orange-50 text-orange-600"
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeMenu === 'coletor' && (
            <motion.div
              key="coletor"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800">🚚 Área do Coletor</h2>
                <p className="text-slate-500 mt-2">Gerencie suas coletas e atualize o status em tempo real.</p>
              </div>

              {!selectedRequestId ? (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-700">Ordens Disponíveis</h3>
                  {availableOrders.length > 0 ? (
                    <div className="grid gap-4">
                      {availableOrders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{order.id}</p>
                            <p className="text-xs text-slate-400 font-medium">{order.clientName} • {order.address}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Clock size={14} /> {order.sla}
                              </span>
                              <span className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                order.priority === 'alta' ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-500"
                              )}>
                                Prioridade {order.priority}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleAcceptOrder(order.id)}
                            className="bg-[#2980B9] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#2471a3] transition-all"
                          >
                            Assumir Coleta
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                      <Package className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400">Nenhuma ordem disponível no momento.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">Em Atendimento</span>
                      <h3 className="text-2xl font-bold text-slate-800 mt-2">Ordem {selectedRequestId}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedRequestId(null)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Cancelar Atendimento
                    </button>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Nome do Motorista</label>
                        <input 
                          type="text"
                          id="driver-name"
                          placeholder="Ex: João Silva"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2980B9] focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Placa do Veículo</label>
                        <input 
                          type="text"
                          id="vehicle-plate"
                          placeholder="AAA-0000"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2980B9] focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Truck className="text-[#2980B9]" size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Endereço de Coleta</p>
                        <p className="font-bold text-slate-800">{selectedRequest?.address || 'Rua das Flores, 123 - Centro'}</p>
                        <p className="text-xs text-slate-400">Cliente: {selectedRequest?.clientName || 'João Silva'}</p>
                      </div>
                    </div>
                  </div>

                    <div className="space-y-4 pt-4">
                      <button 
                        onClick={() => {
                          const name = (document.getElementById('driver-name') as HTMLInputElement)?.value || 'João Silva';
                          handleAcceptOrder(selectedRequestId!, name);
                          showNotification('info', `Notificação enviada ao cliente: O motorista ${name} chegou!`);
                        }}
                        className="w-full bg-[#2980B9] hover:bg-[#2471a3] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                      >
                        Confirmar Chegada no Cliente
                      </button>
                    
                    <button 
                      onClick={handleFinalizeOrder}
                      className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                    >
                      Finalizar e Entregar no Centro Logístico
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Notifications */}
      <AnimatePresence>
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
