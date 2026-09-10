# Supabase: configuração e operação

A conexão usa URL e chave pública em `.env.local` (ignorado pelo Git) e nas variáveis da Vercel. Não é necessária uma chave secreta no aplicativo.

## Banco e conta administrativa

1. A primeira migração `supabase/migrations/202609100001_portfolio.sql` cria as tabelas e as políticas RLS. Ela já foi confirmada em 10/09/2026.
2. Execute uma vez `supabase/migrations/202609100002_portfolio_save.sql` no SQL Editor. Ela concede acesso ao UID informado pelo responsável e cria a função de salvamento. Se a conta não existir no Auth, a transação falha sem aplicar as alterações.
3. Execute `supabase/migrations/202609100003_fix_portfolio_save.sql`. Corrige o erro `21000: DELETE requires a WHERE clause` encontrado nos registros da Vercel: o salvamento passa a atualizar projetos existentes e remover somente os slugs ausentes da lista enviada. A execução da migração apenas substitui a função, sem modificar conteúdo.
4. Acesse `/login` com o e-mail e a senha dessa conta. A confirmação de e-mail precisa estar concluída no Supabase Auth.

## Conteúdo compartilhado

`/admin` exige sessão validada pelo Supabase e participação em `portfolio_admins`. A API repete a autorização antes de ler rascunhos ou gravar. As páginas públicas usam uma conexão anônima mesmo quando o navegador tem uma sessão administrativa.

Salvar no site grava os textos e os projetos em uma transação. Projetos desmarcados como publicados ficam restritos ao administrador. A versão do conteúdo evita sobrescrever silenciosamente alterações de outra aba: em caso de conflito, copie as edições e recarregue.

O banco vazio mostra os exemplos do projeto até o primeiro salvamento. Em Conteúdo do site, “Recuperar edições deste navegador” coloca o conteúdo antigo no formulário para revisão, incluindo os projetos. “Salvar no site” publica esse conjunto. A recuperação não apaga o armazenamento local e não envia dados automaticamente.

A área do cliente, comentários, anexos e etapas continuam demonstrativos. A prospecção mantém sua conexão separada com Google Places.

## Validação

Compilação e verificação de tipos; redirecionamento anônimo de `/admin`; bloqueio da leitura administrativa e escrita sem sessão; bloqueio de origem externa; leitura pública; validação de projetos duplicados, URLs inseguras e imagens não permitidas.

A validação completa com login, salvamento, rascunhos, conflito entre abas e logout depende da execução da segunda migração e de uma sessão do responsável. Não armazenar senhas em testes ou no Git.

## Referências

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/reference/javascript/auth-getuser

## Correção do salvamento (10/09/2026)

A terceira migração foi validada em PostgreSQL temporário com os papéis e as políticas RLS do projeto: inserção inicial, atualização, reordenação, remoção seletiva, rascunhos invisíveis para visitantes, conflito entre versões, rollback em projeto inválido e bloqueio de gravação anônima. O ambiente temporário não inclui a extensão de proteção que gerou o erro original; a função corrigida usa um filtro WHERE explícito na exclusão. A confirmação final em produção depende de aplicar a terceira migração e salvar pelo admin.
