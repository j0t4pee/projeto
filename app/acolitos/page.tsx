'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, X, LogOut, Users, DollarSign, ClipboardList, Settings, ChevronLeft,
  ArrowLeft, Save, Trash2, User, CheckCircle2, XCircle, Edit2, 
  Cake, AlertCircle, AlertTriangle, Heart, CalendarClock, 
  BookOpen, Flame, Plus, PartyPopper, Search, Shield, Clock, LockKeyhole, Download
} from 'lucide-react'

// Constante de Versão
const APP_VERSION = "v3.87.0-ui-folder-light" 

// --- Tipos e Interfaces ---
interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
}

const MODULES = [
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'equipe', label: 'Gestão de Equipe' },
    { id: 'atas', label: 'Atas / Documentos' },
    { id: 'restricoes', label: 'Gerenciar Restrições' },
    { id: 'escalas', label: 'Gerar/Editar Escalas' } 
]

export default function AcolitosPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [acolitos, setAcolitos] = useState<any[]>([])
  const [userRole, setUserRole] = useState('padrao')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'success', title: '', message: ''
  })

  const [form, setForm] = useState({
    nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', 
    data_nascimento: '', perfil: 'padrao', senha: '123', genero: 'M',
    apenas_fim_de_semana: false, parceiro_id: '', acessos: [] as string[],
    manuseia_missal: false, manuseia_turibulo: false,
    disponivel_inicio: '00:00',
    disponivel_fim: '23:59'
  })

  useEffect(() => {
    setMounted(true)
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil || 'padrao')
    } catch (e) { router.push('/login') }
    
    fetchAcolitos()
  }, [])

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type })
  }
  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
      setCustomAlert({ isOpen: true, title, message, type: 'warning', onConfirm })
  }
  const closeAlert = () => { setCustomAlert({ ...customAlert, isOpen: false, onConfirm: undefined }) }

  async function fetchAcolitos() {
    setLoading(true)
    try {
        const { data, error } = await supabase.from('acolitos').select('*').order('nome', { ascending: true })
        if (error) throw error
        if (data) setAcolitos(data)
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  // --- Lógica de Aniversários OTIMIZADA ---
  const getAniversariantesData = () => {
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth() + 1
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    
    const currentCompareValue = (currentMonth * 100) + currentDay;

    const todos = acolitos
      .filter(a => a.data_nascimento)
      .map(a => {
        const [ano, mes, dia] = a.data_nascimento.split('-')
        const diaNum = parseInt(dia)
        const mesNum = parseInt(mes)
        const userCompareValue = (mesNum * 100) + diaNum;

        return {
          ...a,
          dia: diaNum,
          mes: mesNum,
          mesNome: meses[mesNum - 1],
          compareValue: userCompareValue,
          isToday: userCompareValue === currentCompareValue,
        }
      })
      .sort((a, b) => a.compareValue - b.compareValue)

    return {
      hoje: todos.filter(a => a.isToday),
      proximos: todos.filter(a => a.compareValue > currentCompareValue).slice(0, 5)
    }
  }

  const { hoje, proximos } = getAniversariantesData()

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 4) v = v.slice(0, 4)
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2')
    setForm({...form, data_nascimento: v})
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); if(v.length>11)v=v.slice(0,11); v=v.replace(/^(\d{2})(\d)/g,'($1) $2'); v=v.replace(/(\d)(\d{4})$/,'$1-$2'); setForm({...form, telefone: v})
  }
  
  const toggleAccess = (moduleId: string) => {
      setForm(prev => {
          const exists = prev.acessos.includes(moduleId)
          if (exists) return { ...prev, acessos: prev.acessos.filter(a => a !== moduleId) }
          return { ...prev, acessos: [...prev.acessos, moduleId] }
      })
  }

  function openNewForm() {
      setEditingId(null)
      setForm({ 
        nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', data_nascimento: '', 
        perfil: 'padrao', senha: '123', genero: 'M', apenas_fim_de_semana: false, parceiro_id: '', acessos: [],
        manuseia_missal: false, manuseia_turibulo: false,
        disponivel_inicio: '00:00', disponivel_fim: '23:59'
      })
      setIsFormOpen(true)
  }

  function handleEdit(acolito: any) {
    setEditingId(acolito.id)
    let formattedDate = ''
    if (acolito.data_nascimento) {
        const [ano, mes, dia] = acolito.data_nascimento.split('-')
        formattedDate = `${dia}/${mes}`
    }
    setForm({
        ...acolito,
        data_nascimento: formattedDate,
        parceiro_id: acolito.parceiro_id || '',
        acessos: acolito.acessos || []
    })
    setIsFormOpen(true)
  }

  async function handleSave() {
    try {
        let dataNascDB = null
        if (form.data_nascimento && form.data_nascimento.length === 5) {
            const [dia, mes] = form.data_nascimento.split('/')
            dataNascDB = `2000-${mes}-${dia}`
        }
        
        const payload = { 
            ...form,
            data_nascimento: dataNascDB,
            parceiro_id: form.parceiro_id !== '' ? parseInt(form.parceiro_id as string) : null
        }

        if (editingId) {
            const { error } = await supabase.from('acolitos').update(payload).eq('id', editingId)
            if (error) throw error
        } else {
            const { error } = await supabase.from('acolitos').insert([{ ...payload, ativo: true }])
            if (error) throw error
        }

        setIsFormOpen(false)
        fetchAcolitos()
        triggerAlert('Sucesso', 'Dados atualizados com sucesso.', 'success')
    } catch (error: any) { triggerAlert('Erro', error.message, 'error') }
  }

  async function toggleStatus(e: any, id: number, statusAtual: boolean) {
    e.stopPropagation(); 
    try { 
        await supabase.from('acolitos').update({ ativo: !statusAtual }).eq('id', id)
        fetchAcolitos()
    } catch { triggerAlert('Erro', 'Falha ao mudar status.', 'error') }
  }

  async function handleQuickToggle(e: any, id: number, field: string, currentValue: boolean) {
      e.stopPropagation();
      if(userRole !== 'admin' && userRole !== 'diretoria') return;
      try {
          await supabase.from('acolitos').update({ [field]: !currentValue }).eq('id', id);
          fetchAcolitos();
      } catch (err) { triggerAlert('Erro', 'Falha ao atualizar.', 'error'); }
  }

  async function handleDelete(e: any, id: number) {
    e.stopPropagation();
    triggerConfirm('Excluir?', 'Esta ação é irreversível.', async () => {
        try { 
            await supabase.from('acolitos').delete().eq('id', id); 
            fetchAcolitos(); 
            closeAlert() 
        } catch (e: any) { triggerAlert('Erro', e.message, 'error') }
    })
  }

  const filteredAcolitos = acolitos.filter(a => 
      (a.nome + ' ' + a.sobrenome).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canManage = userRole === 'admin' || userRole === 'diretoria';

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
            <h1 className="text-sm font-bold text-gray-900">Gestão de Equipe</h1>
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
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userRole === 'admin' ? 'Admin' : 'Acólito'}</span>
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
                    <Link href="/acolitos" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition">
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
        
        {/* Título e Info da Página */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">Gestão de Equipe</h2>
                <p className="text-sm text-gray-500 font-medium">Acólitos & Cerimoniários do Santuário</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600 shadow-sm w-fit">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {acolitos.length} Membros
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Coluna Esquerda: Busca, Botão e Lista (Ocupa 3 colunas no Desktop) */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* Search e Ação */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input 
                            placeholder="Buscar por nome..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 text-gray-900 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                    </div>
                    {canManage && (
                        <button onClick={openNewForm} className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-blue-600/20">
                            <Plus size={18}/> Novo Acólito
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400 animate-pulse font-medium">Carregando equipe...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredAcolitos.map((acolito) => (
                            <div key={acolito.id} onClick={() => canManage ? handleEdit(acolito) : null} 
                                 className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm
                                 ${!acolito.ativo ? 'opacity-60 grayscale bg-gray-50' : 'border-gray-200'} 
                                 ${canManage ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}>
                                
                                <div className="p-4 pb-14"> 
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                {acolito.nome?.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">{acolito.nome} {acolito.sobrenome}</h3>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    {acolito.perfil !== 'padrao' && <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Shield size={10}/> {acolito.perfil}</span>}
                                                    {acolito.parceiro_id && <span className="text-[9px] font-bold text-pink-700 bg-pink-100 border border-pink-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Heart size={10}/> Dupla</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(e, acolito.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Ações rápidas no hover */}
                                <div className={`absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-100 h-11 flex items-center justify-around transition-transform duration-200 z-10 
                                    ${canManage ? 'translate-y-full group-hover:translate-y-0' : ''}`}>
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'apenas_fim_de_semana', acolito.apenas_fim_de_semana)} title="FDS" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.apenas_fim_de_semana ? 'text-yellow-600' : 'text-gray-400'}`}><CalendarClock size={16}/></button>
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_missal', acolito.manuseia_missal)} title="Missal" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.manuseia_missal ? 'text-blue-600' : 'text-gray-400'}`}><BookOpen size={16}/></button>
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_turibulo', acolito.manuseia_turibulo)} title="Turíbulo" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 border-r border-gray-200/50 ${acolito.manuseia_turibulo ? 'text-orange-500' : 'text-gray-400'}`}><Flame size={16}/></button>
                                    <button onClick={(e) => toggleStatus(e, acolito.id, acolito.ativo)} title="Status" className={`flex-1 h-full flex justify-center items-center transition hover:bg-gray-100 ${acolito.ativo ? 'text-green-500' : 'text-red-500'}`}><CheckCircle2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Coluna Direita: Sidebar de Aniversariantes (Ocupa 1 coluna no Desktop) */}
            <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <Cake size={18} className="text-pink-600" />
                        <h3 className="font-bold text-xs uppercase tracking-widest text-gray-600">Aniversariantes</h3>
                    </div>

                    <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Hoje */}
                        {hoje.length > 0 && (
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Aniversário do Dia</span>
                                {hoje.map(aniv => (
                                    <div key={aniv.id} className="bg-pink-50 border border-pink-200 p-3 rounded-xl flex items-center gap-3 shadow-sm">
                                        <div className="flex flex-col items-center justify-center bg-pink-500 text-white w-10 h-10 rounded-lg shrink-0 shadow-md shadow-pink-500/20">
                                            <span className="text-sm font-black leading-none">{aniv.dia}</span>
                                            <span className="text-[8px] uppercase font-bold">{aniv.mesNome}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{aniv.nome}</p>
                                            <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1">
                                                <PartyPopper size={12}/> Parabéns!
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Próximos */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Próximos</span>
                            {proximos.length === 0 && hoje.length === 0 ? (
                                <p className="text-xs text-gray-500 text-center italic py-2">Nenhum aniversário próximo.</p>
                            ) : (
                                <div className="space-y-2">
                                    {proximos.map(aniv => (
                                        <div key={aniv.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 group">
                                            <div className="flex flex-col items-center justify-center bg-white border border-gray-200 text-gray-500 w-9 h-9 rounded-lg shrink-0 group-hover:border-gray-300 transition-colors">
                                                <span className="text-xs font-bold leading-none text-gray-700">{aniv.dia}</span>
                                                <span className="text-[7px] uppercase font-bold">{aniv.mesNome}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-700 group-hover:text-gray-900 truncate transition-colors">
                                                    {aniv.nome} {aniv.sobrenome}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
      </main>

      {/* --- MODAL DE CADASTRO/EDIÇÃO (LIGHT MODE) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
           <div className="bg-white border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col relative">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                    {editingId ? <Edit2 size={20} className="text-blue-600"/> : <User size={20} className="text-blue-600"/>} 
                    {editingId ? 'Editar Membro' : 'Novo Membro'}
                  </h2>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                  {/* Nome e Sobrenome */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Nome</label>
                          <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-gray-900 transition" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Sobrenome</label>
                          <input value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-gray-900 transition" />
                      </div>
                  </div>

                  {/* Gênero, Usuário e Niver */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Gênero</label>
                        <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-gray-900 transition">
                            <option value="M">Masculino</option><option value="F">Feminino</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Usuário</label>
                        <input value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-gray-900 transition" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block mb-1">Nascimento (DD/MM)</label>
                        <input value={form.data_nascimento} onChange={handleDateChange} placeholder="Ex: 15/08" maxLength={5} className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-gray-900 transition" />
                    </div>
                  </div>

                  {/* Liturgia e Disponibilidade */}
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1 mb-2"><Flame size={14}/> Liturgia & Disponibilidade</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-orange-500 hover:shadow-sm transition">
                            <input type="checkbox" checked={form.manuseia_missal} onChange={e => setForm({...form, manuseia_missal: e.target.checked})} className="w-4 h-4 accent-orange-600 rounded"/>
                            <span className="text-sm font-medium text-gray-700">Missal</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-orange-500 hover:shadow-sm transition">
                            <input type="checkbox" checked={form.manuseia_turibulo} onChange={e => setForm({...form, manuseia_turibulo: e.target.checked})} className="w-4 h-4 accent-orange-600 rounded"/>
                            <span className="text-sm font-medium text-gray-700">Turíbulo</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-blue-500 hover:shadow-sm transition">
                            <input type="checkbox" checked={form.apenas_fim_de_semana} onChange={e => setForm({...form, apenas_fim_de_semana: e.target.checked})} className="w-4 h-4 accent-blue-600 rounded"/>
                            <span className="text-sm font-medium text-gray-700">Só FDS</span>
                        </label>
                    </div>
                    {/* Horários */}
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 mt-2">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock size={12}/> Início Disponibilidade</label>
                            <input type="time" value={form.disponivel_inicio} onChange={e => setForm({...form, disponivel_inicio: e.target.value})} className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 focus:border-blue-600 outline-none transition" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock size={12}/> Fim Disponibilidade</label>
                            <input type="time" value={form.disponivel_fim} onChange={e => setForm({...form, disponivel_fim: e.target.value})} className="w-full p-2.5 rounded-lg bg-white border border-gray-300 text-sm text-gray-900 focus:border-blue-600 outline-none transition" />
                        </div>
                    </div>
                  </div>

                  {/* Configurações de Perfil e Parceiro */}
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 mb-2"><Settings size={14}/> Configurações de Sistema</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Perfil de Acesso</label>
                             <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 focus:border-blue-600 outline-none transition">
                                <option value="padrao">Acólito (Padrão)</option><option value="diretoria">Diretoria</option><option value="admin">Administrador</option>
                             </select>
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dupla / Parceiro Fixo</label>
                             <select value={form.parceiro_id} onChange={e => setForm({...form, parceiro_id: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-gray-300 text-sm text-gray-900 focus:border-blue-600 outline-none transition">
                                <option value="">Nenhum</option>
                                {acolitos.filter(a => a.id !== editingId).map(a => <option key={a.id} value={a.id}>{a.nome} {a.sobrenome}</option>)}
                             </select>
                        </div>
                    </div>
                  </div>

                  {/* Acessos Específicos (Admin) */}
                  {userRole === 'admin' && (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><LockKeyhole size={12}/> Módulos Liberados</span>
                        <div className="flex flex-wrap gap-2">
                            {MODULES.map(mod => (
                                <button key={mod.id} onClick={() => toggleAccess(mod.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${form.acessos.includes(mod.id) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                    {mod.label}
                                </button>
                            ))}
                        </div>
                      </div>
                  )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/80 sticky bottom-0 z-10 rounded-b-3xl">
                  <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2">
                      <Save size={20} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Ajuste simples da Scrollbar para o Sidebar de Aniversariantes */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  )
}