# Área do cliente e notificações

## Fluxo

Admin → Clientes e projetos cadastra clientes por nome, empresa e e-mail. Um cliente pode ter vários projetos privados. Cada projeto tem resumo, etapa, início, previsão de entrega, próximo passo e link de entrega. Alterações de etapa geram histórico automático; administrador e cliente podem publicar mensagens persistidas.

Desde a migração `202610180002` o projeto também tem **tarefas** (com responsável, prazo e conclusão explícita) e **entregas com versões**. O cliente aprova ou pede ajustes de uma versão específica; o registro guarda quem decidiu e quando. Nada é concluído por passagem de prazo. O progresso exibido é a média de critérios observáveis (etapa, tarefas concluídas, entregas aprovadas) com os critérios listados ao lado do valor; sem tarefas ou entregas, só a etapa conta.

Mensagens aceitam **nota interna** (visível apenas ao administrador, bloqueada no API e no RLS) e podem ficar vinculadas a uma entrega. Cada leitor tem sua própria posição de leitura (`workspace_message_reads`); a contagem de não lidos considera apenas mensagens do outro lado após a posição de quem lê.

O portfólio público é independente. `/cliente` oferece login, primeiro acesso e recuperação de senha. O e-mail da conta deve coincidir com o cadastro feito pelo administrador e estar confirmado. A conta do cliente não pode editar etapa, prazo ou cadastro nem ler projetos de outro cliente. Nenhuma senha é definida pelo administrador: o convite orienta o cliente a criar a própria senha.

## Funil comercial

Desde a migração `202610180001`, Admin → Prospecção inclui um funil com etapas: novo contato, qualificação, contato realizado, reunião, proposta enviada, negociação, ganho e perdido. O admin registra origem, contato, necessidade, serviço de interesse, próxima ação e data de retorno, valor previsto e valor da proposta; a perda exige motivo. Resultados da busca no Google Places podem ser salvos como oportunidade com um clique.

Converter uma oportunidade em ganho cria (ou reutiliza, pelo e-mail) o cliente e cria o projeto com a necessidade como resumo inicial, preservando o histórico da oportunidade. A conversão é atômica no banco (`workspace_convert_opportunity`), bloqueia reconversão e o aviso ao cliente usa a mesma fila durável de e-mails. O funil é exclusivo do administrador: nenhuma política permite leitura ou escrita por cliente.

## Banco

Aplicadas no projeto `cexdxamvogtpptakijsr` em 11/09/2026:

- `202609110001_client_workspace.sql`: clientes, projetos, histórico e políticas RLS.
- `202609110002_workspace_emails.sql`: fila durável para convites e mudanças de etapa.
- `202609110003_workspace_email_ownership.sql`: checagem de vínculo atual antes do envio.

Migrações novas, a aplicar no SQL Editor (todas validadas em PostgreSQL temporário com as políticas reais):

- `202610180001_workspace_pipeline.sql`: oportunidades e conversão atômica em cliente+projeto.
- `202610180002_workspace_tasks_deliverables.sql`: tarefas, entregas versionadas com aprovação registrada, notas internas, comentários vinculados a entregas e posições de leitura por leitor.
- `202610180003_workspace_files_registry.sql`: registro de arquivos (nome, tipo, tamanho, autor, data), anotações internas por cliente e função de fila para avisos de nova versão.

O acesso é verificado na API e no PostgreSQL. O vínculo usa o e-mail confirmado de `auth.users`, não metadados editáveis. As edições usam `updated_at` para evitar sobrescrever alterações de outra sessão. Datas vazias são aceitas; o progresso representa etapas, tarefas e entregas, não uma estimativa de horas trabalhadas.

Até aplicar as migrações `20261018*`, a área continua funcionando e o painel informa quais recursos ainda não estão ativados no banco.

## Configuração pendente de e-mail

No Supabase, Authentication → SMTP Settings, conectar SMTP próprio. O serviço padrão atual limita o envio e não permite personalizar os modelos. Mantenha a confirmação de e-mail ligada.

