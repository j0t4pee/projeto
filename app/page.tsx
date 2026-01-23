'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  Plus, X, Clock, Users, LogOut, Trash2, Save, FileText, Edit2, 
  Filter, Eye, ChevronDown, Calendar as CalendarIcon, CalendarOff, 
  Wand2, ChevronLeft, ChevronRight, Settings, ClipboardList, 
  ArrowLeft, CheckCircle2, AlertCircle, Info, Download, AlertTriangle, 
  Search, DollarSign, Flame, BookOpen 
} from 'lucide-react'

// --- CONSTANTES & TIPOS ---
const APP_VERSION = "v3.60.0-ui-refactor" 

const RELEASE_NOTES = [
    "UI: Menu superior reorganizado e intuitivo.",
    "Novo: Botão 'Regras do Sistema' adicionado ao menu.",
    "Relatório: Espaçamento entre nomes reduzido.",
    "Sistema: Geração de escalas com validação rigorosa."
]

interface NewEscala {
    data: string; hora: string; local: string; observacao: string; cor: string;
    acolitos: { nome: string; funcao: string }[];
}

interface AlertState {
    isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
    title: string; message: string; onConfirm?: () => void; isConfirmDialog: boolean;
}

// Interface para regras de exclusão de dias
interface ExclusionRule {
    id: string;
    start: number;
    end: number;
}

const ROLES = ['Missal', 'Vela', 'Turíbulo', 'Naveta']
const ROLE_SIGLA: { [key: string]: string } = { 'Missal': 'M', 'Vela': 'V', 'Turíbulo': 'T', 'Naveta': 'N' }
const PLACES = ["São José Operário", "Capela Nsa. Sra. das Graças", "Nsa. Sra. da Abadia", "Santa Clara"]
const PLACE_SIGLA: { [key: string]: string } = {
    "São José Operário": "SJO", "Capela Nsa. Sra. das Graças": "NSG",
    "Nsa. Sra. da Abadia": "NSA", "Santa Clara": "SC"
}
const ITEMS_PER_PAGE = 10
const SUNDAY_SCHEDULE = ['07:30', '09:00', '17:30', '19:00']
const PLACE_COLORS: { [key: string]: string } = {
    "São José Operário": "border-l-blue-600",
    "Capela Nsa. Sra. das Graças": "border-l-emerald-600",
    "Nsa. Sra. da Abadia": "border-l-orange-600",
    "Santa Clara": "border-l-violet-600"
}
const ROLE_BADGE_STYLE = "border-zinc-700 text-zinc-300 bg-zinc-800/80"

const VERSICULOS = [
  { text: "Em todo o tempo ama o amigo e para a hora da angústia nasce o irmão.", ref: "Provérbios 17:17" },
  { text: "Tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor.", ref: "Colossenses 3:23" },
  { text: "Servi ao Senhor com alegria; e entrai diante dele com canto.", ref: "Salmos 100:2" },
]

// --- COMPONENTES AUXILIARES ---

const DailyVerseFooter = React.memo(() => {
    const [verse, setVerse] = useState(VERSICULOS[0])
    useEffect(() => {
        setVerse(VERSICULOS[Math.floor(Math.random() * VERSICULOS.length)])
        const intervalId = setInterval(() => {
            setVerse(VERSICULOS[Math.floor(Math.random() * VERSICULOS.length)])
        }, 15000)
        return () => clearInterval(intervalId)
    }, [])
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-200 text-center z-40">
            <p className="text-xs text-zinc-900 font-serif italic">
                "{verse.text}" <span className="font-bold text-blue-600 not-italic ml-1">{verse.ref}</span>
            </p>
        </div>
    )
})
DailyVerseFooter.displayName = 'DailyVerseFooter'

