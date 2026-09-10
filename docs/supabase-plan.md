# Integração planejada com Supabase

Este documento é um plano para a próxima fase, não uma migração executável nem uma integração concluída.

## Conteúdo público

`site_settings`: textos, contato, links sociais, métricas e marcas. `portfolio_projects`: slug único, título, categoria, ano, resumo, desafio, solução, processo, resultados e estado de publicação. `project_media`: capas, galerias, ordem e descrições acessíveis. Somente projetos publicados podem ser lidos publicamente; escrita exclusiva de administradores.

## Clientes e colaboração

Supabase Auth com convites. `profiles` associa usuários a perfis; privilégios de administrador atribuídos somente por operação confiável no servidor. `client_projects` e `project_members` controlam acesso explícito por projeto. `deliveries` registra entregas e versões. `comments` associa comentário a entrega e autor autenticado. `attachments` registra caminho privado, projeto, autor, tamanho e tipo.

## Regras obrigatórias na implementação

- RLS em todas as tabelas. Nenhuma confiança em papel, autor ou projeto enviados pelo navegador.
- Cliente lê somente projetos dos quais é membro e insere comentários como seu próprio usuário nas entregas autorizadas.
- Arquivos em bucket privado com políticas de Storage alinhadas à participação no projeto. Downloads com URLs assinadas de curta duração.
- Validar tamanho, conteúdo/tipo de arquivo e nomes no servidor. Usar caminhos gerados, não nomes fornecidos como caminhos.
- Ações administrativas verificadas no servidor; nenhuma proteção baseada apenas em esconder botões.
- Testar explicitamente que cliente A não acessa projeto, entrega, comentário ou arquivo de cliente B.
- Substituir o provider local por consultas e mutations autenticadas; remover os avisos de demonstração apenas após validar o fluxo real.

## Ordem sugerida

1. Criar projeto Supabase e configurar variáveis nos ambientes local e Vercel.
2. Implementar migrações, RLS, autenticação e conta administrativa.
3. Persistir conteúdo e projetos; adicionar imagens reais e galeria.
4. Implementar convites, entregas, comentários e uploads privados.
5. Validar isolamento entre clientes, estados de erro e publicação; configurar domínio definitivo.
