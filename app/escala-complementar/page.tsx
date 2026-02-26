'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Save, Trash2, Edit2, FileText, X, AlertCircle, Clock, MapPin,
  ChevronLeft, ChevronRight, LogOut, Users, DollarSign, ClipboardList, 
  Settings, HomeIcon, Download, Menu, CheckCircle2, AlertTriangle
} from 'lucide-react'

const APP_VERSION = "v3.87.0-ui-folder-light" 
const ROLES = ['Missal', 'Vela', 'Turíbulo', 'Naveta', 'Cerimoniário', 'Cruciferário', 'Auxiliar']
const PLACES = ["São José Operário", "Capela Nsa. Sra. das Graças", "Nsa. Sra. da Abadia", "Santa Clara", "Outro"]

interface EscalaComplementar {
    id: number;
    titulo: string;
    data: string;
    hora: string;
    local: string;
    observacao: string;
    acolitos: { nome: string; funcao: string }[];
}

interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
}

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
        else if (isToday) bgClass = 'border border-blue-600 text-blue-600 font-bold bg-blue-50'

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
                <span className="text-sm font-bold capitalize text-gray-900">{currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] text-gray-400 font-bold mb-2">{d}</span>)}
                {days}
            </div>
            {filterDate && <div className="mt-3 text-center border-t border-gray-100 pt-2"><button onClick={() => setFilterDate(null)} className="text-xs text-blue-600 hover:underline font-bold">Ver todos os dias</button></div>}
        </div>
    )
})
MemoizedCalendar.displayName = 'MemoizedCalendar'