const MemoizedCalendar = React.memo(({ 
    currentDate, setDate, rawEvents, filterDate, setFilterDate 
}: { 
    currentDate: Date, setDate: (d: Date) => void, rawEvents: any[], filterDate: string | null, setFilterDate: (s: string | null) => void 
}) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    
    const eventDays = useMemo(() => {
        const set = new Set(rawEvents.map(e => e.data))
        return set
    }, [rawEvents])

    const days = []
    for(let i=0; i<firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8"/>)
    
    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const hasEvent = eventDays.has(dateStr)
        const isToday = new Date().toLocaleDateString('en-CA') === dateStr
        const isSelected = filterDate === dateStr

        let bgClass = 'hover:bg-zinc-800 text-zinc-400'
        if (isSelected) bgClass = 'bg-blue-600 text-white font-medium shadow-md transform scale-110'
        else if (isToday) bgClass = 'border border-blue-600 text-blue-600 font-medium'

        days.push(
            <button key={d} onClick={() => setFilterDate(isSelected ? null : dateStr)} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs relative transition-all ${bgClass}`}>
                {d}
                {hasEvent && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>}
            </button>
        )
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><ChevronLeft size={16}/></button>
                <span className="text-sm font-medium capitalize text-zinc-200">{currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] text-zinc-500 font-medium mb-2">{d}</span>)}
                {days}
            </div>
            {filterDate && <div className="mt-3 text-center border-t border-zinc-800 pt-2"><button onClick={() => setFilterDate(null)} className="text-xs text-blue-500 hover:underline font-medium">Ver todos os dias</button></div>}
        </div>
    )
})
MemoizedCalendar.displayName = 'MemoizedCalendar'


// --- COMPONENTE PRINCIPAL ---

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false)
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false) // Modal de regras
  
  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'info', title: '', message: '', isConfirmDialog: false
  })
  
  const [showGenSettings, setShowGenSettings] = useState(false)

  // Dados
  const [loading, setLoading] = useState(true)
  const [dbAcolitos, setDbAcolitos] = useState<any[]>([]) 
  const [restrictions, setRestrictions] = useState<any[]>([])
  const [rawEvents, setRawEvents] = useState<any[]>([])
  
  // Filtros
  const [userProfile, setUserProfile] = useState('padrao')
  const [userName, setUserName] = useState('') 
  
  const [showOnlyMyScales, setShowOnlyMyScales] = useState(false)
  const [selectedAcolyte, setSelectedAcolyte] = useState('') 
  const [selectedPlace, setSelectedPlace] = useState('')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  
  // Paginação e Calendário
  const [currentPage, setCurrentPage] = useState(1)
  const [calendarDate, setCalendarDate] = useState(new Date()) 
  const [filterDate, setFilterDate] = useState<string | null>(null)

  // Edit/Gen
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  
  // Gerador
  const [autoGenMonth, setAutoGenMonth] = useState(new Date().toISOString().slice(0, 7)) 
  const [isGenerating, setIsGenerating] = useState(false)
  const [clearBeforeGenerate, setClearBeforeGenerate] = useState(true)

  // Opção para o Dia 19
  const [includeDay19, setIncludeDay19] = useState(true)
  
  // -- ESTADOS PARA EXCLUSÃO DE DIAS --
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([])
  const [exStart, setExStart] = useState('')
  const [exEnd, setExEnd] = useState('')
  
  const [fixedRules, setFixedRules] = useState<{ acolito: string, day: string }[]>([]) 
  const [newFixedRule, setNewFixedRule] = useState({ acolito: '', day: '' })

  const [formData, setFormData] = useState({
    date: '', time: '', place: PLACES[0], obs: '',
    acolitos: [
        { nome: '', funcao: 'Missal' }, 
        { nome: '', funcao: 'Vela' }
    ]
  })

  const [resForm, setResForm] = useState({ acolito: '', data_inicio: '', data_fim: '' })

  const canManage = userProfile === 'admin' || userProfile === 'diretoria';
  const canEditContext = canManage; 

  useEffect(() => { 
    setMounted(true)
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }

    try {
        const user = JSON.parse(authData)
        setUserProfile(user.perfil || 'padrao')
        setUserName(user.nome || '') 
    } catch (e) { router.push('/login') }

    fetchInitialData()

    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (customAlert.isOpen) {
                closeAlert()
                return
            }
            setIsModalOpen(false); setIsAutoModalOpen(false); setIsRestrictionModalOpen(false); 
            setIsAboutModalOpen(false); setIsRulesModalOpen(false);
        }
    }
    window.addEventListener('keydown', handleEsc)
    return () => { window.removeEventListener('keydown', handleEsc) }
  }, [customAlert.isOpen])

  useEffect(() => {
      if (isAutoModalOpen) {
          const year = calendarDate.getFullYear()
          const month = String(calendarDate.getMonth() + 1).padStart(2, '0')
          setAutoGenMonth(`${year}-${month}`)
          if (!showGenSettings) setShowGenSettings(false)
          setIncludeDay19(true)
      }
  }, [isAutoModalOpen, calendarDate])

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type, isConfirmDialog: false })
  }

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
      setCustomAlert({ isOpen: true, title, message, type: 'warning', isConfirmDialog: true, onConfirm })
  }

  const closeAlert = () => {
      setCustomAlert({ ...customAlert, isOpen: false })
  }

  async function fetchInitialData() {
    setLoading(true)
    const [acolitosRes, restricoesRes, escalasRes] = await Promise.all([
        supabase.from('acolitos').select('id, nome, sobrenome, ativo, genero, apenas_fim_de_semana, parceiro_id, manuseia_missal, manuseia_turibulo').eq('ativo', true).order('nome'),
        supabase.from('restricoes').select('*').order('data_inicio', { ascending: true }),
        supabase.from('escalas').select('*').order('data', { ascending: true }).order('hora', { ascending: true })
    ])

    if (acolitosRes.data) setDbAcolitos(acolitosRes.data)
    if (restricoesRes.data) setRestrictions(restricoesRes.data)
    if (escalasRes.data) setRawEvents(escalasRes.data)
    setLoading(false)
  }

  async function fetchRestrictions() {
      const { data } = await supabase.from('restricoes').select('*').order('data_inicio', { ascending: true })
      if(data) setRestrictions(data)
  }

  async function fetchEscalas() {
    const { data } = await supabase.from('escalas').select('*').order('data', { ascending: true }).order('hora', { ascending: true })
    if (data) setRawEvents(data)
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const filteredEvents = useMemo(() => {
    let filtered = rawEvents
    if (filterDate) {
        filtered = filtered.filter(evt => evt.data === filterDate)
    } else {
        const today = new Date().toLocaleDateString('en-CA') 
        if (activeTab === 'upcoming') {
            filtered = filtered.filter(evt => evt.data >= today)
        } else {
            filtered = filtered.filter(evt => evt.data < today)
            filtered.reverse()
        }
    }

    if (showOnlyMyScales && userName) {
        filtered = filtered.filter(evt => evt.acolitos.some((a: any) => a.nome.toLowerCase().includes(userName.toLowerCase())))
    } 
    else if (selectedAcolyte) {
        filtered = filtered.filter(evt => evt.acolitos.some((a: any) => a.nome === selectedAcolyte))
    }

    if (selectedPlace) {
        filtered = filtered.filter(evt => evt.local === selectedPlace)
    }
    return filtered
  }, [rawEvents, showOnlyMyScales, userName, selectedPlace, activeTab, filterDate, selectedAcolyte])

  const paginatedEvents = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      return filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredEvents, currentPage])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [activeTab, showOnlyMyScales, selectedPlace, filterDate, selectedAcolyte])

  const groupedEvents = useMemo(() => {
      const groups: { [key: string]: any[] } = {}
      paginatedEvents.forEach(evt => {
          const date = new Date(evt.data + 'T12:00:00')
          const monthKey = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          if (!groups[monthKey]) groups[monthKey] = []
          groups[monthKey].push(evt)
      })
      return groups
  }, [paginatedEvents])

  const handleAddRestriction = async () => {
      if(!resForm.acolito || !resForm.data_inicio) return triggerAlert("Erro", "Preencha o acólito e a data de início.", "error")
      
      const dataFimFinal = resForm.data_fim ? resForm.data_fim : resForm.data_inicio;

      await supabase.from('restricoes').insert({ 
          acolito_nome: resForm.acolito, 
          data_inicio: resForm.data_inicio, 
          data_fim: dataFimFinal 
      })
      
      setResForm({ acolito: '', data_inicio: '', data_fim: '' })
      fetchRestrictions()
  }

  const handleDeleteRestriction = async (id: number) => {
      await supabase.from('restricoes').delete().eq('id', id)
      fetchRestrictions()
  }

  const handleClearMonth = async () => {
      const year = calendarDate.getFullYear()
      const month = String(calendarDate.getMonth() + 1).padStart(2, '0')
      const monthStr = `${year}-${month}`
      
      triggerConfirm(
          "Excluir Mês Inteiro?", 
          `Deseja realmente apagar TODAS as escalas de ${calendarDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}? Esta ação não pode ser desfeita.`, 
          async () => {
              const lastDay = new Date(year, calendarDate.getMonth() + 1, 0).getDate()
              setLoading(true)
              try {
                  const { error } = await supabase.from('escalas').delete().gte('data', `${monthStr}-01`).lte('data', `${monthStr}-${lastDay}`)
                  if(error) throw error
                  await fetchEscalas()
              } catch (e: any) { triggerAlert("Erro", e.message, "error") } 
              finally { setLoading(false) }
          }
      )
  }

  const addExclusionRule = () => {
      const start = parseInt(exStart)
      const end = exEnd ? parseInt(exEnd) : start

      if (!start || isNaN(start)) return triggerAlert("Erro", "Informe ao menos o dia inicial", "warning")
      if (start > 31 || end > 31 || start < 1 || end < 1) return triggerAlert("Erro", "Dias devem ser entre 1 e 31", "warning")
      if (end < start) return triggerAlert("Erro", "Dia final não pode ser menor que o inicial", "warning")

      const newRule: ExclusionRule = {
          id: Math.random().toString(36).substr(2, 9),
          start,
          end
      }

      setExclusionRules([...exclusionRules, newRule])
      setExStart('')
      setExEnd('')
  }

  const removeExclusionRule = (id: string) => {
      setExclusionRules(exclusionRules.filter(r => r.id !== id))
  }

  // --- FUNÇÃO DE GERAÇÃO PRINCIPAL ---
  const handleAutoGenerate = async (includeTuribuloDay19: boolean = false) => {
    setIsGenerating(true)

    try {
        if (clearBeforeGenerate) {
            const [year, month] = autoGenMonth.split('-').map(Number)
            const lastDay = new Date(year, month, 0).getDate()
            await supabase.from('escalas').delete().gte('data', `${autoGenMonth}-01`).lte('data', `${autoGenMonth}-${lastDay}`)
        }

        const [year, month] = autoGenMonth.split('-').map(Number)

        const excludedDays: number[] = []
        exclusionRules.forEach(rule => {
            for(let i = rule.start; i <= rule.end; i++) {
                if(!excludedDays.includes(i)) excludedDays.push(i)
            }
        })

        const usageMap: { [key: string]: number } = {}
        dbAcolitos.forEach(a => usageMap[a.nome] = 0)

        // --- JUSTIÇA HISTÓRICA: Popula usageMap com escalas dos últimos 60 dias ---
        const historyStartDate = new Date(year, month - 3, 1).toISOString().split('T')[0];
        const historyEndDate = `${year}-${String(month).padStart(2,'0')}-01`;
        const recentHistory = rawEvents.filter(e => e.data >= historyStartDate && e.data < historyEndDate);
        
        recentHistory.forEach(evt => {
             if (Array.isArray(evt.acolitos)) {
                 evt.acolitos.forEach((ac:any) => {
                     const dbAc = dbAcolitos.find(d => `${d.nome} ${d.sobrenome || ''}`.trim() === ac.nome)
                     if(dbAc) {
                        usageMap[dbAc.nome] = (usageMap[dbAc.nome] || 0) + 1;
                     }
                 })
             }
        });

        const getFullName = (ac: any) => `${ac.nome} ${ac.sobrenome || ''}`.trim()

        const getTeam = (size: number, dateStr: string, dayNum: number, currentScheduledNames: Set<string>) => {
            const team: string[] = []
            const dateObj = new Date(dateStr + 'T12:00:00')
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

            const isEligible = (ac: any, roleIndex: number) => {
                const fullName = getFullName(ac)
                
                // Bloqueio de duplicidade diária
                if (currentScheduledNames.has(fullName)) return false;

                if (!ac.ativo) return false
                if (team.includes(fullName)) return false
                
                // Validação de Restrições
                const hasRestriction = restrictions.some(r => {
                     const isSameName = r.acolito_nome === fullName; 
                     const rStart = r.data_inicio;
                     const rEnd = r.data_fim || r.data_inicio;
                     const isDateOverlap = dateStr >= rStart && dateStr <= rEnd;
                     return isSameName && isDateOverlap;
                });
                if (hasRestriction) return false;

                if (ac.apenas_fim_de_semana && !isWeekend) return false
                if (roleIndex === 2 && ac.genero === 'F') return false 

                if (roleIndex === 0 && !ac.manuseia_missal) return false
                if (roleIndex === 2 && !ac.manuseia_turibulo) return false

                return true
            }

            // 1. Escala Fixa
            const fixedForDay = fixedRules.filter(r => parseInt(r.day) === dayNum)
            fixedForDay.forEach(rule => {
                const acolito = dbAcolitos.find(a => {
                    const fullName = `${a.nome} ${a.sobrenome || ''}`.trim();
                    return fullName === rule.acolito;
                })
                
                if (acolito && isEligible(acolito, team.length)) {
                    team.push(getFullName(acolito))
                    usageMap[acolito.nome] = (usageMap[acolito.nome] || 0) + 10
                    
                    if (acolito.parceiro_id && team.length < size) {
                        const partner = dbAcolitos.find(p => p.id === acolito.parceiro_id)
                        if (partner && isEligible(partner, team.length)) {
                            team.push(getFullName(partner))
                            usageMap[partner.nome] = (usageMap[partner.nome] || 0) + 10
                        }
                    }
                }
            })

            // 2. Sorteio
            let attempts = 0
            while (team.length < size && attempts < 500) {
                const currentRoleIdx = team.length
                const pool = dbAcolitos
                    .filter(a => {
                        if (!isEligible(a, currentRoleIdx)) return false
                        if (a.parceiro_id && team.length + 1 >= size) return false 
                        return true
                    })
                    // JUSTIÇA: Ordena estritamente por uso (menor para maior)
                    .sort((a, b) => (usageMap[a.nome] || 0) - (usageMap[b.nome] || 0) || Math.random() - 0.5)

                let selected = false;
                for (const candidate of pool) {
                    if (candidate.parceiro_id) {
                        const partner = dbAcolitos.find(p => p.id === candidate.parceiro_id)
                        if (partner && isEligible(partner, currentRoleIdx + 1)) {
                            team.push(getFullName(candidate))
                            team.push(getFullName(partner))
                            usageMap[candidate.nome] = (usageMap[candidate.nome] || 0) + 1
                            usageMap[partner.nome] = (usageMap[partner.nome] || 0) + 1
                            selected = true; break;
                        }
                    } else {
                        team.push(getFullName(candidate))
                        usageMap[candidate.nome] = (usageMap[candidate.nome] || 0) + 1
                        selected = true; break;
                    }
                }
                if (!selected) break;
                attempts++
            }
            return team
        }

        const daysInMonth = new Date(year, month, 0).getDate()
        const newEscalas: NewEscala[] = []
        const today = new Date(); today.setHours(0,0,0,0)

        for (let day = 1; day <= daysInMonth; day++) {
            if (excludedDays.includes(day)) continue;

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dateObj = new Date(dateStr + 'T12:00:00') 
            if (dateObj < today) continue;

            const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            const weekDay = utcDate.getUTCDay();

            let dayTimes: string[] = []
            
            if (weekDay === 0) {
                dayTimes = [...SUNDAY_SCHEDULE]
            } else if (day === 19 || day === 15) {
                dayTimes = ['19:00']
            } else {
                if (weekDay === 1) dayTimes = ['19:30'] 
                else if (weekDay === 3 || weekDay === 5 || weekDay === 6) dayTimes = ['19:00']
            }

            if (dayTimes.length > 0) {
                for (const time of dayTimes) {
                    let teamSize = 2; let obs = ''; let local = PLACES[0]; let color = '#2563eb' 

                    if (weekDay === 0) {
                        if (time === '07:30') { local = PLACES[3]; color = '#7c3aed' } 
                        else if (time === '17:30') { local = PLACES[2]; color = '#d97706' } 
                        else { local = PLACES[0]; color = '#2563eb' }
                    } else {
                        if (day === 15) { local = PLACES[2]; color = '#d97706' }
                        else if (day === 19) { local = PLACES[0]; color = '#2563eb' }
                        else if (weekDay === 6) { local = PLACES[1]; color = '#059669' }
                    }

                    if (day === 19 && local === PLACES[0]) {
                        obs = 'Missa Votiva de São José';
                        teamSize = includeTuribuloDay19 ? 4 : 2;
                    }

                    if (day === 15 && local === PLACES[2]) {
                        obs = 'Missa Votiva Nsa. Sra. da Abadia'; teamSize = 2; 
                    }

                    const normalizedTime = time.substring(0, 5);
                    
                    const existsInDb = rawEvents.some(evt => 
                        evt.data === dateStr && 
                        evt.local === local && 
                        evt.hora.substring(0, 5) === normalizedTime
                    );

                    const existsInBatch = newEscalas.find(e => 
                        e.data === dateStr && 
                        e.local === local && 
                        e.hora === time
                    );

                    if (existsInDb || existsInBatch) continue;

                    const currentScheduledNames = new Set([
                        ...rawEvents.filter(e => e.data === dateStr).flatMap(e => e.acolitos.map((a:any) => a.nome)),
                        ...newEscalas.filter(e => e.data === dateStr).flatMap(e => e.acolitos.map(a => a.nome))
                    ]);

                    const teamNames = getTeam(teamSize, dateStr, day, currentScheduledNames)
                    if (teamNames.length >= 2) {
                        const teamObjects = teamNames.map((nome, index) => ({ nome: nome, funcao: ROLES[index] || 'Auxiliar' }))
                        newEscalas.push({ data: dateStr, hora: time, local: local, observacao: obs, cor: color, acolitos: teamObjects })
                    }
                }
            }
        }
        
        if (newEscalas.length > 0) {
            await supabase.from('escalas').insert(newEscalas)
            setIsAutoModalOpen(false)
            fetchEscalas()
        } else { triggerAlert("Aviso", "Nenhuma escala gerada com os parâmetros atuais.", "info") }
    } catch (error: any) { triggerAlert("Erro", error.message, "error") } 
    finally { setIsGenerating(false) }
  }

  const generatePDF = async () => {
    try {
        if(rawEvents.length === 0) return triggerAlert("Vazio", "Não há escalas para gerar o PDF.", "warning");

        triggerAlert("Aguarde", "Gerando PDF...", "info");
        const jsPDF = (await import('jspdf')).default;
        
        const doc = new jsPDF('p', 'mm', 'a4') 
        
        let eventsToPrint = rawEvents
        if (selectedPlace) eventsToPrint = eventsToPrint.filter(evt => evt.local === selectedPlace)
        
        const sortedEvents = [...eventsToPrint].sort((a, b) => new Date(a.data + 'T' + a.hora).getTime() - new Date(b.data + 'T' + b.hora).getTime())

        const refDate = sortedEvents.length > 0 ? new Date(sortedEvents[0].data + 'T12:00:00') : new Date()
        const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
        const year = refDate.getFullYear()

        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text("ESCALA DOS ACÓLITOS – " + monthName + "/" + year, 105, 15, { align: "center" })

        const startX = 10
        const startY = 25
        const boxWidth = 47.5 
        const boxHeight = 24 
        const gap = 0 
        const columns = 4 

        let cursorX = startX
        let cursorY = startY
        
        doc.setFontSize(8)

        sortedEvents.forEach((evt, index) => {
            if (index > 0 && index % columns === 0) {
                cursorX = startX
                cursorY += boxHeight + gap
            }
            if (cursorY + boxHeight > 280) { 
                doc.addPage()
                cursorY = 20
            }

            const d = new Date(evt.data + 'T12:00:00')
            const day = d.getDate()
            const weekDayRaw = d.toLocaleDateString('pt-BR', { weekday: 'long' })
            const weekDay = weekDayRaw.charAt(0).toUpperCase() + weekDayRaw.slice(1) 
            const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const timeFormatted = evt.hora.substring(0, 5) 
            const placeSigla = PLACE_SIGLA[evt.local] || '???'

            let isSpecial = false;
            if (day === 19 && placeSigla === 'SJO') isSpecial = true;
            if (day === 15 && placeSigla === 'NSA') isSpecial = true;

            if (isSpecial) {
                doc.setFillColor(220, 230, 255) 
            } else {
                doc.setFillColor(240, 240, 240)
            }
            
            doc.rect(cursorX, cursorY, boxWidth, 6, 'F') 
            doc.setDrawColor(0)
            doc.rect(cursorX, cursorY, boxWidth, boxHeight) 

            doc.setFont("helvetica", "bold")
            doc.setFontSize(7)
            doc.setTextColor(0, 0, 0)
            
            const headerText = `${weekDay}, ${timeFormatted} - ${placeSigla}`
            const centerX = cursorX + (boxWidth / 2)
            doc.text(headerText, centerX, cursorY + 4, { align: 'center' })
            doc.text(dayMonth, cursorX + boxWidth - 2, cursorY + 4, { align: 'right' })

            doc.setFont("helvetica", "normal")
            let listY = cursorY + 10
            evt.acolitos.forEach((ac: any) => {
                const siglaFuncao = ROLE_SIGLA[ac.funcao] || ac.funcao.substring(0,1)
                
                doc.setFillColor(50, 50, 50) 
                doc.roundedRect(cursorX + 2, listY - 3, 6, 4, 1, 1, 'F') 
                
                doc.setTextColor(255, 255, 255) 
                doc.setFont("helvetica", "bold")
                doc.text(siglaFuncao, cursorX + 5, listY, { align: 'center' }) 

                doc.setTextColor(0, 0, 0)
                doc.setFont("helvetica", "normal")
                
                doc.text(ac.nome, cursorX + 12, listY)
                
                listY += 3.5 // ESPAÇAMENTO REDUZIDO
            })

            if (evt.observacao && evt.observacao.includes('Votiva')) {
                // APENAS COR (SEM ESCRITA)
                doc.setTextColor(0)
            }

            cursorX += boxWidth + gap
        })

        doc.save(`escala_${monthName}_${year}.pdf`)
        closeAlert()
    } catch (error) {
        console.error(error);
        triggerAlert("Erro", "Não foi possível gerar o PDF.", "error");
    }
  }

  const handleEdit = useCallback((evt: any) => {
      setEditingEventId(evt.id)
      const acolitosSafe = Array.isArray(evt.acolitos) 
        ? evt.acolitos.map((a: any) => ({ nome: a.nome, funcao: a.funcao })) 
        : [];

      setFormData({ 
          date: evt.data, 
          time: evt.hora ? evt.hora.substring(0, 5) : '', 
          place: evt.local, 
          obs: evt.observacao || '', 
          acolitos: acolitosSafe
      })
      setIsModalOpen(true)
  }, [])

  const handleDelete = async (id: number) => {
      triggerConfirm("Excluir Missa", "Tem certeza que deseja apagar esta escala?", async () => {
          await supabase.from('escalas').delete().eq('id', id)
          fetchEscalas()
          closeAlert()
      })
  }

  const handleSave = async () => {
      if (!formData.date || !formData.time) return triggerAlert("Erro", "Preencha data e hora", "error")
      
      const acolitosValidos = formData.acolitos.filter(a => a.nome.trim() !== '')
      if (acolitosValidos.length === 0) return triggerAlert("Erro", "Adicione pelo menos um acólito!", "error") 

      // --- TRAVA DE SEGURANÇA CONTRA DUPLICIDADE (MANUAL) ---
      const formTime = formData.time.substring(0, 5); 
      
      const isDuplicate = rawEvents.some(evt => {
          if (editingEventId && evt.id === editingEventId) return false; 
          const evtTime = evt.hora.substring(0, 5);
          return evt.data === formData.date && 
                 evt.local === formData.place &&
                 evtTime === formTime;
      })

      if (isDuplicate) {
          return triggerAlert("Duplicidade", "Já existe uma missa agendada para este dia, local e horário.", "error")
      }
      // ----------------------------------------------------

      let color = '#2563eb' 
      if (formData.place.includes('Graças')) color = '#059669' 
      if (formData.place.includes('Abadia')) color = '#d97706' 
      if (formData.place.includes('Clara')) color = '#7c3aed' 

      const acolitosFinal = formData.acolitos.map(ac => {
           const dbAc = dbAcolitos.find(db => db.nome === ac.nome)
           if (dbAc) {
               return { ...ac, nome: `${dbAc.nome} ${dbAc.sobrenome || ''}`.trim() }
           }
           return ac
      })

      const payload = { data: formData.date, hora: formData.time, local: formData.place, observacao: formData.obs, cor: color, acolitos: acolitosFinal }
      
      let error = null
      if (editingEventId) {
          const { error: err } = await supabase.from('escalas').update(payload).eq('id', editingEventId)
          error = err
      } else {
          const { error: err } = await supabase.from('escalas').insert([payload])
          error = err
      }

      if (error) {
          triggerAlert("Erro", "Falha ao salvar: " + error.message, "error")
      } else {
          setIsModalOpen(false)
          fetchEscalas()
      }
  }

  const openNewForm = () => {
      setEditingEventId(null)
      setFormData({ date: new Date().toLocaleDateString('en-CA'), time: '19:00', place: PLACES[0], obs: '', acolitos: [{nome:'', funcao:'Missal'}, {nome:'', funcao:'Vela'}] })
      setIsModalOpen(true)
  }

  const updateAcolito = (idx: number, field: string, val: string) => {
      const newArr: any = [...formData.acolitos]; newArr[idx][field] = val; setFormData({...formData, acolitos: newArr})
  }
  const addSlot = () => setFormData({...formData, acolitos: [...formData.acolitos, {nome: '', funcao: 'Missal'}]})
  const removeSlot = (idx: number) => setFormData({...formData, acolitos: formData.acolitos.filter((_, i) => i !== idx)})

  const addFixedRule = () => {
      if(!newFixedRule.acolito || !newFixedRule.day) return
      setFixedRules([...fixedRules, newFixedRule])
      setNewFixedRule({ acolito: '', day: '' })
  }

  if (!mounted) return null

  // Check se existe dia 19
  const checkDay19Exists = () => {
      if(!autoGenMonth) return false
      const [y, m] = autoGenMonth.split('-').map(Number)
      return new Date(y, m-1, 19).getDate() === 19
  }
  const showDay19Option = checkDay19Exists()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      customAlert.type === 'error' ? 'bg-red-500/20 text-red-500' : 
                      customAlert.type === 'success' ? 'bg-green-500/20 text-green-500' : 
                      customAlert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' : 
                      'bg-blue-500/20 text-blue-500'
                  }`}>
                      {customAlert.type === 'error' && <AlertCircle size={28}/>}
                      {customAlert.type === 'success' && <CheckCircle2 size={28}/>}
                      {customAlert.type === 'warning' && <AlertTriangle size={28}/>}
                      {customAlert.type === 'info' && <Info size={28}/>}
                  </div>
                  
                  <div>
                      <h3 className="text-lg font-bold text-white mb-1">{customAlert.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{customAlert.message}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                      {!customAlert.isConfirmDialog ? (
                          <button onClick={closeAlert} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition">Entendi</button>
                      ) : (
                          <>
                              <button onClick={closeAlert} className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 font-bold py-3 rounded-xl transition">Cancelar</button>
                              <button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); closeAlert(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">Sim, confirmar</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="px-4 h-16 flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20 text-white">JP</div>
                <div className="hidden sm:block">
                    <h1 className="text-sm font-bold leading-none text-white flex items-center gap-2">
                        São José Operário
                        <button onClick={() => setIsAboutModalOpen(true)} className="text-zinc-500 hover:text-white transition"><Info size={14} /></button>
                        <button onClick={() => setIsRulesModalOpen(true)} className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 transition flex items-center gap-2">
                            <BookOpen size={14} /> Regras do Sistema
                        </button>
                    </h1>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{userProfile === 'admin' ? 'Admin' : 'Acólito'}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {canManage && (
                    <div className="hidden md:flex items-center gap-2 mr-2 border-r border-zinc-800 pr-2">
                        <Link href="/financeiro" className="h-8 px-3 rounded-lg border border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/20 text-xs font-medium flex items-center gap-2 transition mr-2">
                             <DollarSign size={16}/> Financeiro
                        </Link>
                        <Link href="/atas" className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition mr-2">
                            <ClipboardList size={16}/> Atas
                        </Link>
                        <Link href="/acolitos" className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition mr-2">
                            <Users size={16}/> Equipe
                        </Link>
                        <button onClick={() => { setIsAutoModalOpen(true); setShowGenSettings(true); }} className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition">
                            <Settings size={16}/> Configurações Gerais
                        </button>
                    </div>
                )}
                {canManage && (
                    <button onClick={generatePDF} className="h-8 px-3 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-bold flex items-center gap-2 transition shadow-sm">
                        <Download size={16}/> Baixar Escala
                    </button>
                )}
                <button onClick={handleLogout} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition ml-2"><LogOut size={18}/></button>
            </div>
        </div>
      </header>

      <main className="px-4 py-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              
              <div className="lg:col-span-1 space-y-4">
                  <div className="lg:sticky lg:top-24 space-y-4">
                      <MemoizedCalendar 
                        currentDate={calendarDate}
                        setDate={setCalendarDate}
                        rawEvents={rawEvents}
                        filterDate={filterDate}
                        setFilterDate={setFilterDate}
                      />
                      
                      {canManage && (
                          <div className="grid gap-2">
                              <button onClick={() => { setIsAutoModalOpen(true); setShowGenSettings(false); }} className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-900/20">
                                  <Wand2 size={16}/> Gerar Escalas
                              </button>
                              <button onClick={openNewForm} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20">
                                  <Plus size={16}/> Manual
                              </button>
                          </div>
                      )}
                      
                      {canManage && (
                          <button onClick={handleClearMonth} className="w-full h-10 border border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-900/20 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition mt-2">
                              <Trash2 size={16}/> Limpar Mês Atual
                          </button>
                      )}

                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                              <button onClick={() => setActiveTab('upcoming')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'upcoming' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Próximas</button>
                              <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'history' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Histórico</button>
                          </div>

                          <div className="relative">
                              <select value={selectedPlace} onChange={e => setSelectedPlace(e.target.value)} className="w-full h-8 pl-3 pr-8 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-300 focus:border-zinc-700 outline-none appearance-none cursor-pointer hover:bg-zinc-800 transition">
                                  <option value="">Todas as Igrejas</option>
                                  {PLACES.map(p => <option key={p} value={p}>{p.replace('Rainha da Paz (Matriz)', 'Matriz')}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                          </div>
                          
                          <div className="relative">
                              <select 
                                value={selectedAcolyte} 
                                onChange={e => { setSelectedAcolyte(e.target.value); setShowOnlyMyScales(false); }} 
                                className="w-full h-8 pl-3 pr-8 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-300 focus:border-zinc-700 outline-none appearance-none cursor-pointer hover:bg-zinc-800 transition"
                              >
                                  <option value="">Filtrar Acólito...</option>
                                  {dbAcolitos.map(a => {
                                      const nomeCompleto = `${a.nome} ${a.sobrenome || ''}`.trim();
                                      return (
                                          <option key={a.id || a.nome} value={nomeCompleto}>
                                              {nomeCompleto}
                                          </option>
                                      )
                                  })}
                              </select>
                              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                          </div>

                          <button onClick={() => { setShowOnlyMyScales(!showOnlyMyScales); setSelectedAcolyte('') }} className={`w-full h-8 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition ${showOnlyMyScales ? 'bg-blue-600/10 border-blue-600/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                              {showOnlyMyScales ? <Eye size={16}/> : <Filter size={16}/>} Minhas Escalas
                          </button>
                          
                          {(showOnlyMyScales || selectedAcolyte) && (
                              <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-2 text-center">
                                  <span className="text-[10px] text-blue-300 font-bold block uppercase tracking-wider">Missas Encontradas</span>
                                  <span className="text-xl font-bold text-white block">{filteredEvents.length}</span>
                              </div>
                          )}
                          
                          <div className="md:hidden pt-2 border-t border-zinc-800 space-y-2">
                             {canManage && (
                                <>
                                <Link href="/financeiro" className="w-full h-8 px-3 rounded-lg border border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/20 flex items-center justify-center gap-2 text-xs font-medium">
                                    <DollarSign size={16}/> Prestação de Contas
                                </Link>
                                <button onClick={() => { setIsAutoModalOpen(true); setShowGenSettings(true); }} className="w-full h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium">
                                    <Settings size={16}/> Configurações Gerais
                                </button>
                                <Link href="/acolitos" className="w-full h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium"><Users size={16}/> Equipe</Link>
                                <Link href="/atas" className="w-full h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium"><ClipboardList size={16}/> Atas</Link>
                                </>
                             )}
                             <button onClick={generatePDF} className="w-full h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium"><FileText size={16}/> Baixar Escala</button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                  {Object.keys(groupedEvents).length === 0 ? (
                      <div className="text-center py-20">
                          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                              <CalendarIcon size={32} className="text-zinc-600" />
                          </div>
                          <h3 className="text-lg font-bold text-white">Nenhuma escala encontrada</h3>
                      </div>
                  ) : (
                      Object.entries(groupedEvents).map(([month, monthEvents]) => (
                          <div key={month} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">{month}</h2>
                              <div className="grid gap-3">
                                  {monthEvents.map((evt) => {
                                      const date = new Date(evt.data + 'T12:00:00')
                                      const day = date.getDate()
                                      const weekDay = date.toLocaleDateString('pt-BR', { weekday: 'long' })
                                      
                                      return (
                                          <div key={evt.id} className={`group bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 transition shadow-sm hover:shadow-md ${PLACE_COLORS[evt.local] || 'border-l-gray-300'} border-l-[3px]`}>
                                              <div className="flex flex-row md:flex-col items-center justify-between md:justify-center bg-zinc-950 border border-zinc-800 rounded-lg p-2 md:w-14 md:h-14 shrink-0">
                                                  <div className="flex flex-col items-center">
                                                    <span className="text-xl font-bold text-white leading-none">{day}</span>
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">{date.toLocaleDateString('pt-BR', {month:'short'}).replace('.','')}</span>
                                                  </div>
                                                  <div className="md:hidden text-xs text-zinc-400 font-bold">{weekDay.split('-')[0]}</div>
                                              </div>

                                              <div className="flex-1 min-w-0">
                                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                                                      <div>
                                                          <h3 className="font-bold text-white text-sm truncate">{evt.local.replace('Rainha da Paz (Matriz)', 'Matriz')}</h3>
                                                          <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 capitalize mt-0.5">
                                                              <Clock size={12}/> {weekDay} às <span className="text-zinc-200 font-bold">{evt.hora.substring(0,5)}</span>
                                                              {evt.observacao && <span className="bg-yellow-900/30 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded border border-yellow-900/50 normal-case ml-1">{evt.observacao}</span>}
                                                          </p>
                                                      </div>
                                                      
                                                      {canEditContext && (
                                                          <div className="flex gap-2 mt-2 sm:mt-0">
                                                              <button onClick={() => handleEdit(evt)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"><Edit2 size={16}/></button>
                                                              <button onClick={() => handleDelete(evt.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/50">
                                                      {evt.acolitos.map((ac: any, idx: number) => (
                                                          <div key={idx} className="flex items-center gap-2">
                                                              <span className={`text-xs font-semibold truncate ${ac.nome.toLowerCase().includes(userName.toLowerCase()) ? 'text-blue-400' : 'text-zinc-300'}`}>
                                                                  {ac.nome}
                                                              </span>
                                                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ml-2 ${ROLE_BADGE_STYLE}`}>
                                                                  {ac.funcao}
                                                              </span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      ))
                  )}

                  {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 pt-4 border-t border-zinc-800">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 transition text-zinc-400"><ChevronLeft size={20}/></button>
                          <span className="text-sm font-bold text-zinc-500">Página {currentPage} de {totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 transition text-zinc-400"><ChevronRight size={20}/></button>
                      </div>
                  )}
              </div>
          </div>
      </main>

      {/* MODAIS */}
      
      {/* MODAL SOBRE */}
      {isAboutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                  <button onClick={() => setIsAboutModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><X size={20}/></button>
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                      <span className="text-white font-bold text-lg">JP</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">São José Operário</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6">Versão {APP_VERSION}</p>
                  
                  <div className="text-left space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto">
                      <h4 className="text-xs font-bold text-white mb-2">Novidades desta versão:</h4>
                      <ul className="space-y-2">
                          {RELEASE_NOTES.map((note, i) => (
                              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">•</span> {note}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
      )}

      {/* NOVO: MODAL MANUAL DE REGRAS */}
      {isRulesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                  <button onClick={() => setIsRulesModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><X size={20}/></button>
                  
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <BookOpen size={20} className="text-purple-400"/>
                      </div>
                      <h3 className="text-lg font-bold text-white">Manual de Regras do Sistema</h3>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-sm text-zinc-400 leading-relaxed">
                      <div className="space-y-2">
                          <h4 className="text-white font-bold flex items-center gap-2"><Flame size={14} className="text-orange-500"/> Habilidades Litúrgicas</h4>
                          <p>
                              Apenas acólitos com a opção <strong>"Manuseia Missal"</strong> ativada no cadastro podem ser escalados para a função de Missal (vaga 1).
                              Da mesma forma, apenas quem tem <strong>"Manuseia Turíbulo"</strong> pode ser escalado para Turíbulo (vaga 3).
                          </p>
                      </div>

                      <div className="space-y-2">
                          <h4 className="text-white font-bold flex items-center gap-2"><Users size={14} className="text-blue-500"/> Duplas (Parceiros)</h4>
                          <p>
                              Se um acólito tem uma dupla definida, o sistema tentará colocá-los juntos na mesma missa.
                              <strong>Importante:</strong> Se não houver vaga para os dois, nenhum dos dois será escalado naquela missa específica, garantindo que a dupla nunca seja separada.
                          </p>
                      </div>

                      <div className="space-y-2">
                          <h4 className="text-white font-bold flex items-center gap-2"><Clock size={14} className="text-emerald-500"/> Exclusividade Diária</h4>
                          <p>
                              Um acólito só pode ser escalado <strong>uma vez por dia</strong>. Se ele já estiver em qualquer missa (mesmo em outra igreja), o sistema não o sorteará novamente para aquele dia.
                          </p>
                      </div>

                      <div className="space-y-2">
                          <h4 className="text-white font-bold flex items-center gap-2"><CalendarOff size={14} className="text-red-500"/> Restrições & Justiça</h4>
                          <p>
                              O sistema prioriza quem tem menos escalas nos últimos 60 dias para garantir uma distribuição justa.
                              Acólitos com restrição de data ativa não serão escalados no período bloqueado.
                          </p>
                      </div>
                  </div>
                  
                  <button onClick={() => setIsRulesModalOpen(false)} className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition">Entendi</button>
              </div>
          </div>
      )}

      {/* MODAL GERAR */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => { setIsAutoModalOpen(false); setShowGenSettings(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><X size={20}/></button>
                
                {!showGenSettings ? (
                    <>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Wand2 className="text-purple-600" size={20}/> Gerar Escalas</h3>
                        <div className="space-y-6">
                            <div className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                <div>
                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Mês de Referência</label>
                                    <div className="relative">
                                        <input 
                                            type="month" 
                                            value={autoGenMonth} 
                                            onChange={e => setAutoGenMonth(e.target.value)} 
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pl-10 text-white outline-none focus:border-purple-600 transition z-10 relative"
                                            style={{colorScheme: 'dark'}} 
                                        />
                                        <CalendarIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 z-0 pointer-events-none"/>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={clearBeforeGenerate} 
                                        onChange={e => setClearBeforeGenerate(e.target.checked)}
                                        className="mt-0.5 accent-purple-600"
                                    />
                                    <div className="text-xs text-zinc-300">
                                        <span className="font-bold block text-purple-400">Limpar automaticamente</span>
                                        Apaga as escalas existentes deste mês antes de gerar.
                                    </div>
                                </div>
                                
                                {showDay19Option && (
                                    <div className="flex items-start gap-2 pt-2 border-t border-zinc-800/50 mt-2">
                                        <input 
                                            type="checkbox" 
                                            checked={includeDay19} 
                                            onChange={e => setIncludeDay19(e.target.checked)}
                                            className="mt-0.5 accent-orange-500"
                                        />
                                        <div className="text-xs text-zinc-300">
                                            <span className="font-bold block text-orange-400">Escalar Turíbulo no dia 19?</span>
                                            Adiciona funções extras na Missa de São José.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
                                <button onClick={() => handleAutoGenerate(includeDay19)} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-900/20 disabled:opacity-50">
                                    {isGenerating ? 'Processando...' : 'Gerar Escalas'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setShowGenSettings(false)} className="p-1 -ml-1 text-zinc-500 hover:text-white"><ArrowLeft size={20}/></button>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Settings size={18}/> Configurações Gerais</h3>
                        </div>
                        
                        <div className="space-y-4">
                             {/* BOTÃO MOVIDO PARA CÁ */}
                             <button onClick={() => setIsRestrictionModalOpen(true)} className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition border border-zinc-700">
                                 <CalendarOff size={16}/> Gerenciar Restrições de Data
                             </button>

                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                                <div className="mb-4">
                                    <label className="text-sm font-bold text-white block mb-1 flex items-center gap-2"><CalendarOff size={14} className="text-red-500"/> Pular Dias</label>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Selecione dias ou períodos em que não haverá escala (ex: feriados sem missa, manutenções).
                                    </p>
                                </div>

                                <div className="flex gap-2 items-end mb-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-zinc-500 mb-1 block">De (Dia)</label>
                                        <input 
                                            type="text" 
                                            inputMode="numeric"
                                            placeholder="Ex: 5" 
                                            value={exStart} 
                                            onChange={e => setExStart(e.target.value.replace(/\D/g, ''))} 
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-red-600 transition text-center"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-zinc-500 mb-1 block">Até (Opcional)</label>
                                        <input 
                                            type="text"
                                            inputMode="numeric" 
                                            placeholder="Ex: 10" 
                                            value={exEnd} 
                                            onChange={e => setExEnd(e.target.value.replace(/\D/g, ''))} 
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-red-600 transition text-center"
                                        />
                                    </div>
                                    <button onClick={addExclusionRule} className="h-[38px] w-[38px] border border-transparent hover:border-red-500/50 text-red-500 rounded-lg flex items-center justify-center transition shrink-0 bg-zinc-900 hover:bg-zinc-800">
                                        <Plus size={18}/>
                                    </button>
                                </div>

                                {exclusionRules.length > 0 && (
                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                        {exclusionRules.map(rule => (
                                            <div key={rule.id} className="flex justify-between items-center text-xs bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
                                                <span className="text-zinc-300 font-bold">
                                                    {rule.start === rule.end ? `Dia ${rule.start}` : `Dia ${rule.start} ao ${rule.end}`}
                                                </span>
                                                <button onClick={() => removeExclusionRule(rule.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                                <div className="mb-4">
                                    <label className="text-sm font-bold text-white block mb-1 flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500"/> Escala Fixa (Prioridade)</label>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Adicione regras para garantir que determinados acólitos sirvam <strong>sempre</strong> em dias específicos (ex: Todo dia 15).
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                    <select value={newFixedRule.acolito} onChange={e => setNewFixedRule({...newFixedRule, acolito: e.target.value})} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white outline-none focus:border-blue-600 transition">
                                        <option value="">Selecione o Acólito...</option>
                                        {dbAcolitos.map(a => {
                                            const fullName = `${a.nome} ${a.sobrenome || ''}`.trim();
                                            return <option key={a.id || a.nome} value={fullName}>{fullName}</option>
                                        })}
                                    </select>
                                    
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <input 
                                            type="text" 
                                            inputMode="numeric" 
                                            placeholder="Dia" 
                                            className="flex-1 sm:w-20 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white outline-none text-center focus:border-blue-600 transition" 
                                            value={newFixedRule.day} 
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val === '' || (Number(val) > 0 && Number(val) <= 31)) {
                                                    setNewFixedRule({...newFixedRule, day: val})
                                                }
                                            }} 
                                            maxLength={2}
                                        />
                                        <button onClick={addFixedRule} className="h-[38px] w-[38px] border border-transparent hover:border-blue-500/50 text-blue-500 rounded-lg flex items-center justify-center transition shrink-0 bg-zinc-900 hover:bg-zinc-800"><Plus size={18}/></button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {fixedRules.length === 0 ? (
                                        <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg">
                                            <AlertCircle size={20} className="mx-auto text-zinc-700 mb-2"/>
                                            <p className="text-xs text-zinc-600">Nenhuma regra fixa definida ainda.</p>
                                        </div>
                                    ) : (
                                        fixedRules.map((rule, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs bg-zinc-900 px-3 py-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition group">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 border border-zinc-700">{rule.day}</span>
                                                    <span className="text-zinc-200 font-bold text-sm">{rule.acolito}</span>
                                                </div>
                                                <button onClick={() => setFixedRules(fixedRules.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-500 transition p-1"><Trash2 size={16}/></button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button onClick={() => setShowGenSettings(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl text-sm transition mt-4 border border-zinc-700">
                                Voltar para Geração
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {/* MODAL RESTRIÇÕES */}
      {isRestrictionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto relative">
                  <button onClick={() => setIsRestrictionModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarOff size={18} className="text-red-500"/> Indisponibilidades</h3>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 mb-6 space-y-3">
                      <select value={resForm.acolito} onChange={e => setResForm({...resForm, acolito: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white outline-none">
                          <option value="">Selecione o Acólito...</option>
                          {dbAcolitos.map(a => {
                              const fullName = `${a.nome} ${a.sobrenome || ''}`.trim();
                              return <option key={a.id || a.nome} value={fullName}>{fullName}</option>
                          })}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={resForm.data_inicio} onChange={e => setResForm({...resForm, data_inicio: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white outline-none"/>
                          <input type="date" value={resForm.data_fim} onChange={e => setResForm({...resForm, data_fim: e.target.value})} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white outline-none"/>
                      </div>
                      <button onClick={handleAddRestriction} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-lg text-xs transition border border-zinc-700">Adicionar Restrição</button>
                  </div>
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase">Registros Ativos</h4>
                      {restrictions.length === 0 ? <p className="text-zinc-600 text-sm">Nenhuma restrição.</p> : (
                          restrictions.map(res => (
                              <div key={res.id} className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700/50">
                                  <div>
                                      <span className="text-sm font-bold text-zinc-200 block">{res.acolito_nome}</span>
                                      <span className="text-xs text-red-400">{new Date(res.data_inicio).toLocaleDateString('pt-BR',{timeZone:'UTC'})} até {new Date(res.data_fim).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</span>
                                  </div>
                                  <button onClick={() => handleDeleteRestriction(res.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={16}/></button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EDITAR/CRIAR MISSA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
               <h3 className="text-lg font-bold text-white">{editingEventId ? 'Editar Missa' : 'Nova Missa'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
             </div>
             <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">Data</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1 block">Hora</label>
                        <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Local</label>
                    <select value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600">
                        {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Observação</label>
                    <input type="text" value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" placeholder="Opcional" />
                </div>
                <div className="pt-4 border-t border-zinc-800">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-white">Equipe</label>
                        <button onClick={addSlot} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-blue-400 font-bold transition">+ Vaga</button>
                    </div>
                    <div className="space-y-2">
                        {formData.acolitos.map((acolito, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50">
                                <select 
                                    value={acolito.nome} 
                                    onChange={e => updateAcolito(idx, 'nome', e.target.value)} 
                                    className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white outline-none"
                                >
                                    <option value="">Selecione...</option>
                                    {dbAcolitos.map(a => {
                                        const nomeCompleto = `${a.nome} ${a.sobrenome || ''}`.trim();
                                        return (
                                            <option key={a.id || a.nome} value={nomeCompleto}>
                                                {nomeCompleto}
                                            </option>
                                        )
                                    })}
                                </select>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <select value={acolito.funcao} onChange={e => updateAcolito(idx, 'funcao', e.target.value)} className="flex-1 sm:w-32 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none">
                                        {ROLES.map(r => <option key={r}>{r}</option>)}
                                        <option>Auxiliar</option>
                                    </select>
                                    <button onClick={() => removeSlot(idx)} className="p-2.5 bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-500 rounded-lg transition shrink-0"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4">
                    <Save size={18}/> Salvar Missa
                </button>
             </div>
           </div>
        </div>
      )}

      {/* OTIMIZAÇÃO: Componente isolado */}
      <DailyVerseFooter />
    </div>
  )
}