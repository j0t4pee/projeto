'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase' 
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, FileText, Calendar, Edit2, X, ClipboardList } from 'lucide-react'

export default function AtasPage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [atas, setAtas] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    data_reuniao: '',
    conteudo: ''
  })

  useEffect(() => {
    setTheme('dark')
    const authData = localStorage.getItem('auth_token')
    
    if (!authData) {
        router.push('/login')
        return
    }
    
    try {
        const user = JSON.parse(authData)
        if (user.perfil === 'padrao') {
            alert("Acesso restrito à Diretoria.")
            router.push('/')
            return
        }
    } catch (e) {
        router.push('/login')
    }

    fetchAtas()
  }, [])

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
    if (!form.titulo || !form.data_reuniao) return alert('Título e Data são obrigatórios')

    try {
        if (editingId) {
            const { error } = await supabase.from('atas').update(form).eq('id', editingId)
            if (error) throw error
            alert('Ata atualizada com sucesso!')
        } else {
            const { error } = await supabase.from('atas').insert([form])
            if (error) throw error
            alert('Ata registrada com sucesso!')
        }
        handleCancelEdit()
        fetchAtas()
    } catch (error: any) {
        alert('Erro ao salvar: ' + error.message)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return
    try {
        const { error } = await supabase.from('atas').delete().eq('id', id)
        if (error) throw error
        fetchAtas()
    } catch (error: any) {
        alert('Erro: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-[Arial,Helvetica,sans-serif]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold uppercase">Livro de Atas</h1>
        </div>
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center font-bold shadow-lg shrink-0 text-sm">AT</div>
      </header>

      <main className="pt-24 pb-10 px-4 max-w-[1200px] mx-auto flex flex-col md:grid md:grid-cols-[1fr_1fr] gap-8">
        
        <div className="h-fit space-y-6 order-1">
          <div className={`p-6 rounded-[2rem] border shadow-xl transition-colors ${editingId ? 'bg-zinc-900 border-purple-900/50 ring-1 ring-purple-900' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {editingId ? (<><Edit2 size={20} className="text-yellow-500" /> Editar Registro</>) : (<><FileText size={20} className="text-purple-500" /> Nova Ata</>)}
                </h2>
                {editingId && (
                    <button onClick={handleCancelEdit} className="text-xs font-bold text-red-400 hover:bg-red-900/20 px-3 py-1 rounded-lg transition flex items-center gap-1"><X size={14} /> Cancelar</button>
                )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Título da Reunião</label>
                <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-purple-600 outline-none transition" placeholder="Ex: Reunião Mensal de Planejamento" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Data</label>
                <input type="date" value={form.data_reuniao} onChange={e => setForm({...form, data_reuniao: e.target.value})} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-purple-600 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Conteúdo / Pauta</label>
                <textarea 
                    value={form.conteudo} 
                    onChange={e => setForm({...form, conteudo: e.target.value})} 
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-purple-600 outline-none transition h-48 resize-none text-sm leading-relaxed"
                    placeholder="Descreva o que foi discutido e decidido..."
                />
              </div>
              <button onClick={handleSave} className={`w-full py-3 rounded-xl font-bold mt-2 flex justify-center gap-2 transition active:scale-95 ${editingId ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                {editingId ? <><Edit2 size={18} /> Atualizar Ata</> : <><Save size={18} /> Salvar Registro</>}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 order-2">
          <h2 className="text-xl font-bold px-2 flex items-center gap-2"><ClipboardList size={20}/> Histórico ({atas.length})</h2>
          
          {loading ? <div className="text-center text-gray-500">Carregando...</div> : 
           atas.length === 0 ? <div className="text-center text-gray-500 border border-dashed border-zinc-800 p-8 rounded-2xl">Nenhuma ata registrada.</div> : (
            <div className="space-y-3">
              {atas.map((ata) => (
                <div key={ata.id} className={`bg-zinc-900 p-5 rounded-2xl border border-zinc-800 transition hover:border-zinc-700 ${editingId === ata.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-white text-lg break-words">{ata.titulo}</h3>
                        <div className="flex items-center gap-2 text-xs text-purple-400 font-bold mt-1 uppercase tracking-wide">
                            <Calendar size={12} />
                            {new Date(ata.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleEdit(ata)} className="p-2 bg-zinc-800 hover:bg-blue-900/30 text-zinc-400 hover:text-blue-400 rounded-lg transition"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(ata.id)} className="p-2 bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 rounded-lg transition"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  {/* CORREÇÃO DO TEXTO INFINITO: break-all e whitespace-pre-wrap */}
                  <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap break-all bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                    {ata.conteudo}
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