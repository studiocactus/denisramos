# Prospecção de clientes — ativação

Acesse Admin → Prospecção. A ferramenta consulta a Places API (New) no servidor e apresenta apenas negócios em operação sem website informado no cadastro, conforme os filtros escolhidos. Não comprova ausência de site fora do Google, não varre toda a cidade e não envia mensagens.

## Conectar na Vercel

1. No Google Cloud, escolha um projeto, ative a **Places API (New)** e o faturamento correspondente.
2. Crie uma chave de API, restrinja-a à Places API (New) e configure uma cota adequada no Google Cloud. Os campos de telefone, website e avaliação podem acionar cobrança do Text Search Enterprise. Confira os preços atuais antes de habilitar.
3. Nas variáveis de ambiente do projeto **denisramos** na Vercel, cadastre `GOOGLE_PLACES_API_KEY` com a chave. Não use o prefixo `NEXT_PUBLIC_`.
4. Cadastre `PROSPECTING_ACCESS_TOKEN` com uma senha aleatória de 32 a 512 caracteres. Essa senha protege as consultas enquanto o admin não tem autenticação. Guarde-a em seu gerenciador de senhas; não a coloque no Git.
5. Publique novamente para aplicar as variáveis. Na aba Prospecção, abra **Acesso à busca** e digite essa senha (não a chave do Google).

Sem as duas variáveis, a busca permanece desativada. Para desenvolvimento local, use `.env.local`, ignorado pelo Git, e reinicie o servidor.

## Comportamento

- Segmento e localização livres, país, avaliação mínima e exigência de telefone.
- Cada consulta analisa até 20 registros; os filtros de ausência de site, funcionamento, telefone e nota são aplicados no servidor. Assim, uma página de 20 negócios pode resultar em zero oportunidades.
- A próxima página mantém os parâmetros da busca original; os resultados são deduplicados por ID.
- O texto da cidade/bairro/CEP orienta a busca. Não representa um raio nem uma fronteira geográfica exata.
- Busca textual e ordenação nos resultados já carregados não fazem novas consultas pagas.
- Resultados não são exportados nem persistidos. A senha fica na memória do componente e é descartada ao sair da aba; é transmitida somente para o endpoint do próprio site, por HTTPS em produção.
- Atribuição ao Google Maps e a eventuais provedores acompanha os resultados. Condições de uso e informações sobre dados ficam acessíveis no final da ferramenta.
- A proteção de 10 consultas/minuto é por instância do servidor; não substitui uma cota global definida no Google Cloud. Para múltiplos usuários, substituir a senha compartilhada por autenticação e limitação distribuída.

## Validação

`node --test tests/prospecting.test.cjs`

Testes usam respostas fictícias locais, sem chamadas pagas. Cobrem validação, filtros, links seguros, paginação, autorização, origem, erros upstream e limitação de consultas. A busca real deve ser validada após configurar as credenciais.

## Referências

- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Políticas e atribuições](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Uso e faturamento](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
