# Denis Ramos — Portfólio

Primeira versão baseada em `portfolio_branco.png`. Next.js App Router, React, TypeScript, Tailwind CSS, GSAP com `@gsap/react`, Phosphor Icons e componentes oficiais shadcn/ui.

## Executar

Node.js 22 ou superior, npm.

```sh
npm ci
npm run dev
```

Validação de produção: `npm run build`. Verificação de tipos: `npm run typecheck`. Servidor de produção: `npm start`.

## Rotas

- `/`: hero, serviços, CTA estratégico, portfólio, empresas, apresentação/convite para trabalhar e footer.
- `/projetos/[slug]`: apresentação, desafio, solução, processo e projetos relacionados.
- `/login`: acesso com e-mail e senha do Supabase Auth.
- `/admin`: painel restrito a administradores. Visão geral com pendências reais, editor de textos e projetos do portfólio, clientes e projetos (tarefas, entregas versionadas, comentários, anexos, notas internas) e prospecção com funil comercial e busca no Google Places.
- `/cliente`: acesso do cliente com Supabase Auth. Etapas, tarefas, entregas com aprovação, arquivos e conversa; isolado por RLS.

## Limites desta fase

O portfólio usa Supabase para autenticação administrativa e conteúdo compartilhado, após executar as duas migrações descritas em `docs/supabase-setup.md`. A área do cliente é real (mensagens, arquivos e aprovações persistidos), condicionada às migrações de `docs/client-workspace.md` — incluindo as três migrações `20261018*`, ainda a aplicar no Supabase. Upload limitado a 4 MB por arquivo, com formatos de trabalho permitidos no servidor. As edições antigas do navegador podem ser recuperadas no admin para revisão e publicação.

O e-mail de avisos depende de SMTP ou Resend configurados; sem isso, os avisos ficam na fila. A prospecção com Google Places depende de `GOOGLE_PLACES_API_KEY` e `PROSPECTING_ACCESS_TOKEN`. O funil comercial não envia mensagens automáticas.

Os três cases são conceituais e estão identificados como demonstração. Indicadores e marcas foram transcritos do esboço e devem ser confirmados antes do lançamento definitivo. A área sobre usa uma composição gráfica até a foto original estar disponível. A fotografia do hero foi gerada para esta primeira versão. Não há endereço de contato inventado: cadastre-o no editor para experimentar o link de e-mail localmente.

Conteúdo padrão: `src/lib/content.ts`. Estilos: `src/app/globals.css`. O projeto usa fonte de sistema para evitar dependências externas na construção. As animações respeitam redução de movimento, têm escopo e limpeza via useGSAP. A navegação funciona com teclado e as seções de serviços expõem seu estado expandido.

## Vercel

Importar `studiocactus/denisramos`, escolher preset Next.js e manter a raiz do repositório. `vercel.json` define instalação via `npm ci` e build via `npm run build`. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para o login e o conteúdo remoto. A imagem de referência fica fora de `public`, portanto não é entregue pelo site.

## Supabase

Ver `docs/supabase-setup.md` para a integração atual e `docs/supabase-plan.md` para a futura área de clientes. `.env.example` lista as variáveis usadas. Nunca incluir service role no frontend ou no Git.

## Referências de implementação

- [Next.js — instalação](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui — instalação](https://ui.shadcn.com/docs/installation)
- [GSAP — React](https://gsap.com/resources/React/)
