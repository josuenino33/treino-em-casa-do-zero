// Ajustes: perfil, agenda, treino, hábitos, aparência, instalação e backup.

import { apagarTudo, atualizar, espacoUsado, obter, substituir } from '../core/armazem.js';
import { NOMES_DIAS, ehISO, hojeISO } from '../core/datas.js';
import { HABITOS, lerBackup, montarBackup } from '../core/esquema.js';
import { apagarFotos, exportarFotos, importarFotos, listarFotos } from '../core/fotos.js';
import { gerarICS } from '../logic/calendario.js';
import { NIVEIS_ATIVIDADE } from '../logic/nutricao.js';
import { ordemSemana } from '../logic/plano.js';
import { abrirFolha, alternador, aviso, botao, campo, cartao, confirmar, entradaNumero, segmentado, toast } from '../ui/componentes.js';
import { baixarArquivo, h, lerArquivoTexto, num } from '../ui/dom.js';
import { ehIOS, instalar, jaInstalado, podeInstalar } from '../ui/instalar.js';
import { aplicarTema } from '../ui/tema.js';

const DIAS_ORDENADOS = [1, 2, 3, 4, 5, 6, 0];

const RITMOS = [
  { id: 'devagar', nome: 'Bem devagar (recomendado)', detalhe: '2 séries nas 4 primeiras semanas, caminhada a partir de 10 min, começa um nível abaixo do teste' },
  { id: 'normal', nome: 'Normal', detalhe: '3 séries desde o início, caminhada a partir de 20 min' },
];


function salvarPerfil(campoNome, valor) {
  atualizar((st) => {
    st.perfil[campoNome] = valor;
  });
}

function salvarConfig(campoNome, valor) {
  atualizar((st) => {
    st.config[campoNome] = valor;
  });
}

function seletorDias({ rotulo, valor, outros, aoMudar, minimo = 0, maximo = 7 }) {
  let atual = new Set(valor);
  const grupo = h('div', { class: 'dias-semana', role: 'group', 'aria-label': rotulo });
  const msg = h('p', { class: 'campo-dica' });
  const botoes = DIAS_ORDENADOS.map((d) => {
    const b = h('button', { type: 'button', class: 'dia-chip', 'aria-pressed': String(atual.has(d)) }, NOMES_DIAS[d]);
    b.addEventListener('click', () => {
      const novo = new Set(atual);
      if (novo.has(d)) novo.delete(d);
      else novo.add(d);
      if (novo.size < minimo) {
        msg.textContent = `Escolha pelo menos ${minimo} dias.`;
        return;
      }
      if (novo.size > maximo) {
        msg.textContent = `No máximo ${maximo} dias.`;
        return;
      }
      msg.textContent = outros().includes(d) && novo.has(d) ? 'Esse dia também tem outra atividade: tudo bem, mas descanso também conta.' : '';
      atual = novo;
      b.setAttribute('aria-pressed', String(atual.has(d)));
      aoMudar([...atual].sort((a, b2) => ordemSemana(a) - ordemSemana(b2)));
    });
    return b;
  });
  grupo.append(...botoes);
  return h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, rotulo), grupo, msg);
}

async function exportar(incluirFotos) {
  const e = obter();
  const fotos = incluirFotos ? await exportarFotos() : [];
  const json = JSON.stringify(montarBackup(e, fotos));
  baixarArquivo(`trilha-backup-${hojeISO()}.json`, json, 'application/json');
  toast('Backup baixado. Guarde num lugar seguro (Drive, e-mail).', { tipo: 'sucesso', duracao: 5000 });
}

