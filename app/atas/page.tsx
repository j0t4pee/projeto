'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, X, LogOut, Users, DollarSign, ClipboardList, Settings, ChevronLeft,
  ArrowLeft, Save, Trash2, FileText, Calendar, Edit2, 
  CheckCircle2, AlertCircle, AlertTriangle
} from 'lucide-react'

// Constante de Versão
const APP_VERSION = "v3.87.0-ui-folder-light" 

interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
}

export default function AtasPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('padrao')
  const [atas, setAtas] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    data_reuniao: '',
    conteudo: ''
  })

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'success', title: '', message: ''
  })

  useEffect(() => {
    setMounted(true)
    checkPermission()
  }, [])

  const checkPermission = () => {
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil || 'padrao')
        // Restringe o acesso apenas para diretoria e admin
        if (user.perfil === 'padrao') {
            router.push('/')
        } else {
            fetchAtas()
        }
    } catch (e) { router.push('/login') }
  }

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
  const closeAlert = () => setCustomAlert({ ...customAlert, isOpen: false, onConfirm: undefined })

  async function fetchAtas() {
    setLoading(true)
    try {
        const { data, error } = await supabase
          .from('atas')
          .select('*')
          .order('data_reuniao', { ascending: false })
        
        if (error) throw error
        if (data) setAtas(data)
    } catch (error) {
        console.error(error)
    } finally {
        setLoading(false)
    }
  }

  function handleEdit(ata: any) {
    setEditingId(ata.id)
    setForm({
        titulo: ata.titulo || '',
        data_reuniao: ata.data_reuniao || '',
        conteudo: ata.conteudo || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm({ titulo: '', data_reuniao: '', conteudo: '' })
  }

  async function handleSave() {
    if (!form.titulo || !form.data_reuniao) return triggerAlert('Atenção', 'Título e Data são obrigatórios.', 'warning')

    try {
        if (editingId) {
            const { error } = await supabase.from('atas').update(form).eq('id', editingId)
            if (error) throw error
            triggerAlert('Sucesso', 'Ata atualizada com sucesso!', 'success')
        } else {
            const { error } = await supabase.from('atas').insert([form])
            if (error) throw error
            triggerAlert('Sucesso', 'Ata registrada com sucesso!', 'success')
        }
        handleCancelEdit()
        fetchAtas()
    } catch (error: any) {
        triggerAlert('Erro ao salvar', error.message, 'error')
    }
  }

  function handleDelete(id: number) {
    triggerConfirm('Excluir Registro?', 'Tem certeza que deseja apagar esta ata permanentemente?', async () => {
        try {
            const { error } = await supabase.from('atas').delete().eq('id', id)
            if (error) throw error
            fetchAtas()
            triggerAlert('Excluída', 'Ata apagada com sucesso.', 'success')
        } catch (error: any) {
            triggerAlert('Erro', error.message, 'error')
        }
    })
  }

  const canManage = userRole === 'admin' || userRole === 'diretoria';

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 lg:pb-0 selection:bg-purple-500/30">
      
      {/* Alertas */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      customAlert.type === 'error' ? 'bg-red-50 text-red-500' : 
                      customAlert.type === 'success' ? 'bg-green-50 text-green-500' : 
                      customAlert.type === 'warning' ? 'bg-yellow-50 text-yellow-600' : 
                      'bg-purple-50 text-purple-600'
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
                              <button onClick={() => { if(customAlert.onConfirm) customAlert.onConfirm(); closeAlert(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition">Sim, apagar</button>
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
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md">AT</div>
            <h1 className="text-sm font-bold text-gray-900">Livro de Atas</h1>
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
                     <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 block">{userRole === 'admin' ? 'Admin' : 'Diretoria'}</span>
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
                    <Link href="/atas" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-medium transition">
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
                    <ClipboardList size={24} className="text-purple-600"/> Livro de Atas
                </h2>
                <p className="text-sm text-gray-500 font-medium">Registro de reuniões e decisões da equipe</p>
            </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 items-start">
            
            {/* Coluna Esquerda: Formulário */}
            <div className="w-full space-y-6 lg:sticky lg:top-8 order-1">
                <div className={`p-6 rounded-3xl border shadow-sm transition-colors ${editingId ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                            {editingId ? (<><Edit2 size={20} className="text-blue-600" /> Editar Registro</>) : (<><FileText size={20} className="text-purple-600" /> Nova Ata</>)}
                        </h2>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1 border border-transparent hover:border-red-100"><X size={14} /> Cancelar</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Título da Reunião</label>
                            <input 
                                type="text" 
                                value={form.titulo} 
                                onChange={e => setForm({...form, titulo: e.target.value})} 
                                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:bg-white text-gray-900 outline-none transition" 
                                placeholder="Ex: Reunião Mensal de Planejamento" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Data</label>
                            <input 
                                type="date" 
                                value={form.data_reuniao} 
                                onChange={e => setForm({...form, data_reuniao: e.target.value})} 
                                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:bg-white text-gray-900 outline-none transition" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Conteúdo / Pauta</label>
                            <textarea 
                                value={form.conteudo} 
                                onChange={e => setForm({...form, conteudo: e.target.value})} 
                                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:bg-white text-gray-900 outline-none transition h-56 resize-none text-sm leading-relaxed custom-scrollbar"
                                placeholder="Descreva os tópicos discutidos e as decisões tomadas..."
                            />
                        </div>
                        <button onClick={handleSave} className={`w-full py-3.5 rounded-xl font-bold mt-2 flex justify-center items-center gap-2 transition active:scale-95 shadow-md ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'}`}>
                            {editingId ? <><Edit2 size={18} /> Atualizar Ata</> : <><Save size={18} /> Salvar Registro</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna Direita: Histórico */}
            <div className="w-full space-y-4 order-2">
                <div className="flex items-center justify-between px-1 mb-2">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-gray-500 uppercase tracking-widest"><ClipboardList size={16}/> Histórico Registrado</h2>
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{atas.length} ATAS</span>
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-gray-400 animate-pulse font-medium">Carregando atas...</div>
                ) : atas.length === 0 ? (
                    <div className="text-center text-gray-400 border-2 border-dashed border-gray-200 bg-gray-50 p-10 rounded-3xl">Nenhuma ata registrada no sistema.</div>
                ) : (
                    <div className="space-y-4">
                        {atas.map((ata) => (
                            <div key={ata.id} className={`bg-white p-5 rounded-2xl border transition-all shadow-sm ${editingId === ata.id ? 'border-blue-300 ring-2 ring-blue-100 opacity-60' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="pr-4">
                                        <h3 className="font-bold text-gray-900 text-base break-words leading-tight">{ata.titulo}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold mt-1.5 uppercase tracking-wide">
                                            <Calendar size={14} />
                                            {new Date(ata.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                        <button onClick={() => handleEdit(ata)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(ata.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                
                                {/* Exibição do texto mantendo formatação e quebras de linha */}
                                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-all bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {ata.conteudo}
                                </div>
                            </div>
                        ))}
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
    </div>
  )
}