# Publicação e prevenção de regressões

Antes de publicar, comparar `git status --short`, o diff completo e o último commit publicado. Uma correção local não está disponível na Vercel até entrar no commit enviado. Identificar arquivos novos e migrações dos componentes modificados; não selecionar apenas trechos recentes sem revisar suas dependências.

Quando houver trabalho fora do escopo, mantê-lo local e registrar explicitamente os arquivos excluídos. Validar o commit de publicação em um checkout separado, para que arquivos locais não registrados não escondam dependências ausentes.

Executar `npm run verify` e a compilação no checkout de publicação. A Vercel também executa `verify` antes do build: uma falha nos testes de autorização, edição de perfis, arquivamento, exclusão, conflito de versão ou carregamento impede o novo deploy.

Conferir no Supabase as migrações exigidas antes de disponibilizar controles dependentes delas. Testar migrações em banco temporário com as políticas de acesso reais. Não testar exclusões, e-mails ou alteração de cadastros de clientes reais para validar a interface.

Após o deploy, confirmar o commit publicado e conferir no navegador: título único de Clientes e projetos, ícones funcionais, espaçamento entre textos e ações, Editar/Arquivar/Excluir, perfil completo editável, retorno entre abas preservando a seleção e navegação landing/projeto. Informar limitações de verificação; não afirmar que uma mudança local já foi publicada.

## Recuperação de 12/09/2026

As correções locais de Clientes e projetos, campos de contato, mensagens, arquivos e espaçamento estavam fora dos commits anteriores. Elas devem ser publicadas com as migrações `202609110004`, `202609110005` e `202609120001`.

O arquivamento preserva os projetos e permite desarquivar pelo filtro Arquivados. A exclusão oculta projeto, mensagens e arquivos por meio de `deleted_at`; não apaga fisicamente os dados. As alterações de perfil usam o mesmo formulário no admin e no cliente; somente o admin pode transferir o e-mail de acesso.

As alterações locais da landing page em `portfolio.tsx` e os estilos de métricas são outro trabalho e não fazem parte desta recuperação do admin.

## Landing e carrossel — 12/09/2026

Esta publicação inclui as pendências da landing anteriormente excluídas: ícones dos rótulos, animação das métricas e padronização de Sobre Mim, além das ações compactas do admin e da paginação por posições reais. Nenhum desses itens pode ser tratado como concluído enquanto existir apenas no diff local.

Antes de fechar cada publicação, conferir também Meus Serviços / Portfólio / Sobre Mim com o mesmo estilo e seus ícones, observar um ciclo das métricas, chegar ao último ponto do carrossel e voltar com um único clique, e conferir as tags sobre a imagem. Repetir a paginação em largura móvel e desktop. Os testes de posições do carrossel fazem parte de `npm run verify`.

Nenhum arquivo solicitado nesta rodada será excluído da publicação. Não há novas dependências ou migrações de banco nesta rodada.

## Anexos e alinhamento — 13/09/2026

Publicar juntos o tipo textual dos anexos, confirmação de exclusão, rota DELETE, alinhamento do cliente e migração `202609130001_workspace_file_deletion.sql`. A política do Storage permite excluir somente arquivos do bucket privado `workspace-files` em projetos acessíveis à sessão e não excluídos. A API usa a sessão do usuário e rejeita nomes que saiam da pasta do projeto. Não utiliza credenciais administrativas para excluir arquivos.

Os testes cobrem exclusão pelo cliente e pelo admin, bloqueio de outro cliente, sessão anônima e conta não confirmada, caminho inválido e falha do Storage. A exclusão física de arquivos reais não deve ser usada na conferência do deploy: abrir e cancelar a confirmação é suficiente para verificar a interface. Nenhuma alteração desta rodada foi excluída da publicação.

## Atendimento, entregas e funil — 18/10/2026

Esta rodada transforma o admin em ferramenta de trabalho diário. Publicar código e aplicar as migrações `202610180001_workspace_pipeline.sql`, `202610180002_workspace_tasks_deliverables.sql` e `202610180003_workspace_files_registry.sql` no SQL Editor, nesta ordem, antes de disponibilizar os controles novos. Todas as três foram validadas em PostgreSQL temporário com as políticas reais: dois clientes isolados, conta não confirmada, acesso anônimo, tarefas (cliente só conclui), entregas (aprovação registra autor e data), notas internas invisíveis ao cliente, posições de leitura privadas, funil restrito ao admin, conversão atômica sem cliente duplicado e registro de arquivos sem acesso cruzado.

O que muda no admin: a Visão geral passa a mostrar pendências reais (mensagens sem leitura, entregas aguardando aprovação, tarefas atrasadas, entregas fora do prazo, oportunidades sem próximo contato) com atalho para o registro correspondente. Clientes e projetos ganham tarefas com responsável e prazo, entregas versionadas com aprovação registrada, anotações internas por cliente, anexos com autor/data/tamanho e vínculo opcional a entrega, e upload com barra de progresso. Prospecção ganha funil comercial com etapas, próxima ação, valores previsto/da proposta, motivo de perda e conversão em cliente e projeto preservando o histórico.

Regras que não podem ser burladas por UI: nada é concluído por passagem de prazo; o progresso é a média de critérios observáveis com os critérios exibidos; nota interna é bloqueada no API e no RLS; arquivo aceito só de formatos de trabalho, com limite de 4 MB, caminho gerado no servidor e registro em `workspace_files`; conversão bloqueia reconversão e cliente duplicado. O aviso de nova versão usa a mesma fila durável de e-mails (kind `approval`) — sem SMTP/Resend configurado, o aviso fica na fila como os demais.

A landing page não foi alterada nesta rodada além do necessário. Nenhum arquivo foi excluído da publicação. Não foram enviados e-mails reais nem criados clientes reais de teste; a validação de interface autenticada com dados reais depende de uma conta de teste autorizada.

O painel degrada com aviso enquanto as migrações `20261018*` não forem aplicadas: conversa, projetos e arquivos continuam funcionando; tarefas, entregas, funil e anotações aparecem como "recursos ainda não ativados no banco".
