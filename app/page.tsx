'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { 
  Plus, X, Clock, Trash2, Save, FileText, Edit2, 
  Filter, Eye, ChevronDown, Calendar as CalendarIcon, 
  Wand2, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertCircle, Info, Download, AlertTriangle, Search, 
  Sparkles, BookOpen, ShieldCheck, Users, Flame, Palette, CalendarOff, Eraser, Settings
} from 'lucide-react'

// --- Funções de Conversão de Cor para o PDF ---
const hexToRgb = (hex: string): [number, number, number] => {
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return [r, g, b];
};

const getContrastYIQ = (hex: string): [number, number, number] => {
    const [r, g, b] = hexToRgb(hex);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? [0, 0, 0] : [255, 255, 255];
};

// --- Constantes ---
const PLACE_SIGLA: { [key: string]: string } = {
    "São José Operário": "SJO", "Capela Nsa. Sra. das Graças": "NSG",
    "Nsa. Sra. da Abadia": "NSA", "Santa Clara": "SC"
}

const PLACE_COLORS: { [key: string]: string } = {
    "São José Operário": "border-l-blue-600",
    "Capela Nsa. Sra. das Graças": "border-l-emerald-600",
    "Nsa. Sra. da Abadia": "border-l-orange-500",
    "Santa Clara": "border-l-violet-600"
}

const ROLES = ['Missal', 'Vela', 'Turíbulo', 'Naveta']
const ROLE_SIGLA: { [key: string]: string } = { 'Missal': 'M', 'Vela': 'V', 'Turíbulo': 'T', 'Naveta': 'N' }
const PLACES = ["São José Operário", "Capela Nsa. Sra. das Graças", "Nsa. Sra. da Abadia", "Santa Clara"]
const ITEMS_PER_PAGE = 10 
const SUNDAY_SCHEDULE = ['07:30', '09:00', '17:30', '19:00']

// --- Tipagens ---
interface NewEscala {
    data: string; hora: string; local: string; observacao: string; cor: string;
    acolitos: { nome: string; funcao: string }[];
}

interface AlertState {
    isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
    title: string; message: string; onConfirm?: () => void; isConfirmDialog: boolean;
}

// --- Componente de Minicalendário Lateral ---
const MemoizedCalendar = React.memo(({ 
    currentDate, setDate, rawEvents, filterDate, setFilterDate 
}: { 
    currentDate: Date, setDate: (d: Date) => void, rawEvents: any[], filterDate: string | null, setFilterDate: (s: string | null) => void 
}) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    
    const eventDays = useMemo(() => new Set(rawEvents.map(e => e.data)), [rawEvents])

    const days = []
    for(let i=0; i<firstDay; i++) days.push(<div key={`empty-${i}`} className="w-7 h-7"/>)
    
    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const hasEvent = eventDays.has(dateStr)
        const isToday = new Date().toLocaleDateString('en-CA') === dateStr
        const isSelected = filterDate === dateStr

        let bgClass = 'hover:bg-gray-100 text-gray-700'
        if (isSelected) bgClass = 'bg-blue-600 text-white font-bold shadow-md transform scale-105'
        else if (isToday) bgClass = 'border border-blue-600 text-blue-600 font-bold bg-blue-50'

        days.push(
            <button key={d} onClick={() => setFilterDate(isSelected ? null : dateStr)} className={`w-7 h-7 flex items-center justify-center rounded-full text-xs relative transition-all ${bgClass}`}>
                {d}
                {hasEvent && !isSelected && <div className="absolute bottom-0 w-1 h-1 bg-emerald-500 rounded-full"></div>}
            </button>
        )
    }

    return (
        <div className="bg-white border border-gray-200 rounded-3xl p-4 w-full shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronLeft size={16}/></button>
                <span className="text-xs font-bold capitalize text-gray-900 tracking-wide">{currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[9px] text-gray-400 font-bold uppercase mb-1">{d}</span>)}
                {days}
            </div>
            {filterDate && (
                <div className="mt-3 pt-2 border-t border-gray-100 text-center">
                    <button onClick={() => setFilterDate(null)} className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider transition">Limpar filtro de data</button>
                </div>
            )}
        </div>
    )
})
MemoizedCalendar.displayName = 'MemoizedCalendar'


