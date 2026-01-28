'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' 
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Trash2, User, CheckCircle2, XCircle, Edit2, X, 
  Cake, AlertCircle, AlertTriangle, Heart, CalendarClock, Settings, 
  BookOpen, Flame, Plus, PartyPopper, Search, Check, Shield
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
    manuseia_missal: false, manuseia_turibulo: false
  })

  // --- Efeitos Iniciais ---
  useEffect(() => {
    setTheme('dark')
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil)
        const hasTeamAccess = user.perfil === 'admin' || (user.acessos && user.acessos.includes('equipe'))
        
        if (!hasTeamAccess) {
            triggerAlert("Acesso Negado", "Você não tem permissão para gerenciar a equipe.", "error")
            router.push('/')
            return
        }
    } catch (e) { router.push('/login') }

    fetchAcolitos()
  }, [])

  // --- Funções Auxiliares ---
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

  // --- Lógica de Datas e Aniversários ---
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth() + 1

  const getAniversariantes = () => {
    return acolitos
      .filter(a => a.data_nascimento)
      .map(a => {
        const [ano, mes, dia] = a.data_nascimento.split('-')
        const diaNum = parseInt(dia)
        const mesNum = parseInt(mes)
        return {
           ...a,
           dia: diaNum,
           mes: mesNum,
           diaDisplay: dia,
           mesDisplay: mes,
           isToday: diaNum === currentDay && mesNum === currentMonth
        }
      })
      .sort((a, b) => {
        if (a.mes !== b.mes) return a.mes - b.mes
        return a.dia - b.dia
      })
  }
  const aniversariantesList = getAniversariantes()

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

  // --- Ações de Formulário ---
  function openNewForm() {
      setEditingId(null)
      setForm({ 
        nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', data_nascimento: '', 
        perfil: 'padrao', senha: '123', genero: 'M', apenas_fim_de_semana: false, parceiro_id: '', acessos: [],
        manuseia_missal: false, manuseia_turibulo: false
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
        nome: acolito.nome || '', sobrenome: acolito.sobrenome || '', usuario: acolito.usuario || '', telefone: acolito.telefone || '',
        rua: acolito.rua || '', numero: acolito.numero || '', bairro: acolito.bairro || '', complemento: acolito.complemento || '', 
        data_nascimento: formattedDate, perfil: acolito.perfil || 'padrao', senha: acolito.senha || '123',
        genero: acolito.genero || 'M', apenas_fim_de_semana: acolito.apenas_fim_de_semana || false,
        parceiro_id: acolito.parceiro_id || '', acessos: acolito.acessos || [],
        manuseia_missal: acolito.manuseia_missal || false, manuseia_turibulo: acolito.manuseia_turibulo || false
    })
    setIsFormOpen(true)
  }

  // --- FUNÇÃO DE SALVAR CORRIGIDA ---
  async function handleSave() {
    try {
        let dataNascDB = null
        if (form.data_nascimento && form.data_nascimento.length === 5) {
            const [dia, mes] = form.data_nascimento.split('/')
            dataNascDB = `2000-${mes}-${dia}`
        }
        
        // Garante que é numérico ou null
        const novoParceiroId = form.parceiro_id && form.parceiro_id !== '' ? parseInt(form.parceiro_id) : null
        
        const payload = { 
            nome: form.nome, sobrenome: form.sobrenome, usuario: form.usuario, telefone: form.telefone,
            rua: form.rua, numero: form.numero, bairro: form.bairro, complemento: form.complemento,
            data_nascimento: dataNascDB, perfil: form.perfil, genero: form.genero,
            apenas_fim_de_semana: form.apenas_fim_de_semana, parceiro_id: novoParceiroId,
            acessos: form.acessos, manuseia_missal: form.manuseia_missal, manuseia_turibulo: form.manuseia_turibulo
        }

        // --- MODO EDIÇÃO ---
        if (editingId) {
            // 1. Busca o estado ATUAL do banco (ou do state) para saber quem era o ex-parceiro
            const usuarioAntigo = acolitos.find(a => a.id === editingId)
            const antigoParceiroId = usuarioAntigo?.parceiro_id

            // 2. Atualiza o usuário atual (Breno aponta para Leticia)
            const { error } = await supabase.from('acolitos').update(payload).eq('id', editingId)
            if (error) throw error

            // 3. RECIPROCIDADE FORÇADA
            // Se escolheu alguém (Leticia), força ela a apontar para o Breno.
            // Removemos o "if changed" para garantir que correções sejam feitas mesmo se o dropdown não mudou.
            if (novoParceiroId) {
                await supabase.from('acolitos').update({ parceiro_id: editingId }).eq('id', novoParceiroId)
            }

            // 4. LIMPEZA DE EX
            // Se tinha um parceiro antigo e ele é diferente do novo (ou agora é null),
            // remove o vínculo do antigo parceiro.
            if (antigoParceiroId && antigoParceiroId !== novoParceiroId) {
                await supabase.from('acolitos').update({ parceiro_id: null }).eq('id', antigoParceiroId)
            }

        // --- MODO CRIAÇÃO ---
        } else {
            if (form.usuario) {
                const { data: exists } = await supabase.from('acolitos').select('id').eq('usuario', form.usuario).single()
                if (exists) throw new Error('Usuário já existe.')
            }
            
            // Insere e retorna os dados para pegar o ID gerado
            const { data: insertedData, error } = await supabase.from('acolitos').insert([{ ...payload, ativo: true }]).select().single()
            if (error) throw error

            // Se criou já com dupla, atualiza a dupla para apontar para o novo acólito
            if (insertedData && novoParceiroId) {
                await supabase.from('acolitos').update({ parceiro_id: insertedData.id }).eq('id', novoParceiroId)
            }
        }

        setIsFormOpen(false)
        fetchAcolitos()
        triggerAlert('Sucesso', 'Dados e vínculos de dupla atualizados.', 'success')

    } catch (error: any) { triggerAlert('Erro ao Salvar', error.message, 'error') }
  }

  // --- Ações Rápidas do Card ---
  async function toggleStatus(e: any, id: number, statusAtual: boolean) {
    e.stopPropagation(); 
    const novos = acolitos.map(a => a.id === id ? { ...a, ativo: !statusAtual } : a); 
    setAcolitos(novos)
    try { await supabase.from('acolitos').update({ ativo: !statusAtual }).eq('id', id) } catch { triggerAlert('Erro', 'Falha no status.', 'error') }
  }

  async function handleQuickToggle(e: any, id: number, field: string, currentValue: boolean) {
      e.stopPropagation();
      // VERIFICAÇÃO DE PERMISSÃO RIGOROSA
      if(userRole !== 'admin' && userRole !== 'diretoria') {
          return triggerAlert('Acesso Negado', 'Apenas Coordenação altera funções litúrgicas.', 'warning');
      }

      // Atualização Otimista
      const novos = acolitos.map(a => a.id === id ? { ...a, [field]: !currentValue } : a);
      setAcolitos(novos);

      try {
          // Atualiza no banco
          const { error } = await supabase.from('acolitos').update({ [field]: !currentValue }).eq('id', id);
          if (error) throw error;
      } catch (err) {
          triggerAlert('Erro', 'Falha ao atualizar atributo.', 'error');
          fetchAcolitos(); // Reverte em caso de erro
      }
  }

  async function handleDelete(e: any, id: number) {
    e.stopPropagation(); if (userRole !== 'admin') return triggerAlert('Sem Permissão', 'Apenas Admin exclui.', 'error')
    triggerConfirm('Excluir?', 'Irreversível.', async () => {
        try { await supabase.from('acolitos').delete().eq('id', id); fetchAcolitos(); closeAlert() } catch (e: any) { triggerAlert('Erro', e.message, 'error') }
    })
  }

  // Filtro de busca
  const filteredAcolitos = acolitos.filter(a => 
      (a.nome + ' ' + a.sobrenome).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* --- ALERT COMPONENT --- */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${customAlert.type === 'error' ? 'bg-red-500/20 text-red-500' : customAlert.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {customAlert.type === 'error' && <AlertCircle size={28}/>} {customAlert.type === 'success' && <CheckCircle2 size={28}/>} {customAlert.type === 'warning' && <AlertTriangle size={28}/>}
                  </div>
                  <div><h3 className="text-lg font-bold text-white mb-1">{customAlert.title}</h3><p className="text-sm text-zinc-400">{customAlert.message}</p></div>
                  <div className="flex gap-3 pt-2">
                      {!customAlert.onConfirm ? <button onClick={closeAlert} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition">Entendi</button> : 
                      <><button onClick={closeAlert} className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold py-3 rounded-xl hover:bg-zinc-800 transition">Cancelar</button><button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">Confirmar</button></>}
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL DE CADASTRO/EDIÇÃO --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                    {editingId ? <><Edit2 size={20} className="text-yellow-500"/> Editar Acólito</> : <><User size={20} className="text-blue-500"/> Novo Acólito</>}
                 </h2>
                 <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Inputs do Formulário */}
                 <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-1"><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                     <div className="col-span-1"><label className="text-xs font-bold text-gray-500 uppercase">Sobrenome</label><input type="text" value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Gênero</label>
                        <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1 text-white">
                            <option value="M">Masculino</option><option value="F">Feminino</option>
                        </select>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Usuário</label><input type="text" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Aniversário (DD/MM)</label><input type="text" value={form.data_nascimento} onChange={handleDateChange} placeholder="Ex: 15/08" maxLength={5} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none mt-1" /></div>
                 </div>

                 <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1"><Flame size={12}/> Liturgia & Disponibilidade</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition">
                            <input type="checkbox" checked={form.manuseia_missal} onChange={e => setForm({...form, manuseia_missal: e.target.checked})} className="accent-orange-500 scale-125"/>
                            <span className="text-sm">Manuseia Missal</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-orange-500/50 transition">
                            <input type="checkbox" checked={form.manuseia_turibulo} onChange={e => setForm({...form, manuseia_turibulo: e.target.checked})} className="accent-orange-500 scale-125"/>
                            <span className="text-sm">Manuseia Turíbulo</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-blue-500/50 transition">
                            <input type="checkbox" checked={form.apenas_fim_de_semana} onChange={e => setForm({...form, apenas_fim_de_semana: e.target.checked})} className="accent-blue-500 scale-125"/>
                            <span className="text-sm">Só Fim de Semana</span>
                        </label>
                    </div>
                 </div>

                 <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1"><Settings size={12}/> Configurações</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Perfil de Acesso</label>
                             <select value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})} disabled={userRole !== 'admin'} className={`w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm ${userRole !== 'admin' ? 'opacity-50' : ''}`}>
                                <option value="padrao">Acólito</option><option value="diretoria">Diretoria</option><option value="admin">Admin</option>
                             </select>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Dupla / Parceiro</label>
                             <select value={form.parceiro_id} onChange={e => setForm({...form, parceiro_id: e.target.value})} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm">
                                <option value="">Nenhum</option>
                                {acolitos.filter(a => a.id !== editingId).map(a => <option key={a.id} value={a.id}>{a.nome} {a.sobrenome}</option>)}
                             </select>
                        </div>
                    </div>
                 </div>

                 {userRole === 'admin' && (
                     <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Acessos Específicos</span>
                        <div className="flex flex-wrap gap-2">
                            {MODULES.map(mod => (
                                <button key={mod.id} onClick={() => toggleAccess(mod.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${form.acessos.includes(mod.id) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
                                    {mod.label}
                                </button>
                            ))}
                        </div>
                     </div>
                 )}
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 z-10">
                  <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2">
                      <Save size={20} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Acólito'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 z-40">
        <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition"><ArrowLeft size={20}/></Link>
            <div>
                <h1 className="text-lg font-bold text-white leading-none">Gestão de Equipe</h1>
                <span className="text-xs text-zinc-500 font-medium">Acólitos & Cerimoniários</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold text-zinc-400">{acolitos.length} Membros</span>
             </div>
             <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-900/20 text-xs">
                 {userRole === 'admin' ? 'ADM' : 'DIR'}
             </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-24 pb-10 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
            
            {/* COLUNA ESQUERDA: Controles e Cards */}
            <div className="space-y-6">
                
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-zinc-500" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 text-white text-sm pl-9 pr-4 py-2 rounded-lg border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                        />
                    </div>
                    <button onClick={openNewForm} className="w-full md:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-blue-900/20 whitespace-nowrap">
                        <Plus size={18}/> Novo Acólito
                    </button>
                </div>

                {/* Grid de Cards Compactos */}
                {loading ? (
                    <div className="text-center py-20 text-zinc-500 animate-pulse">Carregando equipe...</div>
                ) : filteredAcolitos.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-500">Nenhum acólito encontrado.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredAcolitos.map((acolito) => (
                            <div key={acolito.id} onClick={() => handleEdit(acolito)} 
                                 className={`group relative bg-zinc-900 hover:bg-zinc-800/80 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
                                 ${!acolito.ativo ? 'border-zinc-800 opacity-60 grayscale' : 'border-zinc-800 hover:border-blue-500/30'}`}>
                                
                                {/* --- CONTEÚDO PRINCIPAL (Com padding inferior extra para não cortar texto) --- */}
                                <div className="p-3 pb-12"> 
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${acolito.ativo ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                                                {acolito.nome?.substring(0,2).toUpperCase()}
                                            </div>
                                            
                                            {/* Nome e Cargo */}
                                            <div>
                                                <h3 className="font-bold text-white text-sm leading-tight group-hover:text-blue-400 transition-colors">
                                                    {acolito.nome} {acolito.sobrenome}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {acolito.perfil !== 'padrao' && <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1 rounded uppercase flex items-center gap-0.5"><Shield size={8}/> {acolito.perfil}</span>}
                                                    {acolito.parceiro_id && <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 px-1 rounded flex items-center gap-0.5"><Heart size={8}/> Dupla</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Botões de Canto (Check/Lixeira) */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <button onClick={(e) => toggleStatus(e, acolito.id, acolito.ativo)} className={`p-1.5 rounded-md transition ${acolito.ativo ? 'hover:bg-green-500/20 text-green-500' : 'hover:bg-zinc-700 text-zinc-500'}`}>
                                                {acolito.ativo ? <Check size={16}/> : <XCircle size={16}/>}
                                            </button>
                                            {userRole === 'admin' && (
                                                <button onClick={(e) => handleDelete(e, acolito.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-600 hover:text-red-500 transition">
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* --- RODAPÉ: STATUS (Visível quando NÃO está com mouse em cima) --- */}
                                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 border-t border-zinc-800/50 flex items-center gap-2 transition-transform duration-300 group-hover:translate-y-full">
                                     {(acolito.apenas_fim_de_semana || acolito.manuseia_missal || acolito.manuseia_turibulo || acolito.parceiro_id) ? (
                                        <>
                                            {acolito.apenas_fim_de_semana && <div title="Só FDS" className="text-yellow-500 bg-yellow-500/10 p-1 rounded"><CalendarClock size={14} /></div>}
                                            {acolito.manuseia_missal && <div title="Missal" className="text-blue-400 bg-blue-500/10 p-1 rounded"><BookOpen size={14} /></div>}
                                            {acolito.manuseia_turibulo && <div title="Turíbulo" className="text-orange-400 bg-orange-500/10 p-1 rounded"><Flame size={14} /></div>}
                                            {acolito.parceiro_id && <div title="Dupla" className="ml-auto text-pink-400 bg-pink-500/10 p-1 rounded"><Heart size={14} /></div>}
                                        </>
                                     ) : (
                                        <span className="text-[10px] text-zinc-600 italic">Sem restrições/funções</span>
                                     )}
                                </div>

                                {/* --- MENU DESLIZANTE (Visível APENAS no Hover) --- */}
                                <div className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-blue-500/30 h-[42px] flex items-center justify-around translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out z-10 shadow-2xl">
                                    
                                    <button 
                                        onClick={(e) => handleQuickToggle(e, acolito.id, 'apenas_fim_de_semana', acolito.apenas_fim_de_semana)}
                                        title={acolito.apenas_fim_de_semana ? "Disponível apenas FDS" : "Disponível Semana toda"}
                                        className={`flex-1 h-full flex items-center justify-center transition hover:bg-zinc-900 ${acolito.apenas_fim_de_semana ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                        <CalendarClock size={16} />
                                    </button>

                                    <div className="w-[1px] h-4 bg-zinc-800"></div>

                                    <button 
                                        onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_missal', acolito.manuseia_missal)}
                                        title="Missal"
                                        className={`flex-1 h-full flex items-center justify-center transition hover:bg-zinc-900 ${acolito.manuseia_missal ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                        <BookOpen size={16} />
                                    </button>

                                    <div className="w-[1px] h-4 bg-zinc-800"></div>

                                    <button 
                                        onClick={(e) => handleQuickToggle(e, acolito.id, 'manuseia_turibulo', acolito.manuseia_turibulo)}
                                        title="Turíbulo"
                                        className={`flex-1 h-full flex items-center justify-center transition hover:bg-zinc-900 ${acolito.manuseia_turibulo ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                        <Flame size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* COLUNA DIREITA: Aniversariantes */}
            <aside className="hidden lg:block sticky top-24 space-y-4">
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
                    <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2">
                        <Cake className="text-pink-500" size={16} />
                        <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-400">Aniversariantes</h3>
                    </div>
                    
                    <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {aniversariantesList.length === 0 ? (
                            <p className="text-center text-xs text-zinc-600 py-4">Nenhum registro.</p>
                        ) : (
                            aniversariantesList.map((aniv) => (
                                <div key={aniv.id} className={`flex items-center gap-3 p-2 rounded-lg transition ${aniv.isToday ? 'bg-pink-900/10 border border-pink-500/30' : 'hover:bg-zinc-800 border border-transparent'}`}>
                                    <div className={`flex flex-col items-center justify-center w-8 h-8 rounded border ${aniv.isToday ? 'bg-pink-500 text-white border-pink-400' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                                        <span className="text-xs font-bold leading-none">{aniv.diaDisplay}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${aniv.isToday ? 'text-white' : 'text-zinc-300'}`}>
                                            {aniv.nome} {aniv.sobrenome}
                                        </p>
                                        {aniv.isToday && (
                                            <span className="text-[10px] text-pink-400 flex items-center gap-1 animate-pulse">
                                                <PartyPopper size={10}/> Hoje!
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
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