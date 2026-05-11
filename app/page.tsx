'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  Plus, X, Clock, Users, LogOut, Trash2, Save, FileText, Edit2, 
  Filter, Eye, ChevronDown, Calendar as CalendarIcon, CalendarOff, 
  Wand2, ChevronLeft, ChevronRight, Settings, ClipboardList, 
  CheckCircle2, AlertCircle, Info, Download, AlertTriangle, 
  Search, DollarSign, Flame, BookOpen, FolderClock, Menu, Sparkles
} from 'lucide-react'

const APP_VERSION = "v3.98.5-ui-folder-light" 

const LITURGICAL_COLORS = [
    { name: 'Tempo Comum', hex: '#16a34a', class: 'bg-green-600', text: 'white' },
    { name: 'Natal / Páscoa / Solenidades', hex: '#ffffff', class: 'bg-white border-gray-200', text: 'black' },
    { name: 'Mártires / Pentecostes', hex: '#dc2626', class: 'bg-red-600', text: 'white' },
    { name: 'Advento / Quaresma / Finados', hex: '#7c3aed', class: 'bg-purple-700', text: 'white' },
    { name: 'Domingos Especiais.', hex: '#f472b6', class: 'bg-pink-400', text: 'white' }
]

const PLACE_LEGEND = [
    { name: 'São José Operário', color: 'bg-blue-600' },
    { name: 'Nsa. Sra. das Graças', color: 'bg-emerald-600' },
    { name: 'Nsa. Sra. Abadia', color: 'bg-orange-500' },
    { name: 'Santa Clara', color: 'bg-violet-600' }
]

const RELEASE_NOTES = [
    "PDF: Cabeçalho em tons pastéis suaves com linha única de texto.",
    "PDF: Fundo cinza neutro para escalas geradas no modo comum.",
    "UI: Tooltip do Gerador Avançado ajustado e margens adaptadas.",
    "Edição Manual: Sistema agora preserva a cor litúrgica ao editar.",
    "Limpeza visual e remoção do peso de fontes."
]

interface NewEscala {
    data: string; hora: string; local: string; observacao: string; cor: string;
    acolitos: { nome: string; funcao: string }[];
    isSolemn?: boolean;
}

interface AlertState {
    isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
    title: string; message: string; onConfirm?: () => void; isConfirmDialog: boolean;
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
    "Nsa. Sra. da Abadia": "border-l-orange-500",
    "Santa Clara": "border-l-violet-600"
}

const PAST_PLACE_COLORS: { [key: string]: string } = {
    "São José Operário": "border-l-blue-200",
    "Capela Nsa. Sra. das Graças": "border-l-emerald-200",
    "Nsa. Sra. da Abadia": "border-l-orange-200",
    "Santa Clara": "border-l-violet-200"
}

const ROLE_BADGE_STYLE = "border-gray-200 text-gray-600 bg-gray-50"

const VERSICULOS = [
  { text: "Em todo o tempo ama o amigo e para a hora da angústia nasce o irmão.", ref: "Provérbios 17:17" },
  { text: "Tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor.", ref: "Colossenses 3:23" },
  { text: "Servi ao Senhor com alegria; e entrai diante dele com canto.", ref: "Salmos 100:2" }
];