Na Vercel, configurar somente como variáveis de servidor:

- `APP_URL`: endereço HTTPS estável do site.
- `SMTP_HOST`, `SMTP_PORT` (587, 465 ou 2525), `SMTP_USER`, `SMTP_PASSWORD`.
- `SMTP_FROM`: nome e endereço de remetente verificado pelo provedor.

Não colocar credenciais no Git nem em campos `NEXT_PUBLIC_`. O mesmo serviço SMTP pode ser usado no Supabase e na Vercel. SPF/DKIM e a validação do remetente devem ser concluídos no provedor.

Authentication → URL Configuration já aponta para `https://denisramos.vercel.app`, com os retornos `/auth/callback` e `/auth/callback?next=reset` permitidos. Se o domínio mudar, atualizar esses endereços e `APP_URL`.

Após conectar SMTP, aplicar os arquivos `supabase/templates/confirm-signup.html` (assunto: Confirme seu acesso | Denis Ramos) e `supabase/templates/reset-password.html` (assunto: Recupere seu acesso | Denis Ramos). Mantêm `{{ .ConfirmationURL }}` para respeitar o fluxo de confirmação/PKCE do Supabase.

O cadastro feito pelo admin gera convite; criar um projeto ou mudar sua etapa gera atualização; publicar nova versão de entrega gera aviso de revisão (tipo `approval`). Salvar aciona o envio em segundo plano. Editar apenas o resumo não repete a notificação. Os modelos de convite, etapa e revisão estão em `src/lib/workspace-email-template.ts`, com versões HTML e texto, conteúdo escapado e link para a área do cliente.

Sem SMTP, os avisos permanecem na fila e o painel informa Configuração pendente. Falhas ficam registradas; o administrador pode usar Processar envios pendentes. Há até três tentativas por aviso; após esse limite, é necessária revisão operacional. Não há um agendador independente: novas gravações administrativas ou o botão processam a fila. Lotes de até cinco mensagens usam bloqueio no banco para evitar envio concorrente. SMTP não fornece exatamente-uma-vez; uma falha após aceitação e antes da confirmação no banco pode repetir um envio. O Message-ID é estável por aviso. Aceito pelo serviço não comprova leitura nem entrega na caixa de entrada.

## Verificações

- `npm run typecheck` e `npm run build`.
- `node --test tests/client-workspace.test.cjs`: validação de tarefas, entregas, revisão, funil e posição de leitura, além de autoria, permissão administrativa, origem, sessão, conflito, configuração pendente e templates HTML.
- Migrações executadas em PostgreSQL temporário: dois clientes, vários projetos, identidade não confirmada, bloqueio anônimo, comentários, histórico, visibilidade isolada, fila de e-mails restrita ao admin, tarefas (cliente só conclui), entregas (aprovação registra autor), notas internas invisíveis ao cliente, posições de leitura privadas, funil restrito ao admin, conversão atômica sem cliente duplicado e registro de arquivos sem acesso cruzado.
- Não foram enviados e-mails reais de teste. A verificação de cadastro/recuperação e entrega de notificações depende do SMTP e de um destinatário de teste autorizado.

Referências: https://supabase.com/docs/guides/auth/passwords e https://nodemailer.com/smtp.

## Resend

Na Vercel, configurar `RESEND_API_KEY`, `EMAIL_FROM` (remetente em domínio verificado) e `APP_URL=https://denisramos.vercel.app`, somente no servidor. Publicar novamente após configurar. A API Resend tem prioridade sobre SMTP para convites e mudanças de etapa; cada notificação usa uma chave de idempotência estável. A deduplicação do provedor tem janela limitada.

No Supabase → Authentication → Emails → SMTP Settings, configurar host `smtp.resend.com`, porta `465`, usuário `resend` e senha igual à API key. Informar remetente verificado e nome Denis Ramos. Esse envio atende confirmação de cadastro e recuperação de senha. Aplicar os templates HTML preparados após conectar SMTP. Nunca inserir credenciais no código ou em mensagens.

Referência: https://resend.com/docs/send-with-supabase-smtp.
