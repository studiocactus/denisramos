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
