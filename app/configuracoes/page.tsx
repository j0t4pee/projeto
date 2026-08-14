'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { CalendarOff, Trash2, Plus, AlertCircle, ShieldAlert, Search, ChevronDown, ChevronLeft, ChevronRight, X, CalendarDays, Calendar as CalendarIcon, Check } from 'lucide-react'

interface Acolito {
    id: number;
    nome: string;
    sobrenome: string;
}

interface Restricao {
    id: number;
    acolito_nome: string;
    data_inicio: string;
    data_fim: string;
}

const ITEMS_PER_PAGE = 6;

const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const RangeCalendar = ({ 
    restricoes, 
    acolitoSelecionado, 
    dataInicio, 
    dataFim, 
    onChange 
}: { 
    restricoes: Restricao[], 
    acolitoSelecionado: string, 
    dataInicio: string, 
    dataFim: string, 
    onChange: (inicio: string, fim: string) => void 
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (dataInicio) {
            const [y, m, d] = dataInicio.split('-').map(Number);
            setCurrentMonth(new Date(y, m - 1, 1));
        }
    }, [dataInicio]);

    const blockedDates = useMemo(() => {
        const dates = new Set<string>();
        if (!acolitoSelecionado) return dates;

        const myRestricoes = restricoes.filter(r => r.acolito_nome === acolitoSelecionado);
        
        myRestricoes.forEach(r => {
            const start = new Date(r.data_inicio + 'T12:00:00');
            const end = new Date(r.data_fim + 'T12:00:00');
            let current = new Date(start);
            while (current <= end) {
                dates.add(formatDateStr(current));
                current.setDate(current.getDate() + 1);
            }
        });
        return dates;
    }, [restricoes, acolitoSelecionado]);

    const handleDateClick = (dateStr: string) => {
        if (!dataInicio || (dataInicio && dataFim)) {
            onChange(dateStr, '');
        } else {
            if (dateStr < dataInicio) {
                onChange(dateStr, dataInicio);
            } else {
                onChange(dataInicio, dateStr);
            }
        }
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatDateStr(new Date(year, month, d));
        
        const isBlocked = blockedDates.has(dateStr);
        const isStart = dateStr === dataInicio;
        const isEnd = dateStr === dataFim;
        const isBetween = dataInicio && dataFim && dateStr > dataInicio && dateStr < dataFim;
        
        let bgClass = "hover:bg-gray-100 text-gray-700";
        
        if (isBlocked) bgClass = "bg-orange-100 text-orange-700 font-medium border border-orange-200 cursor-not-allowed";
        else if (isStart || isEnd) bgClass = "bg-blue-600 text-white font-medium shadow-md";
        else if (isBetween) bgClass = "bg-blue-50 text-blue-700 font-medium";

        days.push(
            <button 
                key={d} 
                onClick={() => !isBlocked && handleDateClick(dateStr)} 
                disabled={isBlocked}
                title={isBlocked ? "Data já possui restrição" : "Selecionar data"}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs relative transition-all ${bgClass} ${isBetween && !isStart && !isEnd ? 'rounded-none' : ''}`}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xl w-full z-10 animate-in fade-in zoom-in-95 duration-200 relative mt-2">
            <div className="flex justify-between items-center mb-4">
                <button onClick={(e) => { e.preventDefault(); setCurrentMonth(new Date(year, month - 1, 1)); }} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronLeft size={16}/></button>
                <span className="text-xs font-bold capitalize text-gray-900 tracking-wider">
                    {currentMonth.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}
                </span>
                <button onClick={(e) => { e.preventDefault(); setCurrentMonth(new Date(year, month + 1, 1)); }} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] text-gray-400 font-medium">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center place-items-center">
                {days}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-600"></div>
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Seleção</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></div>
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Restrito</span>
                </div>
            </div>
        </div>
    );
};

export default function ConfiguracoesPage() {
    const [userProfile, setUserProfile] = useState('padrao')
    const [acolitos, setAcolitos] = useState<Acolito[]>([])
    const [restricoes, setRestricoes] = useState<Restricao[]>([])
    const [loading, setLoading] = useState(true)
    
    // Controles de Dropdown e Calendário
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const [formData, setFormData] = useState({
        acolito_nome: '',
        data_inicio: '',
        data_fim: ''
    })

    const calendarRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const authData = localStorage.getItem('auth_token')
        if (authData) {
            try {
                const user = JSON.parse(authData)
                setUserProfile(user.perfil || 'padrao')
            } catch (e) { console.error(e) }
        }
        fetchData()

        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [])

    async function fetchData() {
        setLoading(true)
        const [acolitosRes, restricoesRes] = await Promise.all([
            supabase.from('acolitos').select('id, nome, sobrenome').eq('ativo', true).order('nome'),
            supabase.from('restricoes').select('id, acolito_nome, data_inicio, data_fim').order('data_inicio', { ascending: true })
        ])

        if (acolitosRes.data) setAcolitos(acolitosRes.data)
        if (restricoesRes.data) setRestricoes(restricoesRes.data)
        setLoading(false)
    }

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault()
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
    }

    const handleSaveRestriction = async () => {
        if (!formData.acolito_nome) {
            alert("Selecione o acólito primeiro."); return;
        }
        if (!formData.data_inicio) {
            alert("Selecione ao menos a data de início no calendário."); return;
        }

        const dataFim = formData.data_fim || formData.data_inicio

        const payload = {
            acolito_nome: formData.acolito_nome,
            data_inicio: formData.data_inicio,
            data_fim: dataFim
        }

        const { error } = await supabase.from('restricoes').insert([payload])

        if (error) {
            alert("Erro ao salvar restrição: " + error.message)
        } else {
            setFormData({ acolito_nome: '', data_inicio: '', data_fim: '' })
            setIsCalendarOpen(false)
            fetchData()
        }
    }

    const handleDeleteRestriction = async (ids: number[]) => {
        if (confirm("Deseja realmente remover este período de restrição?")) {
            await supabase.from('restricoes').delete().in('id', ids)
            fetchData()
        }
    }

    const filteredRestricoes = useMemo(() => {
        if (!searchTerm) return restricoes;
        return restricoes.filter(r => 
            r.acolito_nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [restricoes, searchTerm])

    const groupedRestricoes = useMemo(() => {
        const groups: { [key: string]: Restricao[] } = {};
        filteredRestricoes.forEach(r => {
            if (!groups[r.acolito_nome]) groups[r.acolito_nome] = [];
            groups[r.acolito_nome].push(r);
        });
        
        return Object.keys(groups)
            .sort((a, b) => a.localeCompare(b))
            .map(nome => {
                const sorted = groups[nome].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
                
                const mergedRanges: { ids: number[], data_inicio: string, data_fim: string }[] = [];
                
                sorted.forEach(curr => {
                    if (mergedRanges.length === 0) {
                        mergedRanges.push({ ids: [curr.id], data_inicio: curr.data_inicio, data_fim: curr.data_fim });
                        return;
                    }
                    
                    const last = mergedRanges[mergedRanges.length - 1];
                    const lastEnd = new Date(last.data_fim + 'T12:00:00');
                    const nextDay = new Date(lastEnd);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const nextDayStr = formatDateStr(nextDay);
                    
                    if (curr.data_inicio <= nextDayStr) {
                        last.ids.push(curr.id);
                        if (curr.data_fim > last.data_fim) {
                            last.data_fim = curr.data_fim;
                        }
                    } else {
                        mergedRanges.push({ ids: [curr.id], data_inicio: curr.data_inicio, data_fim: curr.data_fim });
                    }
                });

                return { nome, mergedRanges };
            });
    }, [filteredRestricoes])

    useEffect(() => { setCurrentPage(1) }, [searchTerm])

    const totalPages = Math.ceil(groupedRestricoes.length / ITEMS_PER_PAGE)
    
    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
        return groupedRestricoes.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    }, [groupedRestricoes, currentPage])

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    return (
        <MainLayout userProfile={userProfile} onLogout={handleLogout}>
            <main className="px-4 py-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 animate-in fade-in duration-500">
                
                <div className="mb-8">
                    <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-3">
                        <ShieldAlert className="text-blue-600" size={28}/> 
                        Restrições de Escala
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Defina datas isoladas ou períodos em que um acólito não poderá servir.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    
                    {/* COLUNA 1: Formulário de Nova Restrição */}
                    <div className="md:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-8">
                        <h2 className="text-sm font-medium text-gray-900 mb-5 flex items-center gap-2">
                            <Plus size={18} className="text-blue-600"/> Adicionar Período
                        </h2>
                        
                        <div className="space-y-5">
                            
                            {/* Dropdown Customizado de Acólitos */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">1. Selecione o Acólito</label>
                                
                                <div 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full flex items-center justify-between bg-gray-50 border rounded-xl p-3 text-sm transition cursor-pointer select-none shadow-sm ${isDropdownOpen ? 'border-blue-600 ring-1 ring-blue-600 bg-white' : 'border-gray-200 hover:bg-gray-100'}`}
                                >
                                    <span className={formData.acolito_nome ? "text-gray-900 font-medium" : "text-gray-500"}>
                                        {formData.acolito_nome || "Selecione na lista..."}
                                    </span>
                                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`}/>
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] max-h-[250px] overflow-y-auto custom-scrollbar py-2 animate-in fade-in zoom-in-95 duration-150">
                                        <div 
                                            onClick={() => {
                                                setFormData({...formData, acolito_nome: '', data_inicio: '', data_fim: ''});
                                                setIsDropdownOpen(false);
                                            }}
                                            className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer transition flex items-center"
                                        >
                                            Limpar seleção...
                                        </div>
                                        {acolitos.map(a => {
                                            const nomeCompleto = `${a.nome} ${a.sobrenome || ''}`.trim()
                                            const isSelected = formData.acolito_nome === nomeCompleto;
                                            
                                            return (
                                                <div 
                                                    key={a.id} 
                                                    onClick={() => {
                                                        setFormData({...formData, acolito_nome: nomeCompleto, data_inicio: '', data_fim: ''});
                                                        setIsDropdownOpen(false);
                                                        setIsCalendarOpen(true); // Abre o calendário imediatamente após selecionar o nome
                                                    }}
                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900 hover:bg-gray-50'}`}
                                                >
                                                    {nomeCompleto}
                                                    {isSelected && <Check size={16} className="text-blue-600"/>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={calendarRef}>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">2. Período (Início <span className="mx-1 font-normal text-gray-400">até</span> Fim)</label>
                                
                                <div 
                                    onClick={() => {
                                        if(!formData.acolito_nome) alert("Selecione o acólito primeiro!");
                                        else setIsCalendarOpen(!isCalendarOpen);
                                    }}
                                    className={`flex items-center bg-gray-50 border rounded-xl overflow-hidden shadow-sm transition cursor-pointer select-none ${isCalendarOpen ? 'border-blue-600 ring-1 ring-blue-600 bg-white' : 'border-gray-200 hover:bg-gray-100'}`}
                                >
                                    <div className="flex-1 p-3 text-sm flex items-center gap-2">
                                        <CalendarIcon size={16} className={formData.data_inicio ? 'text-blue-600' : 'text-gray-400'}/>
                                        <span className={formData.data_inicio ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                            {formatDisplayDate(formData.data_inicio) || 'De'}
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                                    <div className="flex-1 p-3 text-sm flex items-center gap-2">
                                        <CalendarIcon size={16} className={formData.data_fim ? 'text-blue-600' : 'text-gray-400'}/>
                                        <span className={formData.data_fim ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                            {formatDisplayDate(formData.data_fim) || 'Até'}
                                        </span>
                                    </div>
                                </div>
                                
                                {isCalendarOpen && (
                                    <div className="absolute top-full left-0 right-0 z-50">
                                        <RangeCalendar 
                                            restricoes={restricoes}
                                            acolitoSelecionado={formData.acolito_nome}
                                            dataInicio={formData.data_inicio}
                                            dataFim={formData.data_fim}
                                            onChange={(inicio, fim) => setFormData({...formData, data_inicio: inicio, data_fim: fim})}
                                        />
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-gray-400 mt-1.5">Clique no campo acima para abrir o calendário.</p>
                            </div>

                            <button onClick={handleSaveRestriction} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-600/20 mt-4 active:scale-95">
                                Salvar Restrição
                            </button>
                        </div>
                    </div>

                    {/* COLUNA 2: Lista de Restrições Ativas */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Pesquisar por nome do acólito..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-sm"
                            />
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-400 text-sm">Carregando dados...</div>
                        ) : groupedRestricoes.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                                    <CalendarOff size={28} className="text-gray-400" />
                                </div>
                                <h3 className="text-base font-medium text-gray-700">Nenhum resultado encontrado</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {searchTerm ? 'Tente buscar com outro termo.' : 'Os acólitos estão liberados para todas as escalas.'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays size={16} className="text-gray-500"/>
                                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wider">Acólitos com Restrições</span>
                                    </div>
                                    <span className="bg-white border border-gray-200 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-gray-600 shadow-sm">
                                        {groupedRestricoes.length} Pessoas
                                    </span>
                                </div>
                                
                                <div className="divide-y divide-gray-100">
                                    {paginatedGroups.map(group => (
                                        <div key={group.nome} className="p-5 transition hover:bg-gray-50/50">
                                            <h4 className="text-sm font-medium text-gray-900 mb-3">{group.nome}</h4>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {group.mergedRanges.map((r, idx) => {
                                                    const dInicio = new Date(r.data_inicio + 'T12:00:00')
                                                    const dFim = new Date(r.data_fim + 'T12:00:00')
                                                    
                                                    const strInicio = dInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                    const strFim = dFim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                    
                                                    const isSingleDay = strInicio === strFim
                                                    const periodo = isSingleDay ? strInicio : `De ${strInicio} até ${strFim}`
                                                    
                                                    const isPast = new Date(r.data_fim + 'T23:59:59') < new Date()

                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border shadow-sm transition-colors ${
                                                                isPast 
                                                                    ? 'bg-gray-50 border-gray-200 text-gray-500' 
                                                                    : 'bg-blue-50 border-blue-100/60 text-blue-700'
                                                            }`}
                                                        >
                                                            <span className="text-xs font-medium tracking-tight">{periodo}</span>
                                                            <button 
                                                                onClick={() => handleDeleteRestriction(r.ids)} 
                                                                className={`p-1 rounded-md transition ${isPast ? 'hover:bg-gray-200 hover:text-gray-700' : 'hover:bg-blue-200/50 hover:text-red-500'}`}
                                                                title="Remover período"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                                disabled={currentPage === 1} 
                                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition shadow-sm"
                                            >
                                                <ChevronLeft size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                                disabled={currentPage === totalPages} 
                                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition shadow-sm"
                                            >
                                                <ChevronRight size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
            `}</style>
        </MainLayout>
    )
}