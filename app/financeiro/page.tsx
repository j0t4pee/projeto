'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, X, LogOut, Users, DollarSign, ClipboardList, Settings, ChevronLeft,
  Save, Wallet, TrendingDown, Plus, Trash2, CheckCircle2, AlertCircle, AlertTriangle
} from 'lucide-react'

// Constante de Versão
const APP_VERSION = "v3.87.0-ui-folder-light" 

interface Despesa {
    id: string;
    descricao: string;
    valor: number;
}

interface AlertState {
    isOpen: boolean;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('padrao')
  
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7)) 
  const [saldoInicial, setSaldoInicial] = useState<string>('') 
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [novaDespesaDesc, setNovaDespesaDesc] = useState('')
  const [novaDespesaValor, setNovaDespesaValor] = useState('')

  const [customAlert, setCustomAlert] = useState<AlertState>({
      isOpen: false, type: 'success', title: '', message: ''
  })

  useEffect(() => { 
      setMounted(true)
      checkPermission() 
  }, [])

  useEffect(() => { 
      if (mounted) fetchDadosMensais() 
  }, [mesReferencia, mounted])

  const checkPermission = () => {
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    try {
        const user = JSON.parse(authData)
        setUserRole(user.perfil || 'padrao')
        if (user.perfil !== 'admin' && user.perfil !== 'diretoria') {
            router.push('/') // Redireciona silenciosamente se não tiver acesso
        }
    } catch (e) { router.push('/login') }
  }

  const triggerAlert = (title: string, message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
      setCustomAlert({ isOpen: true, title, message, type })
  }
  const closeAlert = () => setCustomAlert({ ...customAlert, isOpen: false })

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  async function fetchDadosMensais() {
      setLoading(true)
      try {
          const { data } = await supabase.from('financeiro').select('*').eq('mes_referencia', mesReferencia).single()
          if (data) {
              setSaldoInicial(data.saldo_inicial ? data.saldo_inicial.toString() : '')
              setDespesas(data.despesas || [])
          } else {
              setSaldoInicial(''); setDespesas([])
          }
      } catch (error) { 
          // Silencioso, pois apenas significa que é um novo mês sem dados
      } finally { setLoading(false) }
  }

  const valorInicialNum = parseFloat(saldoInicial.replace(',', '.')) || 0
  const totalDespesas = useMemo(() => despesas.reduce((acc, curr) => acc + curr.valor, 0), [despesas])
  const saldoFinal = valorInicialNum - totalDespesas

  const addDespesa = () => {
      if (!novaDespesaDesc || !novaDespesaValor) return triggerAlert("Atenção", "Preencha a descrição e o valor da despesa.", "warning")
      const valor = parseFloat(novaDespesaValor.replace(',', '.'))
      if (isNaN(valor) || valor <= 0) return triggerAlert("Erro", "Valor inválido inserido.", "error")
      const nova: Despesa = { id: Date.now().toString(), descricao: novaDespesaDesc, valor }
      setDespesas([...despesas, nova]); setNovaDespesaDesc(''); setNovaDespesaValor('')
  }

  const removeDespesa = (id: string) => { setDespesas(despesas.filter(d => d.id !== id)) }

  const handleSave = async () => {
      try {
          const payload = { mes_referencia: mesReferencia, saldo_inicial: valorInicialNum, despesas }
          const { error } = await supabase.from('financeiro').upsert(payload, { onConflict: 'mes_referencia' })
          if (error) throw error
          triggerAlert("Sucesso", "Dados financeiros salvos com sucesso!", "success")
      } catch (error: any) { triggerAlert("Erro ao salvar", error.message, "error") }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const canManage = userRole === 'admin' || userRole === 'diretoria';

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 lg:pb-0 selection:bg-emerald-500/30">
      
      {/* Alertas */}
      {customAlert.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      customAlert.type === 'error' ? 'bg-red-50 text-red-500' : 
                      customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
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

                  <button onClick={closeAlert} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition">Entendi</button>
              </div>
          </div>
      )}

      {/* Header Mobile Opcional */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 px-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 p-1 -ml-1"><Menu size={24}/></button>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md">JP</div>
            <h1 className="text-sm font-bold text-gray-900">Financeiro</h1>
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
                    <Link href="/financeiro" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium transition">
                        <DollarSign size={18}/> Financeiro
                    </Link>
                    <Link href="/atas" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition">
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
      <main className="flex-1 lg:ml-64 px-4 py-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8">
        
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                    <DollarSign size={24} className="text-emerald-600"/> Prestação de Contas
                </h2>
                <p className="text-sm text-gray-500 font-medium">Controle de caixa e despesas mensais</p>
            </div>
            
            <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Mês de Referência:</label>
                <input 
                    type="month" 
                    value={mesReferencia} 
                    onChange={e => setMesReferencia(e.target.value)} 
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm" 
                />
            </div>
        </div>

        {loading ? (
             <div className="text-center py-20 text-gray-400 animate-pulse font-medium">Carregando dados financeiros...</div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Coluna Esquerda: Inputs */}
                <div className="space-y-6">
                    {/* Valor em Caixa */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-emerald-600">
                            <Wallet size={20} /><h2 className="text-sm font-bold uppercase tracking-wide">Valor em Caixa (Entradas)</h2>
                        </div>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all h-14">
                            <div className="bg-gray-100 px-4 h-full flex items-center border-r border-gray-200">
                                <span className="text-emerald-600 font-bold text-lg">R$</span>
                            </div>
                            <input 
                                type="number" 
                                value={saldoInicial} 
                                onChange={e => setSaldoInicial(e.target.value)} 
                                className="w-full bg-transparent px-4 h-full text-xl font-bold text-gray-900 outline-none placeholder-gray-400" 
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Nova Despesa */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-red-600">
                            <TrendingDown size={20} /><h3 className="text-sm font-bold uppercase tracking-wide">Lançar Nova Despesa</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                placeholder="Descrição (Ex: Compra de velas...)" 
                                value={novaDespesaDesc} 
                                onChange={e => setNovaDespesaDesc(e.target.value)} 
                                className="w-full h-12 bg-gray-50 border border-gray-200 px-4 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition text-gray-900"
                            />
                            <div className="flex gap-3 h-12">
                                <div className="flex items-center flex-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition-all">
                                    <div className="bg-gray-100 px-3 h-full flex items-center border-r border-gray-200">
                                        <span className="text-gray-500 font-bold text-xs">R$</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={novaDespesaValor} 
                                        onChange={e => setNovaDespesaValor(e.target.value)} 
                                        className="w-full h-full bg-transparent px-3 text-sm outline-none text-gray-900 font-medium"
                                    />
                                </div>
                                <button onClick={addDespesa} className="h-12 w-14 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition shadow-md shadow-red-600/20 active:scale-95 shrink-0">
                                    <Plus size={24}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Resumo e Histórico */}
                <div className="space-y-6 flex flex-col h-full">
                    
                    {/* Resumo Financeiro */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Wallet size={14}/> Resumo Financeiro
                        </h3>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Total em Caixa</span>
                            <span className="text-emerald-600 font-mono font-bold text-base">{formatCurrency(valorInicialNum)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-4">
                            <span className="text-gray-600 font-medium">Total Despesas</span>
                            <span className="text-red-600 font-mono font-bold text-base">- {formatCurrency(totalDespesas)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-gray-900 font-black text-sm uppercase tracking-wider">Saldo Final</span>
                            <span className={`text-3xl font-black tracking-tight ${saldoFinal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(saldoFinal)}
                            </span>
                        </div>
                    </div>

                    {/* Histórico do Mês */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><ClipboardList size={14}/> Histórico do Mês</h4>
                            <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-full">{despesas.length} itens</span>
                        </div>
                        
                        {despesas.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 min-h-[150px]">
                                <p className="text-gray-400 text-sm font-medium">Nenhuma despesa lançada neste mês.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {despesas.map((d, i) => (
                                    <div key={d.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="text-gray-400 font-mono font-bold text-xs w-6 shrink-0">#{i+1}</span>
                                            <span className="text-sm font-bold text-gray-700 truncate">{d.descricao}</span>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 pl-2">
                                            <span className="text-sm text-red-600 font-bold whitespace-nowrap">- {formatCurrency(d.valor)}</span>
                                            <button onClick={() => removeDespesa(d.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition p-1.5 rounded-lg opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )}

        <div className="mt-8">
            <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2">
                <Save size={20}/> Salvar Fechamento do Mês
            </button>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  )
}