async function importar(arquivo, ctx) {
  try {
    const texto = await lerArquivoTexto(arquivo);
    const { estado, fotos } = lerBackup(texto);
    const ok = await confirmar({
      titulo: 'Restaurar backup?',
      mensagem: `Isso substitui os dados atuais deste aparelho por ${estado.treinos.length} treinos, ${estado.caminhadas.length} caminhadas e ${estado.medidas.length} medidas${fotos.length ? ` e ${fotos.length} fotos` : ''}.`,
      ok: 'Restaurar',
      perigo: true,
    });
    if (!ok) return;
    substituir(estado);
    if (fotos.length) await importarFotos(fotos);
    aplicarTema(estado.config.tema);
    toast('Backup restaurado', { tipo: 'sucesso' });
    ctx.redesenhar();
  } catch (err) {
    toast(err.message || 'Não foi possível ler o arquivo.', { tipo: 'erro', duracao: 6000 });
  }
}

function folhaApagar(ctx) {
  const entrada = h('input', { type: 'text', autocomplete: 'off', placeholder: 'APAGAR' });
  abrirFolha({
    titulo: 'Apagar todos os dados',
    classe: 'folha-pequena',
    corpo: h('div', { class: 'pilha-p' }, h('p', { class: 'texto-2' }, 'Treinos, medidas, fotos e ajustes deste aparelho serão apagados. Não dá para desfazer. Faça um backup antes.'), campo({ rotulo: 'Digite APAGAR para confirmar', entrada })),
    rodape: (fechar) => [
      botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => fechar() }),
      botao({
        texto: 'Apagar tudo',
        variante: 'perigo',
        aoClicar: async () => {
          if (entrada.value.trim().toUpperCase() !== 'APAGAR') {
            entrada.focus();
            return;
          }
          apagarTudo();
          await apagarFotos();
          fechar();
          aplicarTema('auto');
          toast('Dados apagados');
          ctx.navegar('#/hoje');
        },
      }),
    ],
  });
}

