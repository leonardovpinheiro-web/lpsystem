

# Correção: Sessão Expirando Rapidamente

## Problema Identificado

Os logs de autenticação mostram o erro **"refresh_token_not_found"** (token de renovação não encontrado). Isso acontece quando:
- O Supabase tenta renovar automaticamente o token de acesso (que expira a cada hora)
- Mas não consegue encontrar o refresh token no armazenamento local

## Causa Provável

O problema pode estar relacionado a:
1. **Conflito entre abas/dispositivos**: Quando você faz login em outro dispositivo ou aba, o refresh token anterior é invalidado
2. **Tratamento de erros de token**: Quando o refresh falha, o sistema não está lidando corretamente com a situação

## Solução

Vou melhorar o `AuthContext` para:
1. **Tratar melhor o evento TOKEN_REFRESHED** para garantir que a sessão seja atualizada corretamente
2. **Lidar com erros de refresh** mostrando feedback ao usuário quando necessário
3. **Adicionar tratamento para SIGNED_OUT** garantindo que o estado seja limpo corretamente

## Alterações Técnicas

### Arquivo: `src/contexts/AuthContext.tsx`

1. **Melhorar o listener de eventos de autenticação:**
   - Adicionar tratamento específico para o evento `TOKEN_REFRESHED`
   - Verificar se houve erro no refresh e tratar adequadamente
   - Garantir que o estado seja sincronizado corretamente

2. **Adicionar verificação periódica de sessão:**
   - Verificar se a sessão ainda é válida quando o usuário retorna à aba
   - Usar o evento `visibilitychange` do documento para detectar quando o usuário volta

3. **Tratamento do evento SIGNED_OUT:**
   - Limpar corretamente todo o estado quando o usuário for deslogado

## Código da Solução

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log("Auth event:", event);
      
      // Atualizar estado da sessão
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setRole(null);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        setTimeout(() => {
          getUserRole(session.user.id).then((userRole) => {
            setRole(userRole as AppRole);
            setLoading(false);
          });
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    }
  );

  // Verificar sessão existente
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      getUserRole(session.user.id).then((userRole) => {
        setRole(userRole as AppRole);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  });

  // Verificar sessão quando usuário volta para a aba
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session && user) {
          // Sessão expirou, limpar estado
          setSession(null);
          setUser(null);
          setRole(null);
        }
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    subscription.unsubscribe();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

## Resultado Esperado

Após a implementação:
- A sessão será verificada quando o usuário retornar à aba
- O sistema tratará melhor os eventos de autenticação
- Se houver falha no refresh do token, o usuário será redirecionado para login de forma limpa

