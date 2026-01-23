'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase' 
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Wallet, TrendingDown, Plus, Trash2, DollarSign } from 'lucide-react'

interface Despesa {
    id: string;
    descricao: string;
    valor: number;
}

export default function FinanceiroPage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7)) 
  const [saldoInicial, setSaldoInicial] = useState<string>('') 
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [novaDespesaDesc, setNovaDespesaDesc] = useState('')
  const [novaDespesaValor, setNovaDespesaValor] = useState('')

  useEffect(() => { setTheme('dark'); checkPermission() }, [])
  useEffect(() => { fetchDadosMensais() }, [mesReferencia])

  const checkPermission = () => {
    const authData = localStorage.getItem('auth_token')
    if (!authData) { router.push('/login'); return }
    try {
        const user = JSON.parse(authData)
        if (user.perfil !== 'admin' && user.perfil !== 'diretoria') {
            alert("Acesso restrito à Diretoria."); router.push('/')
        }
    } catch (e) { router.push('/login') }
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
      } catch (error) { console.log("Novo mês.") } finally { setLoading(false) }
  }

  const valorInicialNum = parseFloat(saldoInicial.replace(',', '.')) || 0
  const totalDespesas = useMemo(() => despesas.reduce((acc, curr) => acc + curr.valor, 0), [despesas])
  const saldoFinal = valorInicialNum - totalDespesas

  const addDespesa = () => {
      if (!novaDespesaDesc || !novaDespesaValor) return alert("Preencha descrição e valor")
      const valor = parseFloat(novaDespesaValor.replace(',', '.'))
      if (isNaN(valor) || valor <= 0) return alert("Valor inválido")
      const nova: Despesa = { id: Date.now().toString(), descricao: novaDespesaDesc, valor }
      setDespesas([...despesas, nova]); setNovaDespesaDesc(''); setNovaDespesaValor('')
  }

  const removeDespesa = (id: string) => { setDespesas(despesas.filter(d => d.id !== id)) }

  const handleSave = async () => {
      try {
          const payload = { mes_referencia: mesReferencia, saldo_inicial: valorInicialNum, despesas }
          const { error } = await supabase.from('financeiro').upsert(payload, { onConflict: 'mes_referencia' })
          if (error) throw error
          alert("Salvo com sucesso!")
      } catch (error: any) { alert("Erro ao salvar: " + error.message) }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-10">
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft size={20} /></Link>
          <h1 className="text-sm md:text-lg font-bold uppercase truncate text-emerald-500 flex items-center gap-2"><DollarSign size={18}/> Prestação de Contas</h1>
        </div>
        <input type="month" value={mesReferencia} onChange={e => setMesReferencia(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-white text-xs rounded-lg p-2 outline-none focus:border-emerald-500 w-36 text-center" style={{colorScheme: 'dark'}}/>
      </header>

      <main className="pt-24 px-4 max-w-2xl mx-auto space-y-6"> {/* max-w-2xl limita a largura */}
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Wallet size={20} /><h2 className="text-sm font-bold uppercase tracking-wide">Valor em Caixa</h2>
            </div>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-emerald-500 transition-colors h-14">
                <div className="bg-zinc-900 px-4 h-full flex items-center border-r border-zinc-800"><span className="text-emerald-500 font-bold text-lg">R$</span></div>
                <input type="number" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} className="w-full bg-transparent px-4 h-full text-xl font-bold text-white outline-none placeholder-zinc-700" placeholder="0.00"/>
            </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-red-400">
                <TrendingDown size={20} /><h3 className="text-sm font-bold uppercase tracking-wide">Nova Despesa</h3>
            </div>
            <div className="flex flex-col gap-3">
                <input type="text" placeholder="Descrição (Ex: Velas...)" value={novaDespesaDesc} onChange={e => setNovaDespesaDesc(e.target.value)} className="w-full h-12 bg-zinc-950 border border-zinc-800 px-4 rounded-xl text-sm outline-none focus:border-red-500/50 transition text-white"/>
                <div className="flex gap-2 h-12">
                    <div className="flex items-center flex-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-red-500/50 transition-colors">
                        <div className="bg-zinc-900 px-3 h-full flex items-center border-r border-zinc-800"><span className="text-zinc-500 font-bold text-xs">R$</span></div>
                        <input type="number" placeholder="0.00" value={novaDespesaValor} onChange={e => setNovaDespesaValor(e.target.value)} className="w-full h-full bg-transparent px-3 text-sm outline-none text-white font-medium"/>
                    </div>
                    <button onClick={addDespesa} className="h-12 w-14 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center transition shadow-lg shadow-red-900/20 active:scale-95 shrink-0"><Plus size={24}/></button>
                </div>
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex justify-between items-center px-1"><h4 className="text-xs font-bold text-zinc-500 uppercase">Histórico do Mês</h4><span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">{despesas.length} itens</span></div>
            {despesas.length === 0 ? <div className="text-center py-10 border-2 border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/30"><p className="text-zinc-600 text-sm">Nenhuma despesa lançada.</p></div> : 
             <div className="space-y-2">{despesas.map((d, i) => (
                <div key={d.id} className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition">
                    <div className="flex items-center gap-3 overflow-hidden"><span className="text-zinc-600 font-mono text-xs w-6 shrink-0">#{i+1}</span><span className="text-sm font-medium text-zinc-200 truncate">{d.descricao}</span></div>
                    <div className="flex items-center gap-4 shrink-0 pl-2"><span className="text-sm text-red-400 font-bold whitespace-nowrap">- {formatCurrency(d.valor)}</span><button onClick={() => removeDespesa(d.id)} className="text-zinc-600 hover:text-red-500 transition p-1"><Trash2 size={18}/></button></div>
                </div>
             ))}</div>
            }
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Resumo Financeiro</h3>
            <div className="flex justify-between items-center text-sm"><span className="text-zinc-400">Total em Caixa</span><span className="text-emerald-400 font-mono text-base">{formatCurrency(valorInicialNum)}</span></div>
            <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-4"><span className="text-zinc-400">Total Despesas</span><span className="text-red-400 font-mono text-base">- {formatCurrency(totalDespesas)}</span></div>
            <div className="flex justify-between items-end pt-2"><span className="text-white font-bold text-sm uppercase tracking-wider">Saldo Final</span><span className={`text-3xl font-bold ${saldoFinal >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{formatCurrency(saldoFinal)}</span></div>
        </div>

        <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4"><Save size={20}/> Salvar Dados</button>
      </main>
    </div>
  )
}