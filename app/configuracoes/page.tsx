'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, Calendar as CalendarIcon, CalendarOff, 
  CheckCircle2, AlertCircle, Plus, Trash2, 
  ChevronLeft, ChevronRight, User, Settings, Info, X, ChevronDown, Check
} from 'lucide-react'
import Link from 'next/link'

interface AlertState {
    isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
    title: string; message: string;
}

// --- COMPONENTE SELECT CUSTOMIZADO ---
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
                className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 h-11 flex items-center justify-between text-sm transition-all hover:border-zinc-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && <Icon size={18} className="text-zinc-500 shrink-0" />}
                    <span className={`truncate font-medium ${value ? 'text-zinc-200' : 'text-zinc-500'}`}>
                        {selectedLabel || placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1.5 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => { onChange(option.value); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                    value === option.value ? 'bg-blue-600 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {value === option.value && <Check size={14} />}
                            </button>
                        ))}
                        {options.length === 0 && <div className="px-4 py-3 text-sm text-zinc-500 text-center">Nenhuma opção disponível</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dbAcolitos, setDbAcolitos] = useState<any[]>([])
  const [restrictions, setRestrictions] = useState<any[]>([])
  
  const [resCalendarDate, setResCalendarDate] = useState(new Date())
  const [selectedResAcolyte, setSelectedResAcolyte] = useState('')

  const [exclusionRules, setExclusionRules] = useState<{id: string, start: number, end: number}[]>([])
  const [exStart, setExStart] = useState('')
  const [exEnd, setExEnd] = useState('')
  
  // Agora guardamos o ID do banco também
  const [fixedRules, setFixedRules] = useState<{ id?: number, acolito: string, day: string }[]>([]) 
  const [newFixedRule, setNewFixedRule] = useState({ acolito: '', day: '' })

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'info', title: '', message: ''
  })

  const acoliteOptions = useMemo(() => {
      return dbAcolitos.map(a => ({
          value: `${a.nome} ${a.sobrenome || ''}`.trim(),
          label: `${a.nome} ${a.sobrenome || ''}`.trim()
      }))
  }, [dbAcolitos])

  useEffect(() => {
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [acolitosRes, restricoesRes, fixedRes] = await Promise.all([
        supabase.from('acolitos').select('id, nome, sobrenome, ativo').eq('ativo', true).order('nome'),
        supabase.from('restricoes').select('*').order('data_inicio', { ascending: true }),
        // Busca as regras fixas salvas no banco
        supabase.from('regras_fixas').select('*').order('day', { ascending: true })
    ])

    if (acolitosRes.data) setDbAcolitos(acolitosRes.data)
    if (restricoesRes.data) setRestrictions(restricoesRes.data)
    if (fixedRes.data) setFixedRules(fixedRes.data) // Carrega no estado
    setLoading(false)
  }

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type })
      setTimeout(() => setCustomAlert({ ...customAlert, isOpen: false }), 3000)
  }
  
  const handleToggleRestrictionDay = async (day: number) => {
      if (!selectedResAcolyte) return triggerAlert("Atenção", "Selecione um acólito primeiro.");

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

  // --- NOVA FUNÇÃO PARA SALVAR NO BANCO ---
  const addFixedRule = async () => {
      if(!newFixedRule.acolito || !newFixedRule.day) return;
      
      const payload = { acolito: newFixedRule.acolito, day: newFixedRule.day };
      
      // Salva no Supabase
      const { data, error } = await supabase.from('regras_fixas').insert([payload]).select();
      
      if (error) {
          triggerAlert("Erro", "Falha ao salvar regra fixa.", "error");
      } else if (data) {
          // Atualiza o estado local com o ID gerado pelo banco
          setFixedRules([...fixedRules, data[0]]);
          setNewFixedRule({ acolito: '', day: '' });
          triggerAlert("Sucesso", "Regra fixa salva.", "success");
      }
  }

  // --- NOVA FUNÇÃO PARA DELETAR DO BANCO ---
  const deleteFixedRule = async (id: number | undefined, index: number) => {
      if (id) {
          // Se tem ID, apaga do banco
          await supabase.from('regras_fixas').delete().eq('id', id);
      }
      // Atualiza visualmente
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
                className={`w-full h-12 flex items-center justify-center rounded-xl text-sm font-bold transition-all border
                  ${!selectedResAcolyte ? 'opacity-30 cursor-not-allowed border-zinc-800 text-zinc-600' : isRestricted ? 'bg-red-900/40 border-red-500/50 text-red-400 hover:bg-red-900/60' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                  {d}
              </button>
          )
      }

      return (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col shadow-lg">
               <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setResCalendarDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition"><ChevronLeft size={24}/></button>
                  <span className="text-lg font-bold text-white uppercase tracking-wide">{resCalendarDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                  <button onClick={() => setResCalendarDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition"><ChevronRight size={24}/></button>
              </div>
              <div className="grid grid-cols-7 gap-3 text-center mb-3">
                 {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-xs text-zinc-500 font-bold uppercase">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-3 flex-1 content-start">{days}</div>
              
              <div className="flex items-center justify-center gap-8 mt-8 pt-5 border-t border-zinc-800">
                   <div className="flex items-center gap-2.5">
                       <div className="w-3.5 h-3.5 bg-zinc-900 border border-zinc-700 rounded-full"></div> 
                       <span className="text-sm text-zinc-400 font-medium">Disponível</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                       <div className="w-3.5 h-3.5 bg-red-900/40 border border-red-500/50 rounded-full"></div> 
                       <span className="text-sm text-zinc-400 font-medium">Indisponível</span>
                   </div>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft size={20}/></Link>
            <h1 className="text-lg font-bold uppercase flex items-center gap-2">
                <Settings size={20} className="text-purple-500"/> Configurações Gerais
            </h1>
        </div>
      </header>

      {customAlert.isOpen && (
          <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
              <div className={`px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 ${customAlert.type === 'error' ? 'bg-red-900/20 border-red-900/50 text-red-200' : 'bg-green-900/20 border-green-900/50 text-green-200'}`}>
                  {customAlert.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
                  <div><p className="font-bold text-sm">{customAlert.title}</p><p className="text-xs opacity-80">{customAlert.message}</p></div>
              </div>
          </div>
      )}

      <main className="pt-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA (2/3) - CALENDÁRIO E LISTA */}
            <div className="lg:col-span-2 space-y-8">
                {/* BLOCO 1: SELEÇÃO E CALENDÁRIO */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><CalendarOff className="text-red-500"/> Indisponibilidade Individual</h2>
                            <p className="text-sm text-zinc-400 mt-1">Selecione um acólito e clique nos dias para bloquear.</p>
                        </div>
                        {/* SELECT CUSTOMIZADO */}
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
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Info className="text-blue-500" size={20}/>
                        <h2 className="text-lg font-bold text-white">Restrições Salvas</h2>
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.keys(groupedRestrictions).length === 0 ? (
                            <div className="p-10 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                                <CalendarOff size={32} className="mx-auto text-zinc-700 mb-3"/>
                                <p className="text-sm text-zinc-500">Nenhuma restrição registrada no sistema.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(groupedRestrictions).map(([name, rules]) => (
                                    <div key={name} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition group relative shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-white text-sm flex items-center gap-2">
                                                <User size={14} className="text-zinc-500"/> {name}
                                            </span>
                                            <button onClick={() => handleDeleteGroup(name)} className="text-zinc-600 hover:text-red-500 bg-zinc-950 hover:bg-red-950/30 p-2 rounded-lg transition"><Trash2 size={16}/></button>
                                        </div>
                                        <div className="text-xs text-blue-300 font-medium leading-relaxed bg-blue-950/30 p-3 rounded-lg border border-blue-900/30">
                                            {formatDateRange(rules)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* COLUNA DIREITA (1/3) - CONFIGURAÇÕES GLOBAIS */}
            <div className="lg:col-span-1 space-y-8">
                
                {/* PULAR DIAS (GLOBAL) */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-sm sticky top-24">
                    <div className="mb-6">
                        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2"><AlertCircle className="text-orange-500" size={18}/> Pular Dias (Global)</h3>
                        <p className="text-xs text-zinc-500">Dias sem escala para ninguém (ex: feriados).</p>
                    </div>
                    
                    <div className="flex gap-2 items-end mb-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">De</label>
                            <input type="text" inputMode="numeric" placeholder="DD" value={exStart} onChange={e => setExStart(e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition text-center font-bold"/>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">Até</label>
                            <input type="text" inputMode="numeric" placeholder="DD" value={exEnd} onChange={e => setExEnd(e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition text-center font-bold"/>
                        </div>
                        <button onClick={addExclusionRule} className="h-[46px] px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition shadow-lg shadow-orange-900/20"><Plus size={20}/></button>
                    </div>

                    <div className="space-y-2">
                        {exclusionRules.map(rule => (
                            <div key={rule.id} className="flex justify-between items-center text-xs bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800">
                                <span className="text-zinc-300 font-bold">{rule.start === rule.end ? `Dia ${rule.start}` : `Dia ${rule.start} ao ${rule.end}`}</span>
                                <button onClick={() => setExclusionRules(prev => prev.filter(p => p.id !== rule.id))} className="text-zinc-500 hover:text-red-500"><X size={14}/></button>
                            </div>
                        ))}
                        {exclusionRules.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-4 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800/50">Nenhum dia bloqueado globalmente.</p>}
                    </div>

                    <div className="mt-8 pt-8 border-t border-zinc-800">
                        <div className="mb-6">
                            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18}/> Escala Fixa</h3>
                            <p className="text-xs text-zinc-500">Garante acólito em dia específico (Prioridade Alta).</p>
                        </div>

                        <div className="space-y-3 mb-4">
                            {/* SELECT CUSTOMIZADO TAMBÉM NA ESCALA FIXA */}
                            <CustomSelect 
                                value={newFixedRule.acolito} 
                                onChange={(val) => setNewFixedRule({...newFixedRule, acolito: val})} 
                                options={acoliteOptions}
                                placeholder="Selecione o Acólito..."
                            />
                            
                            <div className="flex gap-2">
                                <input type="text" inputMode="numeric" placeholder="Dia (1-31)" value={newFixedRule.day} onChange={e => setNewFixedRule({...newFixedRule, day: e.target.value.replace(/\D/g, '')})} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-500 transition text-center font-bold" maxLength={2}/>
                                <button onClick={addFixedRule} className="h-[46px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-lg shadow-emerald-900/20"><Plus size={20}/></button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {fixedRules.map((rule, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 group hover:border-zinc-700 transition">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center font-bold text-emerald-500 border border-emerald-900/30">{rule.day}</span>
                                        <span className="text-zinc-200 font-bold">{rule.acolito}</span>
                                    </div>
                                    <button onClick={() => deleteFixedRule(rule.id, i)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {fixedRules.length === 0 && <p className="text-xs text-zinc-600 italic text-center py-4 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800/50">Nenhuma regra fixa definida.</p>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  )
}