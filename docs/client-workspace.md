# Área do cliente e notificações

## Fluxo

Admin → Clientes e projetos cadastra clientes por nome, empresa e e-mail. Um cliente pode ter vários projetos privados. Cada projeto tem resumo, etapa, início, previsão de entrega, próximo passo e link de entrega. Alterações de etapa geram histórico automático; administrador e cliente podem publicar mensagens persistidas.

O portfólio público é independente. `/cliente` oferece login, primeiro acesso e recuperação de senha. O e-mail da conta deve coincidir com o cadastro feito pelo administrador e estar confirmado. A conta do cliente não pode editar etapa, prazo ou cadastro nem ler projetos de outro cliente. Nenhuma senha é definida pelo administrador: o convite orienta o cliente a criar a própria senha.

## Banco

Aplicadas no projeto `cexdxamvogtpptakijsr` em 11/09/2026:

- `202609110001_client_workspace.sql`: clientes, projetos, histórico e políticas RLS.
- `202609110002_workspace_emails.sql`: fila durável para convites e mudanças de etapa.
- `202609110003_workspace_email_ownership.sql`: checagem de vínculo atual antes do envio.

O acesso é verificado na API e no PostgreSQL. O vínculo usa o e-mail confirmado de `auth.users`, não metadados editáveis. As edições usam `updated_at` para evitar sobrescrever alterações de outra sessão. Datas vazias são aceitas; o progresso representa etapas, não uma estimativa de horas trabalhadas.

## Configuração pendente de e-mail

No Supabase, Authentication → SMTP Settings, conectar SMTP próprio. O serviço padrão atual limita o envio e não permite personalizar os modelos. Mantenha a confirmação de e-mail ligada.

Na Vercel, configurar somente como variáveis de servidor:

- `APP_URL`: endereço HTTPS estável do site.
- `SMTP_HOST`, `SMTP_PORT` (587, 465 ou 2525), `SMTP_USER`, `SMTP_PASSWORD`.
- `SMTP_FROM`: nome e endereço de remetente verificado pelo provedor.

Não colocar credenciais no Git nem em campos `NEXT_PUBLIC_`. O mesmo serviço SMTP pode ser usado no Supabase e na Vercel. SPF/DKIM e a validação do remetente devem ser concluídos no provedor.

Authentication → URL Configuration já aponta para `https://denisramos.vercel.app`, com os retornos `/auth/callback` e `/auth/callback?next=reset` permitidos. Se o domínio mudar, atualizar esses endereços e `APP_URL`.

Após conectar SMTP, aplicar os arquivos `supabase/templates/confirm-signup.html` (assunto: Confirme seu acesso | Denis Ramos) e `supabase/templates/reset-password.html` (assunto: Recupere seu acesso | Denis Ramos). Mantêm `{{ .ConfirmationURL }}` para respeitar o fluxo de confirmação/PKCE do Supabase.

O cadastro feito pelo admin gera convite; criar um projeto ou mudar sua etapa gera atualização. Salvar aciona o envio em segundo plano. Editar apenas o resumo não repete a notificação. Os modelos de convite e etapa estão em `src/lib/workspace-email-template.ts`, com versões HTML e texto, conteúdo escapado e link para a área do cliente.

Sem SMTP, os avisos permanecem na fila e o painel informa Configuração pendente. Falhas ficam registradas; o administrador pode usar Processar envios pendentes. Há até três tentativas por aviso; após esse limite, é necessária revisão operacional. Não há um agendador independente: novas gravações administrativas ou o botão processam a fila. Lotes de até cinco mensagens usam bloqueio no banco para evitar envio concorrente. SMTP não fornece exatamente-uma-vez; uma falha após aceitação e antes da confirmação no banco pode repetir um envio. O Message-ID é estável por aviso. Aceito pelo serviço não comprova leitura nem entrega na caixa de entrada.

## Verificações

- `npm run typecheck` e `npm run build`.
- `node --test tests/client-workspace.test.cjs`: validação, URLs, autoria, permissão administrativa, origem, sessão, conflito, configuração pendente e templates HTML.
- Migrações executadas em PostgreSQL temporário: dois clientes, vários projetos, identidade não confirmada, bloqueio anônimo, comentários, histórico, visibilidade isolada e fila de e-mails restrita ao admin.
- Não foram enviados e-mails reais de teste. A verificação de cadastro/recuperação e entrega de notificações depende do SMTP e de um destinatário de teste autorizado.

Referências: https://supabase.com/docs/guides/auth/passwords e https://nodemailer.com/smtp.

## Resend

Na Vercel, configurar `RESEND_API_KEY`, `EMAIL_FROM` (remetente em domínio verificado) e `APP_URL=https://denisramos.vercel.app`, somente no servidor. Publicar novamente após configurar. A API Resend tem prioridade sobre SMTP para convites e mudanças de etapa; cada notificação usa uma chave de idempotência estável. A deduplicação do provedor tem janela limitada.

No Supabase → Authentication → Emails → SMTP Settings, configurar host `smtp.resend.com`, porta `465`, usuário `resend` e senha igual à API key. Informar remetente verificado e nome Denis Ramos. Esse envio atende confirmação de cadastro e recuperação de senha. Aplicar os templates HTML preparados após conectar SMTP. Nunca inserir credenciais no código ou em mensagens.

Referência: https://resend.com/docs/send-with-supabase-smtp.
