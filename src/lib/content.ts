export type Project = {
  slug: string;
  title: string;
  category: string;
  year: string;
  color: string;
  description: string;
  challenge: string;
  solution: string;
  published: boolean;
};
export type SiteContent = {
  headline: string;
  intro: string;
  about: string;
  email: string;
  projects: Project[];
};
export const initialContent: SiteContent = {
  headline: "Websites memoráveis. Que combinam com valor.",
  intro:
    "Projetando o amanhã através de design, tecnologia e experiências digitais inovadoras.",
  about:
    "Sou apaixonado por construir o futuro digital. Minha missão é elevar marcas através de interfaces que respiram inovação e precisão técnica.",
  email: "",
  projects: [
    {slug:"nexo",title:"Nexo",category:"Plataforma SaaS · UI/UX",year:"2026",color:"blue",description:"Conexões simples para equipes em movimento.",challenge:"Reunir projetos e conversas em um espaço de trabalho claro.",solution:"Um conceito de produto modular, com navegação direta e uma identidade visual flexível.",published:true},
    {slug:"aurora",title:"Aurora",category:"Website · Identidade visual",year:"2026",color:"rose",description:"Uma nova perspectiva para começar.",challenge:"Apresentar uma marca criativa com personalidade e leveza.",solution:"Uma proposta editorial que combina cores suaves e tipografia expressiva.",published:true},
    {slug:"vertice",title:"Vértice",category:"Experiência digital · Desenvolvimento",year:"2026",color:"ink",description:"Ideias que encontram seu próximo nível.",challenge:"Transformar uma proposta complexa em uma apresentação objetiva.",solution:"Uma experiência conceitual com alto contraste e uma hierarquia de informação precisa.",published:true},
    {
      slug: "forma",
      title: "Forma",
      category: "Branding · Website",
      year: "2026",
      color: "sand",
      description: "Um novo olhar para os espaços que habitamos.",
      challenge:
        "Traduzir uma linguagem arquitetônica essencial em uma experiência digital acolhedora, clara e contemporânea.",
      solution:
        "Uma direção visual editorial, com tipografia expressiva, composições generosas e navegação que coloca o conteúdo em primeiro plano.",
      published: true,
    },
    {
      slug: "orbit",
      title: "Orbit",
      category: "Produto digital · UI/UX",
      year: "2026",
      color: "lime",
      description: "Menos ruído. Mais espaço para suas ideias.",
      challenge:
        "Organizar informações complexas em uma interface simples, com uma hierarquia que facilita cada decisão.",
      solution:
        "Um sistema visual modular e um painel com foco nas tarefas essenciais, desenhado para se adaptar a diferentes telas.",
      published: true,
    },
    {
      slug: "essencia",
      title: "Essência",
      category: "E-commerce · Direção de arte",
      year: "2026",
      color: "clay",
      description: "O essencial encontra uma nova expressão.",
      challenge:
        "Criar uma presença digital sensível, aproximando produto, propósito e experiência de compra.",
      solution:
        "Cores orgânicas, ritmo visual tranquilo e uma apresentação de produto que valoriza seus detalhes.",
      published: true,
    },
  ],
};
export const services = [
  [
    "Desenvolvimento Web",
    "Sites rápidos, responsivos e pensados para transformar visitantes em novas oportunidades.",
  ],
  [
    "Design UI/UX",
    "Interfaces intuitivas que conectam as necessidades das pessoas aos objetivos do seu negócio.",
  ],
  [
    "Aplicativos Web Mobile",
    "Experiências digitais que acompanham seus clientes em qualquer tela.",
  ],
  [
    "Soluções em IA",
    "Automação e inteligência aplicadas a desafios reais, com propósito e simplicidade.",
  ],
  [
    "Plataformas SaaS",
    "Do primeiro protótipo a um produto pronto para evoluir com o seu negócio.",
  ],
  [
    "Identidade Visual",
    "Sistemas visuais consistentes para marcas que querem deixar sua própria marca.",
  ],
];
