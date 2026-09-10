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
- `/admin`: **demonstração pública**, sem autenticação. Editor de textos, e-mail de contato, cadastro/edição de projetos e etapa do projeto fictício.
- `/cliente`: **demonstração pública**, sem autenticação. Status fictício, comentários locais e arquivos em memória.

## Limites desta fase

Não existe backend, autenticação, controle de acesso nem envio de mensagens/arquivos. Não usar para dados reais de clientes. As alterações do admin e os comentários são guardados somente no localStorage do navegador. Não alteram o conteúdo visto por outras pessoas. Arquivos ficam apenas em memória e desaparecem ao sair da página ou atualizar. Upload limitado a cinco arquivos de até 10 MB. O Supabase ainda não foi criado e nenhuma conexão foi simulada.

Os três cases são conceituais e estão identificados como demonstração. Indicadores e marcas foram transcritos do esboço e devem ser confirmados antes do lançamento definitivo. A área sobre usa uma composição gráfica até a foto original estar disponível. A fotografia do hero foi gerada para esta primeira versão. Não há endereço de contato inventado: cadastre-o no editor para experimentar o link de e-mail localmente.

Conteúdo padrão: `src/lib/content.ts`. Estilos: `src/app/globals.css`. O projeto usa fonte de sistema para evitar dependências externas na construção. As animações respeitam redução de movimento, têm escopo e limpeza via useGSAP. A navegação funciona com teclado e as seções de serviços expõem seu estado expandido.

## Vercel

Importar `studiocactus/denisramos`, escolher preset Next.js e manter a raiz do repositório. `vercel.json` define instalação via `npm ci` e build via `npm run build`. Nenhuma variável de ambiente é necessária para esta demonstração. A imagem de referência fica fora de `public`, portanto não é entregue pelo site.

## Próxima fase: Supabase

Ver `docs/supabase-plan.md`. `.env.example` contém apenas os nomes das variáveis futuras; ainda não são consumidas. Nunca incluir service role no frontend ou no Git.

## Referências de implementação

- [Next.js — instalação](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui — instalação](https://ui.shadcn.com/docs/installation)
- [GSAP — React](https://gsap.com/resources/React/)
