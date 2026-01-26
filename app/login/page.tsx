'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { Lock, AtSign, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    usuario: '',
    password: ''
  })

  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s/g, '')
    setForm({ ...form, usuario: value })
  }

  // --- SUPORTE A TECLA ENTER ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleLogin()
    }
  }

  const handleLogin = async () => {
    if (!form.usuario || !form.password) {
        setError('Preencha usuário e senha.')
        return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('acolitos')
        .select('*')
        .eq('usuario', form.usuario)
        .eq('senha', form.password)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        throw new Error('Usuário ou senha incorretos.')
      }

      // --- TRAVA DE SEGURANÇA: APENAS DIRETORIA (E ADMIN) ---
      // Se o usuário não for diretoria nem admin, barra o acesso.
      if (data.perfil !== 'diretoria' && data.perfil !== 'admin') {
          throw new Error('Acesso restrito. Este portal é exclusivo para a Diretoria.')
      }

      localStorage.setItem('auth_token', JSON.stringify(data))
      window.location.href = '/'

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans p-4" onKeyDown={handleKeyDown}>
      <div className="w-full max-w-md bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden">
        
        <div className="bg-zinc-800/50 p-8 text-center border-b border-zinc-800">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Acesso Restrito
          </h1>
          <p className="text-gray-400 text-sm mt-2">Área Administrativa / Diretoria</p>
                    <p className="text-gray-400 text-sm mt-2">Caso não tenha se cadastrado, procure a diretoria.</p>

        </div>

        <div className="p-8 space-y-4">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Usuário
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={form.usuario}
                onChange={handleUsuarioChange}
                className="w-full p-4 pl-12 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-blue-400 font-medium lowercase"
                placeholder="ex: joao.silva"
              />
              <AtSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Senha
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full p-4 pl-12 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white"
                placeholder="••••••••"
              />
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
            </div>
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? 'Verificando...' : 'Acessar Sistema'}
            {!loading && <ArrowRight size={20} />}
          </button>

        </div>
      </div>
    </div>
  )
}