// Conteúdo educativo do app. Linguagem direta, sem promessas milagrosas.

export const ARTIGOS = [
  {
    id: 'como-funciona',
    titulo: 'Como o Trilha funciona',
    icone: 'trilha',
    paragrafos: [
      'Cada padrão de movimento (agachar, empurrar, puxar, ponte, prancha e core) é uma trilha com vários níveis, do mais fácil ao mais difícil.',
      'Você treina força 3 vezes por semana, em dias alternados, e caminha em outros 3 dias. Domingo é descanso.',
      'Dentro de cada nível, a meta é ir aumentando as repetições até o topo da faixa (por exemplo, de 8 até 12). Quando você faz o topo em todas as séries, sem chegar ao limite, em 2 treinos seguidos, o app sugere subir de nível.',
      'Cada trilha anda no seu ritmo. É normal estar no nível 5 da flexão e no nível 2 da prancha.',
    ],
  },
  {
    id: 'do-zero',
    titulo: 'Começando do zero',
    icone: 'coracao',
    paragrafos: [
      'Se você está parado há muito tempo, trabalha sentado e tem bastante peso a perder, o começo é a parte mais importante. O objetivo das primeiras semanas não é cansar: é acostumar articulações, tendões e coração com o movimento.',
      'Por isso o modo "Bem devagar" pede só 2 séries por exercício nas 4 primeiras semanas, 90 segundos de descanso e caminhada de 10 minutos. Se ainda for muito, faça o treino curto ou divida a caminhada em duas de 5 minutos.',
      'Braço cansar rápido é normal no começo, porque eles sustentam muito peso na flexão e na prancha. Pare a série quando sentir o braço "pesar", mesmo que seja na terceira repetição. O treino alterna braço e perna justamente para os braços descansarem.',
      'Os primeiros níveis (sentar e levantar, flexão na parede, prancha na mesa) parecem fáceis de propósito. Quando ficarem fáceis de verdade, o app sugere subir.',
      'Levantar da cadeira várias vezes ao dia ajuda tanto quanto o treino. Use as pausas ativas: 2 minutos a cada hora de trabalho.',
    ],
  },
  {
    id: 'falha',
    titulo: 'Por que parar antes do limite',
    icone: 'escudo',
    paragrafos: [
      'Termine cada série sentindo que ainda faria mais 1 ou 2 repetições. Treinar sempre até não aguentar mais deixa o corpo moído por dias, aumenta o risco de lesão e é o motivo número um de desistência.',
      'Força se constrói com constância. Um treino bom que você repete 3 vezes por semana vale muito mais que um treino destruidor que você faz uma vez e abandona.',
      'Por isso o app pergunta, depois de cada exercício, quanto sobrou. Se você foi ao limite, ele mantém a meta em vez de aumentar.',
    ],
  },
  {
    id: 'gordura',
    titulo: 'De onde vem a perda de gordura',
    icone: 'nutricao',
    paragrafos: [
      'A maior parte da perda de gordura vem da alimentação: comer um pouco menos do que o corpo gasta, todos os dias, por meses.',
      'O treino de força faz o corpo manter (e até ganhar) músculo enquanto você emagrece. Sem ele, parte do peso perdido é músculo, e o corpo fica com aspecto "murcho".',
      'A caminhada aumenta o gasto, melhora o fôlego e o humor, e quase não pesa nos joelhos.',
      'O que mais funciona no prato: proteína em toda refeição, cortar bebidas com açúcar e álcool, metade do prato com verdura e legume, e evitar beliscar entre as refeições.',
    ],
  },
  {
    id: 'pele',
    titulo: 'Pele e "pelanca"',
    icone: 'coracao',
    paragrafos: [
      'Perder de 0,5% a 1% do peso por semana dá tempo para a pele se adaptar e preserva músculo. Para 110 kg, isso dá de 0,5 a 1,1 kg por semana.',
      'O treino de força preenche o espaço com músculo: é o que mais evita o aspecto flácido.',
      'Proteína suficiente, boa hidratação, sono e não fumar também ajudam a pele.',
      'Uma parte depende de genética, idade e de quanto tempo o peso esteve alto. Jovens costumam ter boa elasticidade. Se sobrar pele no fim, um dermatologista ou cirurgião plástico pode avaliar.',
    ],
  },
  {
    id: 'dor',
    titulo: 'Dor muscular × dor articular',
    icone: 'alerta',
    paragrafos: [
      'Dor muscular tardia (aquela que aparece 1 a 2 dias depois, espalhada pelo músculo) é normal, principalmente nas primeiras semanas. Ela diminui com a constância.',
      'Dor articular (pontada no joelho, ombro, lombar ou punho durante o movimento) não é normal. Se acontecer, pare aquele exercício, volte um nível ou diminua a amplitude.',
      'Marque "Senti dor" no fim do exercício. O app sugere voltar um nível na próxima vez.',
      'Dor que persiste por mais de uma semana, inchaço ou estalo com dor: procure um médico ou fisioterapeuta.',
    ],
  },
  {
    id: 'alerta',
    titulo: 'Sinais para parar na hora',
    icone: 'coracao',
    alerta: true,
    paragrafos: [
      'Pare o treino e procure atendimento se sentir: dor ou aperto no peito, falta de ar muito maior do que o esforço justifica, tontura ou visão escura, palpitação forte, ou dor que irradia para o braço, pescoço ou mandíbula.',
      'Antes de começar, se possível, faça um check-up: pressão, glicemia e colesterol. Se você tem pressão alta, diabetes, problema cardíaco ou usa remédios contínuos, converse com seu médico antes.',
      'Este app não substitui acompanhamento de médico, nutricionista ou profissional de educação física.',
    ],
  },
  {
    id: 'medicao',
    titulo: 'Passos e distância: como o app mede',
    icone: 'caminhada',
    paragrafos: [
      'Passos vêm do sensor de movimento do celular. O app só conta depois de 6 passos seguidos com ritmo de caminhada, descarta picos rápidos demais e bloqueia a contagem quando o celular é chacoalhado. Batidas soltas, como pôr o celular na mesa, não viram passos.',
      'Distância e velocidade vêm do GPS. Leituras com precisão pior que 25 m são ignoradas, saltos impossíveis a pé são descartados, e a tremida do GPS parado não soma distância. Se o sensor de passos diz que você está parado, a distância não sobe.',
      'Nenhum celular mede com 100% de exatidão: o GPS erra alguns metros e o sensor pode perder alguns passos. Os filtros foram feitos para errar para menos, nunca para inflar. Faça o teste de 100 passos para ver a precisão no seu aparelho.',
      'O navegador só deixa medir com o app aberto e a tela ligada. Use "Travar tela" para levar no bolso. Se o app for para segundo plano, esse tempo aparece como "sem medição" no resumo, em vez de números inventados.',
      'Sua localização e sua rota ficam só no seu aparelho. Nada é enviado para servidor nenhum.',
    ],
  },
  {
    id: 'sono',
    titulo: 'Sono e recuperação',
    icone: 'sono',
    paragrafos: [
      'O músculo cresce no descanso, não no treino. Por isso há pelo menos um dia entre os treinos de força.',
      'Dormir menos de 7 horas aumenta a fome (principalmente por doce), diminui a disposição e atrapalha a recuperação.',
      'A cada 8 semanas o app sugere uma semana leve, com 2 séries por exercício, para o corpo assimilar o progresso.',
    ],
  },
  {
    id: 'medir',
    titulo: 'Como medir o progresso',
    icone: 'balanca',
    paragrafos: [
      'Pese-se 2 ou 3 vezes por semana, pela manhã, em jejum e depois de ir ao banheiro. Olhe a média de 7 dias, não o número do dia: o peso oscila 1 a 2 kg só com água e sal.',
      'Meça a cintura na altura do umbigo a cada 2 semanas. Às vezes a balança trava, mas a cintura continua diminuindo: é gordura saindo e músculo entrando.',
      'Tire fotos de frente, de lado e de costas uma vez por mês, com a mesma luz e a mesma roupa.',
      'Refaça o teste de evolução a cada 4 semanas. Ver os números subindo é o melhor combustível.',
    ],
  },
];