export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [isRulesLocalModalOpen, setIsRulesLocalModalOpen] = useState(false)
  
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

  // Configs do Gerador Automático
  const [isGenerating, setIsGenerating] = useState(false)
  const [clearBeforeGenerate, setClearBeforeGenerate] = useState(true)
  const [includeDay19, setIncludeDay19] = useState(false)
  const [singleAcolyteWeekdays, setSingleAcolyteWeekdays] = useState(false)
  const [noWeekdays, setNoWeekdays] = useState(false)
  const [mondayNovena, setMondayNovena] = useState(false) 

  const [formData, setFormData] = useState({
    date: '', time: '', place: PLACES[0], obs: '', cor: '#e5e7eb',
    acolitos: [ { nome: '', funcao: 'Missal' }, { nome: '', funcao: 'Vela' } ]
  })

  const canManage = userProfile === 'admin' || userProfile === 'diretoria';

  // 1. BUSCA DE DADOS E INICIALIZAÇÃO
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
  }, [])

  // 2. CONTROLE DO TECLADO
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (customAlert.isOpen) { 
                setCustomAlert(prev => ({ ...prev, isOpen: false })); 
                return; 
            }
            setIsModalOpen(false); 
            setIsAutoModalOpen(false); 
            setIsPdfModalOpen(false); 
            setIsNotesModalOpen(false); 
            setIsRulesLocalModalOpen(false);
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
          setIncludeDay19(false)
      }
  }, [isAutoModalOpen, calendarDate])

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type, isConfirmDialog: false })
  }

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
      setCustomAlert({ isOpen: true, title, message, type: 'warning', isConfirmDialog: true, onConfirm })
  }

  const closeAlert = () => setCustomAlert({ ...customAlert, isOpen: false })

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
    } else if (selectedAcolyte) {
        filtered = filtered.filter(evt => evt.acolitos.some((a: any) => a.nome === selectedAcolyte))
    }

    if (selectedPlace) {
        filtered = filtered.filter(evt => evt.local === selectedPlace)
    }
    return filtered
  }, [rawEvents, showOnlyMyScales, userName, selectedPlace, activeTab, filterDate, selectedAcolyte])

  // Paginação aplicada à lista
  const paginatedEvents = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      return filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredEvents, currentPage])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [activeTab, showOnlyMyScales, selectedPlace, filterDate, selectedAcolyte])

  // Agrupamento por mês (Lista Clássica)
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
      
      triggerConfirm("Excluir Mês Inteiro?", `Deseja realmente apagar TODAS as escalas de ${calendarDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}? Esta ação é irreversível.`, 
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
                        teamSize = 1; obs = 'Novena Perpétua'; local = PLACES[0]; 
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
                        tempEscalas.push({ data: dateStr, hora: time, local: local, observacao: obs, cor: color, acolitos: teamObjects })
                    }
                }
            }
        }
        
        if (clearBeforeGenerate) {
            const lastDay = new Date(year, month, 0).getDate()
            await supabase.from('escalas').delete().gte('data', `${autoGenMonth}-01`).lte('data', `${autoGenMonth}-${lastDay}`)
        }
        
        const { error } = await supabase.from('escalas').insert(tempEscalas)
        if(error) throw error
        
        setIsAutoModalOpen(false)
        fetchEscalas()
        triggerAlert("Sucesso", `${tempEscalas.length} escalas geradas com sucesso!`, "success")

    } catch (error: any) { triggerAlert("Erro", error.message, "error") } 
    finally { setIsGenerating(false) }
  }

  const generatePDF = async () => {
    try {
        let eventsToPrint = rawEvents.filter(evt => evt.data.startsWith(pdfTargetMonth));
        if (selectedPlace) eventsToPrint = eventsToPrint.filter(evt => evt.local === selectedPlace)
        if(eventsToPrint.length === 0) return triggerAlert("Vazio", "Não há escalas neste mês.", "warning");

        triggerAlert("Aguarde", "Gerando PDF...", "info");
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('p', 'mm', 'a4') 
        const sortedEvents = [...eventsToPrint].sort((a, b) => new Date(a.data + 'T' + (a.hora || '00:00')).getTime() - new Date(b.data + 'T' + (b.hora || '00:00')).getTime())

        const [yStr, mStr] = pdfTargetMonth.split('-');
        const refDate = new Date(parseInt(yStr), parseInt(mStr) - 1, 1);
        const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
        const year = refDate.getFullYear()

        doc.setFont("helvetica", "bold").setFontSize(14)
        doc.text(`ESCALA MENSAL - ${monthName} / ${year}`, 105, 15, { align: "center" })

        const startX = 10; const startY = 25; const boxWidth = 46; const boxHeight = 26; const gap = 2; const columns = 4;
        let cursorX = startX; let cursorY = startY;
        
        doc.setFontSize(8)
        sortedEvents.forEach((evt, index) => {
            if (index > 0 && index % columns === 0) { cursorX = startX; cursorY += boxHeight + gap; }
            if (cursorY + boxHeight > 280) { doc.addPage(); cursorY = 20; }

            const d = new Date(evt.data + 'T12:00:00'); 
            const weekDay = d.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + d.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1);
            const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            const safeCor = (evt.cor && evt.cor !== '#e5e7eb') ? evt.cor : '#e5e7eb';
            const bgRgb = hexToRgb(safeCor);
            const textRgb = getContrastYIQ(safeCor);

            doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]).rect(cursorX, cursorY, boxWidth, 6, 'F');
            doc.setDrawColor(200).rect(cursorX, cursorY, boxWidth, boxHeight);
            
            doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]).setFontSize(6.5).setFont("helvetica", "bold");
            doc.text(`${weekDay}, ${evt.hora ? evt.hora.substring(0, 5) : ''} - ${PLACE_SIGLA[evt.local] || '???'} ${dayMonth}`, cursorX + (boxWidth / 2), cursorY + 4, { align: 'center' });

            doc.setTextColor(0).setFont("helvetica", "normal").setFontSize(7.5);
            let listY = cursorY + 10;
            
            (evt.acolitos || []).forEach((ac: any) => {
                doc.setFillColor(240, 240, 240).rect(cursorX + 1.5, listY - 3, 4, 4, 'F');
                doc.setFont("helvetica", "bold").text(ROLE_SIGLA[ac.funcao || 'Auxiliar'] || 'A', cursorX + 2, listY);
                doc.setFont("helvetica", "normal").text((ac.nome || 'A definir').substring(0, 17), cursorX + 7, listY);
                listY += 4;
            });
            cursorX += boxWidth + gap
        });

        doc.save(`escala_${monthName.toLowerCase()}.pdf`);
        setIsPdfModalOpen(false); closeAlert();
    } catch (error) { triggerAlert("Erro", "Falha ao gerar o PDF.", "error"); }
  }

  const handleEdit = useCallback((evt: any) => {
      setEditingEventId(evt.id)
      setFormData({ date: evt.data, time: evt.hora?.substring(0, 5) || '', place: evt.local, obs: evt.observacao || '', cor: evt.cor || '#e5e7eb', acolitos: Array.isArray(evt.acolitos) ? evt.acolitos.map((a:any)=>({nome:a.nome, funcao:a.funcao})) : [] })
      setIsModalOpen(true)
  }, [])

  const handleDelete = async (id: number) => {
      triggerConfirm("Excluir Missa", "Tem certeza que deseja apagar esta escala?", async () => {
          await supabase.from('escalas').delete().eq('id', id)
          fetchEscalas(); closeAlert();
      })
  }

  const handleSave = async () => {
      if (!formData.date || !formData.time) return triggerAlert("Erro", "Preencha data e hora", "error")
      if (formData.acolitos.filter(a => a.nome.trim() !== '').length === 0) return triggerAlert("Erro", "Adicione pelo menos um acólito!", "error") 

      const isDuplicate = rawEvents.some(evt => (editingEventId !== evt.id) && evt.data === formData.date && evt.local === formData.place && evt.hora.substring(0, 5) === formData.time.substring(0, 5))
      if (isDuplicate) return triggerAlert("Duplicidade", "Já existe uma missa agendada para este dia, local e horário.", "error")

      const acolitosFinal = formData.acolitos.map(ac => {
           const dbAc = dbAcolitos.find(db => db.nome === ac.nome)
           return dbAc ? { ...ac, nome: `${dbAc.nome} ${dbAc.sobrenome || ''}`.trim() } : ac
      })

      const payload = { data: formData.date, hora: formData.time, local: formData.place, observacao: formData.obs, cor: formData.cor, acolitos: acolitosFinal }
      let error = null
      if (editingEventId) { const { error: err } = await supabase.from('escalas').update(payload).eq('id', editingEventId); error = err } 
      else { const { error: err } = await supabase.from('escalas').insert([payload]); error = err }

      if (error) triggerAlert("Erro", "Falha ao salvar", "error")
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

  if (!mounted) return null
  const showDay19Option = autoGenMonth && new Date(Number(autoGenMonth.split('-')[0]), Number(autoGenMonth.split('-')[1])-1, 19).getDate() === 19;
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  
  // --- BOTÕES EXTRAS PARA INJETAR NO MENU LATERAL (MAINLAYOUT) ---
  const homeSidebarExtras = (
      <>
          <button onClick={() => setIsPdfModalOpen(true)} className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm font-bold transition shadow-sm">
              <Download size={18} className="text-blue-600"/> Baixar Escala
          </button>
          
          <button onClick={() => setIsRulesLocalModalOpen(true)} className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm font-bold transition shadow-sm">
              <BookOpen size={18} className="text-purple-600"/> Regras do Gerador
          </button>
          
          <button onClick={() => setIsNotesModalOpen(true)} className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-sm font-bold transition shadow-sm">
              <Sparkles size={18} className="text-amber-500"/> Notas da Versão
          </button>
      </>
  );

  return (
    <>
      {/* Alerta Customizado Global da Página */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      customAlert.type === 'error' ? 'bg-red-50 text-red-500' : 
                      customAlert.type === 'success' ? 'bg-green-50 text-green-500' : 
                      customAlert.type === 'warning' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                      {customAlert.type === 'error' && <AlertCircle size={28}/>}
                      {customAlert.type === 'success' && <CheckCircle2 size={28}/>}
                      {customAlert.type === 'warning' && <AlertTriangle size={28}/>}
                      {customAlert.type === 'info' && <Info size={28}/>}
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{customAlert.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{customAlert.message}</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                      {!customAlert.isConfirmDialog ? (
                          <button onClick={closeAlert} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition">Entendi</button>
                      ) : (
                          <>
                              <button onClick={closeAlert} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition">Cancelar</button>
                              <button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); closeAlert(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">Sim, confirmar</button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Uso do Layout Padrão */}
      <MainLayout userProfile={userProfile} onLogout={handleLogout} customSidebarContent={homeSidebarExtras}>
          <main className="px-4 py-8 max-w-7xl mx-auto w-full pt-20 lg:pt-8 animate-in fade-in duration-500">
              
              {/* Novo Cabeçalho da Página Principal */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                      <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-gray-900 leading-tight">Painel de Escalas</h2>
                          <button onClick={() => setIsNotesModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wider transition">
                              <Sparkles size={12}/> Ver Novidades
                          </button>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-1">Gerencie as missas e equipes do santuário</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                  
                  {/* Coluna Lateral da Home */}
                  <div className="lg:col-span-1 space-y-6">
                      <div className="lg:sticky lg:top-8 space-y-5">
                          <MemoizedCalendar 
                            currentDate={calendarDate} setDate={setCalendarDate}
                            rawEvents={rawEvents} filterDate={filterDate} setFilterDate={setFilterDate}
                          />

                          {/* BOTÕES DE AÇÃO NA COLUNA LATERAL */}
                          {canManage && (
                              <div className="flex flex-col gap-2.5">
                                  <button onClick={openNewForm} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20 active:scale-95">
                                      <Plus size={16}/> Nova Missa
                                  </button>
                                  <button onClick={() => setIsAutoModalOpen(true)} className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-purple-600/20 active:scale-95">
                                      <Wand2 size={16}/> Gerar Escalas
                                  </button>
                              </div>
                          )}

                          <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-sm space-y-4">
                              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                  <button onClick={() => setActiveTab('upcoming')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition ${activeTab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Próximas</button>
                                  <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                              </div>

                              <div className="space-y-2.5">
                                  <div className="relative">
                                      <select value={selectedPlace} onChange={e => setSelectedPlace(e.target.value)} className="w-full h-9 pl-3 pr-8 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-700 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-100 transition">
                                          <option value="">Todas as Igrejas</option>
                                          {PLACES.map(p => <option key={p} value={p}>{p.replace('Rainha da Paz (Matriz)', 'Matriz')}</option>)}
                                      </select>
                                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                                  </div>
                                  
                                  <div className="relative">
                                      <select 
                                        value={selectedAcolyte} 
                                        onChange={e => { setSelectedAcolyte(e.target.value); setShowOnlyMyScales(false); }} 
                                        className="w-full h-9 pl-3 pr-8 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-700 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-100 transition"
                                      >
                                          <option value="">Filtrar Acólito...</option>
                                          {dbAcolitos.map(a => {
                                              const nome = `${a.nome} ${a.sobrenome || ''}`.trim();
                                              return <option key={a.id || a.nome} value={nome}>{nome}</option>
                                          })}
                                      </select>
                                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                                  </div>
                              </div>

                              <button onClick={() => { setShowOnlyMyScales(!showOnlyMyScales); setSelectedAcolyte('') }} className={`w-full h-9 px-3 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-2 transition ${showOnlyMyScales ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                                  {showOnlyMyScales ? <Eye size={16}/> : <Filter size={16}/>} Minhas Escalas
                              </button>
                              
                              {(showOnlyMyScales || selectedAcolyte) && (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                      <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">Missas Encontradas</span>
                                      <span className="text-xl font-black text-gray-900 block mt-1">{filteredEvents.length}</span>
                                  </div>
                              )}
                          </div>

                          {canManage && (
                              <button onClick={handleClearMonth} className="w-full h-10 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition">
                                  <Eraser size={16}/> Limpar Mês Atual
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Coluna Central com as Escalas (FORMATO LISTA HORIZONTAL) */}
                  <div className="lg:col-span-3 space-y-6">
                      {Object.keys(groupedEvents).length === 0 ? (
                          <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl shadow-sm">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                  <CalendarIcon size={32} className="text-gray-400" />
                              </div>
                              <h3 className="text-lg font-bold text-gray-700">Nenhuma escala encontrada</h3>
                              <p className="text-sm text-gray-500 mt-1">Navegue pelas datas ou adicione novas missas.</p>
                          </div>
                      ) : (
                          Object.entries(groupedEvents).map(([month, monthEvents]) => (
                              <div key={month} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">{month}</h2>
                                  <div className="flex flex-col gap-4">
                                      {monthEvents.map((evt) => {
                                          const date = new Date(evt.data + 'T12:00:00');
                                          const day = date.getDate();
                                          const isPast = date < todayDate;

                                          return (
                                              <div key={evt.id} className={`group relative bg-white border border-gray-200 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 transition-all shadow-sm hover:shadow-md 
                                                  ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}
                                                  ${PLACE_COLORS[evt.local] || 'border-l-gray-400'} border-l-[6px]`}>
                                                  
                                                  {/* Lado Esquerdo: Data e Cor */}
                                                  <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center sm:w-20 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 pb-3 sm:pb-0 sm:pr-4">
                                                      <div className="flex flex-col items-center">
                                                          <span className="text-2xl font-black text-gray-900 tracking-tight">{day}</span>
                                                          <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">{date.toLocaleDateString('pt-BR', {month:'short'}).replace('.','')}</span>
                                                      </div>
                                                      {evt.cor && evt.cor !== '#e5e7eb' && (
                                                          <div className="w-3 h-3 rounded-full shadow-sm mt-0 sm:mt-3 border border-black/10" style={{ backgroundColor: evt.cor }} title="Cor de impressão"></div>
                                                      )}
                                                  </div>

                                                  {/* Lado Direito: Informações e Acólitos */}
                                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                      <div className="flex justify-between items-start mb-3">
                                                          <div>
                                                              <h3 className="font-bold text-gray-900 text-base leading-none mb-2">{evt.local.replace('Rainha da Paz (Matriz)', 'Matriz')}</h3>
                                                              <div className="flex items-center gap-2 flex-wrap">
                                                                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                                                      <Clock size={12}/> {evt.hora.substring(0,5)}
                                                                  </span>
                                                                  {evt.observacao && (
                                                                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg truncate max-w-[200px]" title={evt.observacao}>
                                                                          {evt.observacao}
                                                                      </span>
                                                                  )}
                                                              </div>
                                                          </div>
                                                          
                                                          {/* Botões de Ação na Missa */}
                                                          {canManage && !isPast && (
                                                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                  <button onClick={() => handleEdit(evt)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-blue-600 transition border border-gray-200/60 shadow-sm"><Edit2 size={16}/></button>
                                                                  <button onClick={() => handleDelete(evt.id)} className="p-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-400 hover:text-red-600 transition border border-red-100 shadow-sm"><Trash2 size={16}/></button>
                                                              </div>
                                                          )}
                                                      </div>

                                                      {/* Grid de Acólitos */}
                                                      <div className="flex flex-wrap gap-2">
                                                          {evt.acolitos.map((ac: any, idx: number) => (
                                                              <div key={idx} className="bg-gray-50 border border-gray-200/60 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                                                                  <span className="text-[11px] font-bold text-gray-700">{ac.nome.split(' ')[0]} {ac.nome.split(' ').length > 1 ? ac.nome.split(' ')[1].charAt(0) + '.' : ''}</span>
                                                                  <span className="text-[8px] font-bold text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded uppercase tracking-wider">{ROLE_SIGLA[ac.funcao] || 'A'}</span>
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

                      {/* Paginação */}
                      {totalPages > 1 && (
                          <div className="flex justify-center items-center gap-4 pt-6 border-t border-gray-200">
                              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition text-gray-600 shadow-sm"><ChevronLeft size={20}/></button>
                              <span className="text-sm font-bold text-gray-500">Página {currentPage} de {totalPages}</span>
                              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition text-gray-600 shadow-sm"><ChevronRight size={20}/></button>
                          </div>
                      )}
                  </div>
              </div>
          </main>

          {/* === MODAIS === */}

          {/* Modal Gerar Escalas */}
          {isAutoModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button onClick={() => setIsAutoModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                    <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2"><Wand2 className="text-purple-600" size={20}/> Gerador Automático</h3>
                    <div className="space-y-6">
                        <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                            <div>
                                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Mês de Referência</label>
                                <input type="month" value={autoGenMonth} onChange={e => setAutoGenMonth(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition shadow-sm" />
                            </div>
                            
                            <div className="pt-2 space-y-3 border-t border-gray-200">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={clearBeforeGenerate} onChange={e => setClearBeforeGenerate(e.target.checked)} className="mt-0.5 w-4 h-4 accent-purple-600 rounded"/>
                                    <div className="text-xs text-gray-600"><span className="font-bold block text-purple-700">Limpar automaticamente</span>Apaga as escalas existentes deste mês antes de gerar.</div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={mondayNovena} onChange={e => setMondayNovena(e.target.checked)} className="mt-0.5 w-4 h-4 accent-purple-500 rounded"/>
                                    <div className="text-xs text-gray-600"><span className="font-bold block text-purple-700">Novena (Segunda-feira)</span>Escala apenas 1 acólito nas missas de segunda às 19h30.</div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={noWeekdays} onChange={e => setNoWeekdays(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-600 rounded"/>
                                    <div className="text-xs text-gray-600"><span className="font-bold block text-red-600">Sem acólitos na semana</span>Não gera escalas de seg. a sex. (exceto dias especiais e Novena).</div>
                                </label>
                                {!noWeekdays && (
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={singleAcolyteWeekdays} onChange={e => setSingleAcolyteWeekdays(e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600 rounded"/>
                                        <div className="text-xs text-gray-600"><span className="font-bold block text-blue-700">Apenas 1 acólito (Quarta/Sexta)</span>Reduz a equipe para 1 pessoa nas missas de quarta e sexta-feira.</div>
                                    </label>
                                )}
                                {showDay19Option && (
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={includeDay19} onChange={e => setIncludeDay19(e.target.checked)} className="mt-0.5 w-4 h-4 accent-orange-500 rounded"/>
                                        <div className="text-xs text-gray-600"><span className="font-bold block text-orange-600">Escalar Turíbulo no dia 19?</span>Adiciona funções extras na Missa de São José.</div>
                                    </label>
                                )}
                            </div>
                        </div>
                        <button onClick={handleStartAutoGenerate} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 disabled:opacity-50">
                            {isGenerating ? 'Processando...' : 'Gerar Escalas Agora'}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Modal Edição/Manual */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
               <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                 
                 <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                   <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                       {editingEventId ? <Edit2 className="text-blue-600" size={20}/> : <Plus className="text-blue-600" size={20}/>}
                       {editingEventId ? 'Editar Missa' : 'Nova Missa'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition"><X size={20}/></button>
                 </div>
                 
                 <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Data</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Hora</label>
                            <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Local</label>
                        <select value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition">
                            {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Observação</label>
                            <input type="text" value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition" placeholder="Opcional. Ex: Solenidade de Páscoa" />
                        </div>
                        
                        {/* Seletor de Cores Simplificado */}
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-3 block text-center">Cor do Relatório PDF</label>
                            <div className="grid grid-cols-4 gap-2">
                                <button type="button" onClick={() => setFormData({...formData, cor: '#e5e7eb'})} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${formData.cor === '#e5e7eb' ? 'bg-white border-gray-400 shadow-sm ring-1 ring-gray-400 scale-105' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                                    <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 mb-1"></div>
                                    <span className="text-[9px] font-bold uppercase mt-1">Padrão</span>
                                </button>
                                <button type="button" onClick={() => setFormData({...formData, cor: '#16a34a'})} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${formData.cor === '#16a34a' ? 'bg-green-50 border-green-500 shadow-sm ring-1 ring-green-500 scale-105 text-green-700' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                                    <div className="w-6 h-6 rounded-full bg-green-600 mb-1"></div>
                                    <span className="text-[9px] font-bold uppercase mt-1">Verde</span>
                                </button>
                                <button type="button" onClick={() => setFormData({...formData, cor: '#dc2626'})} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${formData.cor === '#dc2626' ? 'bg-red-50 border-red-500 shadow-sm ring-1 ring-red-500 scale-105 text-red-700' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                                    <div className="w-6 h-6 rounded-full bg-red-600 mb-1"></div>
                                    <span className="text-[9px] font-bold uppercase mt-1">Vermelho</span>
                                </button>
                                <button type="button" onClick={() => setFormData({...formData, cor: '#eab308'})} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${formData.cor === '#eab308' ? 'bg-yellow-50 border-yellow-500 shadow-sm ring-1 ring-yellow-500 scale-105 text-yellow-700' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}>
                                    <div className="w-6 h-6 rounded-full bg-yellow-500 mb-1"></div>
                                    <span className="text-[9px] font-bold uppercase mt-1">Amarelo</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-gray-900">Equipe de Acólitos</label>
                            <button onClick={() => setFormData({...formData, acolitos: [...formData.acolitos, {nome: '', funcao: 'Missal'}]})} className="text-xs bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-blue-700 font-bold transition flex items-center gap-1">
                                <Plus size={14}/> Vaga
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.acolitos.map((acolito, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                    <select value={acolito.nome} onChange={e => updateAcolito(idx, 'nome', e.target.value)} className="w-full sm:flex-1 bg-white border border-gray-300 rounded-lg p-2.5 text-[11px] text-gray-900 outline-none focus:border-blue-600">
                                        <option value="">Selecione...</option>
                                        {dbAcolitos.map(a => {
                                            const nome = `${a.nome} ${a.sobrenome || ''}`.trim();
                                            return <option key={a.id || a.nome} value={nome}>{nome}</option>
                                        })}
                                    </select>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <select value={acolito.funcao} onChange={e => updateAcolito(idx, 'funcao', e.target.value)} className="flex-1 sm:w-28 bg-white border border-gray-300 rounded-lg p-2.5 text-[11px] font-medium text-gray-900 outline-none focus:border-blue-600">
                                            {ROLES.map(r => <option key={r}>{r}</option>)}
                                            <option>Auxiliar</option>
                                        </select>
                                        <button onClick={() => setFormData({...formData, acolitos: formData.acolitos.filter((_, i) => i !== idx)})} className="p-2.5 bg-white border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 hover:border-red-200 rounded-lg transition shrink-0"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
                 
                 <div className="p-6 border-t border-gray-100 bg-gray-50/80 sticky bottom-0 rounded-b-3xl">
                     <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2 text-sm">
                         <Save size={18}/> Salvar Missa
                     </button>
                 </div>
               </div>
            </div>
          )}

          {/* Modal PDF */}
          {isPdfModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                    <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
                    <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2"><FileText className="text-blue-600" size={24}/> Baixar Escala</h3>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                            <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Selecione o Mês</label>
                            <input type="month" value={pdfTargetMonth} onChange={e => setPdfTargetMonth(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 transition shadow-sm" />
                        </div>
                        <button onClick={generatePDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 text-sm">
                            <Download size={18}/> Gerar Arquivo PDF
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Modal Notas da Versão */}
          {isNotesModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                  <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Sparkles className="text-amber-500" size={22}/> Notas da Atualização
                          </h2>
                          <button onClick={() => setIsNotesModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
                      </div>
                      <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
                          
                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-blue-600 flex items-center gap-1.5"><Palette size={16}/> Modo Lista Aprimorado</h4>
                              <p className="text-sm text-gray-600 leading-relaxed pl-5 border-l-2 border-blue-100">
                                  O layout retornou para o formato clássico de lista horizontal. Agora os cartões das missas ocupam a tela de ponta a ponta, oferecendo melhor leitura das equipes sem necessidade de "hover".
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1.5"><Trash2 size={16}/> Limpeza de Menus</h4>
                              <p className="text-sm text-gray-600 leading-relaxed pl-5 border-l-2 border-gray-200">
                                  Os módulos de <strong>Financeiro</strong>, <strong>Atas</strong> e <strong>Escala Complementar</strong> foram removidos do sistema para focar 100% na gestão da equipe e geração automatizada de escalas.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-purple-600 flex items-center gap-1.5"><Wand2 size={16}/> Botões Sempre à Mão</h4>
                              <p className="text-sm text-gray-600 leading-relaxed pl-5 border-l-2 border-purple-100">
                                  Os botões de "Nova Missa" e "Gerar Escalas" agora ficam sempre fixos e visíveis na coluna lateral, logo abaixo do minicalendário. 
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-red-500 flex items-center gap-1.5"><FileText size={16}/> Cores Rápidas (Simplificado)</h4>
                              <p className="text-sm text-gray-600 leading-relaxed pl-5 border-l-2 border-red-100">
                                  Você pode selecionar manualmente <strong>Verde, Vermelho ou Amarelo</strong> para os dias especiais direto na criação da missa. O PDF calcula o brilho sozinho para manter a legibilidade.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-green-600 flex items-center gap-1.5"><CalendarOff size={16}/> Restrições Estilo Viagem</h4>
                              <p className="text-sm text-gray-600 leading-relaxed pl-5 border-l-2 border-green-100">
                                  Na aba de Configurações, as restrições ganharam um calendário interativo e inteligente. Ele permite selecionar o período e mescla automaticamente restrições coladas em um só bloco, limpando a visualização.
                              </p>
                          </div>
                      </div>
                      <div className="p-6 border-t border-gray-100 bg-gray-50/80">
                          <button onClick={() => setIsNotesModalOpen(false)} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl transition active:scale-95 text-sm">
                              Entendido, obrigado!
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Modal Regras de Escala */}
          {isRulesLocalModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                  <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
                          <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                              <BookOpen className="text-purple-600" size={22}/> Inteligência de Sorteio
                          </h2>
                          <button onClick={() => setIsRulesLocalModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition"><X size={20}/></button>
                      </div>
                      <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-6">
                          <p className="text-sm text-gray-600 mb-2">Entenda os critérios rigorosos que o robô do sistema usa ao preencher as escalas do mês:</p>
                          
                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><ShieldCheck size={16} className="text-green-600"/> 1. Igualdade e Proporcionalidade</h4>
                              <p className="pl-6 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed">
                                  <strong>SE</strong> houver vagas na missa, <strong>ENTÃO</strong> o sistema cria um mapa de contagem. O robô ordena todos os acólitos pela quantidade de vezes que já serviram no mês atual. Quem serviu menos tem prioridade imediata no sorteio das vagas.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><CalendarOff size={16} className="text-red-500"/> 2. Restrições e Conflitos Diários</h4>
                              <p className="pl-6 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed">
                                  <strong>SE</strong> o acólito estiver no banco de dados de restrições para a data atual,<br/>
                                  <strong>OU SE</strong> ele já foi sorteado para servir em qualquer outra missa no mesmo dia,<br/>
                                  <strong>OU SE</strong> ele serviu no dia anterior ou no dia seguinte (proteção de descanso),<br/>
                                  <strong>ENTÃO</strong> ele é sumariamente ignorado e removido do sorteio.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Users size={16} className="text-blue-500"/> 3. Parceiros (Duplas Inseparáveis)</h4>
                              <p className="pl-6 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed">
                                  <strong>SE</strong> o acólito sorteado possuir um "Parceiro" cadastrado, o sistema tentará alocar a dupla nas próximas 2 vagas.<br/>
                                  <strong>SE</strong> faltar apenas 1 vaga para a missa fechar, <strong>ENTÃO</strong> o sistema ignora os dois para não quebrar a dupla, passando a vez.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Flame size={16} className="text-orange-500"/> 4. Funções Litúrgicas (Vagas)</h4>
                              <p className="pl-6 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed">
                                  <strong>SE</strong> a vaga em aberto for a 1ª (Missal), <strong>ENTÃO</strong> exige que "Manuseia Missal" = Verdadeiro no cadastro.<br/>
                                  <strong>SE</strong> a vaga em aberto for a 3ª (Turíbulo), <strong>ENTÃO</strong> exige que "Manuseia Turíbulo" = Verdadeiro E que o Gênero seja Masculino.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><CalendarIcon size={16} className="text-purple-500"/> 5. Apenas Fim de Semana</h4>
                              <p className="pl-6 border-l-2 border-gray-100 text-sm text-gray-600 leading-relaxed">
                                  <strong>SE</strong> a opção "Só FDS" estiver marcada, <strong>ENTÃO</strong> o robô só verifica se o dia da semana é Domingo (0) ou Sábado (6). Caso contrário, bloqueia.
                              </p>
                          </div>

                          <div className="space-y-2">
                              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5"><Settings size={16} className="text-gray-500"/> 6. Condicionais do Menu de Geração</h4>
                              <ul className="pl-6 border-l-2 border-gray-100 list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed">
                                  <li><strong>Missa Dia 19:</strong> SE marcado, eleva o tamanho da equipe de São José para 4 vagas automaticamente.</li>
                                  <li><strong>Novena:</strong> SE marcado, bloqueia geração normal nas Segundas às 19:30 e insere limite forçado de 1 vaga.</li>
                                  <li><strong>Semana (Qua/Sex):</strong> SE marcado, o tamanho da equipe (que seria 2) é forçado para = 1.</li>
                              </ul>
                          </div>
                      </div>
                      <div className="p-6 border-t border-gray-100 bg-gray-50/80">
                          <button onClick={() => setIsRulesLocalModalOpen(false)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-600/20 active:scale-95 text-sm">
                              Entendi a Lógica
                          </button>
                      </div>
                  </div>
              </div>
          )}

      </MainLayout>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  )
}