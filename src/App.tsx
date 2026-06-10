/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Menu, 
  X, 
  ArrowRight,
  Sparkles,
  Zap,
  Droplet,
  Paintbrush,
  Hammer,
  ChevronRight,
  LogOut,
  Send,
  MessageSquare as ChatIcon,
  User as UserIcon,
  ArrowLeft,
  DollarSign,
  MapPin,
  Info,
  Phone,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  Plus,
  Check,
  AlertCircle,
  Edit,
  Home,
  RotateCcw
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  deleteField
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

const CATEGORIES = [
  { id: 'cleaning', name: 'Limpeza', icon: Sparkles, color: 'bg-blue-100 text-blue-600' },
  { id: 'electric', name: 'Elétrica', icon: Zap, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'plumbing', name: 'Hidráulica', icon: Droplet, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'painting', name: 'Pintura', icon: Paintbrush, color: 'bg-pink-100 text-pink-600' },
  { id: 'assembly', name: 'Montagem', icon: Hammer, color: 'bg-orange-100 text-orange-600' },
];

const FEATURES = [
  {
    title: 'Profissionais Verificados',
    description: 'Rigoroso processo de seleção para garantir sua segurança e tranquilidade.',
    icon: ShieldCheck,
  },
  {
    title: 'Pagamento Protegido',
    description: 'O valor só é liberado após a confirmação de que o serviço foi concluído.',
    icon: CreditCard,
  },
  {
    title: 'Agendamento Flexível',
    description: 'Escolha o melhor dia e horário que se adapta à sua rotina corrida.',
    icon: Clock,
  },
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function getPortugueseCategorySubject(category: string, clientName: string) {
  const name = clientName || "Cliente";
  switch (category) {
    case 'cleaning':
      return `${name} precisa de um Diarista / Limpeza`;
    case 'electric':
      return `${name} precisa de um Eletricista`;
    case 'plumbing':
      return `${name} precisa de um Encanador / Hidr`;
    case 'painting':
      return `${name} precisa de um Pintor`;
    case 'assembly':
      return `${name} precisa de um Montador / Pedreiro`;
    default:
      return `${name} precisa de um Profissional`;
  }
}

const MOCK_CLIENTS = {
  'mock_client_joao': {
    uid: 'mock_client_joao',
    name: 'João Silva',
    email: 'joao.silva@demo.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
    role: 'client',
    age: 34,
    city: 'Curitiba - PR',
    profession: 'Engenheiro de Software',
    phone: '(41) 98877-6655',
    bio: 'Procuro profissionais confiáveis para manutenção da minha residência.',
    isVerified: true
  },
  'mock_client_tiago': {
    uid: 'mock_client_tiago',
    name: 'Tiago Souza',
    email: 'tiago.souza@demo.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
    role: 'client',
    age: 28,
    city: 'São Paulo - SP',
    profession: 'Arquiteto',
    phone: '(11) 97766-5544',
    bio: 'Gosto de serviços executados com capricho e atenção às especificações.',
    isVerified: true
  },
  'mock_client_maria': {
    uid: 'mock_client_maria',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@demo.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
    role: 'client',
    age: 42,
    city: 'Florianópolis - SC',
    profession: 'Empresária',
    phone: '(48) 99911-2233',
    bio: 'Buscando profissionais atenciosos e cuidadosos para embelezar meu lar.',
    isVerified: true
  },
  'mock_client_pedro': {
    uid: 'mock_client_pedro',
    name: 'Pedro Rocha',
    email: 'pedro.rocha@demo.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop',
    role: 'client',
    age: 31,
    city: 'Porto Alegre - RS',
    profession: 'Gerente Comercial',
    phone: '(51) 95544-3322',
    bio: 'Busco rapidez e pontualidade acima de tudo em obras e encanamento.',
    isVerified: true
  }
};

const INITIAL_MOCK_REQUESTS = [
  {
    id: 'mock_request_joao',
    clientId: 'mock_client_joao',
    clientName: 'João Silva',
    category: 'electric',
    description: 'Preciso de um eletricista qualificado para substituir o disjuntor principal, instalar 3 novas tomadas aterradas na cozinha e revisar toda a fiação elétrica da área de serviço para evitar curtos.',
    urgency: 'high',
    price: 350,
    date: '2026-05-22',
    address: 'Rua das Flores, 450 - Centro, Curitiba - PR',
    preferredTime: 'A partir das 12:23 (Período da Tarde)',
    propertyType: 'Residência',
    referencePoint: 'Próximo ao Marco Residencial / Praça principal',
    city: 'Curitiba - PR',
    status: 'pending'
  },
  {
    id: 'mock_request_tiago',
    clientId: 'mock_client_tiago',
    clientName: 'Tiago Souza',
    category: 'assembly',
    description: 'Preciso de um montador comprometido para realizar a montagem de um guarda-roupa de casal com 6 portas e 4 gavetas, além de fixar um painel de TV na parede de drywall da sala. É necessário ter ferramentas apropriadas.',
    urgency: 'normal',
    price: 280,
    date: '2026-05-23',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    preferredTime: '09:30 da manhã',
    propertyType: 'Apartamento',
    referencePoint: 'Ao lado do metrô Brigadeiro',
    city: 'São Paulo - SP',
    status: 'pending'
  },
  {
    id: 'mock_request_maria',
    clientId: 'mock_client_maria',
    clientName: 'Maria Oliveira',
    category: 'painting',
    description: 'Preciso de pintor experiente para preparar e pintar as paredes e o teto de 2 quartos em apartamento residencial. Exige proteção dos móveis, lixamento e duas demãos. Forneço toda a tinta.',
    urgency: 'normal',
    price: 450,
    date: '2026-05-25',
    address: 'Rua Bocaiúva, 1200 - Centro, Florianópolis - SC',
    preferredTime: 'A combinar (preferência de manhã)',
    propertyType: 'Apartamento',
    referencePoint: 'Próximo ao Shopping Beiramar',
    city: 'Florianópolis - SC',
    status: 'pending'
  },
  {
    id: 'mock_request_pedro',
    clientId: 'mock_client_pedro',
    clientName: 'Pedro Rocha',
    category: 'plumbing',
    description: 'Encanador profissional necessário para resolver um vazamento ativo no sifão sob a pia da cozinha e trocar a válvula de descarga Hydra do banheiro social (está vazando direto).',
    urgency: 'critical',
    price: 220,
    date: '2026-05-21',
    address: 'Rua Padre Chagas, 340 - Moinhos de Vento, Porto Alegre - RS',
    preferredTime: 'Imediato / Qualquer horário',
    propertyType: 'Apartamento',
    referencePoint: 'Frente ao restaurante Peppo',
    city: 'Porto Alegre - RS',
    status: 'pending'
  }
];

function enrichRequestForPro(job: any) {
  if (!job) return job;
  // We can hash the job ID to get deterministic simulated values if they don't exist
  const idHash = job.id ? job.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 100;
  
  const simulatedDistance = parseFloat((((idHash % 35) + 5) / 10).toFixed(1)); // between 0.5 and 3.9 km
  
  const propertyTypes = ["Residência", "Apartamento", "Condomínio", "Sobrado", "Sala Comercial"];
  const simulatedPropertyType = propertyTypes[idHash % propertyTypes.length];
  
  const referencePoints = ["Próximo ao Marco residencial", "Frente à pracinha principal", "Ao lado do supermercado de bairro", "Próximo à escola", "Duas quadras após o posto de gasolina"];
  const simulatedReferencePoint = referencePoints[idHash % referencePoints.length];
  
  const hours = ["12:23", "08:30", "10:15", "11:00", "14:45", "16:00", "18:30"];
  const simulatedPreferredTime = hours[idHash % hours.length];

  const cities = ["Curitiba - PR", "São Paulo - SP", "Florianópolis - SC", "Porto Alegre - RS", "Rio de Janeiro - RJ"];
  const simulatedCity = cities[idHash % cities.length];

  return {
    ...job,
    distance: job.distance !== undefined ? job.distance : simulatedDistance,
    preferredTime: job.preferredTime || simulatedPreferredTime,
    propertyType: job.propertyType || simulatedPropertyType,
    referencePoint: job.referencePoint || simulatedReferencePoint,
    city: job.city || simulatedCity,
  };
}

interface ClientEditRequestFormProps {
  initialData: any;
  onSave: (fields: any) => Promise<void>;
  selectedRequest: any;
  handleCancelRequest: (req: any) => Promise<void>;
  handleRecoverRequest: (req: any) => Promise<void>;
  onClose: () => void;
}

function ClientEditRequestForm({
  initialData,
  onSave,
  selectedRequest,
  handleCancelRequest,
  handleRecoverRequest,
  onClose
}: ClientEditRequestFormProps) {
  const [category, setCategory] = useState(initialData.category || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [date, setDate] = useState(initialData.date || '');
  const [urgency, setUrgency] = useState(initialData.urgency || 'normal');
  const [price, setPrice] = useState(
    initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : ''
  );
  const [preferredTime, setPreferredTime] = useState(initialData.preferredTime || '');
  const [propertyType, setPropertyType] = useState(initialData.propertyType || '');
  const [referencePoint, setReferencePoint] = useState(initialData.referencePoint || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        category,
        description,
        address,
        date,
        urgency,
        price: Number(price) || 0,
        preferredTime,
        propertyType,
        referencePoint
      });
      onClose();
    } catch (err) {
      console.error("Erro ao salvar alterações no formulário:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
      await handleCancelRequest(selectedRequest);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRecoverClick = async () => {
    setIsRecovering(true);
    try {
      await handleRecoverRequest(selectedRequest);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Detalhes & Modificação do Pedido</h3>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Editando seu Pedido
          </div>
        </div>

        <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-left text-xs font-medium text-amber-800 flex items-start gap-2.5 mb-6">
          <span className="text-base select-none">💡</span>
          <p className="leading-relaxed">
            Modifique qualquer informação do seu pedido diretamente nos campos abaixo. Suas alterações serão salvas ao clicar em <strong>"Salvar Alterações e Fechar"</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categoria */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Categoria</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Urgência */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Urgência</label>
            <div className="flex gap-2">
              {[
                { id: 'normal', name: 'Normal' },
                { id: 'urgente', name: 'Urgente' }
              ].map(urg => (
                <button
                  key={urg.id}
                  type="button"
                  onClick={() => setUrgency(urg.id)}
                  className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-colors ${
                    urgency === urg.id 
                      ? 'bg-[#FBBF24]/10 border-[#FBBF24] text-[#FBBF24]' 
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {urg.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quando (Data/Hora) */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Quando (Data e Horário)</label>
            <input 
              type="text" 
              placeholder="Ex: Amanhã às 14h, Sábado de manhã"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
            />
          </div>

          {/* Preço Proposto / Médio */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Preço Estimado (R$)</label>
            <input 
              type="number" 
              placeholder="Ex: 150"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Endereço de Realização</label>
          <input 
            type="text" 
            placeholder="Insira o endereço completo..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
          />
        </div>

        {/* Horário, Tipo de Imóvel e Ponto de Referência */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left font-sans">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans">Horário Preferencial</label>
            <input 
              type="text" 
              placeholder="Ex: 14:30"
              maxLength={5}
              value={preferredTime}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                let formatted = digits;
                if (digits.length > 2) {
                  formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
                }
                setPreferredTime(formatted);
              }}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
            />
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm font-sans">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans">Tipo de Imóvel</label>
            <select 
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm font-sans text-zinc-800"
            >
              <option value="">Selecione...</option>
              <option value="Residência">Residência (Casa)</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Condomínio-Sobrado">Condomínio / Sobrado</option>
              <option value="Comercial">Sala Comercial</option>
              <option value="Outro">Outro Imóvel</option>
            </select>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm font-sans">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans font-sans">Ponto de Referência</label>
            <input 
              type="text" 
              placeholder="Ex: Perto do Marco"
              value={referencePoint}
              onChange={(e) => setReferencePoint(e.target.value)}
              className="w-full p-3 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none font-bold text-sm text-zinc-800"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-zinc-950 text-white p-6 rounded-[32px] text-left border border-zinc-800 font-sans">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1.5 font-sans font-sans">Descrição da Necessidade</label>
          <textarea
            rows={4}
            placeholder="Descreva exatamente o que precisa..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-4 bg-zinc-900 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-zinc-850 outline-none text-white text-sm font-medium leading-relaxed resize-none"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col w-full gap-4 pt-6 border-t border-zinc-100 font-sans">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#FBBF24] text-white py-5 rounded-2xl font-bold text-lg hover:gradient-to-r hover:bg-yellow-500 hover:scale-[1.01] transition-all shadow-xl shadow-[#FBBF24]/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações e Fechar'}
        </button>

        {selectedRequest.status !== 'cancelled' && selectedRequest.status !== 'completed' && (
          <button 
            type="button"
            onClick={handleCancelClick}
            disabled={isCancelling}
            className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold text-lg hover:bg-red-100 transition-all border-2 border-red-100 disabled:opacity-50"
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar este Pedido'}
          </button>
        )}

        {selectedRequest.status === 'cancelled' && (
          <button 
            type="button"
            onClick={handleRecoverClick}
            disabled={isRecovering}
            className="w-full bg-[#FBBF24] text-white py-4 rounded-2xl font-bold text-lg hover:bg-yellow-500 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#FBBF24]/20 disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5" /> {isRecovering ? 'Recuperando...' : 'Recuperar este Pedido'}
          </button>
        )}

        <button 
          type="button"
          onClick={onClose}
          className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl"
        >
          Fechar Sem Salvar
        </button>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // State for professional reviews and modal
  const [proReviews, setProReviews] = useState<Record<string, Array<{ id: string, author: string, rating: number, date: string, comment: string }>>>({
    'Ricardo Silva': [
      { id: '1', author: 'Mariana Souza', rating: 5, date: 'há 3 dias', comment: 'Excelente profissional! Chegou no horário combinado, identificou o curto rapidamente e resolveu o problema com muita segurança.' },
      { id: '2', author: 'João Pedro', rating: 4.5, date: 'há 2 semanas', comment: 'Muito educado e atencioso. Explicou todo o procedimento do reparo nos disjuntores e cobrou um preço muito justo.' },
      { id: '3', author: 'Cláudia R.', rating: 5, date: 'há 1 mês', comment: 'Serviço impecável na instalação de luminárias e tomadas novas. Super limpo e cuidadoso. Recomendo muito!' }
    ],
    'Ana Paula': [
      { id: '1', author: 'Beatriz Lima', rating: 5, date: 'há 1 dia', comment: 'A Ana é maravilhosa! Deixou meu apartamento brilhando, super cheiroso. Muito caprichosa nos detalhes da cozinha e banheiro.' },
      { id: '2', author: 'Carlos Eduardo', rating: 5, date: 'há 1 semana', comment: 'Limpeza residencial impecável! Super pontual, confiável e rápida. Com certeza contratarei novamente para as próximas limpezas.' },
      { id: '3', author: 'Patrícia M.', rating: 5, date: 'há 3 semanas', comment: 'Melhor diarista que já contratei pelo aplicativo. Muito atenciosa, cuidadosa com os móveis e extremamente profissional.' }
    ],
    'Felipe M.': [
      { id: '1', author: 'Roberto F.', rating: 5, date: 'há 5 dias', comment: 'Pintura impecável e sem nenhuma sujeira! Felipe cobriu tudo com muito cuidado antes de iniciar e o acabamento das portas ficou perfeito.' },
      { id: '2', author: 'Aline Costa', rating: 4.5, date: 'há 2 semanas', comment: 'Muito profissional e entregou a pintura da sala bem antes do prazo estimado. Super recomendo o trabalho dele.' },
      { id: '3', author: 'Lucas G.', rating: 4, date: 'há 1 mês', comment: 'Bom trabalho de pintura interna. Tivemos um pequeno atraso no início devido ao trânsito, mas o resultado final compensou muito.' }
    ],
    'Juliana Costa': [
      { id: '1', author: 'Fernando Dias', rating: 5, date: 'há 2 dias', comment: 'Juliana resolveu um vazamento crítico na tubulação da cozinha que outros dois profissionais não tinham conseguido achar. Sensacional!' },
      { id: '2', author: 'Sandra Helena', rating: 5, date: 'há 10 dias', comment: 'Rápida, prestativa e muito competente. Trocou todo o encanamento antigo do banheiro com perfeição e sem vazamentos.' },
      { id: '3', author: 'Marcos Tulio', rating: 4.8, date: 'há 1 mês', comment: 'Excelente atendimento. Diagnosticou o problema na caixa d\'água rapidamente e cobrou valor justo.' }
    ],
    'Marcos Santos': [
      { id: '1', author: 'Gabriel S.', rating: 5, date: 'há 4 dias', comment: 'Montou um guarda-roupa enorme de 6 portas em tempo recorde! Ficou super firme, alinhado e perfeito.' },
      { id: '2', author: 'Teresa Cristina', rating: 4.5, date: 'há 1 semana', comment: 'Profissional extremamente educado, trouxe todas as ferramentas adequadas e limpou toda a poeira e papelão depois da montagem do rack. Nota 10!' },
      { id: '3', author: 'Arthur Moreira', rating: 4.5, date: 'há 2 semanas', comment: 'Montagem de painel de TV rápida e bem alinhada. Muito amigável e prestativo.' }
    ]
  });

  const [selectedProForReviews, setSelectedProForReviews] = useState<any>(null);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  // Custom states for direct communication and multi-attachments
  const [expandedInteressados, setExpandedInteressados] = useState<Record<string, boolean>>({});
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [isSendingBudget, setIsSendingBudget] = useState(false);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [attachmentImage, setAttachmentImage] = useState('');
  const [budgetPrice, setBudgetPrice] = useState('');
  const [budgetDesc, setBudgetDesc] = useState('');
  const [budgetDuration, setBudgetDuration] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [view, setView] = useState<'home' | 'request' | 'pro-onboarding' | 'success' | 'dashboard-client' | 'dashboard-pro' | 'login'>('home');
  const [requestOriginView, setRequestOriginView] = useState<'home' | 'request' | 'pro-onboarding' | 'success' | 'dashboard-client' | 'dashboard-pro' | 'login'>('home');
  const [successType, setSuccessType] = useState<'request' | 'pro'>('request');
  const [activeTab, setActiveTab] = useState<'feed' | 'history' | 'profile' | 'requests' | 'chat' | 'reviews'>('feed');
  const [emailInput, setEmailInput] = useState('');
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'exists' | 'not_found'>('idle');
  const [loginError, setLoginError] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPreferredTime, setEditPreferredTime] = useState('');
  const [editPropertyType, setEditPropertyType] = useState('');
  const [editReferencePoint, setEditReferencePoint] = useState('');
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [dbChats, setDbChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [mockRequests, setMockRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem('homehelp_mock_requests');
    return saved ? JSON.parse(saved) : INITIAL_MOCK_REQUESTS;
  });

  const [mockChats, setMockChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('homehelp_mock_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const [mockMessages, setMockMessages] = useState<{ [chatId: string]: any[] }>(() => {
    const saved = localStorage.getItem('homehelp_mock_messages');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('homehelp_mock_requests', JSON.stringify(mockRequests));
  }, [mockRequests]);

  useEffect(() => {
    localStorage.setItem('homehelp_mock_chats', JSON.stringify(mockChats));
  }, [mockChats]);

  useEffect(() => {
    localStorage.setItem('homehelp_mock_messages', JSON.stringify(mockMessages));
  }, [mockMessages]);

  const simulateClientResponse = (chatId: string, userMsgText: string, type: string, meta: any) => {
    setTimeout(() => {
      const chat = mockChats.find(c => c.id === chatId);
      const clientName = chat ? chat.clientName.split(' ')[0] : 'Cliente';
      
      let replyText = "Entendido! Muito obrigado pelo retorno. Vamos acertar os detalhes?";
      
      if (type === 'budget') {
        replyText = `Nossa, ótimo! O valor de R$ ${meta?.price} está super dentro do planejado. Quando você teria disponibilidade para vir realizar o serviço?`;
      } else if (type === 'location') {
        replyText = "Perfeito, já localizei aqui! É bem fácil de chegar.";
      } else {
        const text = userMsgText.toLowerCase();
        if (text.includes('olá') || text.includes('ola') || text.includes('bom dia') || text.includes('boa tarde')) {
          replyText = `Olá! Tudo bem? Muito obrigado pelo contato. Vi que você aceitou meu pedido para o serviço de ${chat?.category === 'electric' ? 'eletricista' : chat?.category === 'painting' ? 'pintor' : chat?.category === 'plumbing' ? 'encanador' : 'montador'}. Qual seria sua disponibilidade?`;
        } else if (text.includes('preço') || text.includes('valor') || text.includes('quanto cobras') || text.includes('orçamento')) {
          replyText = `Pode me mandar uma proposta formal de orçamento por aqui? Assim eu já aprovo direto pelo aplicativo!`;
        } else if (text.includes('endereço') || text.includes('onde fica') || text.includes('local')) {
          replyText = `O endereço certinho é ${chat?.description?.includes('flores') ? 'Rua das Flores, 450 - Centro' : 'no local indicado nas especificações'}. Próximos ao ponto de referência!`;
        } else if (text.includes('amanhã') || text.includes('hoje') || text.includes('segunda') || text.includes('terça') || text.includes('quarta') || text.includes('combinar')) {
          replyText = `Combinado! Esse dia e horário ficam ótimos para mim. Estarei te aguardando!`;
        } else {
          replyText = `Excelente, ${clientName} agradece a atenção! Vamos combinando os detalhes adicionais do serviço para fechar com chave de ouro!`;
        }
      }

      const replyMsg = {
        id: `msg_reply_${Date.now()}`,
        senderId: chat?.clientId || 'mock_client_id',
        text: replyText,
        type: 'text',
        meta: null,
        createdAt: new Date().toISOString()
      };

      setMockMessages(prev => {
        const currentMsgs = prev[chatId] || [];
        return { ...prev, [chatId]: [...currentMsgs, replyMsg] };
      });

      setMockChats(prev => prev.map(c => c.id === chatId ? {
        ...c,
        lastMessage: replyText,
        lastMessageAt: { toDate: () => new Date() },
        lastSenderId: chat?.clientId || 'mock_client_id',
        unread: true
      } : c));

    }, 1500);
  };

  const chats = useMemo(() => {
    const list = [...dbChats];
    mockChats.forEach(mc => {
      if (!list.some(c => c.id === mc.id)) {
        list.push(mc);
      }
    });
    return list.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : new Date(a.lastMessageAt || 0).getTime();
      const bTime = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : new Date(b.lastMessageAt || 0).getTime();
      return bTime - aTime;
    });
  }, [dbChats, mockChats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // refresh every 1 second
    return () => clearInterval(timer);
  }, []);



  const [dbProStats, setDbProStats] = useState({ earnings: 0, jobsCount: 0, rating: 5.0 });

  const proStats = useMemo(() => {
    const completedMockJobs = mockRequests.filter(j => j.proId === user?.uid && j.status === 'completed');
    const mockEarnings = completedMockJobs.reduce((sum, j) => sum + (Number(j.price) || 0), 0);
    return {
      earnings: dbProStats.earnings + mockEarnings,
      jobsCount: dbProStats.jobsCount + completedMockJobs.length,
      rating: 5.0
    };
  }, [dbProStats, mockRequests, user?.uid]);
  const [proFilter, setProFilter] = useState<'all' | 'near' | 'rating' | 'jobs'>('all');

  const ALL_PROS = useMemo(() => {
    const rawPros = [
      { name: 'Ricardo Silva', jobs: 120, cat: 'Elétrica', catId: 'eletrica', img: '12', distance: 1.2, highlight: 'Mais Próximo de Você 📍', desc: 'Especialista em reparos de disjuntores, fiação estruturada de disjuntores e curtos.' },
      { name: 'Ana Paula', jobs: 85, cat: 'Limpeza', catId: 'limpeza', img: '32', distance: 2.5, highlight: 'Nota Máxima ⭐ 5.0', desc: 'Limpeza residencial profunda com capricho especial e organização impecável.' },
      { name: 'Felipe M.', jobs: 45, cat: 'Pintura', catId: 'pintura', img: '45', distance: 0.8, highlight: 'Super Rápido & Atencioso 🎨', desc: 'Pintura residencial interna, portas e acabamentos finos de alta qualidade.' },
      { name: 'Juliana Costa', jobs: 195, cat: 'Hidráulica', catId: 'hidraulica', img: '47', distance: 1.9, highlight: 'Recordista de Serviços 🏆', desc: 'Instalação e conserto de encanamentos, torneiras, registros e vazamentos em geral.' },
      { name: 'Marcos Santos', jobs: 60, cat: 'Montagem', catId: 'montagem', img: '68', distance: 0.5, highlight: 'Mais Perto no Bairro 📍 (0.5 km)', desc: 'Montagem e desmontagem de móveis de todos os portes com extrema agilidade.' },
    ];

    return rawPros.map(pro => {
      const reviews = proReviews[pro.name] || [];
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const calculatedRating = reviews.length > 0 ? totalRating / reviews.length : 5.0;
      return {
        ...pro,
        rating: calculatedRating,
        reviewsCount: reviews.length
      };
    });
  }, [proReviews]);

  const filteredPros = useMemo(() => {
    const list = [...ALL_PROS];
    if (proFilter === 'near') {
      return list.sort((a, b) => a.distance - b.distance);
    } else if (proFilter === 'rating') {
      return list.sort((a, b) => b.rating - a.rating);
    } else if (proFilter === 'jobs') {
      return list.sort((a, b) => b.jobs - a.jobs);
    }
    return list;
  }, [proFilter, ALL_PROS]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    urgency: 'normal',
    price: '',
    date: '',
    address: '',
    phone: '',
    age: '',
    city: '',
    profession: '',
    avatar: '',
    preferredTime: '',
    propertyType: '',
    referencePoint: '',
    // Professional specifics
    fullName: '',
    experienceYears: '',
    bio: '',
    verified: false,
    email: '',
  });

  const [proSortBy, setProSortBy] = useState<'distance' | 'recent'>('distance');
  const [onlyMyServices, setOnlyMyServices] = useState<boolean>(true);
  const [proRealizedCategories, setProRealizedCategories] = useState<string[]>(['cleaning', 'electric', 'plumbing', 'painting', 'assembly']);

  const combinedAvailableRequests = useMemo(() => {
    const list = [...availableRequests];
    mockRequests.forEach(mr => {
      if (mr.status === 'pending' && !list.some(r => r.id === mr.id)) {
        list.push(mr);
      }
    });
    return list;
  }, [availableRequests, mockRequests]);

  const processedAvailableRequests = useMemo(() => {
    let list = combinedAvailableRequests.map(job => enrichRequestForPro(job));
    
    // Filter by services they realize (if onlyMyServices is active)
    if (onlyMyServices) {
      list = list.filter(job => proRealizedCategories.includes(job.category));
    }
    
    // Sort
    if (proSortBy === 'distance') {
      list.sort((a, b) => a.distance - b.distance);
    } else {
      // By newest/recent
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    }
    
    return list;
  }, [combinedAvailableRequests, onlyMyServices, proRealizedCategories, proSortBy]);

  const [userProfile, setUserProfile] = useState({
    name: 'Convidado',
    profession: 'Não informada',
    age: '---',
    city: 'Não informada',
    phone: '(00) 00000-0000',
    email: 'email@exemplo.com',
    bio: 'Olá! Estou explorando o homehelp.',
    avatar: 'https://i.pravatar.cc/150?img=12',
    role: 'client'
  });

  const combinedMyRequests = useMemo(() => {
    if (userProfile?.role === 'pro') {
      const list = [...myRequests];
      mockRequests.forEach(mr => {
        if (mr.status !== 'pending' && mr.proId === user?.uid && !list.some(r => r.id === mr.id)) {
          list.push(mr);
        }
      });
      return list;
    }
    return myRequests;
  }, [myRequests, mockRequests, userProfile?.role, user?.uid]);

  const visibleRequests = useMemo(() => {
    return combinedMyRequests.filter(req => {
      if (req.status === 'cancelled') {
        const cancelledTime = req.cancelledAt?.toDate 
          ? req.cancelledAt.toDate() 
          : (req.updatedAt?.toDate ? req.updatedAt.toDate() : null);
        if (cancelledTime) {
          const diffMs = currentTime.getTime() - cancelledTime.getTime();
          const diffMins = diffMs / (1000 * 60);
          return diffMins <= 20;
        }
      }
      return true;
    });
  }, [combinedMyRequests, currentTime]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderExamples = [
    "Limpeza de sofá",
    "Reparo elétrico",
    "Pintura de sala",
    "Conserto de torneira",
    "Montagem de guarda-roupa",
    "Limpeza pós-obra"
  ];

  useEffect(() => {
    if (userProfile && userProfile.role === 'pro' && userProfile.profession && userProfile.profession !== 'Não informada') {
      const profLower = userProfile.profession.toLowerCase();
      const matched: string[] = [];
      if (profLower.includes('limp') || profLower.includes('clean') || profLower.includes('diar')) matched.push('cleaning');
      if (profLower.includes('elét') || profLower.includes('elect') || profLower.includes('fiação') || profLower.includes('luz')) matched.push('electric');
      if (profLower.includes('hidr') || profLower.includes('plumb') || profLower.includes('vaza') || profLower.includes('encan') || profLower.includes('torne')) matched.push('plumbing');
      if (profLower.includes('pint') || profLower.includes('paint')) matched.push('painting');
      if (profLower.includes('mont') || profLower.includes('assembl') || profLower.includes('móve') || profLower.includes('move')) matched.push('assembly');
      
      if (matched.length > 0) {
        setProRealizedCategories(matched);
      } else {
        setProRealizedCategories(['cleaning', 'electric', 'plumbing', 'painting', 'assembly']);
      }
    }
  }, [userProfile.profession, userProfile?.role]);



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
        
        if (userDoc && userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            name: data.name || 'Convidado',
            profession: data.profession || 'Não informada',
            age: data.age || '---',
            city: data.city || 'Não informada',
            phone: data.phone || '(00) 00000-0000',
            email: data.email || firebaseUser.email || '',
            bio: data.bio || 'Olá! Estou explorando o homehelp.',
            avatar: firebaseUser.photoURL || 'https://i.pravatar.cc/150?img=12',
            role: data.role || 'client'
          });
          // Redirect based on role if logged in via button
          if (view === 'login') {
            setView(data.role === 'pro' ? 'dashboard-pro' : 'dashboard-client');
          }
        }

        // Fetch user's requests if in client dashboard
        if (view === 'dashboard-client') {
          const q = query(
            collection(db, 'requests'),
            where('clientId', '==', firebaseUser.uid),
            orderBy('createdAt', 'desc')
          );
          const unsubRequests = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMyRequests(requests);
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'requests'));
          return () => unsubRequests();
        }

        // Fetch available requests and pro stats for professionals
        if (view === 'dashboard-pro' && userProfile.role === 'pro') {
          // Available jobs feed
          const qAvailable = query(
            collection(db, 'requests'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
          );
          const unsubAvailable = onSnapshot(qAvailable, (snapshot) => {
            setAvailableRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'requests'));

          // Pro's own jobs (history/agenda)
          const qMyJobs = query(
            collection(db, 'requests'),
            where('proId', '==', firebaseUser.uid),
            orderBy('createdAt', 'desc')
          );
          const unsubMyJobs = onSnapshot(qMyJobs, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            setMyRequests(jobs);
            
            // Calculate real-time stats
            const completed = jobs.filter(j => j.status === 'completed');
            const totalEarnings = completed.reduce((sum, j) => sum + (Number(j.price) || 0), 0);
            setDbProStats({
              earnings: totalEarnings,
              jobsCount: completed.length,
              rating: 5.0 // Placeholder until reviews exist
            });
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'requests'));

          return () => {
            unsubAvailable();
            unsubMyJobs();
          };
        }

        // Fetch chats for current user
        const qChats = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', firebaseUser.uid),
          orderBy('lastMessageAt', 'desc')
        );
        const unsubChats = onSnapshot(qChats, (snapshot) => {
          setDbChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));

        return () => unsubChats();
      } else {
        setUser(null);
        setDbChats([]);
        setMessages([]);
      }
      setLoading(false);
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
    }, 3000);

    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, [view]);

  useEffect(() => {
    if (!selectedChat?.id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat.id}/messages`));

    // Mark as read if selected chat has unread messages sent by the other participant
    if (selectedChat.unread === true && selectedChat.lastSenderId !== user?.uid) {
      const chatRef = doc(db, 'chats', selectedChat.id);
      updateDoc(chatRef, { unread: false }).catch(err => console.error("Error marking chat as read:", err));
    }

    return () => unsubscribe();
  }, [selectedChat?.id, selectedChat?.unread, selectedChat?.lastSenderId, user?.uid]);

  const handleCheckEmail = async (intendedAction: 'login' | 'register') => {
    if (!emailInput || !emailInput.includes('@')) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }

    setEmailCheckStatus('checking');
    setLoginError('');
    try {
      const q = query(collection(db, 'users'), where('email', '==', emailInput.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      const exists = !querySnapshot.empty;
      
      if (intendedAction === 'login') {
        if (exists) {
          setEmailCheckStatus('exists');
          // When found, we trigger the login flow. 
          // We'll use a placeholder role that will be corrected by the DB fetch inside handleLogin
          handleLogin('client'); 
        } else {
          setEmailCheckStatus('idle');
          setLoginError('Este e-mail não está cadastrado no sistema.');
        }
      } else if (intendedAction === 'register') {
        if (exists) {
          setEmailCheckStatus('idle');
          setLoginError('Este e-mail já possui cadastro. Use a opção Entrar.');
        } else {
          setEmailCheckStatus('not_found');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setEmailCheckStatus('idle');
    }
  };

  const handleLogin = async (role: 'client' | 'pro') => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: emailInput });
      
      const result = await signInWithPopup(auth, provider);
      const { user: fbUser } = result;

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const initialProfile = {
          uid: fbUser.uid,
          name: userProfile.name !== 'Convidado' ? userProfile.name : (fbUser.displayName || 'Usuário'),
          email: fbUser.email,
          avatar: fbUser.photoURL,
          role,
          age: userProfile.age !== '---' ? userProfile.age : '',
          city: userProfile.city !== 'Não informada' ? userProfile.city : (formData.city || ''),
          profession: userProfile.profession || '',
          phone: userProfile.phone !== '(00) 00000-0000' ? userProfile.phone : '',
          bio: userProfile.bio !== 'Olá! Estou explorando o homehelp.' ? userProfile.bio : '',
          isVerified: false,
          createdAt: serverTimestamp()
        };

        try {
          await setDoc(userDocRef, initialProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
        }
        
        setUserProfile({
          ...userProfile,
          ...initialProfile,
          role
        } as any);
      } else {
        const data = userDoc.data();
        setUserProfile({
          name: data.name || 'Convidado',
          profession: data.profession || 'Não informada',
          age: data.age || '---',
          city: data.city || 'Não informada',
          phone: data.phone || '(00) 00000-0000',
          email: data.email || fbUser.email || '',
          bio: data.bio || 'Olá! Estou explorando o homehelp.',
          avatar: data.avatar || fbUser.photoURL || 'https://i.pravatar.cc/150?img=12',
          role: data.role || role
        });
      }
      
      setView(userProfile.role === 'pro' ? 'dashboard-pro' : 'dashboard-client');
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao entrar. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
    setMyRequests([]);
    setAvailableRequests([]);
    setDbProStats({ earnings: 0, jobsCount: 0, rating: 5.0 });
    setUserProfile({
      name: 'Convidado',
      profession: 'Não informada',
      age: '---',
      city: 'Não informada',
      phone: '(00) 00000-0000',
      email: 'email@exemplo.com',
      bio: 'Olá! Estou explorando o homehelp.',
      avatar: 'https://i.pravatar.cc/150?img=12',
      role: 'client'
    });
  };

  const handleOpenDetails = async (request: any) => {
    const enriched = enrichRequestForPro(request);
    setSelectedRequest(enriched);
    setIsEditingRequest(false);
    setEditCategory(enriched.category || '');
    setEditDescription(enriched.description || '');
    setEditAddress(enriched.address || '');
    setEditDate(enriched.date || '');
    setEditUrgency(enriched.urgency || 'normal');
    setEditPrice((enriched.price !== undefined && enriched.price !== null) ? String(enriched.price) : '');
    setEditPreferredTime(enriched.preferredTime || '');
    setEditPropertyType(enriched.propertyType || '');
    setEditReferencePoint(enriched.referencePoint || '');
    setClientProfile(null);
    if (enriched.clientId.startsWith('mock_client_')) {
      const mockClient = (MOCK_CLIENTS as any)[enriched.clientId] || null;
      setClientProfile(mockClient);
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', enriched.clientId));
      if (userDoc.exists()) {
        setClientProfile(userDoc.data());
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${enriched.clientId}`);
    }
  };

  const handleSaveRequestChanges = async (directFields?: any) => {
    if (!selectedRequest) return;
    try {
      const updatedFields = directFields || {
        category: editCategory,
        description: editDescription,
        address: editAddress,
        date: editDate,
        urgency: editUrgency,
        price: Number(editPrice) || 0,
        preferredTime: editPreferredTime,
        propertyType: editPropertyType,
        referencePoint: editReferencePoint
      };

      if (selectedRequest.id.startsWith('mock_')) {
        setMockRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, ...updatedFields } : r));
        setSelectedRequest((prev: any) => ({
          ...prev,
          ...updatedFields
        }));
        setIsEditingRequest(false);
        console.log('Pedido atualizado com sucesso (Mock)!');
        return;
      }

      const docRef = doc(db, 'requests', selectedRequest.id);
      await updateDoc(docRef, {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
      
      setSelectedRequest((prev: any) => ({
        ...prev,
        ...updatedFields
      }));
      setIsEditingRequest(false);
      console.log('Pedido atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${selectedRequest.id}`);
    }
  };

  const handleCancelRequest = async (request: any) => {
    if (!request) return;
    const isOwner = request.clientId === user?.uid;
    const isAssignedPro = request.proId === user?.uid;

    if (!isOwner && !isAssignedPro && !request.id.startsWith('mock_')) {
      console.warn('Attempted to cancel request with insufficient permissions', { requestId: request.id, userId: user?.uid });
      return;
    }

    try {
      if (request.id.startsWith('mock_')) {
        if (isOwner) {
          setMockRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'cancelled' } : r));
        } else {
          setMockRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'pending', proId: null } : r));
        }
        setSelectedRequest(null);
        return;
      }
      const docRef = doc(db, 'requests', request.id);
      try {
        if (isOwner) {
          // Client cancels everything
          await updateDoc(docRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('Pedido cancelado com sucesso.');
        } else {
          // Pro releases the job back to pending
          await updateDoc(docRef, {
            status: 'pending',
            proId: deleteField(),
            updatedAt: serverTimestamp()
          });
          console.log('Desistência do trabalho concluída.');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}`);
      }
      setSelectedRequest(null);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  const handleRecoverRequest = async (request: any) => {
    if (!request) return;
    try {
      if (request.id.startsWith('mock_')) {
        setMockRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'pending', cancelledAt: null } : r));
        setSelectedRequest(null);
        console.log('Pedido recuperado com sucesso (Mock).');
        return;
      }
      const docRef = doc(db, 'requests', request.id);
      try {
        await updateDoc(docRef, {
          status: 'pending',
          cancelledAt: deleteField(),
          updatedAt: serverTimestamp()
        });
        console.log('Pedido recuperado com sucesso.');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}`);
      }
      setSelectedRequest(null);
    } catch (error) {
      console.error('Erro ao recuperar:', error);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string, additionalData = {}) => {
    if (requestId.startsWith('mock_')) {
      setMockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus, ...additionalData } : r));
      console.log(`[Mock] Status atualizado para: ${newStatus}`);
      return;
    }
    try {
      const docRef = doc(db, 'requests', requestId);
      await updateDoc(docRef, {
        status: newStatus,
        ...additionalData,
        updatedAt: serverTimestamp()
      });
      console.log(`Status atualizado para: ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    // Validar se o endereço de e-mail foi inserido
    if (!formData.email || !formData.email.trim()) {
      alert("Por favor, insira o endereço de e-mail.");
      return;
    }
    
    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      alert("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updateData = {
        name: formData.fullName !== undefined ? formData.fullName : userProfile.name,
        email: formData.email.trim(),
        age: formData.age !== undefined ? formData.age : userProfile.age,
        city: formData.city !== undefined ? formData.city : userProfile.city,
        profession: formData.profession !== undefined ? formData.profession : userProfile.profession,
        phone: formData.phone !== undefined ? formData.phone : userProfile.phone,
        bio: formData.bio !== undefined ? formData.bio : userProfile.bio,
        avatar: formData.avatar !== undefined ? formData.avatar : userProfile.avatar,
        updatedAt: serverTimestamp()
      };
      
      // Use setDoc with merge: true to ensure it works even if doc doesn't exist
      await setDoc(userDocRef, updateData, { merge: true });
      
      // Update local state without the Firestore FieldValue
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updatedAt, ...localData } = updateData;
      setUserProfile(prev => ({
        ...prev,
        ...localData
      }));
      
      setIsEditingProfile(false);
      // We'll use a silent success or a non-blocking feedback
      console.log('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Houve um erro ao salvar as alterações. Por favor, tente novamente.');
    }
  };

  const handleStartChat = async (job: any, proIdFromClient?: string) => {
    if (!user) return alert('Faça login para conversar.');
    
    try {
      const isClient = userProfile.role === 'client';
      const proId = isClient ? (proIdFromClient || job.proId) : user.uid;
      const clientId = job.clientId;

      if (job.id.startsWith('mock_')) {
        const chatId = `${job.id}_${proId}`;
        const existingChat = mockChats.find(c => c.id === chatId);
        
        if (!existingChat) {
          const clientName = job.clientName || 'Cliente';
          const chatData = {
            id: chatId,
            participants: [user.uid, clientId],
            requestId: job.id,
            lastMessage: 'Conversa iniciada',
            lastMessageAt: { toDate: () => new Date() },
            clientName,
            proName: userProfile.name || 'Profissional',
            category: job.category || 'Serviço',
            status: 'active',
            proId,
            clientId,
            price: job.price,
            description: job.description
          };
          
          setMockChats(prev => {
            if (prev.some(c => c.id === chatId)) return prev;
            return [chatData, ...prev];
          });
          
          const welcomeMsg = {
            id: `msg_welcome_${Date.now()}`,
            senderId: clientId,
            text: `Olá, sou ${clientName}! Obrigado por se interessar no meu pedido de ${getPortugueseCategorySubject(job.category, '')}. Gostaria de alinhar os detalhes do serviço!`,
            type: 'text',
            meta: null,
            createdAt: new Date().toISOString()
          };
          setMockMessages(prev => ({
            ...prev,
            [chatId]: [welcomeMsg]
          }));
          
          setSelectedChat(chatData);
        } else {
          setSelectedChat(existingChat);
        }
        
        setActiveTab('chat');
        return;
      }

      if (!proId) {
        if (isClient) {
          // If client clicks chat on a pending job, maybe we should show the details modal instead
          // or a "no messages yet" if no pro reached out.
          handleOpenDetails(job);
          return;
        }
        return;
      }

      const chatId = `${job.id}_${proId}`;
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (!chatDoc.exists()) {
        const otherParticipantId = isClient ? proId : clientId;

        // Fetch names to make the chat list more readable
        let clientName = job.clientName || 'Cliente';
        let proName = 'Profissional';

        const [clientDoc, proDoc] = await Promise.all([
          getDoc(doc(db, 'users', clientId)),
          getDoc(doc(db, 'users', proId))
        ]);

        if (clientDoc.exists()) clientName = clientDoc.data().name || clientName;
        if (proDoc.exists()) proName = proDoc.data().name || proName;

        const chatData = {
          participants: [user.uid, otherParticipantId],
          requestId: job.id,
          lastMessage: 'Conversa iniciada',
          lastMessageAt: serverTimestamp(),
          clientName,
          proName,
          category: job.category || 'Serviço',
          status: 'active',
          proId,
          clientId,
          price: job.price,
          description: job.description
        };
        
        await setDoc(chatDocRef, chatData);
        setSelectedChat({ id: chatId, ...chatData });
      } else {
        setSelectedChat({ id: chatId, ...chatDoc.data() });
      }
      setActiveTab('chat');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${job.id}`);
    }
  };

  const handleSendMessage = async (customMsg?: { text: string; type?: string; meta?: any }) => {
    const textToSend = customMsg ? customMsg.text : newMessage.trim();
    if (!textToSend && !customMsg) return;
    if (!selectedChat?.id || !user) return;

    try {
      const type = customMsg?.type || 'text';
      const meta = customMsg?.meta || null;
      
      const messageData = {
        senderId: user.uid,
        text: textToSend,
        type,
        meta,
        createdAt: serverTimestamp()
      };
      
      if (selectedChat.id.startsWith('mock_')) {
        const localMessageData = {
          ...messageData,
          createdAt: { toDate: () => new Date() }
        };
        
        const newMsg = {
          id: `msg_${Date.now()}`,
          ...localMessageData
        };
        
        setMockMessages(prev => {
          const currentMsgs = prev[selectedChat.id] || [];
          return { ...prev, [selectedChat.id]: [...currentMsgs, newMsg] };
        });
        
        setNewMessage('');
        
        let lastMsg = textToSend;
        if (type === 'image') lastMsg = '📷 Foto';
        else if (type === 'budget') lastMsg = `💰 Orçamento: R$ ${meta?.price}`;
        else if (type === 'location') lastMsg = '📍 Localização compartilhada';
        else if (type === 'file') lastMsg = `📁 Arquivo: ${meta?.fileName}`;
        
        setMockChats(prev => prev.map(c => c.id === selectedChat.id ? {
          ...c,
          lastMessage: lastMsg,
          lastMessageAt: { toDate: () => new Date() },
          lastSenderId: user.uid,
          unread: false
        } : c));
        
        simulateClientResponse(selectedChat.id, textToSend, type, meta);
        return;
      }
      
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData);
      
      let lastMsg = textToSend;
      if (type === 'image') lastMsg = '📷 Foto';
      else if (type === 'budget') lastMsg = `💰 Orçamento: R$ ${meta?.price}`;
      else if (type === 'location') lastMsg = '📍 Localização compartilhada';
      else if (type === 'file') lastMsg = `📁 Arquivo: ${meta?.fileName}`;

      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: lastMsg,
        lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid,
        unread: true
      });
      
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${selectedChat.id}/messages`);
    }
  };

  const handleAcceptBudget = async (msgId: string, budgetMeta: any) => {
    if (!selectedChat?.id) return;
    try {
      const msgRef = doc(db, 'chats', selectedChat.id, 'messages', msgId);
      await updateDoc(msgRef, {
        'meta.status': 'accepted'
      });
      
      const reqId = selectedChat.requestId;
      if (reqId) {
        await handleUpdateStatus(reqId, 'accepted', {
          proId: selectedChat.proId,
          price: budgetMeta.price
        });
        setSelectedChat((prev: any) => prev ? { ...prev, price: budgetMeta.price } : null);
      }
    } catch (err) {
      console.error("Erro ao aceitar orçamento:", err);
    }
  };

  const handleRejectBudget = async (msgId: string) => {
    if (!selectedChat?.id) return;
    try {
      const msgRef = doc(db, 'chats', selectedChat.id, 'messages', msgId);
      await updateDoc(msgRef, {
        'meta.status': 'rejected'
      });
    } catch (err) {
      console.error("Erro ao recusar orçamento:", err);
    }
  };

  const isClientOwner = selectedRequest?.clientId === user?.uid || userProfile?.role === 'client';

  const overlays = (
    <>
      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="bg-zinc-900 p-8 text-white relative">
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-4 rounded-2xl bg-[#FBBF24]/10 text-[#FBBF24]">
                    {(() => {
                      const Icon = CATEGORIES.find(c => c.id === selectedRequest.category)?.icon || Sparkles;
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold italic">{CATEGORIES.find(c => c.id === selectedRequest.category)?.name || 'Serviço'}</h2>
                    <p className="text-[#FBBF24] font-bold text-sm uppercase tracking-widest leading-none mt-1">Pedido #{selectedRequest.id?.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 lg:p-12 space-y-12">
                {/* Client Profile Section */}
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Informações do Solicitante</h3>
                  <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex flex-col md:flex-row items-center gap-6">
                    <img 
                      src={clientProfile?.avatar || 'https://i.pravatar.cc/150?img=32'} 
                      className="w-24 h-24 rounded-3xl object-cover shadow-lg"
                      alt={clientProfile?.name}
                    />
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                        <h4 className="text-xl font-bold italic">{clientProfile?.name || selectedRequest.clientName}</h4>
                        <span className="bg-zinc-900 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mx-auto md:mx-0">
                          {clientProfile?.profession || 'Cliente'}
                        </span>
                      </div>
                      <p className="text-zinc-500 font-medium mb-3 line-clamp-2 italic text-sm">"{clientProfile?.bio || 'Sem biografia disponível.'}"</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold text-zinc-400">
                         <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {clientProfile?.age || '---'} anos</span>
                         <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {clientProfile?.city || 'Brasil'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Job Details Section (Client Direct Editing Mode or Professional Read-Only View) */}
                {isClientOwner ? (
                  <ClientEditRequestForm
                    initialData={selectedRequest}
                    onSave={handleSaveRequestChanges}
                    selectedRequest={selectedRequest}
                    handleCancelRequest={handleCancelRequest}
                    handleRecoverRequest={handleRecoverRequest}
                    onClose={() => setSelectedRequest(null)}
                  />
                ) : (
                  <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Detalhes do Trabalho</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quando */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans">Quando</p>
                          <p className="font-bold flex items-center gap-2 italic text-zinc-800">
                            <Clock className="w-4 h-4 text-[#FBBF24]" /> {selectedRequest.date}
                          </p>
                        </div>

                        {/* Urgência */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans">Urgência</p>
                          <p className="font-bold flex items-center gap-2 italic text-zinc-800">
                            <Zap className="w-4 h-4 text-[#FBBF24]" /> {selectedRequest.urgency?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Preço Proposto */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans">Preço Proposto</p>
                          <p className="font-bold text-green-600 italic text-xl">
                            R$ {selectedRequest.price || 'A combinar'}
                          </p>
                        </div>

                        {/* Categoria */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans">Categoria</p>
                          <p className="font-bold flex items-center gap-2 italic text-zinc-800">
                            <Sparkles className="w-4 h-4 text-[#FBBF24]" /> {CATEGORIES.find(c => c.id === selectedRequest.category)?.name || 'Serviço'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Horário */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans font-sans">Horário</p>
                          <p className="font-bold flex items-center gap-2 italic text-zinc-800">
                            <Clock className="w-4 h-4 text-[#FBBF24]" /> {selectedRequest.preferredTime || 'A combinar'}
                          </p>
                        </div>

                        {/* Imóvel */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans font-sans">Imóvel</p>
                          <p className="font-bold flex items-center gap-2 italic text-zinc-800">
                            <Home className="w-4 h-4 text-[#FBBF24]" /> {selectedRequest.propertyType || 'Residencial'}
                          </p>
                        </div>

                        {/* Ponto de Referência */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm text-left">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 font-sans font-sans">Ponto de Referência</p>
                          <p className="font-bold flex items-center gap-2 italic text-sm text-zinc-800">
                            <MapPin className="w-4 h-4 text-[#FBBF24] shrink-0" /> {selectedRequest.referencePoint || 'Próximo ao Marco'}
                          </p>
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm text-left">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 font-sans">Endereço de Realização</p>
                        <p className="font-bold text-lg italic text-zinc-800 leading-relaxed">{selectedRequest.address}</p>
                      </div>

                      {/* Descrição */}
                      <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-xl text-left">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4 font-sans font-sans">Descrição da Necessidade</p>
                        <p className="text-lg leading-relaxed font-medium italic">"{selectedRequest.description}"</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Actions */}
                {!isClientOwner && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full">
                    {selectedRequest.status === 'pending' && userProfile?.role === 'pro' ? (
                      <div className="flex flex-col w-full gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={() => {
                              handleStartChat(selectedRequest);
                              setSelectedRequest(null);
                            }}
                            className="flex-1 border-2 border-[#FBBF24] text-[#FBBF24] py-5 rounded-2xl font-bold text-lg hover:bg-[#FBBF24]/5 transition-all flex items-center justify-center gap-2"
                          >
                            <ChatIcon className="w-6 h-6" /> Conversar
                          </button>
                          <button 
                            onClick={async () => {
                              await handleUpdateStatus(selectedRequest.id, 'accepted', { proId: user?.uid });
                              handleStartChat(selectedRequest);
                              setSelectedRequest(null);
                            }}
                            className="flex-1 bg-[#FBBF24] text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-all shadow-xl shadow-[#FBBF24]/20"
                          >
                            Contratar Serviço
                          </button>
                        </div>
                        <button 
                          onClick={() => setSelectedRequest(null)}
                          className="w-full py-4 border-2 border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all text-zinc-400"
                        >
                          Agora Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col w-full gap-4">
                        {((selectedRequest.status === 'pending' && userProfile?.role !== 'pro') || (selectedRequest.status === 'accepted')) && (
                          <button 
                            onClick={() => handleCancelRequest(selectedRequest)}
                            className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold text-lg hover:bg-red-100 transition-all border-2 border-red-100"
                          >
                            {userProfile?.role === 'pro' && selectedRequest.status === 'accepted' ? 'Desistir deste Trabalho' : 'Cancelar este Pedido'}
                          </button>
                        )}

                        {selectedRequest.status === 'cancelled' && userProfile?.role === 'client' && (
                          <button 
                            onClick={() => handleRecoverRequest(selectedRequest)}
                            className="w-full bg-[#FBBF24] text-white py-4 rounded-2xl font-bold text-lg hover:bg-yellow-500 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#FBBF24]/20"
                          >
                            <RotateCcw className="w-5 h-5" /> Recuperar este Pedido
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setSelectedRequest(null)}
                          className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl"
                        >
                          Fechar Detalhes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold italic">Editar Perfil</h3>
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Nome Completo</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                        value={formData.fullName}
                        onChange={(e) => setFormData(p => ({...p, fullName: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Idade</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                        value={formData.age}
                        onChange={(e) => setFormData(p => ({...p, age: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">URL da Foto de Perfil</label>
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/foto.jpg"
                      className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium text-xs"
                      value={formData.avatar}
                      onChange={(e) => setFormData(p => ({...p, avatar: e.target.value}))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Profissão / Ocupação</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Estudante, Cozinheira, Autônomo..."
                      className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                      value={formData.profession}
                      onChange={(e) => setFormData(p => ({...p, profession: e.target.value}))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Cidade</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                        value={formData.city}
                        onChange={(e) => setFormData(p => ({...p, city: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">WhatsApp</label>
                      <input 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="seu.email@exemplo.com"
                      className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({...p, email: e.target.value}))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Biografia</label>
                    <textarea 
                      rows={3}
                      className="w-full p-3 rounded-xl border border-zinc-100 focus:border-[#FBBF24] outline-none font-medium resize-none"
                      value={formData.bio}
                      onChange={(e) => setFormData(p => ({...p, bio: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3 border-2 border-zinc-100 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdateProfile}
                    className="flex-1 py-3 bg-[#FBBF24] text-white rounded-xl font-bold hover:bg-[#F59E0B] transition-all shadow-lg shadow-[#FBBF24]/20"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professional Reviews Modal */}
      <AnimatePresence>
        {selectedProForReviews && activeTab !== 'reviews' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedProForReviews(null);
                setNewReviewAuthor('');
                setNewReviewRating(5);
                setNewReviewComment('');
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={`https://i.pravatar.cc/100?img=${selectedProForReviews.img}`} 
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-100 shadow-sm" 
                      alt={selectedProForReviews.name} 
                    />
                    <span className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold italic text-zinc-900 leading-snug">{selectedProForReviews.name}</h3>
                    <span className="text-[10px] font-extrabold text-[#B8860B] bg-[#FBBF24]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{selectedProForReviews.cat}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProForReviews(null);
                    setNewReviewAuthor('');
                    setNewReviewRating(5);
                    setNewReviewComment('');
                  }} 
                  className="p-2.5 hover:bg-zinc-100 rounded-full transition-all text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Contents (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-8 flex-1">
                {/* Stats Summary Block */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center p-5 bg-zinc-50 rounded-[28px] border border-zinc-100/50">
                  <div className="md:col-span-2 text-center md:border-r md:border-zinc-100 py-2">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest block mb-1">Média Geral</span>
                    <span className="text-[44px] font-extrabold text-zinc-900 leading-none">
                      {selectedProForReviews.rating.toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center gap-1 my-2">
                      {[1, 2, 3, 4, 5].map((s) => {
                        const isFull = s <= Math.round(selectedProForReviews.rating);
                        return (
                          <Star 
                            key={s} 
                            className={`w-4 h-4 ${isFull ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-zinc-200'}`} 
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs font-bold text-zinc-550">
                      {proReviews[selectedProForReviews.name]?.length || 0} avaliações
                    </span>
                  </div>

                  <div className="md:col-span-3 space-y-1 px-2">
                    {/* Visual breakdown bars */}
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const totalReviews = proReviews[selectedProForReviews.name] || [];
                      const matching = totalReviews.filter(r => Math.round(r.rating) === stars).length;
                      const percentage = totalReviews.length > 0 ? (matching / totalReviews.length) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                          <span className="w-3 text-right">{stars}</span>
                          <Star className="w-3 h-3 fill-[#FBBF24] text-[#FBBF24]" />
                          <div className="flex-1 bg-zinc-100 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.6 }}
                              className="bg-[#FBBF24] h-full rounded-full"
                            />
                          </div>
                          <span className="w-6 text-zinc-400 text-right">{matching}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-header */}
                <div>
                  <h4 className="text-lg font-bold text-zinc-950 mb-4 flex items-center gap-2">
                    <ChatIcon className="w-5 h-5 text-[#FBBF24]" />
                    Opiniões dos Clientes
                  </h4>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {(!proReviews[selectedProForReviews.name] || proReviews[selectedProForReviews.name].length === 0) ? (
                      <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-zinc-400 italic font-medium">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                      </div>
                    ) : (
                      proReviews[selectedProForReviews.name].map((rev) => (
                        <div key={rev.id} className="p-5 bg-white rounded-3xl border border-zinc-100/85 hover:border-zinc-200 hover:shadow-sm transition-all text-left">
                          <div className="flex items-start justify-between gap-4 mb-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FBBF24]/20 to-[#FBBF24]/5 text-[#B8860B] flex items-center justify-center font-extrabold text-xs uppercase shadow-sm">
                                {rev.author.substring(0, 2)}
                              </div>
                              <div className="text-left">
                                <h5 className="font-bold text-sm text-zinc-900 leading-none">{rev.author}</h5>
                                <span className="text-[10px] text-zinc-400 font-semibold">{rev.date}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-0.5 bg-[#FBBF24]/10 text-[#B8860B] py-1 px-2.5 rounded-full text-xs font-bold">
                              <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                              <span>{rev.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-zinc-600 text-xs font-medium leading-relaxed italic text-left">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Optional: Add custom Review Form section */}
                <div className="pt-6 border-t border-zinc-100">
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#B8860B] mb-4 text-left">Deixar sua Avaliação</h4>
                  <div className="bg-zinc-50/50 rounded-3xl p-5 border border-zinc-100 space-y-4 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Seu Nome</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Amanda Silva"
                          className="w-full p-3 rounded-xl border border-zinc-200/80 bg-white focus:border-[#FBBF24] outline-none font-medium text-xs"
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Nota (Estrelas)</label>
                        <div className="flex items-center gap-1.5 h-10">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              type="button"
                              key={starVal}
                              onClick={() => setNewReviewRating(starVal)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star 
                                className={`w-6 h-6 ${starVal <= newReviewRating ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-zinc-300'}`} 
                              />
                            </button>
                          ))}
                          <span className="text-xs font-extrabold text-[#B8860B] ml-2">({newReviewRating} estrelas)</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Comentário</label>
                      <textarea 
                        rows={2}
                        placeholder="Escreva sua experiência sobre o atendimento..."
                        className="w-full p-3 rounded-xl border border-zinc-200/80 bg-white focus:border-[#FBBF24] outline-none font-medium text-xs resize-none"
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddReview(selectedProForReviews.name)}
                      className="w-full bg-[#FBBF24] hover:bg-[#F59E0B] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#FBBF24]/10"
                    >
                      <Plus className="w-4 h-4" /> Enviar Avaliação
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedProForReviews(null);
                    setNewReviewAuthor('');
                    setNewReviewRating(5);
                    setNewReviewComment('');
                  }}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-2xl transition-all shadow-md text-center uppercase tracking-wide"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  const handleAddReview = (proName: string) => {
    if (!newReviewAuthor.trim()) {
      alert('Por favor, informe seu nome.');
      return;
    }
    if (!newReviewComment.trim()) {
      alert('Por favor, escreva um comentário para a avaliação.');
      return;
    }
    
    const newReview = {
      id: `rev_${Date.now()}`,
      author: newReviewAuthor.trim(),
      rating: newReviewRating,
      date: 'Agora mesmo',
      comment: newReviewComment.trim()
    };
    
    setProReviews(prev => {
      const current = prev[proName] || [];
      return { ...prev, [proName]: [newReview, ...current] };
    });
    
    setNewReviewAuthor('');
    setNewReviewRating(5);
    setNewReviewComment('');
  };

  const handleStartRequest = (category?: string) => {
    if (category) setFormData(prev => ({ ...prev, category }));
    setRequestOriginView(view);
    setView('request');
    setStep(1);
    window.scrollTo(0, 0);
  };

  const handleStartProOnboarding = () => {
    setView('pro-onboarding');
    setStep(1);
    window.scrollTo(0, 0);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[50px] shadow-2xl p-12 border border-zinc-100"
        >
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-[#FBBF24] rounded-xl flex items-center justify-center font-bold text-white">H</div>
            <span className="text-2xl font-bold tracking-tight">homehelp</span>
          </div>

          <h2 className="text-3xl font-bold mb-2 italic text-center text-zinc-900">Acesso</h2>
          <p className="text-zinc-500 text-center mb-10 font-medium italic">
            {emailCheckStatus === 'not_found' ? 'Complete seu cadastro' : 'Informe seu e-mail para continuar'}
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">E-mail</label>
              <input 
                type="email"
                placeholder="seu@email.com"
                className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold disabled:bg-zinc-50 disabled:text-zinc-400"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailCheckStatus !== 'idle') setEmailCheckStatus('idle');
                  setLoginError('');
                }}
                disabled={emailCheckStatus === 'checking' || emailCheckStatus === 'not_found'}
              />
              {loginError && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-tight">{loginError}</p>}
            </div>

            {emailCheckStatus !== 'not_found' && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleCheckEmail('login')}
                  disabled={emailCheckStatus === 'checking' || !emailInput}
                  className="bg-zinc-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5 rotate-180" /> {emailCheckStatus === 'checking' ? '...' : 'Entrar'}
                </button>
                <button 
                  onClick={() => handleCheckEmail('register')}
                  disabled={emailCheckStatus === 'checking' || !emailInput}
                  className="bg-[#FBBF24] text-white py-5 rounded-2xl font-bold hover:bg-[#F59E0B] transition-all shadow-xl shadow-amber-100 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserIcon className="w-5 h-5" /> {emailCheckStatus === 'checking' ? '...' : 'Cadastrar'}
                </button>
              </div>
            )}

            {emailCheckStatus === 'not_found' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Nome Completo</label>
                  <input 
                    type="text"
                    placeholder="Ex: João da Silva"
                    className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold"
                    onChange={(e) => setUserProfile(p => ({...p, name: e.target.value}))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Idade</label>
                    <input 
                      type="number"
                      placeholder="Ex: 18"
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold"
                      onChange={(e) => setUserProfile(p => ({...p, age: e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Cidade</label>
                    <input 
                      type="text"
                      placeholder="Ex: Marco"
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold"
                      onChange={(e) => setUserProfile(p => ({...p, city: e.target.value}))}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleLogin('client')}
                    className="flex-1 bg-zinc-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <UserIcon className="w-5 h-5" /> Ser Cliente
                  </button>
                  <button 
                    onClick={() => handleLogin('pro')}
                    className="flex-1 border-2 border-zinc-100 text-zinc-900 py-5 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-lg shadow-zinc-100 active:scale-95 flex items-center justify-center gap-2 text-sm"
                  >
                    <Zap className="w-4 h-4" /> Ser Profissional
                  </button>
                </div>
                <button 
                   onClick={() => setEmailCheckStatus('idle')}
                   className="w-full text-zinc-400 font-bold text-[10px] uppercase tracking-widest"
                >
                  Voltar
                </button>
              </motion.div>
            )}

            {(emailCheckStatus === 'idle' || emailCheckStatus === 'checking') && (
              <button 
                onClick={() => setView('home')}
                className="w-full text-zinc-400 font-bold text-sm mt-4"
              >
                Voltar ao Início
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-[50px] shadow-2xl p-12 text-center border border-zinc-100"
        >
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <h2 className="text-4xl font-bold mb-4 italic text-zinc-900">
            {successType === 'request' ? 'Pedido Publicado!' : 'Cadastro Realizado!'}
          </h2>
          
          <p className="text-zinc-500 text-lg mb-10 leading-relaxed font-medium">
            {successType === 'request' 
              ? 'Sua solicitação foi enviada com sucesso. Em instantes você começará a receber orçamentos dos profissionais via WhatsApp.' 
              : 'Seus dados foram enviados para nossa central de análise. Em até 24 horas seu perfil estará ativo na plataforma.'}
          </p>

          <div className="space-y-4">
            <button 
              onClick={() => { 
                setView(successType === 'request' ? 'dashboard-client' : 'dashboard-pro'); 
                setStep(1); 
                setActiveTab(successType === 'request' ? 'feed' : 'requests');
              }}
              className="w-full bg-[#FBBF24] text-white py-4 rounded-2xl font-bold hover:bg-[#F59E0B] transition-all shadow-xl shadow-[#FBBF24]/20 active:scale-95"
            >
              Ir para o Painel {successType === 'request' ? 'do Cliente' : 'do Profissional'}
            </button>
            <button 
              onClick={() => { setView('home'); setStep(1); }}
              className="w-full border-2 border-zinc-100 text-zinc-500 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
            >
              Voltar para Início
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'pro-onboarding') {
    return (
      <div className="min-h-screen bg-[#FDFCF8] py-12 px-6">
        <nav className="max-w-3xl mx-auto flex items-center justify-between mb-12">
          <button 
            onClick={() => { 
              if (user) {
                setView(userProfile?.role === 'pro' ? 'dashboard-pro' : 'dashboard-client');
              } else {
                setView('home'); 
              }
              setStep(1); 
            }}
            className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" /> Sair do Cadastro
          </button>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-[#FBBF24]' : 'bg-zinc-200'}`} />
            ))}
          </div>
        </nav>

        <main className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="pro-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4 uppercase">Para Profissionais</div>
                <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-zinc-100">
                  <img 
                    src="/src/assets/images/domestic_professional_1779111727916.png" 
                    alt="Domestic Professional"
                    className="w-full h-48 object-cover object-[center_20%]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-3xl font-bold mb-2 italic">Qual sua especialidade?</h2>
                <p className="text-zinc-500 mb-10 font-medium">Escolha a categoria que melhor define seu trabalho principal.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setFormData(p => ({...p, category: cat.id})); setStep(2); }}
                      className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all text-left ${
                        formData.category === cat.id 
                        ? 'border-[#FBBF24] bg-zinc-900 text-white translate-x-2' 
                        : 'border-zinc-100 hover:border-zinc-200 bg-white'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${formData.category === cat.id ? 'bg-white/20 text-white' : cat.color}`}>
                        <cat.icon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-lg">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="pro-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4 uppercase">Perfil Profissional</div>
                <h2 className="text-3xl font-bold mb-2 italic">Apresente-se aos clientes</h2>
                <p className="text-zinc-500 mb-10 font-medium">Conte um pouco sobre sua trajetória e experiência.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Nome Completo</label>
                    <input 
                      type="text"
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm"
                      value={formData.fullName}
                      onChange={(e) => setFormData(p => ({...p, fullName: e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Anos de Experiência</label>
                    <div className="flex gap-4">
                      {['< 1 ano', '1-3 anos', '3-5 anos', '5+ anos'].map(y => (
                        <button
                          key={y}
                          onClick={() => setFormData(p => ({...p, experienceYears: y}))}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                            formData.experienceYears === y
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-100 text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Bio Profissional</label>
                    <textarea 
                      placeholder="Ex: Trabalho com elétrica predial há 10 anos, especialista em quadros de luz..."
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none min-h-[120px] transition-all resize-none shadow-sm"
                      value={formData.bio}
                      onChange={(e) => setFormData(p => ({...p, bio: e.target.value}))}
                    />
                  </div>
                  <div className="pt-6 flex gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="px-8 py-4 border-2 border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      disabled={!formData.fullName || !formData.bio || !formData.experienceYears}
                      onClick={() => setStep(3)}
                      className="flex-1 px-8 py-4 bg-[#FBBF24] text-white rounded-2xl font-bold hover:bg-[#F59E0B] transition-all shadow-xl shadow-[#FBBF24]/20 disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="pro-step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4 uppercase">Segurança e Verificação</div>
                <h2 className="text-3xl font-bold mb-2 italic">Quase lá, {formData.fullName.split(' ')[0]}!</h2>
                <p className="text-zinc-500 mb-10 font-medium">A segurança é nossa prioridade. Para ativar seu perfil, precisamos validar sua identidade.</p>

                <div className="space-y-6">
                  <div className="bg-zinc-50 p-6 rounded-3xl border border-dashed border-zinc-200">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">Processo de Verificação</h4>
                        <p className="text-sm text-zinc-500">Nossa equipe analisará seu histórico e documentos em até 24 horas. Perfis verificados ganham <span className="font-bold text-zinc-900 italic">3x mais visibilidade</span>.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-zinc-100">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="w-5 h-5 rounded accent-[#FBBF24]"
                      checked={formData.verified}
                      onChange={(e) => setFormData(p => ({...p, verified: e.target.checked}))}
                    />
                    <label htmlFor="terms" className="text-sm font-medium text-zinc-600">
                      Concordo com os <a href="#" className="text-zinc-900 font-bold underline">Termos de Uso</a> e autorizo a análise de meus dados.
                    </label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="px-8 py-4 border-2 border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      disabled={!formData.verified}
                      onClick={async () => {
                        if (!user) {
                          alert('Erro: Você precisa estar logado.');
                          setView('login');
                          return;
                        }

                        try {
                          const userDocRef = doc(db, 'users', user.uid);
                          await updateDoc(userDocRef, {
                            role: 'pro',
                            name: formData.fullName,
                            bio: formData.bio,
                            experienceYears: formData.experienceYears,
                            isVerified: false, // Needs manual approval
                            updatedAt: serverTimestamp()
                          });

                          setUserProfile(prev => ({
                            ...prev,
                            name: formData.fullName,
                            bio: formData.bio,
                            role: 'pro'
                          } as any));

                          setView('dashboard-pro');
                          setActiveTab('requests');
                          setStep(1);
                          setFormData({ category: '', description: '', urgency: 'normal', date: '', address: '', phone: '', age: '', city: '', fullName: '', experienceYears: '', bio: '', verified: false });
                          alert('✨ Cadastro concluído! Sua conta está em análise.');
                        } catch (error) {
                          console.error('Erro no cadastro pro:', error);
                          alert('Erro ao realizar cadastro.');
                        }
                      }}
                      className="flex-1 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200 active:scale-95 disabled:opacity-50"
                    >
                      Finalizar Cadastro
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  if (view === 'dashboard-client' || view === 'dashboard-pro') {
    const isPro = view === 'dashboard-pro';

    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-white border-r border-zinc-100 p-6 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-12 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-8 h-8 bg-[#FBBF24] rounded-lg flex items-center justify-center font-bold text-white">H</div>
              <span className="text-xl font-bold tracking-tight">homehelp</span>
            </div>

            <nav className="space-y-2">
              {isPro ? (
                <>
                  <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'requests' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <Zap className="w-5 h-5" /> Pedidos Abertos
                  </button>
                  <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <Clock className="w-5 h-5" /> Minha Agenda
                  </button>
                  <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'chat' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <ChatIcon className="w-5 h-5" /> Minhas Conversas
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveTab('feed')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${(activeTab === 'feed' || activeTab === 'reviews') ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <Search className="w-5 h-5" /> Profissionais
                  </button>
                  {activeTab === 'reviews' && (
                    <button onClick={() => setActiveTab('reviews')} className="w-full flex items-center gap-2 p-2 pl-9 rounded-xl font-bold transition-all text-[#B8860B] bg-[#FBBF24]/5 -mt-1 mb-2 text-xs">
                      <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" /> Avaliações
                    </button>
                  )}
                  <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <Clock className="w-5 h-5" /> Meus Pedidos
                  </button>
                  <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'chat' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                    <ChatIcon className="w-5 h-5" /> Chat
                  </button>
                </>
              )}
              <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                <ShieldCheck className="w-5 h-5" /> Meu Perfil
              </button>
            </nav>
          </div>

          <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-400 font-bold hover:text-red-500 transition-colors pt-6 border-t border-zinc-100">
            <LogOut className="w-5 h-5" /> Sair da Conta
          </button>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FBBF24] rounded-lg flex items-center justify-center font-bold text-white">H</div>
              <span className="text-xl font-bold">homehelp</span>
            </div>
          </div>

          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold italic mb-1">Bem-vindo, {userProfile.name}! 👋</h2>
              <p className="text-zinc-500 font-medium">{isPro ? 'Você tem 3 novos pedidos na sua região.' : 'Qual o plano para sua casa hoje?'}</p>
            </div>
            {!isPro && (
              <button 
                onClick={() => handleStartRequest()}
                className="bg-[#FBBF24] text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-[#FBBF24]/20 hover:scale-105 transition-all"
              >
                + Novo Pedido
              </button>
            )}
          </header>

          {activeTab === 'profile' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl bg-white rounded-[40px] border border-zinc-100 shadow-xl overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B]"></div>
              <div className="px-10 pb-10">
                <div className="flex flex-col md:flex-row items-end gap-6 -mt-16 mb-8">
                  <div className="w-32 h-32 rounded-[32px] border-4 border-white bg-zinc-200 shadow-lg overflow-hidden">
                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold italic text-zinc-900">{userProfile.name}</h3>
                    <p className="text-zinc-500 font-medium flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-[#FBBF24]" /> Conta Verificada
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        fullName: userProfile.name || '',
                        email: userProfile.email || '',
                        age: userProfile.age || '',
                        city: userProfile.city || '',
                        profession: userProfile.profession || '',
                        phone: userProfile.phone || '',
                        bio: userProfile.bio || '',
                        avatar: userProfile.avatar || ''
                      }));
                      setIsEditingProfile(true);
                    }}
                    className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95"
                  >
                    Editar Perfil
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Idade</label>
                      <p className="font-bold text-lg">{userProfile.age} anos</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Cidade</label>
                      <p className="font-bold text-lg">{userProfile.city}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Profissão</label>
                      <p className="font-bold text-lg">{userProfile.profession}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">WhatsApp</label>
                      <p className="font-bold text-lg">{userProfile.phone}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">E-mail</label>
                      <p className="font-bold text-lg">{userProfile.email}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Tipo de Conta</label>
                      <span className="bg-[#FBBF24]/10 text-[#FBBF24] px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {isPro ? 'Profissional' : 'Cliente'}
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Sobre Mim</label>
                      <p className="text-zinc-600 leading-relaxed font-medium">{userProfile.bio}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                        <p className="text-2xl font-bold italic text-zinc-900">12</p>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Serviços {isPro ? 'Realizados' : 'Solicitados'}</p>
                      </div>
                      <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                        <p className="text-2xl font-bold italic text-zinc-900">4.9</p>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Média de Avaliação</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-250px)] min-h-[500px] bg-white rounded-[40px] border border-zinc-100 shadow-xl flex overflow-hidden">
              {/* Chat Sidebar */}
              <div className={`w-full md:w-80 border-r border-zinc-100 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                  <h3 className="font-bold text-xl italic">Conversas</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chats.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 font-medium">Nenhuma conversa ativa</div>
                  ) : (
                    chats.map(chat => (
                      <button 
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`w-full p-4 flex items-center gap-4 hover:bg-zinc-50 transition-all border-b border-zinc-50 ${selectedChat?.id === chat.id ? 'bg-[#FBBF24]/5 border-r-4 border-r-[#FBBF24]' : ''}`}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-[#FBBF24]">
                            {(() => {
                              const Icon = CATEGORIES.find(c => c.id === chat.category)?.icon || Sparkles;
                              return <Icon className="w-6 h-6" />;
                            })()}
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm line-clamp-1">
                              {userProfile.role === 'pro' ? chat.clientName : chat.proName}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold whitespace-nowrap ml-2">
                              {chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-bold text-[#FBBF24] uppercase tracking-widest">{chat.category}</span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate max-w-[140px]">{chat.lastMessage}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Active Chat Window */}
              <div className={`flex-1 flex flex-col bg-[#FDFCF8]/50 ${!selectedChat ? 'hidden md:flex items-center justify-center p-12 text-center' : 'flex'}`}>
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 md:p-6 bg-white border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedChat(null)} className="md:hidden text-zinc-400"><ArrowRight className="rotate-180" /></button>
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#FBBF24] border border-zinc-100">
                          {(() => {
                            const Icon = CATEGORIES.find(c => c.id === selectedChat.category)?.icon || Sparkles;
                            return <Icon className="w-7 h-7" />;
                          })()}
                        </div>
                        <div>
                          <h4 className="font-bold text-base leading-none mb-1">
                            {userProfile.role === 'pro' ? selectedChat.clientName : selectedChat.proName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-[#FBBF24] uppercase tracking-widest">{selectedChat.category}</span>
                            <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">#{selectedChat.requestId?.slice(-4).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Job Context Info */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-full border border-green-100 shadow-sm">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-[10px] font-bold">R$ {selectedChat.price || '---'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
                          <MapPin className="w-3 h-3" />
                          <span className="text-[10px] font-bold">2.8km</span>
                        </div>
                        <button 
                          onClick={() => {
                            const job = availableRequests.find(r => r.id === selectedChat.requestId) || 
                                        myRequests.find(r => r.id === selectedChat.requestId);
                            if (job) handleOpenDetails(job);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-full hover:bg-zinc-200 transition-all border border-zinc-200 shadow-sm"
                        >
                          <Info className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.05em]">Ver Detalhes</span>
                        </button>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col">
                      {messages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-zinc-400 font-medium text-sm">Envie a primeira mensagem para iniciar o contato.</div>
                      ) : (
                        messages.map((msg, i) => (
                          <div 
                            key={msg.id} 
                            className={`flex items-start gap-3 max-w-[80%] ${msg.senderId === user?.uid ? 'ml-auto flex-row-reverse' : ''}`}
                          >
                            <div className={`${msg.senderId === user?.uid ? 'bg-zinc-900 text-white p-4 rounded-2xl rounded-tr-none shadow-xl shadow-zinc-200' : 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-zinc-100'}`}>
                              {/* Rich media custom types rendering */}
                              {msg.type === 'image' && (
                                <div className="space-y-2">
                                  <img 
                                    src={msg.meta?.imageUrl || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600"} 
                                    className="rounded-xl max-w-full max-h-60 object-cover shadow-sm hover:scale-102 transition-transform duration-200 cursor-zoom-in" 
                                    referrerPolicy="no-referrer"
                                    alt="Imagem de Serviço" 
                                  />
                                  {msg.text && <p className="text-sm leading-relaxed font-medium mt-1">{msg.text}</p>}
                                </div>
                              )}
                              
                              {msg.type === 'budget' && (
                                <div className="p-4 rounded-xl border bg-zinc-50 border-zinc-100 text-zinc-900 shadow-sm space-y-4 max-w-xs">
                                  <div className="flex items-center gap-2 text-zinc-800">
                                    <div className="p-2 bg-[#FBBF24]/10 text-[#FBBF24] rounded-lg">
                                      <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                      <h5 className="font-bold text-xs">Orçamento do Trabalho</h5>
                                      <p className="text-[8px] uppercase tracking-wider text-zinc-400 font-bold">Oficial • homehelp</p>
                                    </div>
                                  </div>
                                  <div className="space-y-1 bg-white p-3 rounded-lg border border-zinc-100 text-left">
                                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Valor Negociado</p>
                                    <p className="text-xl font-bold tracking-tight text-green-600 italic">R$ {msg.meta?.price}</p>
                                    {msg.meta?.duration && (
                                      <p className="text-[10px] text-zinc-500 font-medium">Prazo Estimado: <strong className="font-bold text-zinc-700">{msg.meta.duration} dias</strong></p>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 font-medium italic text-left">"{msg.meta?.description || 'Nenhuma descrição detalhada.'}"</p>
                                  
                                  {msg.meta?.status === 'pending' ? (
                                    userProfile.role === 'client' ? (
                                      <div className="flex gap-2 pt-2 border-t border-zinc-100">
                                        <button 
                                          onClick={() => handleRejectBudget(msg.id)}
                                          className="flex-1 py-1.5 border border-zinc-200 hover:bg-zinc-100 font-bold text-[10px] rounded-lg text-zinc-500 transition-all active:scale-95"
                                        >
                                          Recusar
                                        </button>
                                        <button 
                                          onClick={() => handleAcceptBudget(msg.id, msg.meta)}
                                          className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Aceitar
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="inline-block px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none">Aguardando Resposta...</span>
                                    )
                                  ) : msg.meta?.status === 'accepted' ? (
                                    <div className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none border border-green-200">
                                      <Check className="w-3.5 h-3.5 text-green-600" /> Orçamento Aceito!
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none border border-red-100">
                                      <X className="w-3.5 h-3.5 text-red-500" /> Orçamento Recusado
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {msg.type === 'location' && (
                                <div className="p-3 rounded-xl border bg-zinc-50 border-zinc-100 text-zinc-900 shadow-sm max-w-xs space-y-3">
                                  <div className="flex items-start gap-2.5 text-left">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                      <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-bold text-xs text-zinc-800">Localização Enviada</h5>
                                      <p className="text-[10px] text-zinc-500 font-medium line-clamp-2 mt-0.5 leading-tight">{msg.meta?.address}</p>
                                    </div>
                                  </div>
                                  <div className="h-24 rounded-lg bg-blue-50/50 border border-blue-100/50 overflow-hidden relative flex items-center justify-center">
                                    <MapPin className="w-7 h-7 text-red-500 relative z-10 animate-bounce" />
                                    <div className="absolute inset-0 bg-zinc-900/[0.02] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                    {msg.meta?.distance && (
                                      <span className="absolute bottom-1 right-1 bg-zinc-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">a {msg.meta.distance} de distância</span>
                                    )}
                                  </div>
                                  <a 
                                    href={`https://maps.google.com/?q=${encodeURIComponent(msg.meta?.address || 'Brasil')}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-center gap-1 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg font-bold text-[10px] transition-all"
                                  >
                                    Abrir no Google Maps <ArrowRight className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              
                              {msg.type === 'file' && (
                                <div className="p-3 rounded-xl border bg-zinc-50 border-zinc-100 whitespace-normal flex items-center justify-between gap-4 max-w-xs">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-red-100 border border-red-200 text-red-600 rounded-lg">
                                      <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                      <h5 className="font-bold text-xs text-zinc-800 truncate max-w-[120px]">{msg.meta?.fileName}</h5>
                                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{msg.meta?.fileSize || '1.5 MB'}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => alert(`Iniciando download de: ${msg.meta?.fileName}`)}
                                    className="p-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg transition-all hover:bg-zinc-50"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                                  </button>
                                </div>
                              )}
                              
                              {(!msg.type || msg.type === 'text') && (
                                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                              )}

                              <span className={`text-[10px] font-bold block mt-2 ${msg.senderId === user?.uid ? 'text-white/40 text-right' : 'text-zinc-400'}`}>
                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-6 bg-white border-t border-zinc-100 relative">
                      {/* Floating Attachment Menu dropdown overlay */}
                      {isAttachmentMenuOpen && (
                        <div className="absolute bottom-24 left-6 bg-white border border-zinc-100 rounded-3xl p-4 shadow-xl flex flex-col gap-1 z-50 w-64 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Compartilhar anexo</p>
                          <button 
                            type="button"
                            onClick={() => { setIsAttachmentMenuOpen(false); setIsSendingImage(true); }}
                            className="flex items-center gap-3 p-2.5 rounded-xl text-zinc-700 hover:bg-[#FBBF24]/5 hover:text-[#FBBF24] transition-all font-bold text-xs text-left"
                          >
                            <ImageIcon className="w-4 h-4 text-[#FBBF24]" /> Enviar Imagem (Foto)
                          </button>
                          {userProfile.role === 'pro' && (
                            <button 
                              type="button"
                              onClick={() => { setIsAttachmentMenuOpen(false); setIsSendingBudget(true); }}
                              className="flex items-center gap-3 p-2.5 rounded-xl text-zinc-700 hover:bg-[#FBBF24]/5 hover:text-[#FBBF24] transition-all font-bold text-xs text-left"
                            >
                              <DollarSign className="w-4 h-4 text-[#FBBF24]" /> Enviar Orçamento Oficial
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => { setIsAttachmentMenuOpen(false); setIsSendingLocation(true); }}
                            className="flex items-center gap-3 p-2.5 rounded-xl text-zinc-700 hover:bg-[#FBBF24]/5 hover:text-[#FBBF24] transition-all font-bold text-xs text-left"
                          >
                            <MapPin className="w-4 h-4 text-[#FBBF24]" /> Enviar Localização Atual
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setIsAttachmentMenuOpen(false); setIsSendingFile(true); }}
                            className="flex items-center gap-3 p-2.5 rounded-xl text-zinc-700 hover:bg-[#FBBF24]/5 hover:text-[#FBBF24] transition-all font-bold text-xs text-left"
                          >
                            <FileIcon className="w-4 h-4 text-[#FBBF24]" /> Enviar Arquivo Simplificado
                          </button>
                        </div>
                      )}

                      {/* Modal overlay 1: image sender */}
                      {isSendingImage && (
                        <div className="absolute inset-x-0 bottom-0 top-0 bg-white z-[60] p-6 flex flex-col justify-between animate-in fade-in duration-300">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-bold text-base flex items-center gap-2"><ImageIcon className="w-5 h-5 text-[#FBBF24]" /> Enviar Imagem do Serviço</h5>
                              <button type="button" onClick={() => setIsSendingImage(false)} className="p-1 rounded-full bg-zinc-100"><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4 font-medium">Insira uma URL de imagem ou escolha entre os presets rápidos de demonstração abaixo:</p>
                            
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              {[
                                { name: 'Reparo Finalizado', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600' },
                                { name: 'Manutenção Elétrica', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600' },
                                { name: 'Preparação Pintura', url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=600' },
                                { name: 'Instalação Hidráulica', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600' }
                              ].map((preset, i) => (
                                <button 
                                  key={i}
                                  type="button"
                                  onClick={() => setAttachmentImage(preset.url)}
                                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left truncate ${attachmentImage === preset.url ? 'border-[#FBBF24] bg-[#FBBF24]/5 text-[#FBBF24]' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-600'}`}
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>

                            <input 
                              type="text" 
                              placeholder="Fazer upload ou colar endereço de imagem..."
                              className="w-full pl-4 pr-4 py-3 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none transition-all font-medium text-xs mb-3"
                              value={attachmentImage}
                              onChange={(e) => setAttachmentImage(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setIsSendingImage(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                            <button 
                              type="button" 
                              onClick={() => {
                                handleSendMessage({
                                  text: 'Imagem de demonstração anexada',
                                  type: 'image',
                                  meta: { imageUrl: attachmentImage || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600' }
                                });
                                setAttachmentImage('');
                                setIsSendingImage(false);
                              }}
                              className="flex-1 py-3 bg-[#FBBF24] text-white font-bold text-xs rounded-xl hover:scale-102 transition-all shadow-md shadow-[#FBBF24]/20"
                            >
                              Anexar e Enviar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Modal overlay 2: budget fields */}
                      {isSendingBudget && (
                        <div className="absolute inset-x-0 bottom-0 top-0 bg-white z-[60] p-6 flex flex-col justify-between animate-in fade-in duration-300">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-bold text-base flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#FBBF24]" /> Enviar Orçamento Oficial</h5>
                              <button type="button" onClick={() => setIsSendingBudget(false)} className="p-1 rounded-full bg-zinc-100"><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-[10px] text-zinc-500 mb-4 font-medium">Os detalhes de valores e prazos serão analisados pelo cliente em tempo real.</p>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Preço Proposto (R$)</label>
                                <input 
                                  type="number" 
                                  placeholder="Ex: 350"
                                  className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none transition-all font-bold text-sm"
                                  value={budgetPrice}
                                  onChange={(e) => setBudgetPrice(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Prazo (Dias)</label>
                                  <input 
                                    type="number" 
                                    placeholder="Ex: 2"
                                    className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none transition-all font-bold text-xs"
                                    value={budgetDuration}
                                    onChange={(e) => setBudgetDuration(e.target.value)}
                                  />
                                </div>
                                <div className="text-left">
                                  <label className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Categoria</label>
                                  <span className="inline-block w-full text-center px-4 py-2.5 bg-[#FBBF24]/5 border border-[#FBBF24]/20 rounded-xl font-bold text-xs text-[#FBBF24]">{selectedChat.category}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Detalhes do que está incluso</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: Incluso mão de obra especializada e garantia..."
                                  className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none transition-all font-medium text-xs"
                                  value={budgetDesc}
                                  onChange={(e) => setBudgetDesc(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setIsSendingBudget(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                            <button 
                              type="button" 
                              disabled={!budgetPrice || !budgetDuration}
                              onClick={() => {
                                handleSendMessage({
                                  text: `Proposta de orçamento enviada`,
                                  type: 'budget',
                                  meta: {
                                    price: budgetPrice,
                                    duration: budgetDuration,
                                    description: budgetDesc || 'Incluso todos os materiais básicos de instalação correspondentes.',
                                    status: 'pending'
                                  }
                                });
                                setBudgetPrice('');
                                setBudgetDuration('');
                                setBudgetDesc('');
                                setIsSendingBudget(false);
                              }}
                              className="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-all shadow-md disabled:opacity-50"
                            >
                              Enviar Orçamento
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Modal overlay 3: location pre-fills */}
                      {isSendingLocation && (
                        <div className="absolute inset-x-0 bottom-0 top-0 bg-white z-[60] p-6 flex flex-col justify-between animate-in fade-in duration-300">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-bold text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500 animate-pulse" /> Compartilhar Localização</h5>
                              <button type="button" onClick={() => setIsSendingLocation(false)} className="p-1 rounded-full bg-zinc-100"><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4 font-medium">Selecione um dos locais padrão recomendados ou escreva o endereço completo manualmente:</p>
                            
                            <div className="space-y-2 mb-4">
                              {[
                                "Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP",
                                "Rua dos Pinheiros, 600 - Pinheiros, São Paulo - SP",
                                "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                              ].map((option, idx) => (
                                <button 
                                  key={idx}
                                  type="button"
                                  onClick={() => setLocationAddress(option)}
                                  className={`w-full p-2.5 rounded-xl border text-[11px] font-medium transition-all text-left flex items-start gap-2 ${locationAddress === option ? 'border-blue-500 bg-blue-50/30 text-blue-700' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-600'}`}
                                >
                                  <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                                  <span>{option}</span>
                                </button>
                              ))}
                            </div>

                            <input 
                              type="text" 
                              placeholder="Digite um endereço customizado para as coordenadas..."
                              className="w-full px-4 py-3 bg-zinc-50 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-xs"
                              value={locationAddress}
                              onChange={(e) => setLocationAddress(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setIsSendingLocation(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                            <button 
                              type="button" 
                              disabled={!locationAddress}
                              onClick={() => {
                                handleSendMessage({
                                  text: 'Localização de prestação enviada',
                                  type: 'location',
                                  meta: {
                                    address: locationAddress,
                                    distance: '2.8 km'
                                  }
                                });
                                setLocationAddress('');
                                setIsSendingLocation(false);
                              }}
                              className="flex-1 py-3 bg-zinc-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-all shadow-md disabled:opacity-50"
                            >
                              Compartilhar Localização
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Modal overlay 4: simple files selection */}
                      {isSendingFile && (
                        <div className="absolute inset-x-0 bottom-0 top-0 bg-white z-[60] p-6 flex flex-col justify-between animate-in fade-in duration-300">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-bold text-base flex items-center gap-2"><FileIcon className="w-5 h-5 text-red-500" /> Enviar Arquivo Técnico</h5>
                              <button type="button" onClick={() => setIsSendingFile(false)} className="p-1 rounded-full bg-zinc-100"><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4 font-medium">Os arquivos em formato PDF simplificam envio de notas de garantia, ordens ou recibos:</p>
                            
                            <div className="space-y-2 mb-4">
                              {[
                                { name: "relatorio_tecnico_homehelp.pdf", size: "640 KB" },
                                { name: "recibo_de_conclusao_servico.pdf", size: "180 KB" },
                                { name: "contrato_prestacao_servicos.pdf", size: "1.2 MB" },
                                { name: "manual_garantia_equipamento.pdf", size: "2.4 MB" }
                              ].map((fileObj, idx) => (
                                <button 
                                  type="button"
                                  key={idx}
                                  onClick={() => {
                                    handleSendMessage({
                                      text: `Documento anexado: ${fileObj.name}`,
                                      type: 'file',
                                      meta: {
                                        fileName: fileObj.name,
                                        fileSize: fileObj.size
                                      }
                                    });
                                    setIsSendingFile(false);
                                  }}
                                  className="w-full p-3 rounded-xl border border-zinc-100 hover:border-[#FBBF24] hover:bg-[#FBBF24]/5 transition-all text-left flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <FileIcon className="w-5 h-5 text-red-500" />
                                    <span className="text-xs font-bold text-zinc-700 truncate max-w-[170px]">{fileObj.name}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase">{fileObj.size}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button type="button" onClick={() => setIsSendingFile(false)} className="w-full py-3 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all">Cancelar</button>
                          </div>
                        </div>
                      )}

                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="relative flex items-center gap-3"
                      >
                        <button 
                          type="button"
                          onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                          className={`p-4 rounded-2xl transition-all ${isAttachmentMenuOpen ? 'bg-[#FBBF24] text-white rotate-45' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'} active:scale-95`}
                          title="Anexar arquivos"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            placeholder="Escreva sua mensagem..."
                            className="w-full pl-6 pr-12 py-4 bg-zinc-50 rounded-2xl border-2 border-transparent focus:border-[#FBBF24] focus:bg-white outline-none transition-all font-medium text-sm"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                          />
                        </div>
                        <button 
                          type="submit"
                          className="bg-zinc-900 text-white p-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                          disabled={!newMessage.trim()}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-12">
                    <div className="w-24 h-24 bg-[#FBBF24]/10 text-[#FBBF24] rounded-full flex items-center justify-center mx-auto mb-6">
                      <ChatIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold italic mb-2">Suas Conversas</h3>
                    <p className="text-zinc-500 font-medium max-w-sm mx-auto">Selecione um chat na lateral para ver as mensagens ou inicie um novo contato em um pedido.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold italic flex items-center gap-2">
                  <Clock className="text-[#FBBF24]" /> {isPro ? 'Minha Agenda' : 'Meus Pedidos'}
                </h3>
                <span className="bg-zinc-100 text-zinc-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest leading-none flex items-center justify-center">
                  {visibleRequests.length} Total
                </span>
              </div>

              {visibleRequests.length === 0 ? (
                <div className="bg-white rounded-[40px] border border-zinc-100 p-16 text-center shadow-xl">
                  <div className="w-20 h-20 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Nenhum pedido encontrado</h4>
                  <p className="text-zinc-500 font-medium mb-8">Parece que você ainda não tem solicitações registradas.</p>
                  {!isPro && (
                    <button 
                      onClick={() => handleStartRequest()}
                      className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200"
                    >
                      Solicitar Primeiro Serviço
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {visibleRequests.map((req) => (
                    <div key={req.id} className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-2xl bg-zinc-50 group-hover:bg-[#FBBF24]/10 transition-colors`}>
                            {CATEGORIES.find(c => c.id === req.category)?.icon ? (
                              (() => {
                                const Icon = CATEGORIES.find(c => c.id === req.category)!.icon;
                                return <Icon className="w-8 h-8 text-[#FBBF24]" />;
                              })()
                            ) : <Sparkles className="w-8 h-8 text-zinc-400" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                              <h4 className="font-bold text-xl italic">{CATEGORIES.find(c => c.id === req.category)?.name || 'Serviço'}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                  req.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                  req.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  req.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                  'bg-zinc-100 text-zinc-600'
                                }`}>
                                  {req.status === 'pending' ? 'Pendente' : 
                                   req.status === 'completed' ? 'Concluído' : 
                                   req.status === 'accepted' ? 'Em Andamento' : 'Cancelado'}
                                </span>
                                {req.status === 'cancelled' && (() => {
                                  const cancelledTime = req.cancelledAt?.toDate 
                                    ? req.cancelledAt.toDate() 
                                    : (req.updatedAt?.toDate ? req.updatedAt.toDate() : null);
                                  if (!cancelledTime) return null;
                                  const diffMs = currentTime.getTime() - cancelledTime.getTime();
                                  const diffMins = diffMs / (1000 * 60);
                                  const remainingMins = 20 - diffMins;
                                  if (remainingMins <= 0) return null;
                                  const mins = Math.floor(remainingMins);
                                  const secs = Math.floor((remainingMins - mins) * 60);
                                  const formattedMins = mins.toString().padStart(2, '0');
                                  const formattedSecs = secs.toString().padStart(2, '0');
                                  return (
                                    <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                      falta {formattedMins}:{formattedSecs} para sair
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            <p className="text-zinc-500 font-medium line-clamp-1 max-w-md">{req.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs font-bold text-zinc-400">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {req.date}</span>
                              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {req.urgency?.toUpperCase()}</span>
                              {req.price && <span className="flex items-center gap-1 text-green-600 font-bold">R$ {req.price}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-4 w-full">
                          <div className="flex flex-wrap items-center gap-3">
                            {req.status === 'accepted' && (() => {
                              const relatedChat = chats.find(c => c.requestId === req.id && c.proId === req.proId);
                              const hasUnread = relatedChat?.unread === true && relatedChat?.lastSenderId !== user?.uid;
                              return (
                                <button 
                                  onClick={() => handleStartChat(req)}
                                  className="relative px-6 py-3 bg-[#FBBF24] text-white rounded-xl font-bold text-sm hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#FBBF24]/10 active:scale-95"
                                >
                                  <ChatIcon className="w-5 h-5" /> 
                                  Chat com Profissional
                                  {hasUnread && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white font-bold items-center justify-center">1</span>
                                    </span>
                                  )}
                                </button>
                              );
                            })()}

                            {req.status === 'pending' && !isPro && (() => {
                              const relatedChats = chats.filter(c => c.requestId === req.id);
                              const reqUnreadCount = relatedChats.filter(c => c.unread === true && c.lastSenderId !== user?.uid).length;
                              const isExpanded = expandedInteressados[req.id];
                              
                              if (relatedChats.length > 0) {
                                return (
                                  <button 
                                    onClick={() => setExpandedInteressados(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
                                    className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 border-2 ${
                                      isExpanded 
                                        ? 'bg-zinc-100 text-zinc-800 border-zinc-200' 
                                        : 'bg-white text-[#FBBF24] border-[#FBBF24] hover:bg-[#FBBF24]/5 shadow-sm shadow-[#FBBF24]/5'
                                    }`}
                                  >
                                    <ChatIcon className="w-5 h-5 animate-bounce" /> 
                                    Ver Interessados ({relatedChats.length})
                                    {reqUnreadCount > 0 && (
                                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white font-bold items-center justify-center">{reqUnreadCount}</span>
                                      </span>
                                    )}
                                  </button>
                                );
                              } else {
                                return (
                                  <button 
                                    disabled
                                    className="px-6 py-3 bg-zinc-50 border border-zinc-100 text-zinc-400 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-help"
                                    title="Divulgando para profissionais parceiros na sua área."
                                  >
                                    <span className="relative flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBBF24] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FBBF24]"></span>
                                    </span>
                                    Aguardando Interessados
                                  </button>
                                );
                              }
                            })()}

                            {req.status !== 'cancelled' && (
                              <button 
                                onClick={() => handleOpenDetails(req)}
                                className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-sm active:scale-95"
                              >
                                Ver Detalhes
                              </button>
                            )}

                            {req.status === 'cancelled' && !isPro && (
                              <button 
                                onClick={() => handleRecoverRequest(req)}
                                className="px-6 py-3 bg-[#FBBF24] text-white rounded-xl font-bold text-sm hover:bg-yellow-500 hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#FBBF24]/15 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" /> Recuperar Pedido
                              </button>
                            )}

                            {isPro && req.status === 'accepted' && (
                              <button 
                                onClick={() => handleUpdateStatus(req.id, 'completed')}
                                className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 hover:scale-105 transition-all shadow-lg shadow-green-500/10 active:scale-95"
                              >
                                Concluir Trabalho
                              </button>
                            )}

                            {req.status === 'pending' && !isPro && (
                              <button 
                                onClick={() => handleCancelRequest(req)}
                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-105 active:scale-95" 
                                title="Cancelar Pedido"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}

                            {req.status === 'accepted' && (
                              <button 
                                onClick={() => handleCancelRequest(req)}
                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-105 active:scale-95" 
                                title={isPro ? "Desistir do Trabalho" : "Cancelar Pedido"}
                              >
                                <LogOut className="w-5 h-5" />
                              </button>
                            )}
                          </div>

                          {/* Expanded Interested Professionals List */}
                          {!isPro && req.status === 'pending' && expandedInteressados[req.id] && (() => {
                            const relatedChats = chats.filter(c => c.requestId === req.id);
                            if (relatedChats.length > 0) {
                              return (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 bg-zinc-50 border border-zinc-100/80 rounded-3xl p-6 space-y-4 w-full"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Zap className="w-3.5 h-3.5 text-[#FBBF24]" />
                                      Profissionais que entraram em contato ({relatedChats.length})
                                    </p>
                                    <span className="text-[10px] bg-[#FBBF24]/15 text-[#FBBF24] px-2 py-0.5 rounded-full font-bold">PROPOSTAS RECENTES</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {relatedChats.map(chat => {
                                      const hasUnread = chat.unread === true && chat.lastSenderId !== user?.uid;
                                      return (
                                        <div 
                                          key={chat.id} 
                                          className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group/box ${
                                            hasUnread ? 'border-red-200 ring-2 ring-red-400/5' : 'border-zinc-100 hover:border-[#FBBF24]/30'
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="relative">
                                              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-[#FBBF24] font-bold text-lg font-mono">
                                                {chat.proName?.[0] || 'P'}
                                              </div>
                                              {/* Interactive status indicator */}
                                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse" title="Online" />
                                            </div>
                                            <div className="flex-1 text-left">
                                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h5 className="font-bold text-sm text-zinc-800 line-clamp-1">{chat.proName}</h5>
                                                {hasUnread && (
                                                  <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">Novo</span>
                                                )}
                                              </div>
                                              <p className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-2">{req.category}</p>
                                              <p className="text-xs text-zinc-500 line-clamp-2 font-medium italic">"{chat.lastMessage || 'Conversa iniciada'}"</p>
                                            </div>
                                          </div>

                                          <div className="flex gap-2 w-full mt-2">
                                            <button 
                                              onClick={() => {
                                                setSelectedChat(chat);
                                                setActiveTab('chat');
                                              }}
                                              className="flex-1 bg-[#FBBF24]/10 text-[#FBBF24] font-bold text-xs py-2.5 rounded-xl transition-all hover:bg-[#FBBF24] hover:text-white flex items-center justify-center gap-1.5"
                                            >
                                              <ChatIcon className="w-4 h-4" /> Conversar
                                            </button>
                                            <button 
                                              onClick={async () => {
                                                await handleUpdateStatus(req.id, 'accepted', { proId: chat.proId });
                                                handleStartChat(req, chat.proId);
                                              }}
                                              className="flex-1 bg-zinc-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all hover:bg-black flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                            >
                                              <CheckCircle2 className="w-4 h-4" /> Contratar
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && isPro && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pro Main Feed */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Custom Interactive Filtering Dashboard for Pros */}
                <div className="bg-white rounded-[28px] border border-zinc-100 p-6 shadow-sm space-y-4 text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-zinc-850 text-lg italic">Filtrar & Ordenar Pedidos 🛠️</h4>
                      <p className="text-xs text-zinc-500 font-medium">Encontre serviços próximos que mais combinam com suas habilidades.</p>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setProSortBy('distance')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          proSortBy === 'distance'
                          ? 'bg-zinc-900 text-white shadow-md'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#FBBF24]" /> Mais Próximos
                      </button>
                      <button
                        onClick={() => setProSortBy('recent')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          proSortBy === 'recent'
                          ? 'bg-zinc-900 text-white shadow-md'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-[#FBBF24]" /> Mais Recentes
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Apenas meus serviços que realizo</label>
                      <button
                        onClick={() => setOnlyMyServices(prev => !prev)}
                        className={`text-xs font-bold px-3 py-1 rounded-md transition-all ${
                          onlyMyServices 
                          ? 'bg-[#FBBF24]/10 text-[#F59E0B]' 
                          : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        {onlyMyServices ? '✓ Filtro Ativado' : 'Exibir Todos'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {CATEGORIES.map(cat => {
                        const isChecked = proRealizedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              if (isChecked) {
                                if (proRealizedCategories.length > 1) {
                                  setProRealizedCategories(prev => prev.filter(id => id !== cat.id));
                                }
                              } else {
                                setProRealizedCategories(prev => [...prev, cat.id]);
                              }
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                              isChecked
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                              : 'bg-[#FDFCF8] text-zinc-450 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isChecked ? '#FBBF24' : '#d4d4d8' }} />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-xl font-bold flex items-center gap-2 italic">
                    <Zap className="text-[#FBBF24]" /> Lista de Pedidos ({processedAvailableRequests.length})
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none bg-zinc-100 px-3 py-1 rounded-full">
                    {processedAvailableRequests.length} filtrados
                  </span>
                </div>

                {processedAvailableRequests.length === 0 ? (
                  <div className="bg-white rounded-[40px] border border-zinc-100 p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-lg mb-1">Nenhum pedido compatível encontrado</h4>
                    <p className="text-zinc-500 text-sm font-medium">Tente ajustar suas categorias escolhidas ou desativar o filtro acima.</p>
                  </div>
                ) : (
                  processedAvailableRequests.map(job => (
                    <div key={job.id} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:border-[#FBBF24] transition-all group text-left">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#FBBF24] shrink-0">
                            {(() => {
                              const Icon = CATEGORIES.find(c => c.id === job.category)?.icon || Sparkles;
                              return <Icon className="w-6 h-6" />;
                            })()}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg italic text-zinc-900 group-hover:text-[#FBBF24] transition-colors line-clamp-1">
                              {getPortugueseCategorySubject(job.category, job.clientName)}
                            </h4>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                              {job.urgency === 'critical' ? (
                                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[9px] uppercase font-black shrink-0">Crítico 🔥</span>
                              ) : job.urgency === 'high' ? (
                                <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md text-[9px] uppercase font-black shrink-0">Urgente ⚡</span>
                              ) : (
                                <span className="bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold shrink-0">Normal</span>
                              )}
                              • 🏙️ {job.city || 'São Paulo - SP'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 text-right shrink-0">
                          <span className="bg-green-100 text-green-600 px-4 py-1 rounded-full text-xs font-bold leading-none flex items-center justify-center">R$ {job.price || 'A combinar'}</span>
                          <span className="bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-bold leading-none flex items-center gap-1 shrink-0"><MapPin className="w-3 h-3 text-[#FBBF24]" /> {job.distance} km de você</span>
                        </div>
                      </div>
                      
                      <p className="text-zinc-500 font-medium text-sm mb-4 leading-relaxed line-clamp-2">"{job.description}"</p>
                      
                      {/* Specifications to Accept panel */}
                      <div className="mb-6 bg-zinc-50 p-5 rounded-[24px] border border-zinc-100 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                            Especificações do Serviço para Aceitar 📋
                          </span>
                          <span className="text-[10px] font-extrabold text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/30 px-2.5 py-0.5 rounded-md leading-none">
                            Seguro
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="text-left bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm">
                            <p className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider mb-1">🏙️ Cidade & Região</p>
                            <p className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#FBBF24]" /> {job.city || 'São Paulo - SP'}
                            </p>
                          </div>
                          
                          <div className="text-left bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm">
                            <p className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase mb-1">💰 Valor do Trabalho</p>
                            <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                              R$ {job.price || 'A combinar'}
                            </p>
                          </div>
                          
                          <div className="text-left bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm">
                            <p className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase mb-1">⏰ Horário Preferencial</p>
                            <p className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#FBBF24]" /> {job.preferredTime || '12:23'}
                            </p>
                          </div>
                          
                          <div className="text-left bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm">
                            <p className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase mb-1">🏠 Tipo de Imóvel</p>
                            <p className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-[#FBBF24]" /> {job.propertyType || 'Residência'}
                            </p>
                          </div>
                        </div>

                        {job.referencePoint && (
                          <div className="text-left bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm">
                            <p className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase mb-1">📍 Ponto de Referência</p>
                            <p className="text-xs font-bold text-zinc-650 flex items-start gap-1.5 leading-relaxed">
                              {job.referencePoint}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                          onClick={() => handleOpenDetails(job)}
                          className="flex-1 bg-zinc-100 text-zinc-900 py-3.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Info className="w-4 h-4 text-zinc-500" /> Mais Informações
                        </button>
                        <button 
                          onClick={() => handleStartChat(job)}
                          className="flex-1 border-2 border-[#FBBF24] text-[#FBBF24] py-3.5 rounded-xl font-bold text-sm hover:bg-[#FBBF24]/5 transition-all flex items-center justify-center gap-2"
                        >
                          <ChatIcon className="w-4 h-4" /> Conversar
                        </button>
                        <button 
                          onClick={async () => {
                            await handleUpdateStatus(job.id, 'accepted', { proId: user?.uid });
                            handleStartChat(job);
                          }}
                          className="flex-1 bg-[#FBBF24] text-white py-3.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-[#FBBF24]/20"
                        >
                          Aceitar Pedido
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pro Sidebar Stats */}
              <div className="space-y-6">
                <div className="bg-zinc-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FBBF24]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">Ganhos do Mês</p>
                  <h4 className="text-4xl font-bold mb-6 tracking-tighter italic">R$ {proStats.earnings.toFixed(2)}</h4>
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Trabalhos</p>
                      <p className="text-xl font-bold italic">{proStats.jobsCount}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Avaliação</p>
                      <p className="text-xl font-bold italic flex items-center justify-center gap-1">
                        <Star className="w-5 h-5 fill-[#FBBF24] text-[#FBBF24]" /> 
                        {proStats.rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <h4 className="font-bold mb-4 italic">Meta Semanal</h4>
                  <div className="h-4 bg-zinc-100 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${Math.min((proStats.jobsCount / 10) * 100, 100)}%` }} className="h-full bg-[#FBBF24] transition-all duration-500" />
                  </div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex justify-between">
                    <span>{proStats.jobsCount} de 10 trabalhos</span>
                    <span>{Math.round((proStats.jobsCount/10)*100)}%</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feed' && !isPro && (
            <div className="space-y-12">
              {/* Category Quick Filter */}
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} className="flex-shrink-0 flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-zinc-100 font-bold text-sm hover:border-[#FBBF24] shadow-sm transition-all whitespace-nowrap">
                    <cat.icon className="w-4 h-4 text-[#FBBF24]" /> {cat.name}
                  </button>
                ))}
              </div>

              {/* Recommended Professionals */}
              <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold italic">Profissionais em Destaque</h3>
                    <p className="text-sm text-zinc-500 font-medium">Compare profissionais por especificações como proximidade, nota ou volume de trabalhos.</p>
                  </div>
                  
                  {/* Dynamic specification filter chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Todos', emoji: '👥' },
                      { id: 'near', label: 'Mais Perto', emoji: '📍' },
                      { id: 'rating', label: 'Melhor Avaliado', emoji: '⭐' },
                      { id: 'jobs', label: 'Mais Trabalhos', emoji: '🏆' },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setProFilter(btn.id as any)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          proFilter === btn.id
                            ? 'bg-[#FBBF24] text-white shadow-lg shadow-[#FBBF24]/20 scale-105'
                            : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-100 shadow-sm'
                        }`}
                      >
                        <span>{btn.emoji}</span>
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPros.map((pro, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between relative overflow-hidden">
                      {/* Accent top bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[32px] bg-[#FBBF24]/40" />

                      <div>
                        {/* Top specialty/specification highlight tag */}
                        <div className="mb-4 flex">
                          <span className="text-[9px] font-extrabold text-[#B8860B] bg-[#FBBF24]/10 px-3 py-1 rounded-full uppercase tracking-widest leading-none">
                            {pro.highlight}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <img src={`https://i.pravatar.cc/100?img=${pro.img}`} className="w-14 h-14 rounded-2xl object-cover border border-zinc-100" alt={pro.name} />
                          <div>
                            <h4 className="font-bold text-lg text-zinc-900 leading-snug">{pro.name}</h4>
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{pro.cat}</span>
                          </div>
                        </div>

                        {/* Mini bio description detailing their services */}
                        <p className="text-zinc-500 text-xs font-medium leading-relaxed italic mb-4 line-clamp-2">
                          "{pro.desc}"
                        </p>

                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-100/80 mb-6 text-xs font-bold text-zinc-600">
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedProForReviews(pro);
                              setActiveTab('reviews');
                            }}
                            className="flex flex-col items-center justify-center p-2 bg-zinc-50/55 hover:bg-[#FBBF24]/10 rounded-xl transition-all border border-transparent hover:border-[#FBBF24]/20 cursor-pointer active:scale-95 group/rate text-center"
                            title="Ver avaliações"
                          >
                            <span className="text-zinc-400 group-hover/rate:text-[#B8860B] text-[8px] uppercase tracking-widest mb-0.5">Nota</span>
                            <span className="flex items-center gap-0.5 text-zinc-800 text-sm group-hover/rate:text-[#B8860B]">
                              <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" /> {pro.rating.toFixed(1)}
                            </span>
                          </button>
                          <div className="flex flex-col items-center justify-center p-2 bg-zinc-50/55 rounded-xl">
                            <span className="text-zinc-400 text-[8px] uppercase tracking-widest mb-0.5">Trabalhos</span>
                            <span className="text-zinc-800 text-sm font-extrabold">{pro.jobs}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-2 bg-zinc-50/55 rounded-xl">
                            <span className="text-zinc-400 text-[8px] uppercase tracking-widest mb-0.5">Distância</span>
                            <span className="flex items-center gap-0.5 text-[#B8860B] text-sm">
                              <MapPin className="w-3.5 h-3.5 text-[#FBBF24]" /> {pro.distance} km
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-auto">
                        <button 
                          onClick={() => {
                            setSelectedProForReviews(pro);
                            setActiveTab('reviews');
                          }}
                          className="w-full bg-zinc-50 hover:bg-[#FBBF24]/10 hover:text-[#B8860B] text-zinc-600 font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 border border-zinc-100/65"
                        >
                          <ChatIcon className="w-3.5 h-3.5 text-zinc-400" />
                          Ver Avaliações ({pro.reviewsCount})
                        </button>
                        
                        <button 
                          onClick={() => handleStartRequest(pro.cat.toLowerCase())}
                          className="w-full bg-zinc-50 text-zinc-800 hover:bg-[#FBBF24] hover:text-white py-3.5 rounded-2xl font-bold transition-all shadow-sm text-sm tracking-wide text-center"
                        >
                          Contratar {pro.name.split(' ')[0]}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Active Requests */}
              <section className="bg-[#F5F1E1] p-8 rounded-[40px] border border-[#E5E1D1]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold italic">Meus Pedidos Recentes</h3>
                  {visibleRequests.length > 0 && (
                    <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-[#B8860B] uppercase tracking-widest hover:underline transition-all">Ver Todos</button>
                  )}
                </div>
                
                {visibleRequests.length === 0 ? (
                  <div className="bg-white/50 rounded-3xl p-6 text-center border border-white/50">
                    <p className="text-zinc-500 font-medium">Nenhum pedido ativo no momento.</p>
                    <button onClick={() => handleStartRequest()} className="text-[#FBBF24] font-bold mt-2 hover:underline">Clique aqui para solicitar um serviço</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleRequests.slice(0, 2).map((req) => (
                      <div key={req.id} className="bg-white p-5 rounded-3xl border border-white/50 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#FBBF24]">
                            {(() => {
                              const Icon = CATEGORIES.find(c => c.id === req.category)?.icon || Sparkles;
                              return <Icon className="w-6 h-6" />;
                            })()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm italic">{CATEGORIES.find(c => c.id === req.category)?.name || 'Serviço'}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className={`text-[9px] font-extrabold uppercase tracking-widest ${
                                req.status === 'pending' ? 'text-yellow-500' :
                                req.status === 'completed' ? 'text-green-500' :
                                req.status === 'cancelled' ? 'text-red-500' : 'text-zinc-500'
                              }`}>
                                {req.status === 'pending' ? 'Pendente' : 
                                 req.status === 'completed' ? 'Concluído' :
                                 req.status === 'accepted' ? 'Em Andamento' : 'Cancelado'}
                              </p>
                              {req.status === 'cancelled' && (() => {
                                const cancelledTime = req.cancelledAt?.toDate 
                                  ? req.cancelledAt.toDate() 
                                  : (req.updatedAt?.toDate ? req.updatedAt.toDate() : null);
                                if (!cancelledTime) return null;
                                const diffMs = currentTime.getTime() - cancelledTime.getTime();
                                const diffMins = diffMs / (1000 * 60);
                                const remainingMins = 20 - diffMins;
                                if (remainingMins <= 0) return null;
                                const mins = Math.floor(remainingMins);
                                const secs = Math.floor((remainingMins - mins) * 60);
                                const formattedMins = mins.toString().padStart(2, '0');
                                const formattedSecs = secs.toString().padStart(2, '0');
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                      • falta {formattedMins}:{formattedSecs}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecoverRequest(req);
                                      }}
                                      className="text-[9px] text-white bg-[#FBBF24] hover:bg-yellow-500 font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                                      title="Recuperar Pedido"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" /> Recuperar
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab('history')} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                          <ChevronRight className="w-5 h-5 text-zinc-300" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'reviews' && !isPro && (
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pb-12"
            >
              {/* Navigation Back Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                  onClick={() => {
                    setActiveTab('feed');
                  }}
                  className="self-start flex items-center gap-2 px-5 py-3 bg-white hover:bg-zinc-50 text-zinc-700 rounded-2xl border border-zinc-150 shadow-sm font-bold text-sm transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#FBBF24]" /> Voltar para Profissionais
                </button>
                
                {selectedProForReviews && (
                  <span className="text-xs font-bold text-zinc-450 bg-zinc-100 px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Avaliações de {selectedProForReviews.name}
                  </span>
                )}
              </div>

              {!selectedProForReviews ? (
                <div className="bg-white rounded-[40px] p-12 text-center border border-zinc-150 shadow-sm max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-[#FBBF24]/10 rounded-full flex items-center justify-center text-[#B8860B] mx-auto mb-4">
                    <Star className="w-8 h-8 fill-[#FBBF24] text-[#FBBF24]" />
                  </div>
                  <h4 className="text-xl font-bold italic mb-2">Nenhum Profissional Selecionado</h4>
                  <p className="text-zinc-500 font-medium text-sm">Acesse a lista de profissionais e clique em "Ver Avaliações" para carregar as opiniões.</p>
                  <button 
                    onClick={() => setActiveTab('feed')}
                    className="mt-6 bg-[#FBBF24] hover:bg-[#F59E0B] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FBBF24]/10 cursor-pointer"
                  >
                    Explorar Profissionais
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left stats column & Review Form */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Professional overview & general rating */}
                    <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-6 text-left animate-fade-in">
                      <div className="flex items-center gap-4">
                        <img 
                          src={`https://i.pravatar.cc/100?img=${selectedProForReviews.img}`} 
                          className="w-16 h-16 rounded-2xl object-cover border border-zinc-100" 
                          alt={selectedProForReviews.name} 
                        />
                        <div>
                          <h4 className="font-bold text-lg text-zinc-900 leading-snug">{selectedProForReviews.name}</h4>
                          <span className="text-[10px] font-extrabold text-[#B8860B] bg-[#FBBF24]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{selectedProForReviews.cat}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100/80 text-center">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest block mb-1 font-mono">Média Geral</span>
                        <span className="text-5xl font-extrabold text-zinc-900 leading-none">
                          {selectedProForReviews.rating.toFixed(1)}
                        </span>
                        
                        <div className="flex items-center justify-center gap-1 my-3">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const isFull = s <= Math.round(selectedProForReviews.rating);
                            return (
                              <Star 
                                key={s} 
                                className={`w-4 h-4 ${isFull ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-zinc-200'}`} 
                              />
                            );
                          })}
                        </div>
                        
                        <span className="text-xs font-bold text-zinc-550">
                          {proReviews[selectedProForReviews.name]?.length || 0} avaliações
                        </span>
                      </div>

                      {/* Visual breakdown bars */}
                      <div className="space-y-1.5 pt-4 border-t border-zinc-100/80">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const totalReviews = proReviews[selectedProForReviews.name] || [];
                          const matching = totalReviews.filter(r => Math.round(r.rating) === stars).length;
                          const percentage = totalReviews.length > 0 ? (matching / totalReviews.length) * 100 : 0;
                          return (
                            <div key={stars} className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                              <span className="w-3 text-right">{stars}</span>
                              <Star className="w-3 h-3 fill-[#FBBF24] text-[#FBBF24]" />
                              <div className="flex-1 bg-zinc-100 h-2 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.6 }}
                                  className="bg-[#FBBF24] h-full rounded-full"
                                />
                              </div>
                              <span className="w-6 text-zinc-400 text-right font-bold">{matching}</span>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleStartRequest(selectedProForReviews.cat.toLowerCase())}
                        className="w-full bg-zinc-950 text-white hover:bg-[#FBBF24] hover:text-zinc-900 py-4 rounded-2xl font-bold transition-all shadow-md text-sm text-center uppercase tracking-wider cursor-pointer active:scale-95"
                      >
                        Contratar {selectedProForReviews.name.split(' ')[0]}
                      </button>
                    </div>

                    {/* New review form */}
                    <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4 text-left">
                      <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#B8860B] mb-2">Deixar sua Avaliação</h4>
                      
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Seu Nome</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Amanda Silva"
                          className="w-full p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 focus:border-[#FBBF24] focus:bg-white transition-all outline-none font-bold text-xs"
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Nota (Estrelas)</label>
                        <div className="flex items-center gap-1.5 h-10">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              type="button"
                              key={starVal}
                              onClick={() => setNewReviewRating(starVal)}
                              className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                            >
                              <Star 
                                className={`w-6 h-6 ${starVal <= newReviewRating ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-zinc-200'}`} 
                              />
                            </button>
                          ))}
                          <span className="text-xs font-extrabold text-[#B8860B] ml-2">({newReviewRating} estrelas)</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Comentário</label>
                        <textarea 
                          rows={3}
                          placeholder="Escreva sua experiência sobre o atendimento..."
                          className="w-full p-3.5 rounded-xl border border-zinc-150 bg-zinc-50/50 focus:border-[#FBBF24] focus:bg-white transition-all outline-none font-medium text-xs resize-none"
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleAddReview(selectedProForReviews.name);
                        }}
                        className="w-full bg-[#FBBF24] hover:bg-[#F59E0B] text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#FBBF24]/10 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" /> Enviar Avaliação
                      </button>
                    </div>
                  </div>

                  {/* Right listed opinions column */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-zinc-100 shadow-sm space-y-6 min-h-[500px]">
                      <h4 className="text-xl font-bold italic text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-4 text-left">
                        <Star className="w-5 h-5 fill-[#FBBF24] text-[#FBBF24]" />
                        Opiniões dos Clientes
                      </h4>

                      <div className="space-y-4">
                        {(!proReviews[selectedProForReviews.name] || proReviews[selectedProForReviews.name].length === 0) ? (
                          <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-zinc-100/50">
                            <p className="text-zinc-400 italic font-medium">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                          </div>
                        ) : (
                          proReviews[selectedProForReviews.name].map((rev) => (
                            <div key={rev.id} className="p-6 bg-zinc-50/40 rounded-3xl border border-zinc-100/70 hover:border-zinc-200 transition-all text-left">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBBF24]/20 to-[#FBBF24]/5 text-[#B8860B] flex items-center justify-center font-extrabold text-sm uppercase shadow-sm">
                                    {rev.author.substring(0, 2)}
                                  </div>
                                  <div className="text-left">
                                    <h5 className="font-bold text-sm text-zinc-900 leading-none">{rev.author}</h5>
                                    <span className="text-[10px] text-[#B8860B] font-bold bg-[#FBBF24]/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">{rev.date}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-0.5 bg-[#FBBF24]/10 text-[#B8860B] py-1 px-2.5 rounded-full text-xs font-bold">
                                  <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                                  <span>{rev.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              <p className="text-zinc-600 text-xs font-medium leading-relaxed italic text-left pl-1">
                                "{rev.comment}"
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </main>

        {/* Bottom Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-zinc-100 flex justify-around p-4 z-50">
           <button onClick={() => setActiveTab(isPro ? 'requests' : 'feed')} className={`p-2 rounded-xl ${activeTab === (isPro ? 'requests' : 'feed') ? 'text-[#FBBF24]' : 'text-zinc-400'}`}>
             {isPro ? <Zap /> : <Search />}
           </button>
           <button onClick={() => setActiveTab('history')} className={`p-2 rounded-xl ${activeTab === 'history' ? 'text-[#FBBF24]' : 'text-zinc-400'}`}>
             <Clock />
           </button>
           <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-xl ${activeTab === 'chat' ? 'text-[#FBBF24]' : 'text-zinc-400'}`}>
             <ChatIcon />
           </button>
           <button onClick={() => setActiveTab('profile')} className={`p-2 rounded-xl ${activeTab === 'profile' ? 'text-[#FBBF24]' : 'text-zinc-400'}`}>
             <ShieldCheck />
           </button>
        </nav>
      </div>
    );
  }

  if (view === 'request') {
    return (
      <div className="min-h-screen bg-[#FDFCF8] py-12 px-6">
        <nav className="max-w-3xl mx-auto flex items-center justify-between mb-12">
          <button 
            onClick={() => { 
              setView(requestOriginView);
              setStep(1); 
            }}
            className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" /> Cancelar
          </button>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-[#FBBF24]' : 'bg-zinc-200'}`} />
            ))}
          </div>
        </nav>

        <main className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4">PASSO 1 DE 3</div>
                <h2 className="text-3xl font-bold mb-2 italic">O que você precisa hoje?</h2>
                <p className="text-zinc-500 mb-10 font-medium">Selecione a categoria principal para começarmos.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setFormData(p => ({...p, category: cat.id})); setStep(2); }}
                      className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all text-left ${
                        formData.category === cat.id 
                        ? 'border-[#FBBF24] bg-[#FBBF24]/5 translate-x-2' 
                        : 'border-zinc-100 hover:border-zinc-200 bg-white'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${cat.color}`}>
                        <cat.icon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-lg">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4">PASSO 2 DE 3</div>
                <h2 className="text-3xl font-bold mb-2 italic">Conte-nos os detalhes</h2>
                <p className="text-zinc-500 mb-10 font-medium">Quanto mais detalhes, melhor o orçamento.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Descrição do Serviço</label>
                    <textarea 
                      placeholder="Ex: Minha pia está vazando muito na parte de baixo..."
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none min-h-[150px] transition-all resize-none shadow-sm"
                      value={formData.description}
                      onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Urgência</label>
                    <div className="flex gap-4">
                      {['Normal', 'Urgente', 'Imediato'].map(u => (
                        <button
                          key={u}
                          onClick={() => setFormData(p => ({...p, urgency: u.toLowerCase()}))}
                          className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                            formData.urgency === u.toLowerCase()
                            ? 'border-[#FBBF24] bg-[#FBBF24] text-white shadow-lg shadow-[#FBBF24]/30'
                            : 'border-zinc-100 text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest leading-none">Orçamento Estimado (R$)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">R$</span>
                      <input 
                        type="number"
                        placeholder="Ex: 150"
                        className="w-full p-4 pl-12 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold bg-zinc-50 focus:bg-white"
                        value={formData.price}
                        onChange={(e) => setFormData(p => ({...p, price: e.target.value}))}
                      />
                    </div>
                  </div>
                  <div className="pt-6 flex gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="px-8 py-4 border-2 border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      disabled={!formData.description || !formData.price}
                      onClick={() => setStep(3)}
                      className="flex-1 px-8 py-4 bg-[#FBBF24] text-white rounded-2xl font-bold hover:bg-[#F59E0B] transition-all shadow-xl shadow-[#FBBF24]/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 lg:p-16"
              >
                <div className="bg-[#FBBF24]/10 text-[#B8860B] w-fit px-4 py-1 rounded-full text-xs font-bold mb-4">PASSO FINAL</div>
                <h2 className="text-3xl font-bold mb-2 italic">Onde e Quando?</h2>
                <p className="text-zinc-500 mb-10 font-medium">Finalize com as informações de logística.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Endereço Completo</label>
                    <input 
                      type="text"
                      placeholder="Rua, Número, Bairro e Cidade"
                      className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm"
                      value={formData.address}
                      onChange={(e) => setFormData(p => ({...p, address: e.target.value}))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Data Preferencial</label>
                      <input 
                        type="date"
                        className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm"
                        value={formData.date}
                        onChange={(e) => setFormData(p => ({...p, date: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Horário Preferencial</label>
                      <input 
                        type="text"
                        placeholder="Ex: 14:30"
                        maxLength={5}
                        className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold text-sm bg-zinc-50 focus:bg-white"
                        value={formData.preferredTime}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          let formatted = digits;
                          if (digits.length > 2) {
                            formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
                          }
                          setFormData(p => ({...p, preferredTime: formatted}));
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Tipo de Imóvel</label>
                      <select 
                        className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold text-sm bg-zinc-50 focus:bg-white"
                        value={formData.propertyType}
                        onChange={(e) => setFormData(p => ({...p, propertyType: e.target.value}))}
                      >
                        <option value="">Selecione...</option>
                        <option value="Residência">Residência (Casa)</option>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Condomínio-Sobrado">Condomínio / Sobrado</option>
                        <option value="Comercial">Sala Comercial</option>
                        <option value="Outro">Outro Imóvel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase text-zinc-400 mb-2 tracking-widest">Ponto de Referência</label>
                      <input 
                        type="text"
                        placeholder="Ex: Próximo ao Marco residencial / igreja"
                        className="w-full p-4 rounded-2xl border-2 border-zinc-100 focus:border-[#FBBF24] outline-none transition-all shadow-sm font-bold text-sm bg-zinc-50 focus:bg-white"
                        value={formData.referencePoint}
                        onChange={(e) => setFormData(p => ({...p, referencePoint: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div className="pt-8 bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#FBBF24]" /> 
                      Resumo da Solicitação
                    </h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Sua solicitação de <span className="font-bold text-zinc-900">{CATEGORIES.find(c => c.id === formData.category)?.name}</span> será enviada para 5 profissionais verificados próximos a você. Eles responderão com orçamentos em até 15 minutos.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="px-8 py-4 border-2 border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      disabled={!formData.address || !formData.date}
                      onClick={async () => {
                        if (!user) {
                          alert('Erro: Você precisa estar logado para fazer um pedido.');
                          setView('login');
                          return;
                        }

                        try {
                          const requestData = {
                            clientId: user.uid,
                            clientName: userProfile.name,
                            category: formData.category,
                            description: formData.description,
                            urgency: formData.urgency,
                            price: Number(formData.price),
                            date: formData.date,
                            address: formData.address,
                            preferredTime: formData.preferredTime || '',
                            propertyType: formData.propertyType || '',
                            referencePoint: formData.referencePoint || '',
                            status: 'pending',
                            createdAt: serverTimestamp()
                          };
                          await addDoc(collection(db, 'requests'), requestData);
                          
                          setView('dashboard-client');
                          setActiveTab('history');
                          setStep(1);
                          setFormData({ category: '', description: '', urgency: 'normal', price: '', date: '', address: '', phone: '', age: '', city: '', profession: '', avatar: '', preferredTime: '', propertyType: '', referencePoint: '', fullName: '', experienceYears: '', bio: '', verified: false });
                          alert('✅ Serviço publicado com sucesso! Aguarde o contato dos profissionais.');
                        } catch (error) {
                          console.error('Erro ao salvar pedido:', error);
                          alert('Erro ao publicar pedido. Tente novamente.');
                        }
                      }}
                      className="flex-1 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-zinc-200 active:scale-95 disabled:opacity-50"
                    >
                      Publicar Pedido
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        {overlays}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-zinc-900 selection:bg-[#FBBF24]/30">
      {/* Navigation */}
      <nav 
        id="navbar"
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-10 h-10 bg-[#FBBF24] rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-[#FBBF24]/20">H</div>
            <span className="text-2xl font-bold tracking-tight">homehelp</span>
          </div>

          {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleStartRequest()} className="font-medium hover:text-[#FBBF24] transition-colors cursor-pointer">Solicitar Serviço</button>
            <a href="#categories" className="font-medium hover:text-[#FBBF24] transition-colors">Categorias</a>
            <button onClick={() => handleStartProOnboarding()} className="font-medium hover:text-[#FBBF24] transition-colors cursor-pointer">Para Profissionais</button>
            {user ? (
              <button 
                onClick={() => setView(userProfile.role === 'pro' ? 'dashboard-pro' : 'dashboard-client')}
                className="bg-[#FBBF24] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#F59E0B] transition-all active:scale-95 shadow-lg shadow-[#FBBF24]/20 cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Painel
              </button>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-200 cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Content */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-zinc-100 overflow-hidden"
            >
              <div className="p-8 flex flex-col gap-8">
                <div className="flex flex-col gap-6 font-bold italic text-2xl">
                  <button onClick={() => { setIsMenuOpen(false); handleStartRequest(); }} className="text-left hover:text-[#FBBF24] transition-colors cursor-pointer">Solicitar Serviço</button>
                  <a href="#categories" onClick={() => setIsMenuOpen(false)} className="hover:text-[#FBBF24] transition-colors">Categorias</a>
                  <button onClick={() => { setIsMenuOpen(false); handleStartProOnboarding(); }} className="text-left hover:text-[#FBBF24] transition-colors cursor-pointer">Para Profissionais</button>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-8 border-t border-zinc-100">
                  {user ? (
                    <button 
                      onClick={() => { setIsMenuOpen(false); setView(userProfile.role === 'pro' ? 'dashboard-pro' : 'dashboard-client'); }}
                      className="col-span-2 bg-[#FBBF24] text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-xl shadow-[#FBBF24]/20"
                    >
                      Ir para meu Painel
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setIsMenuOpen(false); handleLogin('client'); }}
                        className="bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                      >
                        Painel Cliente
                      </button>
                      <button 
                        onClick={() => { setIsMenuOpen(false); handleLogin('pro'); }}
                        className="bg-zinc-900 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                      >
                        Painel Pro
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#F5F1E1] -z-10 rounded-l-[100px] hidden lg:block translate-x-20"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#FBBF24]/10 text-[#B8860B] px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              Gestão, Estratégia e Inovação
            </div>
            <h1 className="text-6xl lg:text-7xl font-bold leading-tight tracking-tighter mb-6 text-zinc-900">
              Trabalhe de maneira <span className="text-[#FBBF24]">Fácil</span>
            </h1>
            <p className="text-xl text-zinc-600 mb-10 max-w-lg leading-relaxed">
              Conectamos você aos melhores profissionais domésticos de forma rápida, prática e segura. Comece a cuidar da sua casa hoje.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#FBBF24] transition-colors" />
                <input 
                  type="text" 
                  placeholder={`Ex: ${placeholderExamples[placeholderIndex]}...`}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-200 focus:border-[#FBBF24] focus:ring-4 focus:ring-[#FBBF24]/10 outline-none transition-all shadow-sm"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
              <button 
                onClick={() => handleStartRequest()}
                className="bg-[#FBBF24] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#F59E0B] transition-all shadow-xl shadow-[#FBBF24]/20 active:scale-95"
              >
                Buscar agora
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24]" />)}
                </div>
                <span className="text-sm font-semibold text-zinc-500 italic">+2.500 avaliações de clientes satisfeitos</span>
              </div>
            </div>
          </motion.div>

          {/* Illustration Area */}
          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#FBBF24]/20 to-transparent rounded-full blur-3xl -z-10"></div>
            <div className="relative z-10 p-8">
              <img 
                src="/src/assets/images/domestic_professional_1779111727916.png" 
                alt="Domestic Professional" 
                className="rounded-3xl shadow-2xl object-cover h-[550px] w-full"
                referrerPolicy="no-referrer"
              />
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-zinc-100 max-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Online agora</span>
                </div>
                <p className="text-sm font-semibold mb-1">Juliana Santos</p>
                <p className="text-xs text-zinc-500 leading-tight">Especialista em Limpeza Pós-Obra</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories" className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold tracking-tight mb-4 italic">Nossas Categorias</h2>
              <p className="text-zinc-500">Selecione o tipo de serviço que você deseja para ver os profissionais disponíveis na sua região.</p>
            </div>
            <button 
              onClick={() => handleStartRequest()}
              className="group flex items-center gap-2 text-[#FBBF24] font-bold hover:underline cursor-pointer"
            >
              Ver todos os serviços <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {CATEGORIES.map((cat) => (
              <motion.div 
                key={cat.id}
                whileHover={{ y: -8 }}
                onClick={() => handleStartRequest(cat.id)}
                className="bg-white p-8 rounded-3xl border border-zinc-100 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-[#FBBF24]/30 transition-all cursor-pointer group"
              >
                <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <cat.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">A partir de R$ 80/h</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section id="why-section" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-zinc-900 rounded-[50px] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 translate-x-1/2"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 lg:p-20">
                <h2 className="text-white text-4xl lg:text-5xl font-bold mb-12 italic">Por que escolher o <span className="text-[#FBBF24]">homehelp?</span></h2>
                <div className="space-y-10">
                  {FEATURES.map((feature, idx) => (
                    <div key={idx} className="flex gap-6">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex-shrink-0 flex items-center justify-center text-[#FBBF24]">
                        <feature.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-white text-xl font-bold mb-2 underline decoration-[#FBBF24]/30 underline-offset-4">{feature.title}</h3>
                        <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => handleStartRequest()}
                  className="mt-12 group flex items-center gap-3 bg-white text-zinc-900 px-8 py-4 rounded-2xl font-bold hover:bg-[#FBBF24] transition-all cursor-pointer"
                >
                  Começar agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="hidden lg:block relative">
                <img 
                  src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=800" 
                  alt="Quality Home Service" 
                  className="absolute inset-0 h-full w-full object-cover opacity-80 brightness-75"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Banner */}
      <section className="py-12 bg-[#F5F1E1]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold italic">Segurança em primeiro lugar</p>
              <p className="text-zinc-600 font-medium">Garantia de qualidade em todos os serviços realizados.</p>
            </div>
          </div>
          <div className="flex gap-8 items-center font-bold tracking-tighter opacity-70 uppercase text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Pagamento Digital</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Suporte 24/7</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Profissionais Elite</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white border-2 border-dashed border-[#FBBF24] p-12 lg:p-20 rounded-[40px] shadow-2xl relative z-10"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 italic">Você é um profissional doméstico?</h2>
            <p className="text-zinc-500 text-xl mb-10">Junte-se à maior rede de serviços da cidade e aumente sua clientela de maneira rápida e organizada.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => handleStartProOnboarding()}
                className="bg-[#FBBF24] text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#FBBF24]/30 hover:-translate-y-1 transition-all"
              >
                Cadastrar-se como Profissional
              </button>
              <a 
                href="#why-section"
                className="bg-white border-2 border-zinc-200 text-zinc-900 px-10 py-5 rounded-2xl font-bold text-lg hover:border-[#FBBF24] hover:text-[#FBBF24] transition-all flex items-center justify-center"
              >
                Saber mais
              </a>
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-50 to-transparent opacity-50"></div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 pt-20 pb-12 text-zinc-400">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 bg-[#FBBF24] rounded-lg flex items-center justify-center font-bold">H</div>
              <span className="text-xl font-bold tracking-tight">homehelp</span>
            </div>
            <p className="leading-relaxed">Sua solução definitiva para gestão, estratégia e inovação em serviços domésticos. Trabalhe de maneira fácil agora mesmo.</p>
            <div className="flex gap-4">
              {['FB', 'IG', 'TW', 'LI'].map(social => (
                <div 
                  key={social} 
                  onClick={() => alert(`Siga nosso ${social} para novidades!`)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FBBF24] hover:text-zinc-900 transition-all cursor-pointer font-bold text-[10px]"
                >
                  {social}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">Serviços</h4>
            <ul className="space-y-4 font-medium">
              <li><button onClick={() => handleStartRequest('cleaning')} className="hover:text-white transition-colors cursor-pointer">Limpeza Residencial</button></li>
              <li><button onClick={() => handleStartRequest('electric')} className="hover:text-white transition-colors cursor-pointer">Manutenção Elétrica</button></li>
              <li><button onClick={() => handleStartRequest('hvac')} className="hover:text-white transition-colors cursor-pointer">Instalação de Ar</button></li>
              <li><button onClick={() => handleStartRequest('assembly')} className="hover:text-white transition-colors cursor-pointer">Montagem de Móveis</button></li>
              <li><button onClick={() => handleStartRequest('painting')} className="hover:text-white transition-colors cursor-pointer">Pintura e Reforma</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">Empresa</h4>
            <ul className="space-y-4 font-medium">
              <li><button onClick={() => alert('Info: homehelp - Fundada em 2024')} className="hover:text-white transition-colors cursor-pointer">Sobre Nós</button></li>
              <li><a href="#why-section" className="hover:text-white transition-colors cursor-pointer">Como Funciona</a></li>
              <li><button onClick={() => alert('Sua segurança é nossa prioridade.')} className="hover:text-white transition-colors cursor-pointer">Segurança</button></li>
              <li><button onClick={() => alert('Blog em manutenção.')} className="hover:text-white transition-colors cursor-pointer">Blog</button></li>
              <li><button onClick={() => handleStartProOnboarding()} className="hover:text-white transition-colors cursor-pointer">Carreiras</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 italic">Contato</h4>
            <ul className="space-y-4 font-medium">
              <li><a href="tel:08001234567" className="hover:text-white transition-colors">0800 123 4567</a></li>
              <li><a href="mailto:contato@homehelp.com" className="hover:text-white transition-colors">contato@homehelp.com</a></li>
              <li><button onClick={() => alert('Localização: Av. Inovação, 1000 - SP')} className="hover:text-white transition-colors text-left">Av. Inovação, 1000 - SP</button></li>
            </ul>
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Desenvolvido por</p>
              <span className="text-white font-bold">3informatica</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12 border-t border-white/5 text-center text-sm font-medium">
          <p>© 2026 homehelp. Todos os direitos reservados.</p>
        </div>
      </footer>
      {overlays}
    </div>
  );
}