export default function telaConfig(ctx) {
  const e = obter();
  const p = e.perfil;
  const c = e.config;
  const anoAtual = new Date().getFullYear();

  const inicio = h('input', { type: 'date', value: p.inicio || hojeISO(), max: hojeISO() });
  inicio.addEventListener('change', () => {
    if (ehISO(inicio.value)) salvarPerfil('inicio', inicio.value);
  });
  const nome = h('input', { type: 'text', value: p.nome || '', maxlength: 40, autocomplete: 'given-name' });
  nome.addEventListener('change', () => salvarPerfil('nome', nome.value.trim()));
  const horario = h('input', { type: 'time', value: c.horario });
  horario.addEventListener('change', () => horario.value && salvarConfig('horario', horario.value));

  const perfil = cartao(
    { titulo: 'Perfil', subtitulo: 'Usado para calcular metas. Fica só no aparelho.' },
    campo({ rotulo: 'Seu nome ou apelido', entrada: nome }),
    h(
      'div',
      { class: 'grade-2' },
      campo({ rotulo: 'Ano de nascimento', entrada: entradaNumero({ valor: p.anoNascimento, min: anoAtual - 100, max: anoAtual - 12, aoMudar: (v) => salvarPerfil('anoNascimento', v) }) }),
      campo({ rotulo: 'Altura (cm)', entrada: entradaNumero({ valor: p.alturaCm, min: 120, max: 230, sufixo: 'cm', aoMudar: (v) => salvarPerfil('alturaCm', v) }) }),
      campo({ rotulo: 'Peso inicial (kg)', entrada: entradaNumero({ valor: p.pesoInicial, min: 30, max: 350, decimal: true, sufixo: 'kg', aoMudar: (v) => salvarPerfil('pesoInicial', v) }) }),
      campo({ rotulo: 'Peso-meta (kg)', entrada: entradaNumero({ valor: p.pesoMeta, min: 30, max: 350, decimal: true, sufixo: 'kg', aoMudar: (v) => salvarPerfil('pesoMeta', v) }) }),
    ),
    h(
      'div',
      { class: 'campo' },
      h('span', { class: 'rotulo' }, 'Sexo biológico (só para a fórmula de calorias)'),
      segmentado({ rotulo: 'Sexo biológico', opcoes: [{ id: 'm', nome: 'Masculino' }, { id: 'f', nome: 'Feminino' }, { id: null, nome: 'Não informar' }], valor: p.sexo ?? null, aoMudar: (v) => salvarPerfil('sexo', v) }),
    ),
    h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Nível de atividade no dia a dia'), segmentado({ rotulo: 'Nível de atividade', classe: 'segmentado-vertical', opcoes: NIVEIS_ATIVIDADE.map((n) => ({ id: n.fator, nome: n.nome, detalhe: n.descricao })), valor: p.atividade, aoMudar: (v) => salvarPerfil('atividade', v) })),
    campo({ rotulo: 'Início do programa', dica: 'Define a semana e a fase em que você está', entrada: inicio }),
  );

  const agenda = cartao(
    { titulo: 'Agenda' },
    seletorDias({ rotulo: 'Dias de treino de força', valor: c.diasTreino, minimo: 2, maximo: 4, outros: () => obter().config.diasCaminhada, aoMudar: (v) => salvarConfig('diasTreino', v) }),
    h('p', { class: 'campo-dica' }, 'Ideal: 3 dias com um dia de folga entre eles (ex.: seg, qua, sex).'),
    seletorDias({ rotulo: 'Dias de caminhada', valor: c.diasCaminhada, minimo: 0, maximo: 7, outros: () => obter().config.diasTreino, aoMudar: (v) => salvarConfig('diasCaminhada', v) }),
    campo({ rotulo: 'Horário preferido', entrada: horario }),
    botao({ texto: 'Adicionar lembretes ao calendário', icone: 'calendario', variante: 'secundario', bloco: true, aoClicar: () => { baixarArquivo('trilha-lembretes.ics', gerarICS(obter().config), 'text/calendar'); toast('Abra o arquivo baixado para adicionar ao seu calendário.', { duracao: 5000 }); } }),
  );

  const treino = cartao(
    { titulo: 'Treino' },
    h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Ritmo do programa'), segmentado({ rotulo: 'Ritmo do programa', classe: 'segmentado-vertical', opcoes: RITMOS, valor: c.ritmo, aoMudar: (v) => salvarConfig('ritmo', v) })),
    h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Descanso entre séries'), segmentado({ rotulo: 'Descanso entre séries', opcoes: [60, 75, 90, 120].map((s) => ({ id: s, nome: s === 60 ? '1 min' : s === 120 ? '2 min' : `${s} s` })), valor: c.descanso, aoMudar: (v) => salvarConfig('descanso', v) })),
    alternador({ rotulo: 'Tenho acesso a uma barra', detalhe: 'Praça, academia ao ar livre ou barra de porta. Libera os níveis avançados de remada.', marcado: c.barra, aoMudar: (v) => salvarConfig('barra', v) }),
    alternador({ rotulo: 'Sons', detalhe: 'Bipe no fim do descanso e do cronômetro', marcado: c.som, aoMudar: (v) => salvarConfig('som', v) }),
    alternador({ rotulo: 'Vibração', marcado: c.vibrar, aoMudar: (v) => salvarConfig('vibrar', v) }),
    alternador({ rotulo: 'Manter a tela ligada no treino', marcado: c.manterTela, aoMudar: (v) => salvarConfig('manterTela', v) }),
  );

  const habitos = cartao(
    { titulo: 'Hábitos acompanhados' },
    ...HABITOS.map((hab) =>
      alternador({
        rotulo: hab.nome,
        detalhe: hab.dica,
        marcado: c.habitos.includes(hab.id),
        aoMudar: (v) => {
          atualizar((st) => {
            const set = new Set(st.config.habitos);
            if (v) set.add(hab.id);
            else set.delete(hab.id);
            st.config.habitos = HABITOS.map((x) => x.id).filter((id) => set.has(id));
          });
        },
      }),
    ),
  );

  const pausas = cartao(
    { titulo: 'Pausas ativas', subtitulo: 'Para quem passa muito tempo sentado: 2 minutos de movimento leve.' },
    alternador({ rotulo: 'Mostrar na tela Hoje', marcado: c.pausas.mostrar, aoMudar: (v) => atualizar((st) => { st.config.pausas.mostrar = v; }) }),
    alternador({
      rotulo: 'Lembrar de levantar',
      detalhe: 'Bipe e aviso enquanto o app estiver aberto (no computador ou no celular), entre 7h e 21h.',
      marcado: c.pausas.lembrete,
      aoMudar: async (v) => {
        atualizar((st) => {
          st.config.pausas.lembrete = v;
        });
        if (v && 'Notification' in window && Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch {
            /* sem notificação: fica só o aviso na tela */
          }
        }
      },
    }),
    h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Lembrar a cada'), segmentado({ rotulo: 'Intervalo do lembrete', opcoes: [30, 45, 50, 60].map((m) => ({ id: m, nome: `${m} min` })), valor: c.pausas.intervalo, aoMudar: (v) => atualizar((st) => { st.config.pausas.intervalo = v; }) })),
    h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Meta por dia'), segmentado({ rotulo: 'Meta de pausas por dia', opcoes: [2, 4, 6, 8].map((m) => ({ id: m, nome: String(m) })), valor: c.pausas.meta, aoMudar: (v) => atualizar((st) => { st.config.pausas.meta = v; }) })),
  );

  const aparencia = cartao(
    { titulo: 'Aparência' },
    segmentado({ rotulo: 'Tema', opcoes: [{ id: 'auto', nome: 'Automático' }, { id: 'claro', nome: 'Claro' }, { id: 'escuro', nome: 'Escuro' }], valor: c.tema, aoMudar: (v) => { salvarConfig('tema', v); aplicarTema(v); } }),
  );

  const instalacao = jaInstalado()
    ? null
    : cartao(
        { titulo: 'Instalar no celular', subtitulo: 'Abre como um app, em tela cheia, e funciona sem internet.' },
        podeInstalar()
          ? botao({ texto: 'Instalar o Trilha', icone: 'baixar', bloco: true, aoClicar: async () => { if (await instalar()) toast('App instalado!', { tipo: 'sucesso' }); ctx.redesenhar(); } })
          : h('p', { class: 'texto-2' }, ehIOS() ? 'No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".' : 'No Chrome, abra o menu ⋮ e toque em "Instalar app" ou "Adicionar à tela inicial".'),
      );

  let incluirFotos = false;
  const arquivo = h('input', { type: 'file', accept: 'application/json,.json', class: 'oculto-acessivel', id: 'arquivo-backup' });
  arquivo.addEventListener('change', () => {
    if (arquivo.files?.[0]) importar(arquivo.files[0], ctx);
    arquivo.value = '';
  });
  const infoEspaco = h('p', { class: 'texto-3' }, `Dados: ${num(espacoUsado() / 1024, 0)} KB`);
  listarFotos().then((f) => {
    infoEspaco.textContent = `Dados: ${num(espacoUsado() / 1024, 0)} KB · Fotos: ${f.length}`;
  });

  const dados = cartao(
    { titulo: 'Backup e dados', subtitulo: 'Tudo fica só neste aparelho. Faça backup de vez em quando.' },
    aviso({ tipo: 'aviso', texto: 'Se você limpar os dados do navegador ou trocar de celular sem backup, o histórico se perde.' }),
    alternador({ rotulo: 'Incluir fotos no backup', detalhe: 'O arquivo fica bem maior', marcado: false, aoMudar: (v) => (incluirFotos = v) }),
    h(
      'div',
      { class: 'acoes' },
      botao({ texto: 'Baixar backup', icone: 'baixar', variante: 'secundario', aoClicar: () => exportar(incluirFotos) }),
      arquivo,
      h('label', { for: 'arquivo-backup', class: 'btn btn-secundario' }, 'Restaurar backup'),
    ),
    infoEspaco,
    botao({ texto: 'Apagar todos os dados', icone: 'lixeira', variante: 'perigo-fantasma', aoClicar: () => folhaApagar(ctx) }),
  );

  return {
    titulo: 'Ajustes',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h('div', { class: 'pilha' }, h('header', { class: 'ola' }, h('h1', null, 'Ajustes')), perfil, agenda, treino, pausas, habitos, aparencia, instalacao, dados),
  };
}