const hexToRgb = (hex: string) => {
    if (!hex || hex.length < 7) return { r: 22, g: 163, b: 74 };
    const r = parseInt(hex.slice(1, 3), 16) || 22;
    const g = parseInt(hex.slice(3, 5), 16) || 163;
    const b = parseInt(hex.slice(5, 7), 16) || 74;
    return { r, g, b };
}

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
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-gray-200 text-center z-40">
            <p className="text-xs text-gray-600 font-serif italic">
                "{verse.text}" <span className="font-semibold text-blue-600 not-italic ml-1">{verse.ref}</span>
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

        let bgClass = 'hover:bg-gray-100 text-gray-700'
        if (isSelected) bgClass = 'bg-blue-600 text-white font-medium shadow-md transform scale-110'
        else if (isToday) bgClass = 'border border-blue-600 text-blue-600 font-medium bg-blue-50'

        days.push(
            <button key={d} onClick={() => setFilterDate(isSelected ? null : dateStr)} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs relative transition-all ${bgClass}`}>
                {d}
                {hasEvent && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>}
            </button>
        )
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 w-full shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={16}/></button>
                <span className="text-sm font-semibold capitalize text-gray-900">{currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] text-gray-400 font-medium mb-2">{d}</span>)}
                {days}
            </div>
            {filterDate && <div className="mt-3 text-center border-t border-gray-100 pt-2"><button onClick={() => setFilterDate(null)} className="text-xs text-blue-600 hover:underline font-medium">Ver todos os dias</button></div>}
        </div>
    )
})
MemoizedCalendar.displayName = 'MemoizedCalendar'

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false) 
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  
  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'info', title: '', message: '', isConfirmDialog: false
  })
  
  const [loading, setLoading] = useState(true)
  const [dbAcolitos, setDbAcolitos] = useState<any[]>([]) 
  const [restrictions, setRestrictions] = useState<any[]>([]) 
  const [rawEvents, setRawEvents] = useState<any[]>([])
  
  const [userProfile, setUserProfile] = useState('padrao')
  const [userName, setUserName] = useState('') 
  
  const [showOnlyMyScales, setShowOnlyMyScales] = useState(false)
  const [selectedAcolyte, setSelectedAcolyte] = useState('') 
  const [selectedPlace, setSelectedPlace] = useState('')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [calendarDate, setCalendarDate] = useState(new Date()) 
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  
  const [autoGenMonth, setAutoGenMonth] = useState('') 
  const [pdfTargetMonth, setPdfTargetMonth] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [clearBeforeGenerate, setClearBeforeGenerate] = useState(true)
  const [includeDay19, setIncludeDay19] = useState(true)
  const [singleAcolyteWeekdays, setSingleAcolyteWeekdays] = useState(false)
  const [noWeekdays, setNoWeekdays] = useState(false)
  const [mondayNovena, setMondayNovena] = useState(false) 
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)

  const [previewEscalas, setPreviewEscalas] = useState<NewEscala[]>([])

  const [formData, setFormData] = useState({
    date: '', time: '', place: PLACES[0], obs: '', cor: '#e5e7eb',
    acolitos: [ { nome: '', funcao: 'Missal' }, { nome: '', funcao: 'Vela' } ]
  })

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

    const todayISO = new Date().toISOString().slice(0, 7);
    setAutoGenMonth(todayISO);
    setPdfTargetMonth(todayISO);

    fetchInitialData()

    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (customAlert.isOpen) { closeAlert(); return }
            setIsModalOpen(false); setIsAutoModalOpen(false); 
            setIsAboutModalOpen(false); setIsRulesModalOpen(false);
            setIsPdfModalOpen(false); setIsMobileMenuOpen(false);
            setIsReviewModalOpen(false);
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

  const handleStartAutoGenerate = async () => {
    setIsGenerating(true)

    try {
        const [year, month] = autoGenMonth.split('-').map(Number)
        const { data: fixedRulesData } = await supabase.from('regras_fixas').select('*');
        const fixedRules = fixedRulesData || []; 
        const excludedDays: number[] = [] 

        const usageMap: { [key: string]: number } = {}
        dbAcolitos.forEach(a => usageMap[a.nome] = 0)

        const getFullName = (ac: any) => `${ac.nome} ${ac.sobrenome || ''}`.trim()

        const getTeam = (targetSize: number, dateStr: string, dayNum: number, currentScheduledNames: Set<string>, adjacentScheduledNames: Set<string>) => {
            const team: string[] = []
            const dateObj = new Date(dateStr + 'T12:00:00')
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

            const isEligible = (ac: any, roleIndex: number) => {
                const fullName = getFullName(ac)
                if (currentScheduledNames.has(fullName) || adjacentScheduledNames.has(fullName)) return false;
                if (!ac.ativo || team.includes(fullName)) return false
                
                const hasRestriction = restrictions.some(r => {
                      return r.acolito_nome === fullName && (dateStr >= r.data_inicio && dateStr <= (r.data_fim || r.data_inicio));
                });
                if (hasRestriction) return false;

                if (ac.apenas_fim_de_semana && !isWeekend) return false
                if (roleIndex === 0 && !ac.manuseia_missal) return false
                if (roleIndex === 2 && !ac.manuseia_turibulo) return false
                if (roleIndex === 2 && ac.genero === 'F') return false 
                return true
            }

            const fixedForDay = fixedRules.filter((r: any) => parseInt(r.day) === dayNum)
            fixedForDay.forEach((rule: any) => {
                const acolito = dbAcolitos.find(a => getFullName(a) === rule.acolito)
                if (acolito && isEligible(acolito, team.length)) {
                    team.push(getFullName(acolito))
                    usageMap[acolito.nome] = (usageMap[acolito.nome] || 0) + 50 
                }
            })

            let attempts = 0
            while (team.length < targetSize && attempts < 500) {
                const currentRoleIdx = team.length
                const pool = dbAcolitos
                    .filter(a => {
                        if (!isEligible(a, currentRoleIdx)) return false
                        if (a.parceiro_id && team.length + 1 >= targetSize) return false 
                        return true
                    })
                    .sort((a, b) => (usageMap[a.nome] || 0) - (usageMap[b.nome] || 0) || (Math.random() - 0.5))

                let selected = false;
                for (const candidate of pool) {
                    if (candidate.parceiro_id) {
                        const partner = dbAcolitos.find(p => p.id === candidate.parceiro_id)
                        if (partner && isEligible(partner, currentRoleIdx + 1)) {
                            team.push(getFullName(candidate)); team.push(getFullName(partner))
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

            if (team.length === 3 && targetSize === 4) team.pop(); 
            return team
        }

        const daysInMonth = new Date(year, month, 0).getDate()
        const tempEscalas: NewEscala[] = []
        const today = new Date(); today.setHours(0,0,0,0)

        for (let day = 1; day <= daysInMonth; day++) {
            if (excludedDays.includes(day)) continue;

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dateObj = new Date(dateStr + 'T12:00:00') 
            if (dateObj < today) continue;

            const prevD = new Date(year, month - 1, day - 1);
            const prevDateStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}-${String(prevD.getDate()).padStart(2, '0')}`;
            const nextD = new Date(year, month - 1, day + 1);
            const nextDateStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;

            const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            const weekDay = utcDate.getUTCDay(); 

            if (noWeekdays && weekDay >= 1 && weekDay <= 5 && day !== 19 && day !== 15) {
                if (!(mondayNovena && weekDay === 1)) continue; 
            }

            let dayTimes: string[] = []
            if (weekDay === 0) dayTimes = [...SUNDAY_SCHEDULE]
            else if (day === 19 || day === 15) dayTimes = ['19:00']
            else {
                if (weekDay === 1) dayTimes = ['19:30'] 
                else if (weekDay === 3 || weekDay === 5 || weekDay === 6) dayTimes = ['19:00']
            }

            if (dayTimes.length > 0) {
                for (const time of dayTimes) {
                    let teamSize = 2; let obs = ''; let local = PLACES[0]; let color = '#e5e7eb'; 

                    let isSolemn = (weekDay === 0) || day === 19 || day === 15;

                    if (weekDay === 0) {
                        if (time === '07:30') local = PLACES[3];
                        else if (time === '17:30') local = PLACES[2];
                        else local = PLACES[0];
                    } else {
                        if (day === 15) local = PLACES[2];
                        else if (day === 19) local = PLACES[0];
                        else if (weekDay === 6) local = PLACES[1];
                    }

                    if (singleAcolyteWeekdays && (weekDay === 3 || weekDay === 5)) teamSize = 1;

                    if (mondayNovena && weekDay === 1 && time === '19:30') {
                        teamSize = 1;
                        obs = 'Novena Perpétua a Nsa. Sra. Desatadora dos Nós';
                        local = PLACES[0]; 
                    }

                    if (day === 19 && local === PLACES[0]) { obs = 'Missa Votiva de São José'; teamSize = includeDay19 ? 4 : 2; }
                    if (day === 15 && local === PLACES[2]) { obs = 'Missa Votiva Nsa. Sra. da Abadia'; teamSize = 2; }

                    const existsInBatch = tempEscalas.find(e => e.data === dateStr && e.local === local && e.hora === time);
                    if (existsInBatch) continue;

                    const currentScheduledNames = new Set([
                        ...rawEvents.filter(e => e.data === dateStr).flatMap(e => e.acolitos.map((a:any) => a.nome)),
                        ...tempEscalas.filter(e => e.data === dateStr).flatMap(e => e.acolitos.map(a => a.nome))
                    ]);
                    const adjacentScheduledNames = new Set([
                        ...rawEvents.filter(e => e.data === prevDateStr || e.data === nextDateStr).flatMap(e => e.acolitos.map((a:any) => a.nome)),
                        ...tempEscalas.filter(e => e.data === prevDateStr || e.data === nextDateStr).flatMap(e => e.acolitos.map(a => a.nome))
                    ]);

                    const teamNames = getTeam(teamSize, dateStr, day, currentScheduledNames, adjacentScheduledNames)
                    if (teamNames.length >= 2 || (teamSize === 1 && teamNames.length === 1)) {
                        const teamObjects = teamNames.map((nome, index) => ({ nome: nome, funcao: ROLES[index] || 'Auxiliar' }))
                        if(isAdvancedMode && color === '#e5e7eb') color = '#16a34a'; 
                        tempEscalas.push({ data: dateStr, hora: time, local: local, observacao: obs, cor: color, acolitos: teamObjects, isSolemn: isSolemn })
                    }
                }
            }
        }
        
        if (!isAdvancedMode) {
            if (clearBeforeGenerate) {
                const lastDay = new Date(year, month, 0).getDate()
                await supabase.from('escalas').delete().gte('data', `${autoGenMonth}-01`).lte('data', `${autoGenMonth}-${lastDay}`)
            }
            const finalData = tempEscalas.map(({isSolemn, ...rest}) => rest);
            const { error } = await supabase.from('escalas').insert(finalData)
            if(error) throw error
            setIsAutoModalOpen(false)
            fetchEscalas()
            triggerAlert("Sucesso", `${finalData.length} escalas geradas!`, "success")
        } else {
            setPreviewEscalas(tempEscalas)
            setIsAutoModalOpen(false)
            setIsReviewModalOpen(true)
        }

    } catch (error: any) { triggerAlert("Erro", error.message, "error") } 
    finally { setIsGenerating(false) }
  }

  const finalizeGeneration = async () => {
      setLoading(true)
      try {
          if (clearBeforeGenerate) {
              const [year, month] = autoGenMonth.split('-').map(Number)
              const lastDay = new Date(year, month, 0).getDate()
              await supabase.from('escalas').delete().gte('data', `${autoGenMonth}-01`).lte('data', `${autoGenMonth}-${lastDay}`)
          }

          const finalData = previewEscalas.map(({isSolemn, ...rest}) => rest);
          
          const { error } = await supabase.from('escalas').insert(finalData)
          if (error) throw error

          setIsReviewModalOpen(false)
          fetchEscalas()
          triggerAlert("Sucesso", "Escalas publicadas com sucesso!", "success")
      } catch (e: any) { triggerAlert("Erro", e.message, "error") }
      finally { setLoading(false) }
  }

  const applyColorToAll = (hex: string) => {
      setPreviewEscalas(prev => prev.map(e => ({ ...e, cor: hex })));
  }

  const updatePreviewColor = (idx: number, hex: string) => {
      const newArr = [...previewEscalas]; newArr[idx].cor = hex; setPreviewEscalas(newArr);
  }

  const togglePreviewIncense = (idx: number) => {
      const newArr = [...previewEscalas];
      const escala = newArr[idx];
      const currentTeam = escala.acolitos;

      if (currentTeam.length <= 2) {
          const dateStr = escala.data;
          const dateObj = new Date(dateStr + 'T12:00:00');
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

          const usageMap: { [key: string]: number } = {};
          dbAcolitos.forEach(a => usageMap[a.nome] = 0);
          newArr.forEach(e => e.acolitos.forEach(a => {
              if (usageMap[a.nome] !== undefined) usageMap[a.nome]++;
          }));

          const currentScheduledNames = new Set(
              newArr.filter(e => e.data === dateStr).flatMap(e => e.acolitos.map(a => a.nome))
          );
          
          const prevD = new Date(dateObj); prevD.setDate(prevD.getDate() - 1);
          const prevDateStr = prevD.toISOString().split('T')[0];
          const nextD = new Date(dateObj); nextD.setDate(nextD.getDate() + 1);
          const nextDateStr = nextD.toISOString().split('T')[0];
          
          const adjacentScheduledNames = new Set(
              newArr.filter(e => e.data === prevDateStr || e.data === nextDateStr).flatMap(e => e.acolitos.map(a => a.nome))
          );

          const getFullName = (ac: any) => `${ac.nome} ${ac.sobrenome || ''}`.trim();

          const isEligible = (ac: any, forTuribulo: boolean) => {
              const fullName = getFullName(ac);
              if (currentScheduledNames.has(fullName) || adjacentScheduledNames.has(fullName)) return false;
              if (!ac.ativo) return false;
              if (ac.apenas_fim_de_semana && !isWeekend) return false;
              if (forTuribulo && (!ac.manuseia_turibulo || ac.genero === 'F')) return false;
              
              const hasRestriction = restrictions.some(r => {
                  return r.acolito_nome === fullName && (dateStr >= r.data_inicio && dateStr <= (r.data_fim || r.data_inicio));
              });
              if (hasRestriction) return false;
              
              return true;
          };

          let turibuloName = 'A definir...';
          const turibuloPool = dbAcolitos.filter(a => isEligible(a, true)).sort((a, b) => usageMap[a.nome] - usageMap[b.nome]);
          if (turibuloPool.length > 0) {
              const selected = turibuloPool[0];
              turibuloName = getFullName(selected);
              currentScheduledNames.add(turibuloName);
              usageMap[selected.nome]++;
          }

          let navetaName = 'A definir...';
          const navetaPool = dbAcolitos.filter(a => isEligible(a, false)).sort((a, b) => usageMap[a.nome] - usageMap[b.nome]);
          if (navetaPool.length > 0) {
              const selected = navetaPool[0];
              navetaName = getFullName(selected);
          }

          newArr[idx].acolitos = [
              ...currentTeam,
              { nome: turibuloName, funcao: 'Turíbulo' },
              { nome: navetaName, funcao: 'Naveta' }
          ];

      } else {
          newArr[idx].acolitos = currentTeam.slice(0, 2);
      }
      setPreviewEscalas(newArr);
  }

  const generatePDF = async () => {
    try {
        let eventsToPrint = rawEvents.filter(evt => evt.data.startsWith(pdfTargetMonth));

        if (selectedPlace) eventsToPrint = eventsToPrint.filter(evt => evt.local === selectedPlace)

        if(eventsToPrint.length === 0) return triggerAlert("Vazio", "Não há escalas neste mês para gerar o PDF.", "warning");

        triggerAlert("Aguarde", "Gerando PDF...", "info");
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('p', 'mm', 'a4') 
        const sortedEvents = [...eventsToPrint].sort((a, b) => new Date(a.data + 'T' + (a.hora || '00:00')).getTime() - new Date(b.data + 'T' + (b.hora || '00:00')).getTime())

        const [yStr, mStr] = pdfTargetMonth.split('-');
        const refDate = new Date(parseInt(yStr), parseInt(mStr) - 1, 1);
        const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
        const year = refDate.getFullYear()

        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(`ESCALA MENSAL - ${monthName} / ${year}`, 105, 15, { align: "center" })

        const startX = 10; const startY = 25; const boxWidth = 46; const boxHeight = 26; const gap = 2; const columns = 4;
        let cursorX = startX; let cursorY = startY;
        
        const PDF_THEMES: Record<string, { bg: [number, number, number], text: [number, number, number] }> = {
            '#16a34a': { bg: [220, 252, 231], text: [0, 0, 0] },
            '#ffffff': { bg: [248, 250, 252], text: [0, 0, 0] },
            '#dc2626': { bg: [254, 226, 226], text: [0, 0, 0] },
            '#7c3aed': { bg: [243, 232, 255], text: [0, 0, 0] },
            '#f472b6': { bg: [252, 231, 243], text: [0, 0, 0] }
        };

        doc.setFontSize(8)
        sortedEvents.forEach((evt, index) => {
            if (index > 0 && index % columns === 0) { cursorX = startX; cursorY += boxHeight + gap; }
            if (cursorY + boxHeight > 280) { doc.addPage(); cursorY = 20; }

            const d = new Date(evt.data + 'T12:00:00'); 
            const weekDayRaw = d.toLocaleDateString('pt-BR', { weekday: 'long' });
            const weekDay = weekDayRaw.charAt(0).toUpperCase() + weekDayRaw.slice(1);
            const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeFormatted = evt.hora ? evt.hora.substring(0, 5) : ''; 
            const placeSigla = PLACE_SIGLA[evt.local] || '???';
            
            const safeCor = evt.cor || '#e5e7eb';
            const isDefaultMode = safeCor === '#e5e7eb';
            const theme = isDefaultMode ? { bg: [229, 231, 235], text: [50, 50, 50] } : (PDF_THEMES[safeCor] || { bg: [229, 231, 235], text: [50, 50, 50] });

            doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
            doc.rect(cursorX, cursorY, boxWidth, 6, 'F');
            
            doc.setDrawColor(200).rect(cursorX, cursorY, boxWidth, boxHeight);

            doc.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
            doc.setFontSize(6.5).setFont("helvetica", "bold");
            
            const headerText = `${weekDay}, ${timeFormatted} - ${placeSigla} ${dayMonth}`;
            const centerX = cursorX + (boxWidth / 2);
            doc.text(headerText, centerX, cursorY + 4, { align: 'center' });

            doc.setTextColor(0).setFont("helvetica", "normal").setFontSize(7.5);
            let listY = cursorY + 10;
            const acolitosList = evt.acolitos || [];
            
            acolitosList.forEach((ac: any) => {
                const funcaoSafe = ac.funcao || 'Auxiliar';
                const sigla = ROLE_SIGLA[funcaoSafe] || funcaoSafe.substring(0,1).toUpperCase();
                
                doc.setFillColor(240, 240, 240).rect(cursorX + 1.5, listY - 3, 4, 4, 'F');
                doc.setFont("helvetica", "bold").text(sigla, cursorX + 2, listY);
                
                doc.setFont("helvetica", "normal");
                const nomeSafe = ac.nome || 'A definir';
                const shortName = nomeSafe.length > 17 ? nomeSafe.substring(0, 17) + '.' : nomeSafe;
                doc.text(shortName, cursorX + 7, listY);
                
                listY += 4;
            });
            if (evt.observacao && evt.observacao.includes('Votiva')) doc.setTextColor(0);
            cursorX += boxWidth + gap
        });

        doc.save(`escala_${monthName.toLowerCase()}.pdf`);
        setIsPdfModalOpen(false); closeAlert();
    } catch (error) {
        console.error("Erro na geração do PDF: ", error); 
        triggerAlert("Erro ao Gerar PDF", "Verifique se há dados corrompidos ou tente atualizar a página.", "error");
    }
  }

  const handleEdit = useCallback((evt: any) => {
      setEditingEventId(evt.id)
      const acolitosSafe = Array.isArray(evt.acolitos) 
        ? evt.acolitos.map((a: any) => ({ nome: a.nome, funcao: a.funcao })) 
        : [];
      setFormData({ date: evt.data, time: evt.hora ? evt.hora.substring(0, 5) : '', place: evt.local, obs: evt.observacao || '', cor: evt.cor || '#e5e7eb', acolitos: acolitosSafe })
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

      const formTime = formData.time.substring(0, 5); 
      const isDuplicate = rawEvents.some(evt => {
          if (editingEventId && evt.id === editingEventId) return false; 
          const evtTime = evt.hora.substring(0, 5);
          return evt.data === formData.date && evt.local === formData.place && evtTime === formTime;
      })

      if (isDuplicate) return triggerAlert("Duplicidade", "Já existe uma missa agendada para este dia, local e horário.", "error")

      const acolitosFinal = formData.acolitos.map(ac => {
           const dbAc = dbAcolitos.find(db => db.nome === ac.nome)
           if (dbAc) return { ...ac, nome: `${dbAc.nome} ${dbAc.sobrenome || ''}`.trim() }
           return ac
      })

      const payload = { data: formData.date, hora: formData.time, local: formData.place, observacao: formData.obs, cor: formData.cor, acolitos: acolitosFinal }
      let error = null
      if (editingEventId) { const { error: err } = await supabase.from('escalas').update(payload).eq('id', editingEventId); error = err } 
      else { const { error: err } = await supabase.from('escalas').insert([payload]); error = err }

      if (error) triggerAlert("Erro", "Falha ao salvar: " + error.message, "error")
      else { setIsModalOpen(false); fetchEscalas() }
  }

  const openNewForm = () => {
      setEditingEventId(null)
      setFormData({ date: new Date().toLocaleDateString('en-CA'), time: '19:00', place: PLACES[0], obs: '', cor: '#e5e7eb', acolitos: [{nome:'', funcao:'Missal'}, {nome:'', funcao:'Vela'}] })
      setIsModalOpen(true)
  }

  const updateAcolito = (idx: number, field: string, val: string) => {
      const newArr: any = [...formData.acolitos]; newArr[idx][field] = val; setFormData({...formData, acolitos: newArr})
  }
  const addSlot = () => setFormData({...formData, acolitos: [...formData.acolitos, {nome: '', funcao: 'Missal'}]})
  const removeSlot = (idx: number) => setFormData({...formData, acolitos: formData.acolitos.filter((_, i) => i !== idx)})

  if (!mounted) return null

  const checkDay19Exists = () => {
      if(!autoGenMonth) return false
      const [y, m] = autoGenMonth.split('-').map(Number)
      return new Date(y, m-1, 19).getDate() === 19
  }
  const showDay19Option = checkDay19Exists()
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans pb-28 lg:pb-24 selection:bg-blue-500/30">
      
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
                      {customAlert.type === 'info' && <Info size={28}/>}
                  </div>
                  
                  <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{customAlert.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{customAlert.message}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                      {!customAlert.isConfirmDialog ? (
                          <button onClick={closeAlert} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 rounded-xl transition">Entendi</button>
                      ) : (
                          <>
                              <button onClick={closeAlert} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl transition">Cancelar</button>
                              <button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); closeAlert(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition">Sim, confirmar</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <header className="lg:hidden fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 p-1 -ml-1"><Menu size={24}/></button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-medium text-white text-sm shadow-md">JP</div>
            <h1 className="text-sm font-medium text-gray-900">São José Operário</h1>
         </div>
      </header>

      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
         <div className="p-5 border-b border-gray-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-medium text-white shadow-md">JP</div>
                 <div>
                     <h1 className="text-sm font-medium leading-none text-gray-900">São José Operário</h1>
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userProfile === 'admin' ? 'Admin' : 'Acólito'}</span>
                 </div>
             </div>
             <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
         </div>

         <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3 px-2">Menu Principal</div>
            {canManage && (
                <>
                    <Link href="/financeiro" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium transition">
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
                    <Link href="/configuracoes" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
                        <Settings size={18}/> Configurações
                    </Link>
                </>
            )}
            
            <button onClick={() => {setIsPdfModalOpen(true); setIsMobileMenuOpen(false)}} className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition shadow-sm">
                <Download size={18} className="text-blue-600"/> Baixar Escala
            </button>

            {canManage && (
                <div className="mt-4 px-3 py-3 bg-gray-50 rounded-xl border border-gray-200 relative group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">Gerador Avançado</span>
                            <div className="group/info relative flex items-center">
                                <Info size={14} className="text-blue-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/info:block w-48 p-2.5 bg-gray-800 text-white text-[10px] rounded-xl shadow-xl z-[60] leading-relaxed pointer-events-none text-center">
                                    O gerador avançado é usado para gerar escalas considerando tempo litúrgico. Se desabilitado, ele gera escalas sem o tempo litúrgico.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isAdvancedMode} onChange={(e) => setIsAdvancedMode(e.target.checked)} className="sr-only peer" />
                            <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 block mb-3">Cores das Igrejas</span>
                    <div className="space-y-2 px-2">
                        {PLACE_LEGEND.map(p => (
                            <div key={p.name} className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                                <div className={`w-3 h-3 rounded-sm ${p.color}`}></div> {p.name}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest px-2 block mb-3">Tempos Litúrgicos</span>
                    <div className="grid grid-cols-1 gap-2 px-2">
                        {LITURGICAL_COLORS.map(c => (
                            <div key={c.name} className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                                <div className={`w-3 h-3 rounded-full border border-gray-200 ${c.class}`}></div> {c.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
         </nav>

         <div className="p-4 border-t border-gray-100 flex items-center gap-2">
              <button onClick={() => {setIsAboutModalOpen(true); setIsMobileMenuOpen(false)}} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs font-medium transition"><Info size={16}/> Sobre</button>
              <button onClick={() => {setIsRulesModalOpen(true); setIsMobileMenuOpen(false)}} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs font-medium transition"><BookOpen size={16}/> Regras</button>
              <button onClick={handleLogout} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"><LogOut size={18}/></button>
         </div>
      </aside>

      <main className="flex-1 lg:ml-64 px-4 py-8 max-w-7xl mx-auto w-full pt-20 lg:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              
              <div className="lg:col-span-1 space-y-4">
                  <div className="lg:sticky lg:top-8 space-y-4">
                      <MemoizedCalendar 
                        currentDate={calendarDate}
                        setDate={setCalendarDate}
                        rawEvents={rawEvents}
                        filterDate={filterDate}
                        setFilterDate={setFilterDate}
                      />
                      
                      {canManage && (
                          <div className="grid gap-2">
                              <button onClick={() => setIsAutoModalOpen(true)} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all">
                                  <Wand2 size={20}/> Gerar Escalas
                              </button>
                              <button onClick={openNewForm} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20">
                                  <Plus size={16}/> Manual
                              </button>
                          </div>
                      )}
                      
                      {canManage && (
                          <button onClick={handleClearMonth} className="w-full h-10 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition mt-2">
                              <Trash2 size={16}/> Limpar Mês Atual
                          </button>
                      )}

                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                              <button onClick={() => setActiveTab('upcoming')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Próximas</button>
                              <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                          </div>

                          <div className="relative">
                              <select value={selectedPlace} onChange={e => setSelectedPlace(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition">
                                  <option value="">Todas as Igrejas</option>
                                  {PLACES.map(p => <option key={p} value={p}>{p.replace('Rainha da Paz (Matriz)', 'Matriz')}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                          </div>
                          
                          <div className="relative">
                              <select 
                                value={selectedAcolyte} 
                                onChange={e => { setSelectedAcolyte(e.target.value); setShowOnlyMyScales(false); }} 
                                className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-50 transition"
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
                              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                          </div>

                          <button onClick={() => { setShowOnlyMyScales(!showOnlyMyScales); setSelectedAcolyte('') }} className={`w-full h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition ${showOnlyMyScales ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                              {showOnlyMyScales ? <Eye size={16}/> : <Filter size={16}/>} Minhas Escalas
                          </button>
                          
                          {(showOnlyMyScales || selectedAcolyte) && (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                                  <span className="text-[10px] text-blue-600 font-medium block uppercase tracking-wider">Missas Encontradas</span>
                                  <span className="text-xl font-medium text-gray-900 block">{filteredEvents.length}</span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                  {Object.keys(groupedEvents).length === 0 ? (
                      <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                              <CalendarIcon size={32} className="text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-700">Nenhuma escala encontrada</h3>
                      </div>
                  ) : (
                      Object.entries(groupedEvents).map(([month, monthEvents]) => (
                          <div key={month} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4 px-1">{month}</h2>
                              <div className="grid gap-3">
                                  {monthEvents.map((evt) => {
                                      const date = new Date(evt.data + 'T12:00:00');
                                      const day = date.getDate();
                                      const weekDay = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                                      const isPast = date < todayDate;
                                      
                                      const isDefaultColor = !LITURGICAL_COLORS.some(c => c.hex === evt.cor);
                                      const litColor = isDefaultColor 
                                          ? LITURGICAL_COLORS[0] 
                                          : LITURGICAL_COLORS.find(c => c.hex === evt.cor) || LITURGICAL_COLORS[0];

                                      return (
                                          <div key={evt.id} className={`group relative bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-4 transition shadow-sm hover:shadow-md 
                                              ${isPast ? 'opacity-60 grayscale-[0.5]' : 'border-gray-200'}
                                              ${PLACE_COLORS[evt.local] || 'border-l-gray-400'} border-l-[6px]`}>
                                              
                                              <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:w-16 shrink-0">
                                                  <div className="flex flex-col items-center">
                                                      <span className="text-2xl font-medium text-gray-900">{day}</span>
                                                      <span className="text-[10px] font-medium uppercase text-gray-400">{date.toLocaleDateString('pt-BR', {month:'short'}).replace('.','')}</span>
                                                  </div>
                                                  {!isDefaultColor && (
                                                      <div className={`w-4 h-4 rounded-full border border-gray-200 shadow-inner mt-2 ${litColor.class}`} title={`Tempo: ${litColor.name}`}></div>
                                                  )}
                                              </div>

                                              <div className="flex-1 min-w-0">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div>
                                                          <h3 className="font-medium text-gray-900">{evt.local.replace('Rainha da Paz (Matriz)', 'Matriz')}</h3>
                                                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 uppercase mt-1">
                                                              <Clock size={14} className="text-blue-500"/> {evt.hora.substring(0,5)}
                                                              {evt.observacao && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] ml-2 font-medium">{evt.observacao}</span>}
                                                          </p>
                                                      </div>
                                                      {canManage && !isPast && (
                                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                              <button onClick={() => handleEdit(evt)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                                              <button onClick={() => handleDelete(evt.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                                      {evt.acolitos.map((ac: any, idx: number) => (
                                                          <div key={idx} className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                                                              <span className="text-xs font-medium text-gray-700">{ac.nome.split(' ')[0]}</span>
                                                              <span className="text-[9px] font-medium text-blue-500 uppercase">{ROLE_SIGLA[ac.funcao] || 'A'}</span>
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
                      <div className="flex justify-center items-center gap-4 pt-4 border-t border-gray-200">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition text-gray-600 shadow-sm"><ChevronLeft size={20}/></button>
                          <span className="text-sm font-medium text-gray-500">Página {currentPage} de {totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition text-gray-600 shadow-sm"><ChevronRight size={20}/></button>
                      </div>
                  )}
              </div>
          </div>
      </main>

      {isAutoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => setIsAutoModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2"><Wand2 className="text-purple-600" size={20}/> Gerar Escalas</h3>
                <div className="space-y-6">
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                            <label className="text-xs text-gray-500 font-medium uppercase block mb-1">Mês de Referência</label>
                            <input 
                                type="month" 
                                value={autoGenMonth} 
                                onChange={e => setAutoGenMonth(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                            />
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <input type="checkbox" checked={clearBeforeGenerate} onChange={e => setClearBeforeGenerate(e.target.checked)} className="mt-0.5 accent-purple-600"/>
                            <div className="text-xs text-gray-600">
                                <span className="font-medium block text-purple-700">Limpar automaticamente</span>
                                Apaga as escalas existentes deste mês antes de gerar.
                            </div>
                        </div>

                        <div className="flex items-start gap-2 pt-2 border-t border-gray-200 mt-2">
                            <input type="checkbox" checked={mondayNovena} onChange={e => setMondayNovena(e.target.checked)} className="mt-0.5 accent-purple-500"/>
                            <div className="text-xs text-gray-600">
                                <span className="font-medium block text-purple-700">Novena (Segunda-feira)</span>
                                Escala apenas 1 acólito nas missas de segunda às 19h30.
                            </div>
                        </div>

                        <div className="flex items-start gap-2 pt-2 border-t border-gray-200 mt-2">
                            <input type="checkbox" checked={noWeekdays} onChange={e => setNoWeekdays(e.target.checked)} className="mt-0.5 accent-red-600"/>
                            <div className="text-xs text-gray-600">
                                <span className="font-medium block text-red-600">Sem acólitos na semana</span>
                                Não gera escalas para missas de segunda a sexta (exceto dias especiais e Novena).
                            </div>
                        </div>
                        
                        {!noWeekdays && (
                            <div className="flex items-start gap-2 pt-2 border-t border-gray-200 mt-2">
                                <input type="checkbox" checked={singleAcolyteWeekdays} onChange={e => setSingleAcolyteWeekdays(e.target.checked)} className="mt-0.5 accent-blue-600"/>
                                <div className="text-xs text-gray-600">
                                    <span className="font-medium block text-blue-700">Apenas 1 acólito (Quarta/Sexta)</span>
                                    Reduz a equipe para 1 pessoa nas missas de quarta e sexta-feira.
                                </div>
                            </div>
                        )}

                        {showDay19Option && (
                            <div className="flex items-start gap-2 pt-2 border-t border-gray-200 mt-2">
                                <input type="checkbox" checked={includeDay19} onChange={e => setIncludeDay19(e.target.checked)} className="mt-0.5 accent-orange-500"/>
                                <div className="text-xs text-gray-600">
                                    <span className="font-medium block text-orange-600">Escalar Turíbulo no dia 19?</span>
                                    Adiciona funções extras na Missa de São José.
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleStartAutoGenerate} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 disabled:opacity-50">
                        {isGenerating ? 'Processando...' : (isAdvancedMode ? 'Próximo: Revisar Liturgia' : 'Gerar Escalas')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {isReviewModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
              <div className="bg-white border border-gray-200 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
                  
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div>
                          <h2 className="text-2xl font-medium text-gray-900 flex items-center gap-3"><Sparkles className="text-blue-600" size={28}/> Revisão Litúrgica</h2>
                          <p className="text-sm text-gray-500 font-medium">Ajuste o tempo litúrgico antes de publicar o mês.</p>
                      </div>
                      <button onClick={() => setIsReviewModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-900"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar">
                      <div className="bg-blue-600 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-600/20 mb-6">
                          <div className="text-white text-center sm:text-left">
                              <h4 className="font-medium">Aplicar Tempo Litúrgico Global</h4>
                              <p className="text-xs text-blue-100">Escolha um tempo litúrgico para aplicar em TODOS os dias gerados abaixo.</p>
                          </div>
                          <div className="flex gap-2 bg-white/20 p-2 rounded-2xl backdrop-blur-sm">
                              {LITURGICAL_COLORS.map(c => (
                                  <button key={'global-'+c.hex} onClick={() => applyColorToAll(c.hex)} title={`Aplicar: ${c.name}`} className={`w-9 h-9 rounded-full border-2 border-white/50 hover:scale-110 transition-transform ${c.class}`}></button>
                              ))}
                          </div>
                      </div>

                      {previewEscalas.map((escala, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-blue-300 transition-colors">
                              <div className="flex flex-col items-center md:items-start min-w-[140px]">
                                  <span className="text-lg font-medium text-gray-900">{new Date(escala.data + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', weekday:'short'})}</span>
                                  <span className="text-xs font-medium text-blue-600 uppercase">{escala.hora} - {PLACE_SIGLA[escala.local]}</span>
                              </div>

                              <div className="flex-1 flex flex-col gap-2">
                                  <span className="text-[10px] font-medium text-gray-400 uppercase">Tempo Litúrgico Manual</span>
                                  <div className="flex gap-2">
                                      {LITURGICAL_COLORS.map(c => (
                                          <button 
                                            key={c.hex} 
                                            title={c.name}
                                            onClick={() => updatePreviewColor(idx, c.hex)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${c.class} ${escala.cor === c.hex ? 'border-blue-600 ring-4 ring-blue-50 scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                          />
                                      ))}
                                  </div>
                              </div>

                              <div className="flex flex-col items-center gap-2 px-6 border-l border-gray-100">
                                  <span className="text-[10px] font-medium text-gray-400 uppercase">Incenso?</span>
                                  <button onClick={() => togglePreviewIncense(idx)} className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-medium text-xs ${escala.acolitos.length > 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-400 border border-transparent hover:bg-gray-200'}`}>
                                      <Flame size={18} /> {escala.acolitos.length > 2 ? 'Com Turíbulo' : 'Sem Incenso'}
                                  </button>
                                  {escala.isSolemn && escala.acolitos.length <= 2 && (
                                      <span className="text-[9px] text-orange-500 font-medium animate-pulse">Sugerido para Solenidade!</span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="p-8 border-t border-gray-100 bg-white">
                      <button onClick={finalizeGeneration} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-5 rounded-[1.5rem] shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 text-lg transition-all active:scale-95">
                          <CheckCircle2 size={24}/> Publicar Escalas do Mês
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isAboutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                  <button onClick={() => setIsAboutModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                      <span className="text-white font-medium text-lg">JP</span>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-1">São José Operário</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Versão {APP_VERSION}</p>
                  
                  <div className="text-left space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-60 overflow-y-auto">
                      <h4 className="text-xs font-medium text-gray-900 mb-2">Novidades desta versão:</h4>
                      <ul className="space-y-2">
                          {RELEASE_NOTES.map((note, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">•</span> {note}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
      )}

      {isRulesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                  <button onClick={() => setIsRulesModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                  
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <BookOpen size={20} className="text-purple-600"/>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Manual de Regras do Sistema</h3>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-600 leading-relaxed">
                      <div className="space-y-2">
                          <h4 className="text-gray-900 font-medium flex items-center gap-2"><Flame size={14} className="text-orange-500"/> Habilidades Litúrgicas</h4>
                          <p>Apenas acólitos com a opção <strong>"Manuseia Missal"</strong> ativada no cadastro podem ser escalados para a função de Missal (vaga 1). Da mesma forma, apenas quem tem <strong>"Manuseia Turíbulo"</strong> pode ser escalado para Turíbulo (vaga 3).</p>
                      </div>
                      <div className="space-y-2">
                          <h4 className="text-gray-900 font-medium flex items-center gap-2"><Users size={14} className="text-blue-500"/> Duplas (Parceiros)</h4>
                          <p>Se um acólito tem uma dupla definida, o sistema tentará colocá-los juntos na mesma missa. <strong>Importante:</strong> Se não houver vaga para os dois, nenhum dos dois será escalado naquela missa específica, garantindo que a dupla nunca seja separada.</p>
                      </div>
                      <div className="space-y-2">
                          <h4 className="text-gray-900 font-medium flex items-center gap-2"><Clock size={14} className="text-emerald-500"/> Exclusividade Diária</h4>
                          <p>Um acólito só pode ser escalado <strong>uma vez por dia</strong>. Se ele já estiver em qualquer missa (mesmo em outra igreja), o sistema não o sorteará novamente para aquele dia.</p>
                      </div>
                      <div className="space-y-2">
                          <h4 className="text-gray-900 font-medium flex items-center gap-2"><CalendarOff size={14} className="text-red-500"/> Restrições & Justiça</h4>
                          <p>O sistema prioriza de forma proporcional quem foi menos escalado naquele mesmo mês gerado, distribuindo as vagas irmãmente. Acólitos com restrição de data não serão escalados no período bloqueado.</p>
                      </div>
                  </div>
                  
                  <button onClick={() => setIsRulesModalOpen(false)} className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 rounded-xl transition">Entendi</button>
              </div>
          </div>
      )}

      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20}/> Baixar Escala
                </h3>
                
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="text-xs text-gray-500 font-medium uppercase block mb-2">Selecione o Mês</label>
                        <input 
                            type="month" 
                            value={pdfTargetMonth} 
                            onChange={e => setPdfTargetMonth(e.target.value)} 
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                        />
                    </div>
                    
                    <button onClick={generatePDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                        <Download size={18}/> Gerar Arquivo PDF
                    </button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
           <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
               <h3 className="text-lg font-medium text-gray-900">{editingEventId ? 'Editar Missa' : 'Nova Missa'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
             </div>
             <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Hora</label>
                        <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Local</label>
                    <select value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
                        {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Observação</label>
                    <input type="text" value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600" placeholder="Opcional" />
                </div>
                <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-gray-900">Equipe</label>
                        <button onClick={addSlot} className="text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-blue-600 font-medium transition">+ Vaga</button>
                    </div>
                    <div className="space-y-2">
                        {formData.acolitos.map((acolito, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <select 
                                    value={acolito.nome} 
                                    onChange={e => updateAcolito(idx, 'nome', e.target.value)} 
                                    className="w-full sm:flex-1 bg-white border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 outline-none focus:border-blue-600"
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
                                    <select value={acolito.funcao} onChange={e => updateAcolito(idx, 'funcao', e.target.value)} className="flex-1 sm:w-32 bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-blue-600">
                                        {ROLES.map(r => <option key={r}>{r}</option>)}
                                        <option>Auxiliar</option>
                                    </select>
                                    <button onClick={() => removeSlot(idx)} className="p-2.5 bg-white border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 hover:border-red-200 rounded-lg transition shrink-0"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4">
                    <Save size={18}/> Salvar Missa
                </button>
             </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  )
}