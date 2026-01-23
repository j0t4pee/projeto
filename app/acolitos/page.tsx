'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' 
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Trash2, User, Phone, MapPin, Calendar, 
  CheckCircle, CheckCircle2, XCircle, Edit2, X, Shield, Cake, 
  AtSign, AlertCircle, AlertTriangle, Info, Heart, CalendarClock, Settings, LockKeyhole, BookOpen, Flame
} from 'lucide-react'

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
  const [editingId, setEditingId] = useState<number | null>(null)

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'success', title: '', message: ''
  })

  const [form, setForm] = useState({
    nome: '',
    sobrenome: '',
    usuario: '',
    telefone: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    data_nascimento: '',
    perfil: 'padrao',
    senha: '123',
    genero: 'M',
    apenas_fim_de_semana: false,
    parceiro_id: '',
    acessos: [] as string[],
    manuseia_missal: false,   // NOVO
    manuseia_turibulo: false  // NOVO
  })

  useEffect(() => {
    setTheme('dark')
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil)
        // Apenas quem tem acesso 'equipe' ou é admin pode ver esta tela
        const hasTeamAccess = user.perfil === 'admin' || (user.acessos && user.acessos.includes('equipe'))
        
        if (!hasTeamAccess) {
            triggerAlert("Acesso Negado", "Você não tem permissão para gerenciar a equipe.", "error")
            router.push('/')
            return
        }
    } catch (e) { router.push('/login') }

    fetchAcolitos()
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAlert() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); if(v.length>11)v=v.slice(0,11); v=v.replace(/^(\d{2})(\d)/g,'($1) $2'); v=v.replace(/(\d)(\d{4})$/,'$1-$2'); setForm({...form, telefone: v})
  }
  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '') }) }

  const toggleAccess = (moduleId: string) => {
      setForm(prev => {
          const exists = prev.acessos.includes(moduleId)
          if (exists) return { ...prev, acessos: prev.acessos.filter(a => a !== moduleId) }
          return { ...prev, acessos: [...prev.acessos, moduleId] }
      })
  }

  function handleEdit(acolito: any) {
    setEditingId(acolito.id)
    setForm({
        nome: acolito.nome || '',
        sobrenome: acolito.sobrenome || '',
        usuario: acolito.usuario || '', telefone: acolito.telefone || '',
        rua: acolito.rua || '', numero: acolito.numero || '', bairro: acolito.bairro || '',
        complemento: acolito.complemento || '', data_nascimento: acolito.data_nascimento || '',
        perfil: acolito.perfil || 'padrao', senha: acolito.senha || '123',
        genero: acolito.genero || 'M',
        apenas_fim_de_semana: acolito.apenas_fim_de_semana || false,
        parceiro_id: acolito.parceiro_id || '',
        acessos: acolito.acessos || [],
        manuseia_missal: acolito.manuseia_missal || false,     // Carrega do banco
        manuseia_turibulo: acolito.manuseia_turibulo || false  // Carrega do banco
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm({ 
        nome: '', sobrenome: '', usuario: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', data_nascimento: '', 
        perfil: 'padrao', senha: '123', genero: 'M', apenas_fim_de_semana: false, parceiro_id: '', acessos: [],
        manuseia_missal: false, manuseia_turibulo: false
    })
  }

  async function handleSave() {
    if (!form.nome || !form.usuario || !form.telefone || !form.data_nascimento) return triggerAlert('Campos Obrigatórios', 'Preencha Nome, Usuário, Telefone e Nascimento.', 'warning')
    try {
        const dataNasc = form.data_nascimento === '' ? null : form.data_nascimento
        const parceiro = form.parceiro_id === '' ? null : parseInt(form.parceiro_id)
        
        const payload = { 
            nome: form.nome, sobrenome: form.sobrenome, usuario: form.usuario, telefone: form.telefone,
            rua: form.rua, numero: form.numero, bairro: form.bairro, complemento: form.complemento,
            data_nascimento: dataNasc, perfil: form.perfil, genero: form.genero,
            apenas_fim_de_semana: form.apenas_fim_de_semana, parceiro_id: parceiro,
            acessos: form.acessos,
            manuseia_missal: form.manuseia_missal,       // Salva habilidade Missal
            manuseia_turibulo: form.manuseia_turibulo    // Salva habilidade Turíbulo
        }

        if (editingId) {
            const { error } = await supabase.from('acolitos').update(payload).eq('id', editingId)
            if (error) throw error
        } else {
            const { data: exists } = await supabase.from('acolitos').select('id').eq('usuario', form.usuario).single()
            if (exists) throw new Error('Usuário já existe.')
            const { error } = await supabase.from('acolitos').insert([{ ...payload, ativo: true }])
            if (error) throw error
        }
        handleCancelEdit(); fetchAcolitos()
    } catch (error: any) { triggerAlert('Erro ao Salvar', error.message, 'error') }
  }

  async function toggleStatus(e: any, id: number, statusAtual: boolean) {
    e.stopPropagation(); const novos = acolitos.map(a => a.id === id ? { ...a, ativo: !statusAtual } : a); setAcolitos(novos)
    try { await supabase.from('acolitos').update({ ativo: !statusAtual }).eq('id', id) } catch { triggerAlert('Erro', 'Falha no status.', 'error') }
  }

  async function handleDelete(e: any, id: number) {
    e.stopPropagation(); if (userRole !== 'admin') return triggerAlert('Sem Permissão', 'Apenas Admin exclui.', 'error')
    triggerConfirm('Excluir?', 'Irreversível.', async () => {
        try { await supabase.from('acolitos').delete().eq('id', id); fetchAcolitos(); closeAlert() } catch (e: any) { triggerAlert('Erro', e.message, 'error') }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${customAlert.type === 'error' ? 'bg-red-500/20 text-red-500' : customAlert.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {customAlert.type === 'error' && <AlertCircle size={28}/>} {customAlert.type === 'success' && <CheckCircle2 size={28}/>} {customAlert.type === 'warning' && <AlertTriangle size={28}/>}
                  </div>
                  <div><h3 className="text-lg font-bold text-white mb-1">{customAlert.title}</h3><p className="text-sm text-zinc-400">{customAlert.message}</p></div>
                  <div className="flex gap-3 pt-2">
                      {!customAlert.onConfirm ? <button onClick={closeAlert} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl">Entendi</button> : 
                      <><button onClick={closeAlert} className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold py-3 rounded-xl">Cancelar</button><button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">Confirmar</button></>}
                  </div>
              </div>
          </div>
      )}

      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center gap-3"><Link href="/" className="p-2 hover:bg-zinc-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft size={20}/></Link><h1 className="text-sm md:text-lg font-bold uppercase">Gestão de Acólitos</h1></div>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold shadow-lg text-sm">{userRole === 'admin' ? 'ADM' : 'DIR'}</div>
      </header>

      <main className="pt-24 pb-10 px-4 max-w-[1400px] mx-auto flex flex-col md:grid md:grid-cols-[400px_1fr] gap-8">
        <div className="h-fit md:sticky md:top-24 space-y-6 order-1">
          <div className={`p-6 rounded-[2rem] border shadow-xl transition-colors ${editingId ? 'bg-zinc-900 border-blue-900/50 ring-1 ring-blue-900' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2">{editingId ? <><Edit2 size={20} className="text-yellow-500"/> Editar</> : <><User size={20} className="text-blue-500"/> Novo</>}</h2>{editingId && <button onClick={handleCancelEdit} className="text-xs font-bold text-red-400 px-3 py-1 rounded-lg flex items-center gap-1"><X size={14}/> Cancelar</button>}</div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">Nome *</label><input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">Sobrenome</label><input type="text" value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none" /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">Gênero</label>
                      <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none text-white">
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                      </select>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><AtSign size={12}/> Usuário *</label><input type="text" value={form.usuario} onChange={handleUsuarioChange} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none lowercase text-blue-400" /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Telefone *</label><input type="text" value={form.telefone} onChange={handlePhoneChange} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none" maxLength={15}/></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Nascimento *</label><input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none" /></div>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1"><Settings size={10}/> Preferências</span>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Disponibilidade</label>
                         <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                             <input type="checkbox" checked={form.apenas_fim_de_semana} onChange={e => setForm({...form, apenas_fim_de_semana: e.target.checked})} className="accent-blue-600"/>
                             <span className="text-xs text-zinc-300">Só Fim de Semana</span>
                         </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Shield size={12} /> Perfil</label>
                        <select 
                            value={form.perfil} 
                            onChange={e => setForm({...form, perfil: e.target.value})} 
                            disabled={userRole !== 'admin'}
                            className={`w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs ${userRole !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="padrao">Acólito</option>
                            <option value="diretoria">Diretoria</option>
                            <option value="admin">Admin</option>
                        </select>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Heart size={10}/> Dupla / Casal</label>
                      <select value={form.parceiro_id} onChange={e => setForm({...form, parceiro_id: e.target.value})} className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-blue-600 outline-none text-sm">
                          <option value="">Sem dupla</option>
                          {acolitos.filter(a => a.id !== editingId).map(a => <option key={a.id} value={a.id}>{a.nome} {a.sobrenome}</option>)}
                      </select>
                  </div>
              </div>

              {/* SEÇÃO HABILIDADES LITÚRGICAS */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
                      <Flame size={10}/> Habilidades Litúrgicas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                          <input 
                              type="checkbox" 
                              checked={form.manuseia_missal} 
                              onChange={e => setForm({...form, manuseia_missal: e.target.checked})}
                              className="accent-orange-500"
                          />
                          <span className="text-xs text-zinc-300">Manuseia Missal</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                          <input 
                              type="checkbox" 
                              checked={form.manuseia_turibulo} 
                              onChange={e => setForm({...form, manuseia_turibulo: e.target.checked})}
                              className="accent-orange-500"
                          />
                          <span className="text-xs text-zinc-300">Manuseia Turíbulo</span>
                      </div>
                  </div>
              </div>

              {/* SEÇÃO DE PERMISSÕES - EXCLUSIVO PARA ADMIN */}
              {userRole === 'admin' && (
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 animate-in fade-in">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <LockKeyhole size={10}/> Permissões de Acesso (Admin)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                          {MODULES.map(mod => (
                              <div key={mod.id} className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                                  <input 
                                      type="checkbox" 
                                      checked={form.acessos.includes(mod.id)} 
                                      onChange={() => toggleAccess(mod.id)}
                                      className="accent-emerald-500"
                                  />
                                  <span className="text-xs text-zinc-300">{mod.label}</span>
                              </div>
                          ))}
                      </div>
                      <p className="text-[10px] text-zinc-600">*Administradores têm acesso total por padrão.</p>
                  </div>
              )}

              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Endereço (Opcional)</span>
                <div className="flex gap-3">
                    <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">Rua</label><input type="text" value={form.rua} onChange={e => setForm({...form, rua: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm" placeholder="Rua" /></div>
                    <div className="w-20"><label className="block text-xs font-bold text-gray-500 mb-1">Nº</label><input type="text" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm" placeholder="123" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Bairro</label><input type="text" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm" placeholder="Bairro" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Comp.</label><input type="text" value={form.complemento} onChange={e => setForm({...form, complemento: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm" placeholder="..." /></div>
                </div>
              </div>

              <button onClick={handleSave} className={`w-full py-3 rounded-xl font-bold mt-2 flex justify-center gap-2 transition active:scale-95 ${editingId ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-blue-600 hover:bg-blue-700'}`}>{editingId ? <><Edit2 size={18} /> Atualizar</> : <><Save size={18} /> Salvar</>}</button>
            </div>
          </div>
        </div>

        <div className="space-y-4 order-2">
          <h2 className="text-xl font-bold px-2">Equipe ({acolitos.length})</h2>
          {loading ? <div className="text-center text-gray-500">Carregando...</div> : 
           acolitos.length === 0 ? <div className="text-center text-gray-500 border border-dashed border-zinc-800 p-8 rounded-2xl">Nenhum acólito encontrado.</div> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {acolitos.map((acolito) => (
                <div key={acolito.id} onClick={() => handleEdit(acolito)} className={`bg-zinc-900 p-4 rounded-2xl border transition cursor-pointer hover:scale-[1.02] hover:shadow-xl ${editingId === acolito.id ? 'border-blue-500 ring-2 ring-blue-500/20' : acolito.ativo ? 'border-zinc-800 hover:border-zinc-700' : 'border-yellow-900/30 opacity-75'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${acolito.ativo ? 'bg-blue-600' : 'bg-zinc-700'}`}>{acolito.nome?.substring(0,2).toUpperCase()}</div>
                    <div className="flex gap-1">
                        <button onClick={(e) => toggleStatus(e, acolito.id, acolito.ativo)} className={`p-1.5 rounded-full z-10 hover:bg-zinc-800 ${acolito.ativo ? 'text-green-500' : 'text-yellow-500'}`}>{acolito.ativo ? <CheckCircle size={20}/> : <XCircle size={20}/>}</button>
                        {userRole === 'admin' && <button onClick={(e) => handleDelete(e, acolito.id)} className="p-1.5 text-zinc-600 hover:text-red-500 z-10 hover:bg-zinc-800"><Trash2 size={18}/></button>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold truncate text-white flex items-center gap-2">{acolito.nome} {acolito.sobrenome} {acolito.genero === 'F' && <span className="text-[10px] text-pink-400 bg-pink-900/30 px-1 rounded">F</span>}</h3>
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] font-mono bg-zinc-800 px-2 rounded text-zinc-400">@{acolito.usuario}</span>
                        {acolito.apenas_fim_de_semana && <span className="text-[9px] font-bold bg-zinc-800 text-yellow-500 px-2 rounded border border-yellow-900/30 flex items-center gap-1"><CalendarClock size={10}/> FDS</span>}
                        {acolito.parceiro_id && <span className="text-[9px] font-bold bg-pink-900/30 text-pink-400 px-2 rounded border border-pink-900/50 flex items-center gap-1"><Heart size={10}/> Dupla</span>}
                        
                        {/* ÍCONES DAS HABILIDADES */}
                        {acolito.manuseia_missal && <span className="text-[9px] font-bold bg-blue-900/30 text-blue-400 px-2 rounded border border-blue-900/50 flex items-center gap-1" title="Missal"><BookOpen size={10}/> M</span>}
                        {acolito.manuseia_turibulo && <span className="text-[9px] font-bold bg-orange-900/30 text-orange-400 px-2 rounded border border-orange-900/50 flex items-center gap-1" title="Turíbulo"><Flame size={10}/> T</span>}

                        {acolito.acessos && acolito.acessos.length > 0 && <span className="text-[9px] font-bold bg-emerald-900/30 text-emerald-400 px-2 rounded border border-emerald-900/50 flex items-center gap-1"><LockKeyhole size={10}/> +{acolito.acessos.length}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}