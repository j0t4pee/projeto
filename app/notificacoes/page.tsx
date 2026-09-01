'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import MainLayout from '@/app/components/MainLayout'
import { 
  Send, Bell, CheckCircle2, Eye, RefreshCw, 
  ShieldAlert, AlertCircle, Info, X
} from 'lucide-react'

interface StatNotificacao {
  id: string
  titulo: string
  mensagem: string
  enviadas: number
  entregues: number
  lidas: number
  dataEnvio: string
}

interface AlertState {
  isOpen: boolean; type: 'error' | 'success' | 'warning' | 'info';
  title: string; message: string;
}

export default function NotificacoesPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userProfile, setUserProfile] = useState('padrao')
  
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [historico, setHistorico] = useState<StatNotificacao[]>([])

  const [customAlert, setCustomAlert] = useState<AlertState>({
    isOpen: false, type: 'info', title: '', message: ''
  })

  useEffect(() => {
    setMounted(true)
    const authData = localStorage.getItem('auth_token')
    
    if (!authData) { 
        router.push('/login'); 
        return 
    }

    try {
        const user = JSON.parse(authData)
        if (user.perfil === 'padrao') {
            router.push('/')
            return
        }
        setUserProfile(user.perfil)
        fetchEstatisticas()
    } catch (e) { 
        router.push('/login') 
    }
  }, [router])

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
    setCustomAlert({ isOpen: true, title, message, type })
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const fetchEstatisticas = async () => {
    try {
      const q = query(collection(db, 'notificacoes_stats'), orderBy('dataEnvio', 'desc'), limit(10))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as StatNotificacao[]
      setHistorico(list)
    } catch (e) {
      triggerAlert("Erro", "Falha ao carregar o histórico de notificações.", "error")
    }
  }

  const handleDisparar = async () => {
    if (!titulo || !mensagem) {
        triggerAlert("Atenção", "Preencha o título e a mensagem antes de enviar.", "warning")
        return
    }
    
    setLoading(true)

    try {
      const acolitosSnap = await getDocs(collection(db, 'acolitos'))
      const tokens = acolitosSnap.docs
        .map(d => d.data().fcm_token)
        .filter(t => Boolean(t))

      if (tokens.length === 0) {
          triggerAlert("Aviso", "Nenhum acólito ativou as notificações no aparelho ainda.", "warning")
          setLoading(false)
          return
      }

      await addDoc(collection(db, 'notificacoes_stats'), {
        titulo,
        mensagem,
        enviadas: tokens.length,
        entregues: 0,
        lidas: 0,
        dataEnvio: new Date().toISOString()
      })

      setTitulo('')
      setMensagem('')
      fetchEstatisticas()
      triggerAlert("Sucesso", `Notificação disparada para ${tokens.length} aparelhos!`, "success")
      
    } catch (e: any) {
      triggerAlert("Erro", "Erro ao disparar notificação: " + e.message, "error")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <>
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
                      {customAlert.type === 'warning' && <ShieldAlert size={28}/>}
                      {customAlert.type === 'info' && <Info size={28}/>}
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{customAlert.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{customAlert.message}</p>
                  </div>
                  <div className="pt-2">
                      <button onClick={() => setCustomAlert({...customAlert, isOpen: false})} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-xl transition">Entendi</button>
                  </div>
              </div>
          </div>
      )}

      <MainLayout userProfile={userProfile} onLogout={handleLogout}>
        <main className="px-4 py-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 animate-in fade-in duration-500">
          
          <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Bell className="text-blue-600" size={28}/> 
                  Central de Notificações
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                  Envie avisos gerais para a equipe e acompanhe as métricas de leitura.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-8">
              <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Send size={18} className="text-blue-600"/> Disparar Novo Aviso
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Título da Notificação</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Reunião Geral de Acólitos"
                    value={titulo}
                    onChange={e => setTitulo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-600 transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Mensagem</label>
                  <textarea 
                    placeholder="Escreva os detalhes do aviso aqui..."
                    value={mensagem}
                    rows={4}
                    onChange={e => setMensagem(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm text-gray-900 outline-none focus:bg-white focus:border-blue-600 transition shadow-sm resize-none"
                  />
                </div>

                <button 
                  onClick={handleDisparar}
                  disabled={loading || !titulo || !mensagem}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-medium py-4 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 text-sm mt-4 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : <><Send size={18}/> Enviar para Todos os Aparelhos</>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white border border-gray-200 p-5 rounded-3xl shadow-sm">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Disparos</span>
                <button onClick={fetchEstatisticas} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-medium transition bg-blue-50 px-3 py-1.5 rounded-lg">
                  <RefreshCw size={14}/> Atualizar
                </button>
              </div>

              {historico.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-gray-200 rounded-3xl shadow-sm">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                          <Bell size={28} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700">Nenhum aviso enviado</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">Os relatórios de leitura aparecerão aqui.</p>
                  </div>
              ) : (
                <div className="space-y-4">
                  {historico.map(stat => {
                    const pctEntregue = stat.enviadas > 0 ? Math.round((stat.entregues / stat.enviadas) * 100) : 0
                    const pctLido = stat.entregues > 0 ? Math.round((stat.lidas / stat.entregues) * 100) : 0

                    return (
                      <div key={stat.id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm transition hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div className="pr-4">
                            <h4 className="font-bold text-base text-gray-900 leading-tight mb-1">{stat.titulo}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2">{stat.mensagem}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0 border border-gray-100">
                            {new Date(stat.dataEnvio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                          <div className="bg-gray-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Enviadas</span>
                            <span className="text-lg font-black text-gray-800">{stat.enviadas || 0}</span>
                          </div>

                          <div className="bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                            <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                              <CheckCircle2 size={12}/> Entregues
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-blue-700">{stat.entregues || 0}</span>
                                <span className="text-[10px] font-bold text-blue-500">{pctEntregue}%</span>
                            </div>
                          </div>

                          <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col items-center justify-center border border-emerald-100">
                            <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                              <Eye size={12}/> Lidas
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-emerald-700">{stat.lidas || 0}</span>
                                <span className="text-[10px] font-bold text-emerald-500">{pctLido}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
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