export default function EscalaComplementarPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    
    const [userProfile, setUserProfile] = useState('padrao')
    const [escalas, setEscalas] = useState<EscalaComplementar[]>([])
    const [dbAcolitos, setDbAcolitos] = useState<any[]>([])
    
    const [calendarDate, setCalendarDate] = useState(new Date()) 
    const [filterDate, setFilterDate] = useState<string | null>(null)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    
    // Estados do Relatório Geral
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
    const [pdfTargetMonth, setPdfTargetMonth] = useState(new Date().toISOString().slice(0, 7))
    const [pdfTitle, setPdfTitle] = useState('Relatório de Eventos Especiais')

    const [formData, setFormData] = useState({
        titulo: '', data: '', hora: '19:00', local: PLACES[0], observacao: '',
        acolitos: [{ nome: '', funcao: 'Missal' }]
    })

    const [customAlert, setCustomAlert] = useState<AlertState>({
        isOpen: false, type: 'info', title: '', message: ''
    })

    const canManage = userProfile === 'admin' || userProfile === 'diretoria';

    useEffect(() => {
        setMounted(true)
        const authData = localStorage.getItem('auth_token')
        if (!authData) { router.push('/login'); return }

        try {
            const user = JSON.parse(authData)
            setUserProfile(user.perfil || 'padrao')
        } catch (e) { router.push('/login') }

        fetchData()
    }, [])

    const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
        setCustomAlert({ isOpen: true, title, message, type })
    }
    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setCustomAlert({ isOpen: true, title, message, type: 'warning', onConfirm })
    }
    const closeAlert = () => setCustomAlert({ ...customAlert, isOpen: false, onConfirm: undefined })

    async function fetchData() {
        setLoading(true)
        const [acolitosRes, escalasRes] = await Promise.all([
            supabase.from('acolitos').select('nome, sobrenome').eq('ativo', true).order('nome'),
            supabase.from('escalas_complementares').select('*').order('data', { ascending: false })
        ])

        if (acolitosRes.data) setDbAcolitos(acolitosRes.data)
        if (escalasRes.data) setEscalas(escalasRes.data)
        setLoading(false)
    }

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault()
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
    }

    const filteredEscalas = useMemo(() => {
        if (filterDate) {
            return escalas.filter(evt => evt.data === filterDate)
        }
        return escalas
    }, [escalas, filterDate])

    const openNewForm = () => {
        setEditingId(null)
        setFormData({
            titulo: '', data: new Date().toLocaleDateString('en-CA'), hora: '19:00', 
            local: PLACES[0], observacao: '', acolitos: [{ nome: '', funcao: 'Missal' }]
        })
        setIsModalOpen(true)
    }

    const handleEdit = (escala: EscalaComplementar) => {
        setEditingId(escala.id)
        setFormData({
            titulo: escala.titulo, data: escala.data, hora: escala.hora.substring(0, 5),
            local: escala.local, observacao: escala.observacao || '', acolitos: escala.acolitos
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        triggerConfirm("Excluir Escala?", "Deseja realmente apagar esta escala complementar?", async () => {
            await supabase.from('escalas_complementares').delete().eq('id', id)
            fetchData()
            triggerAlert("Excluída", "A escala foi apagada com sucesso.", "success")
        })
    }

    const handleSave = async () => {
        if (!formData.titulo || !formData.data || !formData.hora) {
            return triggerAlert("Atenção", "Preencha título, data e hora!", "warning")
        }

        const acolitosValidos = formData.acolitos.filter(a => a.nome.trim() !== '')
        if (acolitosValidos.length === 0) {
            return triggerAlert("Atenção", "Adicione pelo menos um acólito à equipe!", "warning")
        }

        const payload = { ...formData, acolitos: acolitosValidos }

        try {
            if (editingId) {
                await supabase.from('escalas_complementares').update(payload).eq('id', editingId)
                triggerAlert("Sucesso", "Escala atualizada com sucesso.", "success")
            } else {
                await supabase.from('escalas_complementares').insert([payload])
                triggerAlert("Sucesso", "Nova escala criada com sucesso.", "success")
            }
            setIsModalOpen(false)
            fetchData()
        } catch (error: any) {
            triggerAlert("Erro", "Falha ao salvar a escala: " + error.message, "error")
        }
    }

    const updateAcolito = (idx: number, field: string, val: string) => {
        const newArr: any = [...formData.acolitos]; newArr[idx][field] = val; 
        setFormData({ ...formData, acolitos: newArr })
    }

    // PDF INDIVIDUAL (Apenas o evento selecionado)
    const generateIndividualPDF = async (escala: EscalaComplementar) => {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('p', 'mm', 'a4')

        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text(escala.titulo.toUpperCase(), 105, 20, { align: "center" })

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        
        const dataFormatada = new Date(escala.data + 'T12:00:00').toLocaleDateString('pt-BR')
        const horaFormatada = escala.hora.substring(0, 5)

        doc.text(`Data: ${dataFormatada} às ${horaFormatada}`, 105, 30, { align: "center" })
        doc.text(`Local: ${escala.local}`, 105, 36, { align: "center" })
        if (escala.observacao) {
            doc.setFont("helvetica", "italic")
            doc.text(`Obs: ${escala.observacao}`, 105, 42, { align: "center" })
        }

        doc.setDrawColor(200)
        doc.setFillColor(240, 240, 240)
        doc.rect(20, 50, 170, 10, 'F')
        
        doc.setFont("helvetica", "bold")
        doc.text("FUNÇÃO", 25, 56)
        doc.text("ACÓLITO", 80, 56)

        let startY = 65
        doc.setFont("helvetica", "normal")

        escala.acolitos.forEach((ac, idx) => {
            doc.setFont("helvetica", "bold")
            doc.text(ac.funcao, 25, startY)
            doc.setFont("helvetica", "normal")
            doc.text(ac.nome, 80, startY)
            
            doc.setDrawColor(230)
            doc.line(20, startY + 2, 190, startY + 2)

            startY += 8
        })

        doc.save(`${escala.titulo.replace(/\s+/g, '_').toLowerCase()}.pdf`)
    }

    // PDF GERAL (Agrupa escalas extras de um mês com o título escolhido)
    const generateGeneralPDF = async () => {
        let eventsToPrint = escalas.filter(evt => evt.data.startsWith(pdfTargetMonth));

        if(eventsToPrint.length === 0) {
            return triggerAlert("Vazio", "Não há escalas complementares neste mês para gerar o relatório.", "warning");
        }

        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const sortedEvents = [...eventsToPrint].sort((a, b) => new Date(a.data + 'T' + a.hora).getTime() - new Date(b.data + 'T' + b.hora).getTime());

        const [yStr, mStr] = pdfTargetMonth.split('-');
        const refDate = new Date(parseInt(yStr), parseInt(mStr) - 1, 1);
        const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
        const year = refDate.getFullYear();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        
        const reportHeader = pdfTitle ? pdfTitle.toUpperCase() : `ESCALAS EXTRAS - ${monthName}/${year}`;
        doc.text(reportHeader, 105, 15, { align: "center" });

        const startX = 10;
        const startY = 25;
        const boxWidth = 47.5; 
        const boxHeight = 30;
        const gap = 0; 
        const columns = 4; 

        let cursorX = startX;
        let cursorY = startY;
        
        doc.setFontSize(8);

        sortedEvents.forEach((evt, index) => {
            if (index > 0 && index % columns === 0) {
                cursorX = startX;
                cursorY += boxHeight + gap;
            }
            if (cursorY + boxHeight > 280) { 
                doc.addPage();
                cursorY = 20;
            }

            const d = new Date(evt.data + 'T12:00:00');
            const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeFormatted = evt.hora.substring(0, 5);
            
            doc.setFillColor(240, 240, 240);
            doc.rect(cursorX, cursorY, boxWidth, 8, 'F'); 
            doc.setDrawColor(0);
            doc.rect(cursorX, cursorY, boxWidth, boxHeight);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            
            const shortTitle = evt.titulo.length > 13 ? evt.titulo.substring(0, 11) + '...' : evt.titulo;
            const headerText = `${shortTitle} - ${timeFormatted}`;
            const centerX = cursorX + (boxWidth / 2);
            doc.text(headerText, centerX, cursorY + 3.5, { align: 'center' });
            doc.text(dayMonth, cursorX + boxWidth - 2, cursorY + 3.5, { align: 'right' });

            doc.setFont("helvetica", "italic");
            doc.setFontSize(5.5);
            const shortLocal = evt.local.length > 30 ? evt.local.substring(0, 28) + '...' : evt.local;
            doc.text(shortLocal, centerX, cursorY + 6.5, { align: 'center' });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            let listY = cursorY + 11.5; 
            
            evt.acolitos.forEach((ac: any) => {
                const siglaFuncao = ac.funcao.substring(0,1).toUpperCase();
                
                doc.setFillColor(50, 50, 50);
                doc.roundedRect(cursorX + 2, listY - 3, 6, 4, 1, 1, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.text(siglaFuncao, cursorX + 5, listY, { align: 'center' });

                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "normal");
                
                const shortName = ac.nome.length > 17 ? ac.nome.substring(0, 17) + '.' : ac.nome;
                doc.text(shortName, cursorX + 10, listY);
                
                listY += 3.5;
            });

            cursorX += boxWidth + gap;
        });

        const safeTitle = pdfTitle ? pdfTitle.replace(/\s+/g, '_').toLowerCase() : `escala_extra_${monthName}_${year}`;
        doc.save(`${safeTitle}.pdf`);
        setIsPdfModalOpen(false);
        triggerAlert("Sucesso", "Relatório PDF gerado e baixado.", "success");
    }

    if (!mounted) return null

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

                        <div className="flex gap-3 pt-2">
                            {!customAlert.onConfirm ? (
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

            {/* Header Mobile Opcional */}
            <header className="lg:hidden fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 p-1 -ml-1"><Menu size={24}/></button>
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md">JP</div>
                  <h1 className="text-sm font-bold text-gray-900">Escala Extra</h1>
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
                           <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userProfile === 'admin' ? 'Admin' : 'Acólito'}</span>
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
                          <Link href="/escala-complementar" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
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
               </nav>

               <div className="p-4 border-t border-gray-100 flex items-center gap-2">
                    <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold transition text-sm">
                        <LogOut size={16}/> Sair do Sistema
                    </button>
               </div>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 lg:ml-64 px-4 py-8 max-w-7xl mx-auto w-full pt-20 lg:pt-8">
                
                {/* Header da Página */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                            <Settings size={24} className="text-blue-600"/> Escala Complementar
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Gestão de eventos extras (Casamentos, Batizados, etc.)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    
                    {/* Coluna Esquerda: Calendário e Botões */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="lg:sticky lg:top-8 space-y-4">
                            <MemoizedCalendar 
                                currentDate={calendarDate}
                                setDate={setCalendarDate}
                                rawEvents={escalas} 
                                filterDate={filterDate}
                                setFilterDate={setFilterDate}
                            />
                            
                            {canManage && (
                                <button onClick={openNewForm} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20">
                                    <Plus size={16}/> Nova Escala Extra
                                </button>
                            )}

                            {canManage && (
                                <button onClick={() => setIsPdfModalOpen(true)} className="w-full h-10 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition mt-2 shadow-sm">
                                    <Download size={16} className="text-blue-600"/> Relatório PDF Geral
                                </button>
                            )}
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center mt-4">
                                <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">Missas Encontradas</span>
                                <span className="text-xl font-bold text-gray-900 block">{filteredEscalas.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Cards de Eventos */}
                    <div className="lg:col-span-3 space-y-4">
                        {loading ? (
                            <div className="text-center text-gray-500 font-medium py-10 animate-pulse">Carregando escalas extras...</div>
                        ) : filteredEscalas.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <AlertCircle size={40} className="mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">Nenhuma escala extra</h3>
                                <p className="text-sm text-gray-500 mt-2">Não há eventos complementares para este período.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredEscalas.map(escala => (
                                    <div key={escala.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-blue-300 transition-all group">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{escala.titulo}</h3>
                                                <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-md font-bold whitespace-nowrap ml-2">
                                                    {escala.acolitos.length} vagas
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 mb-4 border-b border-gray-100 pb-4">
                                                <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                                                    <Clock size={14} className="text-gray-400" /> 
                                                    {new Date(escala.data + 'T12:00:00').toLocaleDateString('pt-BR')} às <span className="text-gray-800 font-bold">{escala.hora.substring(0, 5)}</span>
                                                </p>
                                                <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                                                    <MapPin size={14} className="text-gray-400" /> {escala.local}
                                                </p>
                                                {escala.observacao && (
                                                    <p className="text-[11px] text-yellow-800 bg-yellow-100 border border-yellow-200 px-2 py-1 rounded-md mt-2 inline-block">
                                                        {escala.observacao}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => generateIndividualPDF(escala)} className="flex-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                                                <FileText size={14} className="text-blue-600"/> Imprimir
                                            </button>
                                            
                                            {canManage && (
                                                <>
                                                <button onClick={() => handleEdit(escala)} className="w-10 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-500 flex items-center justify-center rounded-xl transition">
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(escala.id)} className="w-10 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 flex items-center justify-center rounded-xl transition">
                                                    <Trash2 size={16}/>
                                                </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL DO RELATÓRIO GERAL PDF */}
            {isPdfModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="text-blue-600" size={20}/> Relatório Geral
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Título do Relatório</label>
                                    <input 
                                        type="text" 
                                        value={pdfTitle} 
                                        onChange={e => setPdfTitle(e.target.value)} 
                                        placeholder="Ex: Cerco de Jericó"
                                        className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Mês de Referência</label>
                                    <input 
                                        type="month" 
                                        value={pdfTargetMonth} 
                                        onChange={e => setPdfTargetMonth(e.target.value)} 
                                        className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                                    />
                                </div>
                            </div>
                            
                            <button onClick={generateGeneralPDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                                <Download size={18}/> Gerar Arquivo PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulário (Nova/Editar Escala) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto relative flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                {editingId ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                                {editingId ? 'Editar Escala' : 'Nova Escala Complementar'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-full transition"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Título da Escala</label>
                                <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Casamento João e Maria" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Data</label>
                                    <input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Hora</label>
                                    <input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Local</label>
                                <input type="text" value={formData.local} onChange={e => setFormData({ ...formData, local: e.target.value })} list="places" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition" />
                                <datalist id="places">{PLACES.map(p => <option key={p} value={p} />)}</datalist>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Observação (Opcional)</label>
                                <input type="text" value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} placeholder="Ex: Chegar com 30min de antecedência" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:bg-white transition" />
                            </div>
                            
                            <div className="pt-4 border-t border-gray-200 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-gray-900">Membros da Equipe</label>
                                    <button onClick={() => setFormData({ ...formData, acolitos: [...formData.acolitos, { nome: '', funcao: 'Auxiliar' }] })} className="text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-blue-600 font-bold transition">+ Vaga</button>
                                </div>
                                <div className="space-y-2">
                                    {formData.acolitos.map((acolito, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                            <select value={acolito.nome} onChange={e => updateAcolito(idx, 'nome', e.target.value)} className="w-full sm:flex-1 bg-white border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 outline-none focus:border-blue-600">
                                                <option value="">Selecione o membro...</option>
                                                {dbAcolitos.map(a => {
                                                    const nomeCompleto = `${a.nome} ${a.sobrenome || ''}`.trim()
                                                    return <option key={nomeCompleto} value={nomeCompleto}>{nomeCompleto}</option>
                                                })}
                                            </select>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <input type="text" value={acolito.funcao} onChange={e => updateAcolito(idx, 'funcao', e.target.value)} list="roles" placeholder="Função" className="flex-1 sm:w-36 bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 outline-none focus:border-blue-600" />
                                                <datalist id="roles">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
                                                
                                                <button onClick={() => setFormData({ ...formData, acolitos: formData.acolitos.filter((_, i) => i !== idx) })} className="p-2.5 bg-white border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-500 hover:border-red-200 rounded-lg transition shrink-0"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/80 sticky bottom-0 z-10 rounded-b-3xl mt-4">
                            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2">
                                <Save size={18} /> {editingId ? 'Salvar Alterações' : 'Salvar Escala Extra'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}