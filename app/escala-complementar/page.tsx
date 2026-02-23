'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Save, Trash2, Edit2, FileText, X, AlertCircle, Clock, MapPin,
  ChevronLeft, ChevronRight, LogOut, Users, DollarSign, ClipboardList, 
  Settings, HomeIcon, Download
} from 'lucide-react'

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

export default function EscalaComplementarPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    
    const [userProfile, setUserProfile] = useState('padrao')
    const [userName, setUserName] = useState('') 

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

    const canManage = userProfile === 'admin' || userProfile === 'diretoria';

    useEffect(() => {
        setMounted(true)
        const authData = localStorage.getItem('auth_token')
        if (!authData) { router.push('/login'); return }

        try {
            const user = JSON.parse(authData)
            setUserProfile(user.perfil || 'padrao')
            setUserName(user.nome || '') 
        } catch (e) { router.push('/login') }

        fetchData()
    }, [])

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
        if (confirm("Deseja realmente excluir esta escala complementar?")) {
            await supabase.from('escalas_complementares').delete().eq('id', id)
            fetchData()
        }
    }

    const handleSave = async () => {
        if (!formData.titulo || !formData.data || !formData.hora) {
            alert("Preencha título, data e hora!")
            return
        }

        const acolitosValidos = formData.acolitos.filter(a => a.nome.trim() !== '')
        if (acolitosValidos.length === 0) {
            alert("Adicione pelo menos um acólito!")
            return
        }

        const payload = { ...formData, acolitos: acolitosValidos }

        if (editingId) {
            await supabase.from('escalas_complementares').update(payload).eq('id', editingId)
        } else {
            await supabase.from('escalas_complementares').insert([payload])
        }

        setIsModalOpen(false)
        fetchData()
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
            return alert("Não há escalas complementares neste mês para gerar o relatório.");
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
        const boxHeight = 30; // Aumentado para dar espaço ao Local
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
            
            // Fundo do Cabeçalho da Caixinha
            doc.setFillColor(240, 240, 240);
            doc.rect(cursorX, cursorY, boxWidth, 8, 'F'); 
            doc.setDrawColor(0);
            doc.rect(cursorX, cursorY, boxWidth, boxHeight);

            // Textos: Título, Data e Hora
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            
            const shortTitle = evt.titulo.length > 13 ? evt.titulo.substring(0, 11) + '...' : evt.titulo;
            const headerText = `${shortTitle} - ${timeFormatted}`;
            const centerX = cursorX + (boxWidth / 2);
            doc.text(headerText, centerX, cursorY + 3.5, { align: 'center' });
            doc.text(dayMonth, cursorX + boxWidth - 2, cursorY + 3.5, { align: 'right' });

            // Adicionando o Local
            doc.setFont("helvetica", "italic");
            doc.setFontSize(5.5);
            const shortLocal = evt.local.length > 30 ? evt.local.substring(0, 28) + '...' : evt.local;
            doc.text(shortLocal, centerX, cursorY + 6.5, { align: 'center' });

            // Lista de Acólitos
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
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
            <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
                <div className="px-4 h-16 flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20 text-white">JP</div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold leading-none text-white flex items-center gap-2">
                                São José Operário - Extra
                            </h1>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{userProfile === 'admin' ? 'Admin' : 'Acólito'}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {canManage && (
                            <div className="hidden md:flex items-center gap-2 mr-2 border-r border-zinc-800 pr-2">
                                <Link href="/" className="h-8 px-3 rounded-lg border border-blue-900/30 bg-blue-900/10 text-blue-400 hover:bg-blue-900/20 text-xs font-medium flex items-center gap-2 transition mr-2">
                                     <HomeIcon size={16}/> Início Mensal
                                </Link>
                                <Link href="/financeiro" className="h-8 px-3 rounded-lg border border-emerald-900/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/20 text-xs font-medium flex items-center gap-2 transition mr-2">
                                     <DollarSign size={16}/> Financeiro
                                </Link>
                                <Link href="/atas" className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition mr-2">
                                    <ClipboardList size={16}/> Atas
                                </Link>
                                <Link href="/acolitos" className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition mr-2">
                                    <Users size={16}/> Equipe
                                </Link>
                                <Link href="/configuracoes" className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium flex items-center gap-2 transition">
                                    <Settings size={16}/> Config
                                </Link>
                            </div>
                        )}
                        {canManage && (
                            <button onClick={() => setIsPdfModalOpen(true)} className="h-8 px-3 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-xs font-bold flex items-center gap-2 transition shadow-sm ml-2">
                                <Download size={16}/> Baixar Relatório
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
                                rawEvents={escalas} 
                                filterDate={filterDate}
                                setFilterDate={setFilterDate}
                            />
                            
                            {canManage && (
                                <button onClick={openNewForm} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20">
                                    <Plus size={16}/> Nova Escala Extra
                                </button>
                            )}

                            {canManage && (
                                <button onClick={() => setIsPdfModalOpen(true)} className="w-full h-10 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center gap-2 text-xs font-medium rounded-lg transition mt-2">
                                    <FileText size={16}/> Gerar Relatório PDF
                                </button>
                            )}
                            
                            <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-3 text-center mt-4">
                                <span className="text-[10px] text-blue-300 font-bold block uppercase tracking-wider">Missas Listadas</span>
                                <span className="text-xl font-bold text-white block">{filteredEscalas.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 space-y-4">
                        {loading ? (
                            <div className="text-center text-zinc-500 py-10">Carregando...</div>
                        ) : filteredEscalas.length === 0 ? (
                            <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <AlertCircle size={40} className="mx-auto text-zinc-600 mb-4" />
                                <h3 className="text-lg font-bold text-white">Nenhuma escala extra</h3>
                                <p className="text-sm text-zinc-500 mt-2">Nenhuma escala encontrada para este filtro.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredEscalas.map(escala => (
                                    <div key={escala.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-white text-lg leading-tight">{escala.titulo}</h3>
                                                <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded font-bold">{escala.acolitos.length} vagas</span>
                                            </div>
                                            <div className="space-y-1.5 mb-4 border-b border-zinc-800 pb-4">
                                                <p className="text-xs text-zinc-400 flex items-center gap-2">
                                                    <Clock size={14} className="text-zinc-500" /> 
                                                    {new Date(escala.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {escala.hora.substring(0, 5)}
                                                </p>
                                                <p className="text-xs text-zinc-400 flex items-center gap-2">
                                                    <MapPin size={14} className="text-zinc-500" /> {escala.local}
                                                </p>
                                                {escala.observacao && (
                                                    <p className="text-[11px] text-yellow-500/80 bg-yellow-900/10 px-2 py-1 rounded-md mt-2 inline-block">
                                                        {escala.observacao}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => generateIndividualPDF(escala)} className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition">
                                                <FileText size={14}/> Imprimir Única
                                            </button>
                                            
                                            {canManage && (
                                                <>
                                                <button onClick={() => handleEdit(escala)} className="w-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center rounded-lg transition">
                                                    <Edit2 size={14}/>
                                                </button>
                                                <button onClick={() => handleDelete(escala.id)} className="w-10 bg-red-900/20 hover:bg-red-900/40 text-red-500 flex items-center justify-center rounded-lg transition">
                                                    <Trash2 size={14}/>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setIsPdfModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><X size={20}/></button>
                        
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-blue-500" size={20}/> Relatório Geral
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-2">Título do Relatório</label>
                                    <input 
                                        type="text" 
                                        value={pdfTitle} 
                                        onChange={e => setPdfTitle(e.target.value)} 
                                        placeholder="Ex: Cerco de Jericó"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-2">Mês de Referência</label>
                                    <input 
                                        type="month" 
                                        value={pdfTargetMonth} 
                                        onChange={e => setPdfTargetMonth(e.target.value)} 
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600 transition"
                                        style={{colorScheme: 'dark'}} 
                                    />
                                </div>
                            </div>
                            
                            <button onClick={generateGeneralPDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                                <Download size={18}/> Gerar Arquivo PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulário (Nova/Editar Escala) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                            <h3 className="text-lg font-bold text-white">{editingId ? 'Editar Escala' : 'Nova Escala Complementar'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1 block">Título da Escala (Ex: Missa de Casamento)</label>
                                <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Data</label>
                                    <input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 mb-1 block">Hora</label>
                                    <input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1 block">Local</label>
                                <input type="text" value={formData.local} onChange={e => setFormData({ ...formData, local: e.target.value })} list="places" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" />
                                <datalist id="places">{PLACES.map(p => <option key={p} value={p} />)}</datalist>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1 block">Observação</label>
                                <input type="text" value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-blue-600" placeholder="Ex: Chegar com 30min de antecedência" />
                            </div>
                            
                            <div className="pt-4 border-t border-zinc-800">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-white">Equipe</label>
                                    <button onClick={() => setFormData({ ...formData, acolitos: [...formData.acolitos, { nome: '', funcao: 'Auxiliar' }] })} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-blue-400 font-bold transition">+ Vaga</button>
                                </div>
                                <div className="space-y-2">
                                    {formData.acolitos.map((acolito, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50">
                                            <select value={acolito.nome} onChange={e => updateAcolito(idx, 'nome', e.target.value)} className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white outline-none">
                                                <option value="">Selecione...</option>
                                                {dbAcolitos.map(a => {
                                                    const nomeCompleto = `${a.nome} ${a.sobrenome || ''}`.trim()
                                                    return <option key={nomeCompleto} value={nomeCompleto}>{nomeCompleto}</option>
                                                })}
                                            </select>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <input type="text" value={acolito.funcao} onChange={e => updateAcolito(idx, 'funcao', e.target.value)} list="roles" className="flex-1 sm:w-36 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white outline-none" placeholder="Função" />
                                                <datalist id="roles">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
                                                
                                                <button onClick={() => setFormData({ ...formData, acolitos: formData.acolitos.filter((_, i) => i !== idx) })} className="p-2.5 bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-500 rounded-lg transition shrink-0"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Salvar Escala Extra
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}