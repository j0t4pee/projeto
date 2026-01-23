'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import { Lock, User, AtSign, MapPin, ArrowRight, UserPlus, Phone } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    usuario: '',
    phone: '',
    password: '',
    nome: '',
    data_nascimento: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: ''
  })

  // MÁSCARA DE TELEFONE
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "")
    if (v.length > 11) v = v.slice(0, 11)

    if (v.length > 10) {
        v = v.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3")
    } else if (v.length > 5) {
        v = v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3")
    } else if (v.length > 2) {
        v = v.replace(/^(\d\d)(\d{0,5})/, "($1) $2")
    }
    
    setForm({ ...form, phone: v })
  }

  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s/g, '')
    setForm({ ...form, usuario: value })
  }

  // --- SUPORTE A TECLA ENTER ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (mode === 'login') handleLogin()
        else handleSignup()
    }
  }

  const handleLogin = async () => {
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

      localStorage.setItem('auth_token', JSON.stringify(data))
      window.location.href = '/'

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    // VALIDAÇÃO REFORÇADA
    if (
        !form.usuario || 
        !form.password || 
        !form.nome || 
        !form.phone || // Telefone Obrigatório
        !form.data_nascimento || // Nascimento Obrigatório
        !form.rua || 
        !form.numero || 
        !form.bairro
    ) {
      setError('Preencha todos os campos obrigatórios (*).')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: exists } = await supabase
        .from('acolitos')
        .select('id')
        .eq('usuario', form.usuario)
        .single()

      if (exists) {
        throw new Error('Este apelido já está em uso. Escolha outro.')
      }

      const { error: insertError } = await supabase.from('acolitos').insert([{
        nome: form.nome,
        usuario: form.usuario,
        telefone: form.phone,
        senha: form.password, 
        data_nascimento: form.data_nascimento, // Enviando data correta
        rua: form.rua,
        numero: form.numero,
        bairro: form.bairro,
        complemento: form.complemento,
        ativo: true 
      }])

      if (insertError) throw insertError

      await handleLogin()

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans p-4" onKeyDown={handleKeyDown}>
      <div className="w-full max-w-md bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden">
        
        <div className="bg-zinc-800/50 p-8 text-center border-b border-zinc-800">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            {mode === 'login' ? <Lock size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Acesso ao Portal' : 'Criar Conta'}
          </h1>
          <p className="text-gray-400 text-sm mt-2">Paróquia São José Operário</p>
        </div>

        <div className="p-8 space-y-4">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {mode === 'login' ? 'Usuário' : <span>Crie seu Login <span className="text-red-500">*</span></span>}
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
            {mode === 'signup' && <p className="text-[10px] text-gray-500 mt-1 ml-1">Este será seu usuário para entrar.</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Senha <span className="text-red-500">*</span>
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

          {mode === 'signup' && (
            <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
              <hr className="border-zinc-800 my-4" />
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full p-4 pl-12 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white" placeholder="Seu nome" />
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Telefone (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={form.phone} 
                    onChange={handlePhoneChange} 
                    maxLength={15}
                    className={`w-full p-4 pl-12 rounded-xl bg-zinc-950 border ${!form.phone && error ? 'border-red-500/50' : 'border-zinc-800'} focus:border-blue-600 outline-none transition text-white`} 
                    placeholder="(00) 00000-0000" 
                  />
                  <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nascimento <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className={`w-full p-4 rounded-xl bg-zinc-950 border ${!form.data_nascimento && error ? 'border-red-500/50' : 'border-zinc-800'} focus:border-blue-600 outline-none transition text-white text-sm`} />
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Endereço</span>
                
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Rua <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input type="text" value={form.rua} onChange={e => setForm({...form, rua: e.target.value})} className="w-full p-4 pl-10 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white text-sm" placeholder="Rua" />
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                    </div>
                    <div className="w-24">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Nº <span className="text-red-500">*</span></label>
                        <input type="text" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white text-sm text-center" placeholder="123" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Bairro <span className="text-red-500">*</span></label>
                        <input type="text" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white text-sm" placeholder="Bairro" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Comp. (Opcional)</label>
                        <input type="text" value={form.complemento} onChange={e => setForm({...form, complemento: e.target.value})} className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-blue-600 outline-none transition text-white text-sm" placeholder="Apto 101" />
                    </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? 'Carregando...' : (mode === 'login' ? 'Entrar' : 'Confirmar Cadastro')}
            {!loading && <ArrowRight size={20} />}
          </button>

          <div className="text-center pt-2">
            <button 
                onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login')
                    setError('')
                }}
                className="text-zinc-500 hover:text-white text-sm font-medium transition"
            >
                {mode === 'login' ? 'Não tem conta? Crie agora' : 'Já tem conta? Fazer Login'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}