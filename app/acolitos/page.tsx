'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' 
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Trash2, User, CheckCircle2, XCircle, Edit2, X, 
  Cake, AlertCircle, AlertTriangle, Heart, CalendarClock, Settings, 
  BookOpen, Flame, Plus, PartyPopper, Search, Shield, Clock, LockKeyhole
} from 'lucide-react'

// --- Tipos e Interfaces ---
interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning';
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
  const { setTheme } = useTheme()
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
    setTheme('dark')
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil)
    } catch (e) { router.push('/login') }
    fetchAcolitos()
  }, [])

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'warning') => {
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
    const currentMonth = today.getMonth() + 1 // 1 a 12
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    
    // Cria um número comparável: Mês * 100 + Dia
    // Ex: 5 de Fevereiro = 205. 25 de Dezembro = 1225.
    const currentCompareValue = (currentMonth * 100) + currentDay;

    const todos = acolitos
      .filter(a => a.data_nascimento)
      .map(a => {
        const [ano, mes, dia] = a.data_nascimento.split('-')
        const diaNum = parseInt(dia)
        const mesNum = parseInt(mes)
        
        // Valor comparável do usuário
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
      // Ordena de Janeiro a Dezembro pelo valor comparável
      .sort((a, b) => a.compareValue - b.compareValue)

    return {
      hoje: todos.filter(a => a.isToday),
      // Filtra estritamente quem tem o valor maior que hoje
      // Ex: Se hoje é 205 (5/fev), mostra apenas quem tem 206 pra cima
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
        triggerAlert('Sucesso', 'Dados atualizados.', 'success')
    } catch (error: any) { triggerAlert('Erro', error.message, 'error') }
  }

  async function toggleStatus(e: any, id: number, statusAtual: boolean) {
    e.stopPropagation(); 
    try { 
        await supabase.from('acolitos').update({ ativo: !statusAtual }).eq('id', id)
        fetchAcolitos()
    } catch { triggerAlert('Erro', 'Falha no status.', 'error') }
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
    triggerConfirm('Excluir?', 'Irreversível.', async () => {
        try { await supabase.from('acolitos').delete().eq('id', id); fetchAcolitos(); closeAlert() } catch (e: any) { triggerAlert('Erro', e.message, 'error') }
    })
  }

  const filteredAcolitos = acolitos.filter(a => 
      (a.nome + ' ' + a.sobrenome).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* Alert Component */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${customAlert.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                      {customAlert.type === 'error' ? <AlertCircle size={28}/> : <CheckCircle2 size={28}/>}
                  </div>
                  <h3 className="text-lg font-bold text-white">{customAlert.title}</h3>
                  <p className="text-sm text-zinc-400">{customAlert.message}</p>
                  <button onClick={closeAlert} className="w-full bg-zinc-800 py-3 rounded-xl transition">Entendi</button>
              </div>
          </div>
      )}

      {/* --- MODAL DE CADASTRO/EDIÇÃO (RESTAURADO) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {editingId ? <Edit2 size={20} className="text-yellow-500"/> : <User size={20} className="text-blue-500"/>} 
                    {editingId ? 'Editar Membro' : 'Novo Membro'}
                  </h2>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                  {/* Nome e Sobrenome */}
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nome</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Sobrenome</label><input value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                  </div>

                  {/* Gênero, Usuário e Niver */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Gênero</label>
                        <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1 text-white">
                            <option value="M">Masculino</option><option value="F">Feminino</option>
                        </select>
                    </div>
                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Usuário</label><input value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Nascimento (DD/MM)</label><input value={form.data_nascimento} onChange={handleDateChange} placeholder="Ex: 15/08" maxLength={5} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                  </div>

                  {/* Liturgia e Disponibilidade */}
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1"><Flame size={12}/> Liturgia & Disponibilidade</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition">
                            <input type="checkbox" checked={form.manuseia_missal} onChange={e => setForm({...form, manuseia_missal: e.target.checked})} className="accent-orange-500 scale-125"/>
                            <span className="text-sm">Missal</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition">
                            <input type="checkbox" checked={form.manuseia_turibulo} onChange={e => setForm({...form, manuseia_turibulo: e.target.checked})} className="accent-orange-500 scale-125"/>
                            <span className="text-sm">Turíbulo</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-blue-500/50 transition">
                            <input type="checkbox" checked={form.apenas_fim_de_semana} onChange={e => setForm({...form, apenas_fim_de_semana: e.target.checked})} className="accent-blue-500 scale-125"/>
                            <span className="text-sm">Só FDS</span>
                        </label>
                    </div>
                    {/* Horários */}
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-3">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Clock size={10}/> Início</label>
                            <input type="time" value={form.disponivel_inicio} onChange={e => setForm({...form, disponivel_inicio: e.target.value})} className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm mt-1 focus:border-blue-600 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Clock size={10}/> Fim</label>
                            <input type="time" value={form.disponivel_fim} onChange={e => setForm({...form, disponivel_fim: e.target.value})} className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm mt-1 focus:border-blue-600 outline-none" />
                        </div>
                    </div>
                  </div>

                  {/* Configurações de Perfil e Parceiro */}
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1"><Settings size={12}/> Configurações</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Perfil de Acesso</label>
                             <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                                <option value="padrao">Acólito</option><option value="diretoria">Diretoria</option><option value="admin">Admin</option>
                             </select>
                        </div>
                        <div>
                             <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Dupla / Parceiro</label>
                             <select value={form.parceiro_id} onChange={e => setForm({...form, parceiro_id: e.target.value})} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                                <option value="">Nenhum</option>
                                {acolitos.filter(a => a.id !== editingId).map(a => <option key={a.id} value={a.id}>{a.nome} {a.sobrenome}</option>)}
                             </select>
                        </div>
                    </div>
                  </div>

                  {/* Acessos Específicos (Admin) */}
                  {userRole === 'admin' && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1"><LockKeyhole size={10}/> Módulos Liberados</span>
                        <div className="flex flex-wrap gap-2">
                            {MODULES.map(mod => (
                                <button key={mod.id} onClick={() => toggleAccess(mod.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${form.acessos.includes(mod.id) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
                                    {mod.label}
                                </button>
                            ))}
                        </div>
                      </div>
                  )}
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 z-10">
                  <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2">
                      <Save size={20} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 z-40">
        <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-full text-zinc-400 transition"><ArrowLeft size={20}/></Link>
            <div>
                <h1 className="text-lg font-bold text-white leading-none">Gestão de Equipe</h1>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Acólitos & Cerimoniários</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {acolitos.length} Membros
             </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="pt-24 pb-10 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
            
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16}/>
                        <input 
                            placeholder="Buscar por nome..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 text-white text-sm pl-9 pr-4 py-2 rounded-lg border border-zinc-800 outline-none focus:border-blue-500 transition"
                        />
                    </div>
                    <button onClick={openNewForm} className="w-full md:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition active:scale-95 shadow-lg shadow-blue-900/20">
                        <Plus size={18}/> Novo Acólito
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-zinc-500 animate-pulse">Carregando equipe...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredAcolitos.map((acolito) => (
                            <div key={acolito.id} onClick={() => handleEdit(acolito)} 
                                 className={`group relative bg-zinc-900 hover:bg-zinc-800/80 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
                                 ${!acolito.ativo ? 'opacity-60 grayscale' : 'border-zinc-800 hover:border-blue-500/30'}`}>
                                
                                <div className="p-4 pb-12"> 
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-900/20">
                                                {acolito.nome?.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm leading-tight group-hover:text-blue-400 transition-colors">{acolito.nome} {acolito.sobrenome}</h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {acolito.perfil !== 'padrao' && <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-1 rounded uppercase flex items-center gap-0.5"><Shield size={8}/> {acolito.perfil}</span>}
                                                    {acolito.parceiro_id && <span className="text-[8px] font-black text-pink-400 bg-pink-500/10 px-1 rounded flex items-center gap-0.5"><Heart size={8}/> Dupla</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(e, acolito.id); }} className="p-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>

                                {/* Ações rápidas no hover */}
                                <div className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 h-10 flex items-center justify-around translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-10 shadow-2xl">
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'apenas_fim_de_semana', acolito.apenas_fim_de_semana)} title="FDS" className={`flex-1 h-full flex justify-center items-center transition hover:bg-zinc-900 ${acolito.apenas_fim_de_semana ? 'text-yellow-400' : 'text-zinc-600'}`}><CalendarClock size={16}/></button>
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_missal', acolito.manuseia_missal)} title="Missal" className={`flex-1 h-full flex justify-center items-center transition hover:bg-zinc-900 ${acolito.manuseia_missal ? 'text-blue-400' : 'text-zinc-600'}`}><BookOpen size={16}/></button>
                                    <button onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_turibulo', acolito.manuseia_turibulo)} title="Turíbulo" className={`flex-1 h-full flex justify-center items-center transition hover:bg-zinc-900 ${acolito.manuseia_turibulo ? 'text-orange-400' : 'text-zinc-600'}`}><Flame size={16}/></button>
                                    <button onClick={(e) => toggleStatus(e, acolito.id, acolito.ativo)} title="Status" className={`flex-1 h-full flex justify-center items-center transition hover:bg-zinc-900 ${acolito.ativo ? 'text-green-500' : 'text-red-500'}`}><CheckCircle2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar de Aniversariantes */}
            <aside className="hidden lg:block sticky top-24 space-y-4">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="p-4 bg-zinc-950/50 border-b border-zinc-800 flex items-center gap-2">
                        <Cake size={16} className="text-pink-500" />
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">Aniversariantes</h3>
                    </div>

                    <div className="p-3 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {/* Hoje */}
                        {hoje.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-pink-500 uppercase ml-1">Aniversário do Dia</span>
                                {hoje.map(aniv => (
                                    <div key={aniv.id} className="bg-gradient-to-br from-pink-500/20 to-violet-500/10 border border-pink-500/40 p-3 rounded-xl flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center bg-pink-500 text-white w-10 h-10 rounded-lg shrink-0 shadow-lg shadow-pink-500/20">
                                            <span className="text-sm font-black leading-none">{aniv.dia}</span>
                                            <span className="text-[8px] uppercase font-bold">{aniv.mesNome}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{aniv.nome}</p>
                                            <span className="text-[10px] text-pink-400 flex items-center gap-1 animate-pulse">
                                                <PartyPopper size={10}/> Parabéns!
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Próximos */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Próximos</span>
                            {proximos.length === 0 && hoje.length === 0 ? (
                                <p className="text-xs text-zinc-600 p-4 text-center italic">Nenhum aniversário próximo.</p>
                            ) : (
                                proximos.map(aniv => (
                                    <div key={aniv.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded-xl transition-colors group">
                                        <div className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-400 w-9 h-9 rounded-lg shrink-0 group-hover:border-zinc-600 transition-colors">
                                            <span className="text-xs font-bold leading-none">{aniv.dia}</span>
                                            <span className="text-[7px] uppercase font-bold">{aniv.mesNome}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-zinc-300 group-hover:text-white truncate transition-colors">
                                                {aniv.nome} {aniv.sobrenome}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </aside>

        </div>
      </main>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  )
}