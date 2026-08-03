"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { LogoAssociacao } from "@/components/crm/logo-associacao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, Zap, Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Nome e logos da associação. A tela de login roda sem sessão, e
  // `configuracoes` só é legível por usuário autenticado — por isso vem da RPC
  // `identidade_publica`, que devolve só esses campos. Enquanto não chega, a
  // tela mostra o monograma; nada aqui depende da resposta para funcionar.
  const [identidade, setIdentidade] = useState<{
    nome_associacao?: string | null
    logo_url?: string | null
    logo_url_escura?: string | null
  } | null>(null)

  useEffect(() => {
    let ativo = true
    supabase
      .rpc("identidade_publica")
      .then(({ data }) => {
        if (ativo && data) setIdentidade(data as typeof identidade)
      })
    return () => {
      ativo = false
    }
  }, [])

  const nomeAssociacao = identidade?.nome_associacao ?? "ABPAC"

  // Validação de email em tempo real
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError(null)
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError("Email inválido")
      return false
    }
    setEmailError(null)
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError(null)
      return false
    }
    if (password.length < 6) {
      setPasswordError("Senha deve ter no mínimo 6 caracteres")
      return false
    }
    setPasswordError(null)
    return true
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const fullName = formData.get("fullName") as string

    // Validações
    if (!validateEmail(email)) {
      setError("Por favor, insira um email válido")
      setLoading(false)
      return
    }

    if (!validatePassword(password)) {
      setError("Senha deve ter no mínimo 6 caracteres")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        // A chave tem que ser `nome`: é o que o trigger `handle_new_user`
        // procura em `raw_user_meta_data` para preencher `profiles.nome`. Com
        // outro nome de campo, o perfil nasceria batizado com o pedaço do
        // e-mail antes do @.
        options: { data: { nome: fullName } },
      })

      if (signUpError) throw signUpError

      // O perfil é criado pelo trigger `handle_new_user`, no banco. Não dá para
      // inserir daqui: a policy de `profiles` não deixa, e a linha já existe.
      // O primeiro usuário do sistema nasce admin; os seguintes, consultores —
      // um admin promove em Usuários.

      if (data.session) {
        setSuccess("Conta criada com sucesso! Redirecionando...")
        setTimeout(() => router.push("/crm"), 1500)
      } else {
        // Sem sessão na resposta, o projeto exige confirmação por e-mail.
        // Mandar para /crm aqui devolveria a pessoa para o login sem explicação.
        setSuccess(
          "Conta criada. Confirme o cadastro pelo link que enviamos para " +
            `${email} e depois entre normalmente.`
        )
      }
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta")
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!validateEmail(email)) {
      setError("Por favor, insira um email válido")
      setLoading(false)
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      setSuccess("Login realizado com sucesso! Redirecionando...")
      setTimeout(() => router.push("/crm"), 1000)
    } catch (err: any) {
      setError(err.message || "Email ou senha incorretos")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("resetEmail") as string

    if (!validateEmail(email)) {
      setError("Por favor, insira um email válido")
      setLoading(false)
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) throw resetError

      setResetEmailSent(true)
      setSuccess("Email de recuperação enviado! Verifique sua caixa de entrada.")
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email de recuperação")
    } finally {
      setLoading(false)
    }
  }

  // O botão "Continuar com Google" saiu daqui: o provedor Google não está
  // habilitado no projeto Supabase, então clicar nele só rendia um 400
  // ("provider is not enabled") — o log de autenticação registra tentativas
  // reais. Para reativar, ligue o provedor no painel do Supabase primeiro.

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1B4670]/15 dark:bg-[#1B4670]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <LogoAssociacao
                url={identidade?.logo_url}
              urlEscura={identidade?.logo_url_escura}
                nome={nomeAssociacao}
                altura={104}
              />
            </div>
            {!identidade?.logo_url && (
              <h1 className="text-3xl font-bold text-[#0E2A47] dark:text-[#7FA6CC]">
                ABPAC
              </h1>
            )}
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Recuperar Senha
            </p>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
            <form onSubmit={handleResetPassword}>
              <CardHeader>
                <CardTitle>Esqueceu sua senha?</CardTitle>
                <CardDescription>
                  Digite seu email e enviaremos um link para redefinir sua senha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      required
                      disabled={loading || resetEmailSent}
                      onChange={(e) => validateEmail(e.target.value)}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-[#0E2A47] hover:bg-[#1B4670]"
                  disabled={loading || resetEmailSent}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : resetEmailSent ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Email Enviado
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowResetPassword(false)
                    setResetEmailSent(false)
                    setError(null)
                    setSuccess(null)
                  }}
                >
                  Voltar para Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#1B4670]/15 dark:bg-[#1B4670]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <LogoAssociacao
              url={identidade?.logo_url}
              urlEscura={identidade?.logo_url_escura}
              nome={nomeAssociacao}
              altura={128}
            />
          </div>
          {/* Com logo no ar, o título repetiria o que já está desenhado nela. */}
          {!identidade?.logo_url && (
            <h1 className="text-3xl font-bold text-[#0E2A47] dark:text-[#7FA6CC]">
              ABPAC
            </h1>
          )}
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            CRM de Proteção Veicular
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="space-y-1 pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        required
                        disabled={loading}
                        onChange={(e) => validateEmail(e.target.value)}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-sm text-[#1B4670] hover:text-[#0E2A47] dark:text-[#7FA6CC] dark:hover:text-[#A9C5DF]"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-[#0E2A47] hover:bg-[#1B4670] shadow-lg shadow-[#0E2A47]/25"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-name"
                        name="fullName"
                        type="text"
                        placeholder="Seu nome"
                        className="pl-10"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        required
                        disabled={loading}
                        onChange={(e) => validateEmail(e.target.value)}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required
                        disabled={loading}
                        minLength={6}
                        onChange={(e) => validatePassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required
                        disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* O seletor "Tipo de Perfil" (CLT / MEI) que existia aqui era
                      do app de finanças e não significava nada no CRM — o papel
                      de acesso quem define é um admin, em Usuários. */}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contas novas entram como <strong>consultor</strong>, vendo
                    apenas a própria carteira. Um administrador pode mudar o
                    papel em Usuários.
                  </p>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-[#0E2A47] hover:bg-[#1B4670] shadow-lg shadow-[#0E2A47]/25"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#0E2A47]/10 dark:bg-[#1B4670]/25">
              <Shield className="w-5 h-5 text-[#0E2A47] dark:text-[#7FA6CC]" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Seguro</p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Rápido</p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Proposta em PDF</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-8">
          Ao criar uma conta, você concorda com nossos{" "}
          <a href="#" className="text-[#1B4670] hover:text-[#0E2A47] dark:text-[#7FA6CC]">
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a href="#" className="text-[#1B4670] hover:text-[#0E2A47] dark:text-[#7FA6CC]">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  )
}
