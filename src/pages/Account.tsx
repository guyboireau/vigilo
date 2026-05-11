import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, KeyRound, LogOut, Save, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession, useProfile, useSignOut, useUpdateProfile } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const profileSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string().min(1, 'Confirmation requise'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type PasswordForm = z.infer<typeof passwordSchema>

export default function Account() {
  const navigate = useNavigate()
  const session = useSession()
  const user = session?.user
  const userId = user?.id ?? ''
  const { data: profile, isLoading: profileLoading } = useProfile(user)
  const updateProfile = useUpdateProfile(userId)
  const signOut = useSignOut()

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: profile?.name ?? '' },
  })

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  async function onProfileSubmit(data: ProfileForm) {
    await updateProfile.mutateAsync({ name: data.name })
    toast.success('Profil mis à jour')
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordError(null)
    setPasswordSuccess(false)

    // Vérifier le mot de passe actuel via re-auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: data.currentPassword,
    })

    if (signInError) {
      setPasswordError('Mot de passe actuel incorrect')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (updateError) {
      setPasswordError(updateError.message)
      return
    }

    setPasswordSuccess(true)
    resetPassword()
    toast.success('Mot de passe modifié')
  }

  function handleSignOut() {
    signOut.mutate(undefined, { onSuccess: () => navigate('/login') })
  }

  const initials = profile?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? user?.email?.[0].toUpperCase() ?? '?'

  if (profileLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Mon Compte</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gérez vos informations personnelles et votre sécurité.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{profile?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ID: {userId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom affiché</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                {...regProfile('name')}
                placeholder="Votre nom"
                className="pl-9"
              />
            </div>
            {profileErrors.name && (
              <p className="text-xs text-destructive">{profileErrors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={user?.email ?? ''}
                disabled
                className="pl-9 bg-muted"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              L'email ne peut pas être modifié directement.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={profileSubmitting || updateProfile.isPending}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Sécurité</h2>
        </div>

        <form onSubmit={handlePassword(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mot de passe actuel</Label>
            <Input
              type="password"
              {...regPassword('currentPassword')}
              placeholder="••••••••"
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nouveau mot de passe</Label>
            <Input
              type="password"
              {...regPassword('newPassword')}
              placeholder="Minimum 8 caractères"
            />
            {passwordErrors.newPassword && (
              <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Confirmer le mot de passe</Label>
            <Input
              type="password"
              {...regPassword('confirmPassword')}
              placeholder="••••••••"
            />
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          {passwordError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600">
              Mot de passe modifié avec succès.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={passwordSubmitting}
            >
              <KeyRound className="h-4 w-4 mr-1.5" />
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4">
        <h2 className="text-lg font-bold text-destructive">Zone de danger</h2>
        <p className="text-xs text-muted-foreground">
          La déconnexion vous redirigera vers la page de connexion.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSignOut}
          loading={signOut.isPending}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Se déconnecter
        </Button>
      </div>
    </div>
  )
}
