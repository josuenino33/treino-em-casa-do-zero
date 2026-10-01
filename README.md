# Trilha · treino com peso do corpo

App web para quem está começando do zero (inclusive com bastante peso a perder) e quer ganhar força, fôlego e perder gordura **aos poucos**, sem academia. Funciona no celular como um app instalado, inclusive sem internet, e todos os dados ficam só no seu aparelho.

> Este app é uma ferramenta de apoio e não substitui acompanhamento de médico, nutricionista ou profissional de educação física.

## O que ele faz

| Área | Recursos |
|---|---|
| **Trilhas de evolução** | 7 trilhas (agachamento, flexão, remada, afundo, ponte de glúteo, prancha, core) com 55 níveis, do "sentar e levantar da cadeira" até a barra fixa. Cada nível tem execução passo a passo, dica, erro comum e link para vídeos. |
| **Treino guiado** | Check-in (duração e dor articular), aquecimento, metas série a série, contador de repetições, cronômetro para prancha, descanso cronometrado com bipe e vibração, tela sempre ligada, pergunta de esforço e resumo com sugestão de subir ou voltar de nível. Dá para fechar o app no meio e continuar depois. |
| **Fases do programa** | Adaptação (sem. 1–4), Construção (5–8), Evolução (9–16) e Domínio (17+), com semana leve a cada 8 semanas. |
| **Caminhada** | Meta que cresce 5 min por semana (20 → 60 min), cronômetro com avisos de troca de ritmo na intervalada, caminhada com subidas a partir da fase 3. |
| **Teste de evolução** | A cada 4 semanas: flexões, sentar e levantar em 30 s, prancha máxima e batimentos em repouso. O primeiro teste define os níveis de partida. |
| **Progresso** | Peso com média de 7 dias e ritmo semanal, cintura e outras medidas, mapa de constância, séries e minutos por semana, fotos de antes e depois (com comparação) e tabela equivalente em todos os gráficos. |
| **Nutrição** | Metas estimadas de calorias (Mifflin-St Jeor), proteína e água, IMC, marcos a cada 5 kg, guia do prato, tabela de proteína dos alimentos e hábitos diários com constância. |
| **Conquistas** | 32 conquistas de constância, força, corpo, fôlego e hábitos. |
| **Extras** | Instalável (PWA), offline, tema claro/escuro, lembretes para o calendário (.ics), backup e restauração em arquivo, sem cadastro e sem servidor. |

## Como a progressão funciona

É a **dupla progressão**, a mesma usada em treino de força tradicional:

1. Cada nível tem uma faixa, por exemplo **3 × 8–12**.
2. O app sugere a meta de cada série: um pouco mais que da última vez (+1 repetição ou +5 segundos), dentro da faixa.
3. Você para cada série **com 1 ou 2 repetições sobrando**. No fim do exercício, o app pergunta quanto sobrou.
4. Quando você faz o **topo da faixa em todas as séries, sem chegar ao limite, em 2 treinos seguidos**, o app sugere subir de nível.
5. Se você marcar dor articular, ou ficar abaixo da faixa em 2 treinos seguidos, ele sugere voltar um nível.

Detalhes que evitam armadilhas:

- Treino **curto** (2 séries) conta como treino, mas não conta para subir de nível nem quebra a sequência.
- O **afundo** só entra no treino quando o agachamento chega ao nível 4, para as pernas ganharem base antes.
- Os níveis avançados de **remada** precisam de uma barra (praça ou academia ao ar livre). Sem barra, você continua no nível com mochila, aumentando o peso.
- Cada trilha anda no seu ritmo: é normal estar no nível 5 da flexão e no 2 da prancha.

As regras estão em [`js/logic/progressao.js`](js/logic/progressao.js) e têm testes em [`tests/progressao.test.js`](tests/progressao.test.js).

## Publicar no GitHub

O repositório já vem com um workflow ([`.github/workflows/publicar.yml`](.github/workflows/publicar.yml)) que roda os testes e publica o site no **GitHub Pages** a cada push na branch `main`.

### Com o GitHub Desktop

1. Abra o GitHub Desktop e escolha **File → Add local repository…** e selecione esta pasta.
2. Clique em **Publish repository**. Dê um nome (por exemplo `trilha-treino`) e escolha se quer público ou privado. O GitHub Pages gratuito exige repositório **público**.
3. No site do GitHub, abra o repositório e vá em **Settings → Pages**. Em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Vá na aba **Actions** e rode o workflow **Testar e publicar** (ou faça qualquer novo commit). Quando terminar, o app estará em:
   `https://SEU-USUARIO.github.io/trilha-treino/`
5. Opcional: coloque o endereço do repositório em [`js/versao.js`](js/versao.js) (`URL_REPOSITORIO`) para aparecer um link na tela "Mais".

### Pela linha de comando

```bash
git remote add origin https://github.com/SEU-USUARIO/trilha-treino.git
git push -u origin main
```

Depois siga os passos 3 e 4 acima.

### Instalar no celular

Abra o endereço do GitHub Pages no celular:

- **Android (Chrome):** menu ⋮ → **Instalar app**, ou o botão em **Mais → Ajustes**.
- **iPhone (Safari):** botão Compartilhar → **Adicionar à Tela de Início**.

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo. Não há dependências para instalar.

```bash
npm start
```

Abra http://localhost:5173. Os módulos JavaScript não funcionam abrindo o `index.html` direto do disco, por isso o servidor.

```bash
npm test
```

Roda os testes da lógica (progressão, plano, nutrição, estatísticas, conquistas, backup) e confere a estrutura do projeto, por exemplo se todo arquivo novo foi incluído no cache offline do `sw.js`.

Para regerar os ícones PNG a partir do desenho (precisa de Python com Pillow):

```bash
npm run icones
```

## Estrutura

```
index.html              casca da página
manifest.webmanifest    dados para instalar como app
sw.js                   cache offline (lista todos os arquivos do app)
css/app.css             estilos, com tema claro e escuro
js/
  main.js               rotas e casca
  versao.js             versão e link do repositório
  core/                 datas, estado salvo, migrações, fotos (IndexedDB)
  data/                 trilhas e níveis, conteúdo do guia
  logic/                regras puras: progressão, plano, nutrição, números, conquistas, calendário
  ui/                   componentes, gráficos SVG, ícones, som, tema
  views/                uma tela por arquivo
tests/                  testes com o test runner do Node
scripts/                servidor local e gerador de ícones
```

Sem frameworks e sem etapa de build: o que está no repositório é o que vai para o ar.

## Privacidade

- Os dados ficam no `localStorage` e as fotos no `IndexedDB` do navegador. Nada é enviado para servidor nenhum.
- Limpar os dados do navegador apaga o histórico. Use **Mais → Ajustes → Baixar backup** de vez em quando e guarde o arquivo num lugar seguro.
- O backup pode incluir as fotos (opcional). Trate esse arquivo como algo pessoal.

## Licença

[MIT](LICENSE).
