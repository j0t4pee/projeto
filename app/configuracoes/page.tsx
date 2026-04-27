'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  Menu, X, LogOut, Users, DollarSign, ClipboardList, Settings, ChevronLeft,
  ArrowLeft, Calendar as CalendarIcon, CalendarOff, 
  CheckCircle2, AlertCircle, Plus, Trash2, 
  ChevronRight, User, Info, ChevronDown, Check, AlertTriangle
} from 'lucide-react'

// Constante de Versão
const APP_VERSION = "v3.87.0-ui-folder-light" 

interface AlertState {
  isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
  title: string; message: string; onConfirm?: () => void;
}

// --- COMPONENTE SELECT CUSTOMIZADO (MODO CLARO) ---
const CustomSelect = ({ 
    options, value, onChange, placeholder = "Selecione...", icon: Icon 
}: { 
    options: { value: string, label: string }[], value: string, onChange: (val: string) => void, placeholder?: string, icon?: React.ElementType
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedLabel = options.find(o => o.value === value)?.label

    return (
        <div className="relative w-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white border border-gray-300 rounded-xl px-4 h-11 flex items-center justify-between text-sm transition-all hover:border-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && <Icon size={18} className="text-gray-400 shrink-0" />}
                    <span className={`truncate font-medium ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                        {selectedLabel || placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1.5 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                    value === option.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {value === option.value && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}
                        {options.length === 0 && <div className="px-4 py-3 text-sm text-gray-500 text-center">Nenhuma opção disponível</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState('padrao')

  const [loading, setLoading] = useState(true)
  const [dbAcolitos, setDbAcolitos] = useState<any[]>([])
  const [restrictions, setRestrictions] = useState<any[]>([])
  
  const [resCalendarDate, setResCalendarDate] = useState(new Date())
  const [selectedResAcolyte, setSelectedResAcolyte] = useState('')

  const [exclusionRules, setExclusionRules] = useState<{id: string, start: number, end: number}[]>([])
  const [exStart, setExStart] = useState('')
  const [exEnd, setExEnd] = useState('')
  
  const [fixedRules, setFixedRules] = useState<{ id?: number, acolito: string, day: string }[]>([]) 
  const [newFixedRule, setNewFixedRule] = useState({ acolito: '', day: '' })

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'info', title: '', message: ''
  })
  
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)

  const acoliteOptions = useMemo(() => {
      return dbAcolitos.map(a => ({
          value: `${a.nome} ${a.sobrenome || ''}`.trim(),
          label: `${a.nome} ${a.sobrenome || ''}`.trim()
      }))
  }, [dbAcolitos])

  useEffect(() => {
    setMounted(true)
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }

    try {
        const user = JSON.parse(authData)
        setUserProfile(user.perfil || 'padrao')
        if (user.perfil === 'padrao') {
            router.push('/') // Bloqueia acesso se não for diretoria/admin
        }
    } catch (e) { router.push('/login') }

    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    // LÓGICA DE AUTO-CLEAN (Virada de Mês)
    const today = new Date();
    const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    await supabase.from('restricoes').delete().lt('data_inicio', firstDayOfMonth);

    const [acolitosRes, restricoesRes, fixedRes] = await Promise.all([
        supabase.from('acolitos').select('id, nome, sobrenome, ativo').eq('ativo', true).order('nome'),
        supabase.from('restricoes').select('*').order('data_inicio', { ascending: true }),
        supabase.from('regras_fixas').select('*').order('day', { ascending: true })
    ])

    if (acolitosRes.data) setDbAcolitos(acolitosRes.data)
    if (restricoesRes.data) setRestrictions(restricoesRes.data)
    if (fixedRes.data) setFixedRules(fixedRes.data) 
    setLoading(false)
  }

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type })
  }
  const closeAlert = () => setCustomAlert({ ...customAlert, isOpen: false, onConfirm: undefined })

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }
  
  const handleToggleRestrictionDay = async (day: number) => {
      if (!selectedResAcolyte) return triggerAlert("Atenção", "Selecione um acólito primeiro no campo acima.", "warning");

      const year = resCalendarDate.getFullYear();
      const month = resCalendarDate.getMonth();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const existing = restrictions.find(r => 
          r.acolito_nome === selectedResAcolyte && r.data_inicio <= dateStr && (r.data_fim || r.data_inicio) >= dateStr
      );

      if (existing) {
          await supabase.from('restricoes').delete().eq('id', existing.id);
      } else {
          await supabase.from('restricoes').insert({ acolito_nome: selectedResAcolyte, data_inicio: dateStr, data_fim: dateStr });
      }
      
      const { data } = await supabase.from('restricoes').select('*').order('data_inicio', { ascending: true })
      if(data) setRestrictions(data)
  };

  const handleDeleteGroup = async (nome: string) => {
      const idsToDelete = restrictions.filter(r => r.acolito_nome === nome).map(r => r.id);
      if(idsToDelete.length > 0) {
          await supabase.from('restricoes').delete().in('id', idsToDelete);
          const { data } = await supabase.from('restricoes').select('*').order('data_inicio', { ascending: true })
          if(data) setRestrictions(data)
      }
  }

  const handleOpenClearModal = () => {
      setShowConfirmClearModal(true);
  }

  const executeClearAllRestrictions = async () => {
      setShowConfirmClearModal(false);
      
      const idsToDelete = restrictions.map(r => r.id);
      if(idsToDelete.length > 0) {
          const { error } = await supabase.from('restricoes').delete().in('id', idsToDelete);
          
          if (error) {
              triggerAlert("Erro", "Falha ao limpar restrições.", "error");
          } else {
              setRestrictions([]);
              triggerAlert("Sucesso", "Todas as restrições foram limpas.", "success");
          }
      } else {
          triggerAlert("Aviso", "Não há restrições para limpar.", "warning");
      }
  }

  const formatDateRange = (rules: any[]) => {
      const dates = new Set<string>();
      rules.forEach(r => {
         let curr = new Date(r.data_inicio + 'T12:00:00');
         const end = new Date((r.data_fim || r.data_inicio) + 'T12:00:00');
         while(curr <= end) { dates.add(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate() + 1); }
      });
      const sortedDates = Array.from(dates).sort();
      if(sortedDates.length === 0) return "";

      const ranges: string[] = [];
      let start = sortedDates[0], prev = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
          const currDate = new Date(sortedDates[i] + 'T12:00:00');
          const prevDate = new Date(prev + 'T12:00:00');
          const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);

          if (diffDays === 1) { prev = sortedDates[i]; } 
          else {
              if (start === prev) ranges.push(new Date(start + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
              else ranges.push(`${new Date(start + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a ${new Date(prev + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}`);
              start = sortedDates[i]; prev = sortedDates[i];
          }
      }
      if (start === prev) ranges.push(new Date(start + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
      else ranges.push(`${new Date(start + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a ${new Date(prev + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}`);

      return ranges.join(", ");
  }

  const groupedRestrictions = useMemo(() => {
      const groups: { [key: string]: any[] } = {}
      restrictions.forEach(r => {
          if (!groups[r.acolito_nome]) groups[r.acolito_nome] = []
          groups[r.acolito_nome].push(r)
      })
      return groups
  }, [restrictions])

  const addExclusionRule = () => {
      const start = parseInt(exStart); const end = exEnd ? parseInt(exEnd) : start;
      if (!start || isNaN(start)) return;
      setExclusionRules([...exclusionRules, { id: Math.random().toString(), start, end }]);
      setExStart(''); setExEnd('');
  }

  const addFixedRule = async () => {
      if(!newFixedRule.acolito || !newFixedRule.day) return;
      
      const payload = { acolito: newFixedRule.acolito, day: newFixedRule.day };
      
      const { data, error } = await supabase.from('regras_fixas').insert([payload]).select();
      
      if (error) {
          triggerAlert("Erro", "Falha ao salvar regra fixa.", "error");
      } else if (data) {
          setFixedRules([...fixedRules, data[0]]);
          setNewFixedRule({ acolito: '', day: '' });
          triggerAlert("Sucesso", "Regra fixa adicionada.", "success");
      }
  }

  const deleteFixedRule = async (id: number | undefined, index: number) => {
      if (id) {
          await supabase.from('regras_fixas').delete().eq('id', id);
      }
      setFixedRules(prev => prev.filter((_, idx) => idx !== index));
  }

  const renderResCalendar = () => {
      const year = resCalendarDate.getFullYear();
      const month = resCalendarDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      
      const days = [];
      for(let i=0; i<firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full h-12"/>);
      
      for(let d=1; d<=daysInMonth; d++) {
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isRestricted = selectedResAcolyte && restrictions.some(r => r.acolito_nome === selectedResAcolyte && r.data_inicio <= dateStr && (r.data_fim || r.data_inicio) >= dateStr);

          days.push(
              <button key={d} onClick={() => handleToggleRestrictionDay(d)} disabled={!selectedResAcolyte}
                className={`w-full h-12 flex items-center justify-center rounded-xl text-sm font-bold transition-all border shadow-sm
                  ${!selectedResAcolyte ? 'opacity-50 cursor-not-allowed border-gray-100 text-gray-400 bg-gray-50 shadow-none' : 
                  isRestricted ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  {d}
              </button>
          )
      }

      return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col shadow-sm">
               <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setResCalendarDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronLeft size={24}/></button>
                  <span className="text-lg font-bold text-gray-900 uppercase tracking-wide">{resCalendarDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                  <button onClick={() => setResCalendarDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronRight size={24}/></button>
              </div>
              <div className="grid grid-cols-7 gap-3 text-center mb-3">
                 {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-xs text-gray-400 font-bold uppercase">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-3 flex-1 content-start">{days}</div>
              
              <div className="flex items-center justify-center gap-8 mt-8 pt-5 border-t border-gray-100">
                   <div className="flex items-center gap-2.5">
                       <div className="w-3.5 h-3.5 bg-white border-2 border-gray-300 rounded-full"></div> 
                       <span className="text-sm text-gray-600 font-medium">Disponível</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                       <div className="w-3.5 h-3.5 bg-red-50 border-2 border-red-400 rounded-full"></div> 
                       <span className="text-sm text-gray-600 font-medium">Indisponível</span>
                   </div>
              </div>
          </div>
      )
  }

  const canManage = userProfile === 'admin' || userProfile === 'diretoria';

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 lg:pb-0 selection:bg-blue-500/30">
      
      {/* Alertas */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      customAlert.type === 'error' ? 'bg-red-50 text-red-500' : 
                      customAlert.type === 'success' ? 'bg-green-50 text-green-500' : 
                      customAlert.type === 'warning' ? 'bg-yellow-50 text-yellow-600' : 
                      'bg-blue-50 text-blue-600'
                  }`}>
                      {customAlert.type === 'error' && <AlertCircle size={28}/>}
                      {customAlert.type === 'success' && <CheckCircle2 size={28}/>}
                      {customAlert.type === 'warning' && <AlertTriangle size={28}/>}
                      {customAlert.type === 'info' && <AlertCircle size={28}/>}
                  </div>
                  
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{customAlert.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{customAlert.message}</p>
                  </div>

                  <button onClick={closeAlert} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition">Entendi</button>
              </div>
          </div>
      )}

      {/* Modal de Confirmação: Limpar Todas as Restrições */}
      {showConfirmClearModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl text-center space-y-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-50 text-red-600">
                      <AlertTriangle size={28} />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Limpar Todas as Restrições?</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                          Tem certeza que deseja apagar <strong className="text-gray-900">TODAS</strong> as restrições de <strong className="text-gray-900">TODOS</strong> os acólitos? Esta ação não poderá ser desfeita.
                      </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowConfirmClearModal(false)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition">
                          Cancelar
                      </button>
                      <button onClick={executeClearAllRestrictions} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                          <Trash2 size={16} /> Limpar Tudo
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header Mobile Opcional */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 p-1 -ml-1"><Menu size={24}/></button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md">JP</div>
            <h1 className="text-sm font-bold text-gray-900">Configurações</h1>
         </div>
      </header>

      {/* Overlay Mobile */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar / Menu Vertical */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
         <div className="p-5 border-b border-gray-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md">JP</div>
                 <div>
                     <h1 className="text-sm font-bold leading-none text-gray-900">São José Operário</h1>
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userProfile === 'admin' ? 'Admin' : 'Diretoria'}</span>
                 </div>
             </div>
             <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
         </div>

         <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium transition">
                <ChevronLeft size={18}/> Voltar ao Início
            </Link>

            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3 px-2">Menu Principal</div>
            {canManage && (
                <>
                    <Link href="/financeiro" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
                        <DollarSign size={18}/> Financeiro
                    </Link>
                    <Link href="/atas" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
                        <ClipboardList size={18}/> Atas
                    </Link>
                    <Link href="/escala-complementar" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
                        <Settings size={18}/> Escala Complementar
                    </Link>
                    <Link href="/acolitos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
                        <Users size={18}/> Equipe
                    </Link>
                    <Link href="/configuracoes" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
                        <Settings size={18}/> Configurações
                    </Link>
                </>
            )}
         </nav>

         <div className="p-4 border-t border-gray-100 flex items-center gap-2">
              <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold transition text-sm">
                  <LogOut size={16}/> Sair do Sistema
              </button>
         </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 lg:ml-64 px-4 py-8 max-w-7xl mx-auto w-full pt-20 lg:pt-8">
        
        {/* Título da Página */}
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                <Settings size={24} className="text-blue-600"/> Configurações Gerais
            </h2>
            <p className="text-sm text-gray-500 font-medium">Gestão de restrições de acólitos e regras do gerador automático</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            <div className="lg:col-span-2 space-y-8">
                {/* BLOCO 1: SELEÇÃO E CALENDÁRIO */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarOff className="text-red-500" size={20}/> Indisponibilidade Individual</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Selecione um acólito e clique nos dias para bloquear.</p>
                        </div>
                        <div className="w-full md:w-72">
                            <CustomSelect 
                                value={selectedResAcolyte} 
                                onChange={setSelectedResAcolyte} 
                                options={acoliteOptions}
                                placeholder="Selecione o Acólito..."
                                icon={User}
                            />
                        </div>
                    </div>

                    <div className="h-auto">
                        {renderResCalendar()}
                    </div>
                </div>

                {/* BLOCO 2: LISTA DE RESTRIÇÕES SALVAS */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Info className="text-blue-600" size={20}/>
                            <h2 className="text-lg font-bold text-gray-900">Restrições Salvas</h2>
                        </div>
                        {restrictions.length > 0 && (
                            <button 
                                onClick={handleOpenClearModal}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg transition flex items-center gap-1.5 font-bold"
                            >
                                <Trash2 size={14}/> Limpar Todas
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.keys(groupedRestrictions).length === 0 ? (
                            <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <CalendarOff size={32} className="mx-auto text-gray-400 mb-3"/>
                                <p className="text-sm font-medium text-gray-500">Nenhuma restrição registrada no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(groupedRestrictions).map(([name, rules]) => (
                                    <div key={name} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors group relative shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-gray-900 text-sm flex items-center gap-2 truncate">
                                                <User size={14} className="text-blue-500"/> {name}
                                            </span>
                                            <button onClick={() => handleDeleteGroup(name)} className="text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 p-1.5 rounded-lg transition shrink-0"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="text-xs text-blue-700 font-bold leading-relaxed bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                            {formatDateRange(rules)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                
                {/* PULAR DIAS (GLOBAL) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:sticky lg:top-8">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2"><AlertCircle className="text-orange-500" size={18}/> Pular Dias (Global)</h3>
                        <p className="text-xs text-gray-500">Impede que o gerador escale qualquer pessoa nesses dias (ex: feriados).</p>
                    </div>
                    
                    <div className="flex gap-2 items-end mb-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">De</label>
                            <input type="text" inputMode="numeric" placeholder="DD" value={exStart} onChange={e => setExStart(e.target.value.replace(/\D/g, ''))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition text-center font-bold"/>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Até</label>
                            <input type="text" inputMode="numeric" placeholder="DD" value={exEnd} onChange={e => setExEnd(e.target.value.replace(/\D/g, ''))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition text-center font-bold"/>
                        </div>
                        <button onClick={addExclusionRule} className="h-[46px] px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition shadow-md shadow-orange-500/20"><Plus size={20}/></button>
                    </div>

                    <div className="space-y-2">
                        {exclusionRules.map(rule => (
                            <div key={rule.id} className="flex justify-between items-center text-xs bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition">
                                <span className="text-gray-700 font-bold">{rule.start === rule.end ? `Dia ${rule.start}` : `Dia ${rule.start} ao ${rule.end}`}</span>
                                <button onClick={() => setExclusionRules(prev => prev.filter(p => p.id !== rule.id))} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-md border border-gray-200"><X size={14}/></button>
                            </div>
                        ))}
                        {exclusionRules.length === 0 && <p className="text-xs text-gray-500 font-medium italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhum dia bloqueado globalmente.</p>}
                    </div>

                    {/* REGRAS FIXAS (PRIORIDADE ALTA) */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="mb-5">
                            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18}/> Escala Fixa</h3>
                            <p className="text-xs text-gray-500">Garante a escala do acólito no dia escolhido (Fura a fila).</p>
                        </div>

                        <div className="space-y-3 mb-4">
                            <CustomSelect 
                                value={newFixedRule.acolito} 
                                onChange={(val) => setNewFixedRule({...newFixedRule, acolito: val})} 
                                options={acoliteOptions}
                                placeholder="Selecione o Acólito..."
                            />
                            
                            <div className="flex gap-2">
                                <input type="text" inputMode="numeric" placeholder="Dia (1-31)" value={newFixedRule.day} onChange={e => setNewFixedRule({...newFixedRule, day: e.target.value.replace(/\D/g, '')})} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition text-center font-bold" maxLength={2}/>
                                <button onClick={addFixedRule} className="h-[46px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/20"><Plus size={20}/></button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {fixedRules.map((rule, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 group hover:border-gray-300 transition">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-black text-emerald-600 border border-emerald-100 shadow-sm">{rule.day}</span>
                                        <span className="text-gray-900 font-bold truncate max-w-[120px] sm:max-w-[150px]">{rule.acolito}</span>
                                    </div>
                                    <button onClick={() => deleteFixedRule(rule.id, i)} className="text-gray-400 hover:text-red-600 bg-white p-1.5 rounded-md border border-gray-200 transition"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {fixedRules.length === 0 && <p className="text-xs text-gray-500 font-medium italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nenhuma regra fixa definida.</p>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  )
}