export const DICAS = [
  'Contraia o abdômen antes de cada repetição, como se fosse levar um soco leve.',
  'Solte o ar na parte mais difícil do movimento.',
  'Beba um copo de água antes de cada refeição.',
  'Coloque a proteína no prato primeiro e monte o resto em volta.',
  'Troque o refrigerante por água com gás e limão.',
  'Deixe a roupa de treino separada na noite anterior.',
  'Use a escada sempre que puder: conta como movimento.',
  'Mastigue devagar: o corpo leva uns 20 minutos para sentir saciedade.',
  'Pesagem é dado, não julgamento. Olhe a média da semana.',
  'Treino curto feito vale mais que treino perfeito adiado.',
  'Durma e acorde em horários parecidos, inclusive no fim de semana.',
  'Descanse entre 60 e 90 segundos entre as séries.',
  'Ovos, frango, atum, carne moída, feijão e iogurte são proteínas baratas.',
  'Se faltou um treino, faça no dia seguinte e siga a semana normalmente.',
  'Não compare seu começo com o meio da jornada de outra pessoa.',
  'Calçado com bom amortecimento poupa os joelhos na caminhada.',
  'Alongue de leve depois do treino, não antes.',
  'Fome à noite costuma ser falta de proteína ou sono ruim.',
  'Prato colorido: quanto mais cores de vegetais, melhor.',
  'Comemore cada nível: é força nova que você construiu.',
];

export function dicaDoDia(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const indice = Math.floor(Date.UTC(a, m - 1, d) / 86400000);
  return DICAS[indice % DICAS.length];
}
