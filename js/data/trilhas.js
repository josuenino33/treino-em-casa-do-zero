// Trilhas de progressão: cada trilha é um padrão de movimento com níveis do
// mais fácil ao mais difícil. Você só sobe quando domina o nível atual.
//
// Campos de cada nível:
//   nome, metrica ('reps' | 'segundos'), min, max, series, porLado,
//   equipamento (null | 'barra'), como[], dicas[], erros[]

const nivel = (nome, metrica, min, max, extra = {}) => ({
  nome,
  metrica,
  min,
  max,
  series: 3,
  porLado: false,
  equipamento: null,
  como: [],
  dicas: [],
  erros: [],
  ...extra,
});

export const TRILHAS = [
  {
    id: 'agachamento',
    nome: 'Agachamento',
    grupo: 'Coxas e glúteos',
    icone: 'agachamento',
    desbloqueio: null,
    niveis: [
      nivel('Sentar e levantar com apoio', 'reps', 8, 12, {
        como: [
          'Use uma cadeira firme encostada na parede, pés na largura do quadril.',
          'Sente devagar, contando 3 segundos.',
          'Levante empurrando o chão com os pés. Use as mãos nos joelhos só o necessário.',
        ],
        dicas: ['Os joelhos apontam na mesma direção dos pés.', 'Solte o ar ao levantar.'],
        erros: ['Despencar na cadeira no fim da descida.', 'Joelhos se fechando para dentro.'],
      }),
      nivel('Sentar e levantar sem as mãos', 'reps', 8, 12, {
        como: [
          'Mesma cadeira firme. Cruze os braços no peito ou estenda-os à frente.',
          'Desça em 3 segundos até sentar de leve.',
          'Incline o tronco um pouco à frente e levante sem impulso.',
        ],
        dicas: ['Peso distribuído no pé inteiro, não só na ponta.'],
        erros: ['Balançar o corpo para ganhar impulso.'],
      }),
      nivel('Agachamento segurando em apoio', 'reps', 10, 15, {
        como: [
          'Segure no batente de uma porta ou na beirada da pia.',
          'Leve o quadril para trás e para baixo, como se fosse sentar.',
          'Desça até onde conseguir sem dor e suba. As mãos só ajudam no equilíbrio.',
        ],
        dicas: ['Vá aumentando a profundidade a cada treino.'],
        erros: ['Puxar o corpo com os braços em vez de usar as pernas.'],
      }),
      nivel('Agachamento até a cadeira', 'reps', 10, 15, {
        como: [
          'Fique em pé na frente da cadeira, sem segurar em nada.',
          'Desça até o bumbum tocar o assento de leve.',
          'Suba sem sentar e sem relaxar lá embaixo.',
        ],
        dicas: ['A cadeira é só um guia de profundidade.'],
        erros: ['Sentar e descansar entre as repetições.'],
      }),
      nivel('Agachamento livre', 'reps', 10, 15, {
        como: [
          'Pés um pouco mais abertos que o quadril, pontas levemente para fora.',
          'Desça com o peito aberto até as coxas ficarem perto da horizontal.',
          'Suba empurrando o chão com o pé inteiro.',
        ],
        dicas: ['Braços estendidos à frente ajudam no equilíbrio.'],
        erros: ['Calcanhar saindo do chão.', 'Arredondar as costas.'],
      }),
      nivel('Agachamento com pausa', 'reps', 8, 12, {
        como: [
          'Faça o agachamento livre.',
          'Segure 2 segundos na posição mais baixa, sem se mexer.',
          'Suba com força, sem quicar.',
        ],
        dicas: ['A pausa tira o embalo: as pernas trabalham mais.'],
        erros: ['Encurtar a descida para aguentar a pausa.'],
      }),
      nivel('Agachamento com mochila', 'reps', 10, 15, {
        como: [
          'Abrace uma mochila com 5–10 kg (livros, garrafas de água) junto ao peito.',
          'Agache como no agachamento livre.',
          'Mantenha o peito aberto durante todo o movimento.',
        ],
        dicas: ['Aumente o peso da mochila aos poucos.'],
        erros: ['Deixar a mochila puxar o tronco para frente.'],
      }),
      nivel('Agachamento com mochila e descida lenta', 'reps', 8, 12, {
        como: [
          'Com a mochila abraçada no peito, desça contando 3 segundos.',
          'Pause 1 segundo embaixo.',
          'Suba em 1 segundo.',
        ],
        dicas: ['Controle é mais importante que velocidade.'],
        erros: ['Acelerar a descida no fim da série.'],
      }),
    ],
  },
  {
    id: 'empurrar',
    nome: 'Flexão',
    grupo: 'Peito, ombros e tríceps',
    icone: 'flexao',
    desbloqueio: null,
    niveis: [
      nivel('Flexão na parede', 'reps', 10, 15, {
        como: [
          'De frente para a parede, mãos na altura dos ombros, um pouco mais abertas que eles.',
          'Afaste os pés até o corpo ficar levemente inclinado.',
          'Dobre os cotovelos até o peito chegar perto da parede e empurre de volta.',
        ],
        dicas: ['Quanto mais longe os pés, mais difícil.'],
        erros: ['Quebrar o quadril para trás.'],
      }),
      nivel('Flexão na pia ou bancada', 'reps', 8, 12, {
        como: [
          'Mãos na borda de uma bancada firme (cerca de 90 cm de altura).',
          'Corpo reto da cabeça aos calcanhares, como uma tábua.',
          'Desça o peito até a borda e empurre.',
        ],
        dicas: ['Contraia barriga e glúteo para o corpo não ceder.'],
        erros: ['Cotovelos muito abertos, em forma de T.'],
      }),
      nivel('Flexão na mesa', 'reps', 8, 12, {
        como: [
          'Mãos na borda de uma mesa firme (cerca de 75 cm), encostada na parede.',
          'Corpo reto, cotovelos a uns 45° do tronco.',
          'Desça até o peito quase tocar a mesa e empurre.',
        ],
        dicas: ['Confira se a mesa não escorrega antes de começar.'],
        erros: ['Fazer só meio movimento.'],
      }),
      nivel('Flexão no sofá ou cadeira', 'reps', 8, 12, {
        como: [
          'Mãos no assento de um sofá firme ou de uma cadeira encostada na parede.',
          'Corpo reto, pés juntos ou levemente afastados.',
          'Desça até o peito chegar perto do assento e empurre.',
        ],
        dicas: ['Olhe um pouco à frente das mãos, não para os pés.'],
        erros: ['Deixar a barriga afundar.'],
      }),
      nivel('Flexão no degrau baixo', 'reps', 8, 12, {
        como: [
          'Mãos num degrau de escada ou banquinho firme (cerca de 20–30 cm).',
          'Corpo reto e firme.',
          'Desça controlando e empurre o degrau para longe.',
        ],
        dicas: ['Este é o último passo antes do chão.'],
        erros: ['Levantar o quadril primeiro na subida.'],
      }),
      nivel('Flexão no chão', 'reps', 6, 12, {
        como: [
          'Mãos no chão um pouco mais abertas que os ombros, pés juntos.',
          'Corpo reto da cabeça aos calcanhares.',
          'Desça até o peito ficar a um palmo do chão e empurre.',
        ],
        dicas: ['Se não fechar a série, termine as últimas no degrau.'],
        erros: ['Cabeça caindo antes do peito.', 'Quadril afundando.'],
      }),
      nivel('Flexão com descida lenta', 'reps', 6, 10, {
        como: [
          'Flexão no chão, descendo em 3 segundos.',
          'Pause 1 segundo embaixo, sem encostar.',
          'Suba em 1 segundo.',
        ],
        dicas: ['A descida lenta constrói força rápido.'],
        erros: ['Perder a forma para aguentar o tempo.'],
      }),
      nivel('Flexão com pés elevados', 'reps', 6, 10, {
        como: [
          'Pés num degrau ou no sofá, mãos no chão.',
          'Corpo reto e firme.',
          'Desça até o peito chegar perto do chão e empurre.',
        ],
        dicas: ['Comece com os pés numa altura baixa.'],
        erros: ['Dobrar o quadril para aliviar.'],
      }),
      nivel('Flexão diamante', 'reps', 6, 10, {
        como: [
          'Mãos juntas embaixo do peito, polegares e indicadores formando um losango.',
          'Cotovelos perto do corpo.',
          'Desça até o peito tocar as mãos e empurre.',
        ],
        dicas: ['Trabalha mais o tríceps.'],
        erros: ['Abrir os cotovelos para fora.'],
      }),
      nivel('Flexão arqueiro', 'reps', 5, 8, {
        porLado: true,
        como: [
          'Mãos bem afastadas no chão.',
          'Desça levando o peso para um braço, com o outro quase esticado.',
          'Suba e alterne o lado.',
        ],
        dicas: ['É a preparação para a flexão de um braço só.'],
        erros: ['Girar o tronco.'],
      }),
    ],
  },
  {
    id: 'puxar',
    nome: 'Remada',
    grupo: 'Costas e bíceps',
    icone: 'remada',
    desbloqueio: null,
    niveis: [
      nivel('Remada com mochila leve', 'reps', 10, 15, {
        porLado: true,
        como: [
          'Mochila com 3–5 kg numa mão. A outra mão e o joelho do mesmo lado apoiados numa cadeira ou mesa.',
          'Costas retas, braço esticado para baixo.',
          'Puxe o cotovelo para trás, rente ao corpo, e desça devagar.',
        ],
        dicas: ['Pense em levar o cotovelo até o bolso de trás.'],
        erros: ['Girar o tronco para puxar.', 'Encolher o ombro na orelha.'],
      }),
      nivel('Remada com mochila pesada', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Mesma posição, com a mochila mais pesada (6–10 kg).',
          'Puxe o cotovelo para trás com controle.',
          'Desça em 2 segundos.',
        ],
        dicas: ['Garrafas de água de 1,5 L pesam 1,5 kg cada.'],
        erros: ['Dar tranco na subida.'],
      }),
      nivel('Remada com mochila e pausa', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Puxe a mochila até o lado do corpo.',
          'Segure 2 segundos lá em cima, apertando as costas.',
          'Desça devagar.',
        ],
        dicas: ['Sem barra? Fique neste nível aumentando o peso da mochila.'],
        erros: ['Diminuir a amplitude para segurar a pausa.'],
      }),
      nivel('Remada invertida alta', 'reps', 8, 12, {
        equipamento: 'barra',
        como: [
          'Use uma barra na altura do peito (academia ao ar livre, praça ou parquinho).',
          'Segure a barra e incline o corpo para trás, pés à frente, quase em pé.',
          'Puxe o peito até a barra e desça devagar.',
        ],
        dicas: ['Quanto mais em pé, mais fácil.'],
        erros: ['Quadril dobrando: o corpo fica reto como na prancha.'],
      }),
      nivel('Remada invertida na cintura', 'reps', 8, 12, {
        equipamento: 'barra',
        como: [
          'Barra na altura da cintura.',
          'Corpo mais inclinado, calcanhares no chão.',
          'Puxe o peito até a barra e desça devagar.',
        ],
        dicas: ['Aperte as escápulas no topo.'],
        erros: ['Puxar só com os braços, sem fechar as costas.'],
      }),
      nivel('Remada invertida baixa', 'reps', 6, 10, {
        equipamento: 'barra',
        como: [
          'Barra na altura do quadril ou mais baixa.',
          'Corpo quase horizontal, reto da cabeça aos pés.',
          'Puxe até o peito encostar na barra.',
        ],
        dicas: ['Dobrar os joelhos deixa um pouco mais fácil.'],
        erros: ['Esticar o pescoço para alcançar a barra.'],
      }),
      nivel('Barra fixa negativa', 'reps', 3, 6, {
        equipamento: 'barra',
        como: [
          'Barra alta. Suba com a ajuda de um banco ou de um pulo até o queixo passar a barra.',
          'Desça o mais devagar que conseguir (3 a 5 segundos).',
          'Volte ao banco e repita.',
        ],
        dicas: ['Descanse bem entre as séries.'],
        erros: ['Soltar o corpo no fim da descida.'],
      }),
      nivel('Barra fixa', 'reps', 3, 8, {
        equipamento: 'barra',
        como: [
          'Pendure-se na barra com as mãos na largura dos ombros.',
          'Puxe até o queixo passar a barra.',
          'Desça até os braços quase esticarem.',
        ],
        dicas: ['Parabéns: poucas pessoas chegam aqui.'],
        erros: ['Balançar as pernas para subir.'],
      }),
    ],
  },
  {
    id: 'afundo',
    nome: 'Afundo',
    grupo: 'Pernas, uma de cada vez',
    icone: 'afundo',
    desbloqueio: { trilha: 'agachamento', nivel: 4 },
    niveis: [
      nivel('Subida no degrau baixo', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Use um degrau de 15–20 cm e segure no corrimão ou na parede.',
          'Coloque o pé inteiro no degrau e suba empurrando com essa perna.',
          'Desça devagar com a mesma perna. Faça todas de um lado e depois troque.',
        ],
        dicas: ['A perna de baixo só acompanha.'],
        erros: ['Dar impulso com a perna de trás.'],
      }),
      nivel('Subida no degrau alto', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Degrau ou banquinho firme de 30–40 cm.',
          'Suba com o pé inteiro apoiado.',
          'Desça controlando, sem cair.',
        ],
        dicas: ['Incline o tronco um pouco à frente.'],
        erros: ['Joelho se fechando para dentro na subida.'],
      }),
      nivel('Afundo para trás com apoio', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Segure numa cadeira ou na parede.',
          'Dê um passo longo para trás e desça o joelho de trás até perto do chão.',
          'Volte empurrando com o calcanhar da perna da frente.',
        ],
        dicas: ['Passo para trás é mais leve para o joelho do que para frente.'],
        erros: ['Bater o joelho no chão.'],
      }),
      nivel('Afundo para trás livre', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Mãos na cintura, sem apoio.',
          'Passo longo para trás, desça com o tronco reto.',
          'Volte à posição inicial.',
        ],
        dicas: ['Olhe para um ponto fixo à frente para ter equilíbrio.'],
        erros: ['Passo curto demais, que joga o joelho da frente muito à frente.'],
      }),
      nivel('Afundo andando', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Dê um passo longo à frente e desça.',
          'Suba trazendo a perna de trás direto para o próximo passo.',
          'Alterne as pernas andando (um corredor ajuda).',
        ],
        dicas: ['Conte as repetições de cada perna.'],
        erros: ['Pisar com os pés na mesma linha (fica instável).'],
      }),
      nivel('Agachamento búlgaro', 'reps', 8, 12, {
        porLado: true,
        como: [
          'De costas para o sofá, apoie o peito do pé de trás no assento.',
          'Pé da frente bem à frente.',
          'Desça até a coxa da frente ficar quase na horizontal e suba.',
        ],
        dicas: ['Segure numa parede nas primeiras semanas.'],
        erros: ['Pé da frente perto demais do sofá.'],
      }),
      nivel('Búlgaro com mochila', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Mesmo agachamento búlgaro, abraçando a mochila no peito.',
          'Desça em 2 segundos.',
          'Suba firme.',
        ],
        dicas: ['Comece com pouco peso: equilíbrio primeiro.'],
        erros: ['Tronco despencando à frente.'],
      }),
      nivel('Agachamento unilateral na cadeira', 'reps', 5, 8, {
        porLado: true,
        como: [
          'Em pé na frente da cadeira, levante uma perna à frente.',
          'Sente devagar só com a outra perna.',
          'Levante sem tirar a perna do ar. No começo, use a mão na parede.',
        ],
        dicas: ['Uma cadeira mais alta deixa mais fácil.'],
        erros: ['Despencar na cadeira.'],
      }),
    ],
  },
  {
    id: 'quadril',
    nome: 'Ponte de glúteo',
    grupo: 'Glúteos e posterior de coxa',
    icone: 'ponte',
    desbloqueio: null,
    niveis: [
      nivel('Ponte de glúteo', 'reps', 10, 15, {
        como: [
          'Deite de barriga para cima, joelhos dobrados, pés no chão na largura do quadril.',
          'Suba o quadril até formar uma linha reta dos ombros aos joelhos.',
          'Aperte o glúteo lá em cima e desça devagar.',
        ],
        dicas: ['Empurre o chão com os calcanhares.'],
        erros: ['Arquear a lombar em vez de subir com o glúteo.'],
      }),
      nivel('Ponte com pausa', 'reps', 10, 15, {
        como: [
          'Mesma ponte de glúteo.',
          'Segure 3 segundos no alto, apertando o glúteo.',
          'Desça em 2 segundos.',
        ],
        dicas: ['Se sentir a lombar, suba um pouco menos.'],
        erros: ['Deixar o quadril cair durante a pausa.'],
      }),
      nivel('Elevação de quadril no sofá', 'reps', 10, 15, {
        como: [
          'Sente no chão e apoie a parte de cima das costas na beirada do sofá.',
          'Pés no chão, joelhos dobrados.',
          'Suba o quadril até o tronco ficar reto e desça.',
        ],
        dicas: ['O queixo fica levemente para baixo.'],
        erros: ['Empurrar com a lombar.'],
      }),
      nivel('Ponte unilateral', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Posição da ponte, com uma perna esticada no ar.',
          'Suba o quadril com a perna que está apoiada.',
          'Desça devagar e troque de lado depois da série.',
        ],
        dicas: ['O quadril não pode tombar para o lado.'],
        erros: ['Girar o quadril.'],
      }),
      nivel('Elevação de quadril com mochila', 'reps', 10, 15, {
        como: [
          'Posição da elevação no sofá, com a mochila apoiada sobre o quadril.',
          'Segure a mochila com as mãos.',
          'Suba e desça controlando.',
        ],
        dicas: ['Uma toalha dobrada embaixo da mochila deixa mais confortável.'],
        erros: ['Subir rápido demais.'],
      }),
      nivel('Elevação de quadril unilateral no sofá', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Costas no sofá, uma perna no ar.',
          'Suba o quadril com a perna apoiada.',
          'Desça devagar.',
        ],
        dicas: ['Faça primeiro o lado mais fraco.'],
        erros: ['O quadril tombar para o lado da perna no ar.'],
      }),
      nivel('Elevação unilateral com mochila', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Elevação unilateral no sofá com a mochila sobre o quadril.',
          'Pause 1 segundo no alto.',
          'Desça em 2 segundos.',
        ],
        dicas: ['Glúteo forte protege joelhos e lombar.'],
        erros: ['Perder a linha reta no alto.'],
      }),
    ],
  },
  {
    id: 'prancha',
    nome: 'Prancha',
    grupo: 'Abdômen e lombar',
    icone: 'prancha',
    desbloqueio: null,
    niveis: [
      nivel('Prancha inclinada', 'segundos', 20, 40, {
        como: [
          'Antebraços apoiados numa mesa firme ou na beirada da pia.',
          'Afaste os pés até o corpo ficar reto e inclinado.',
          'Contraia a barriga e o glúteo e segure.',
        ],
        dicas: ['Respire normalmente: não prenda o ar.'],
        erros: ['Quadril para trás, em forma de V.'],
      }),
      nivel('Prancha de joelhos', 'segundos', 20, 40, {
        como: [
          'Antebraços no chão, cotovelos embaixo dos ombros.',
          'Joelhos apoiados, corpo reto dos ombros aos joelhos.',
          'Segure contraindo a barriga.',
        ],
        dicas: ['Use um tapete ou toalha para os joelhos.'],
        erros: ['Bumbum para o alto.'],
      }),
      nivel('Prancha', 'segundos', 20, 40, {
        como: [
          'Antebraços no chão, cotovelos embaixo dos ombros.',
          'Pernas esticadas, com o peso nas pontas dos pés.',
          'Corpo reto da cabeça aos calcanhares.',
        ],
        dicas: ['Aperte o glúteo: protege a lombar.'],
        erros: ['Lombar afundando.', 'Olhar para frente, forçando o pescoço.'],
      }),
      nivel('Prancha longa', 'segundos', 40, 60, {
        como: [
          'Mesma prancha, segurando mais tempo.',
          'Se a forma quebrar, pare: a série acabou.',
        ],
        dicas: ['Qualidade vale mais que tempo.'],
        erros: ['Segurar com a lombar afundada só para bater o tempo.'],
      }),
      nivel('Prancha com toque no ombro', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Prancha com as mãos no chão e os braços esticados, pés afastados.',
          'Toque o ombro oposto com uma mão, sem girar o quadril.',
          'Alterne os lados devagar.',
        ],
        dicas: ['Pés mais afastados deixam mais fácil.'],
        erros: ['Quadril balançando de um lado para o outro.'],
      }),
      nivel('Prancha com elevação de perna', 'reps', 6, 10, {
        porLado: true,
        como: [
          'Prancha nos antebraços.',
          'Levante uma perna esticada a um palmo do chão e segure 2 segundos.',
          'Desça e alterne.',
        ],
        dicas: ['O movimento é pequeno: a lombar não se mexe.'],
        erros: ['Levantar a perna alto demais e arquear as costas.'],
      }),
      nivel('Prancha com pés elevados', 'segundos', 30, 45, {
        como: [
          'Antebraços no chão e pés num degrau ou no sofá.',
          'Corpo reto.',
          'Segure contraindo barriga e glúteo.',
        ],
        dicas: ['Comece com uma altura baixa.'],
        erros: ['Quadril caindo.'],
      }),
    ],
  },
  {
    id: 'estabilidade',
    nome: 'Core e estabilidade',
    grupo: 'Abdômen profundo e laterais',
    icone: 'core',
    desbloqueio: null,
    niveis: [
      nivel('Dead bug só pernas', 'reps', 6, 10, {
        porLado: true,
        como: [
          'Deite de barriga para cima, joelhos dobrados no alto (90°) e braços apontando para o teto.',
          'Cole a lombar no chão.',
          'Desça um calcanhar até tocar o chão, volte e alterne.',
        ],
        dicas: ['Solte o ar enquanto a perna desce.'],
        erros: ['A lombar descolar do chão.'],
      }),
      nivel('Dead bug completo', 'reps', 6, 10, {
        porLado: true,
        como: [
          'Mesma posição inicial.',
          'Estenda ao mesmo tempo um braço para trás e a perna oposta para frente.',
          'Volte e alterne os lados.',
        ],
        dicas: ['Devagar: o difícil é manter a lombar colada.'],
        erros: ['Fazer rápido e perder o controle.'],
      }),
      nivel('Dead bug com pausa', 'reps', 6, 10, {
        porLado: true,
        como: [
          'Dead bug completo.',
          'Segure 3 segundos com braço e perna estendidos.',
          'Volte e alterne.',
        ],
        dicas: ['Perna mais baixa é mais difícil.'],
        erros: ['Prender a respiração.'],
      }),
      nivel('Prancha lateral de joelhos', 'segundos', 15, 30, {
        porLado: true,
        como: [
          'Deite de lado, com o antebraço no chão e o cotovelo embaixo do ombro.',
          'Joelhos dobrados e apoiados.',
          'Suba o quadril até formar uma linha reta e segure.',
        ],
        dicas: ['Mão livre na cintura.'],
        erros: ['Quadril caindo para trás.'],
      }),
      nivel('Prancha lateral', 'segundos', 15, 30, {
        porLado: true,
        como: [
          'De lado, com o antebraço no chão, pernas esticadas e pés um sobre o outro.',
          'Suba o quadril até o corpo ficar reto.',
          'Segure e troque de lado.',
        ],
        dicas: ['Pés um à frente do outro deixam mais estável.'],
        erros: ['Ombro afundando.'],
      }),
      nivel('Prancha lateral longa', 'segundos', 30, 45, {
        porLado: true,
        como: ['Mesma prancha lateral, por mais tempo.', 'Corpo reto do início ao fim.'],
        dicas: ['Se a forma quebrar, encerre a série.'],
        erros: ['Rodar o tronco para baixo.'],
      }),
      nivel('Prancha lateral com elevação de quadril', 'reps', 8, 12, {
        porLado: true,
        como: [
          'Na prancha lateral, desça o quadril até quase tocar o chão.',
          'Suba de volta até a linha reta.',
          'Faça todas de um lado e depois troque.',
        ],
        dicas: ['Movimento lento e controlado.'],
        erros: ['Usar impulso.'],
      }),
    ],
  },
];

// Ordem dos exercícios no treino: começa pelas pernas e alterna grupos.
export const ORDEM_TREINO = ['agachamento', 'empurrar', 'puxar', 'afundo', 'quadril', 'prancha', 'estabilidade'];

const POR_ID = new Map(TRILHAS.map((t) => [t.id, t]));

export function trilha(id) {
  return POR_ID.get(id) || null;
}

// Níveis são numerados a partir de 1 na interface e no estado.
export function nivelDe(trilhaId, numero) {
  const t = trilha(trilhaId);
  if (!t) return null;
  const n = Math.min(Math.max(1, numero), t.niveis.length);
  return t.niveis[n - 1];
}

export function rotuloFaixa(nv) {
  const unidade = nv.metrica === 'segundos' ? ' s' : '';
  const lado = nv.porLado ? ' cada lado' : '';
  return `${nv.series} × ${nv.min}–${nv.max}${unidade}${lado}`;
}

export function linkVideo(nv) {
  const termo = `${nv.nome} execução correta`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(termo)}`;
}
