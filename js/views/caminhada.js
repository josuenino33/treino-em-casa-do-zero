// Caminhada com cronômetro e medição real: passos pelo sensor de movimento,
// distância e velocidade pelo GPS. Com avisos de troca de ritmo na intervalada,
// tela travada para o bolso e teste de 100 passos para conferir o contador.
//
// Limite honesto: o navegador só deixa medir com o app aberto e a tela ligada.
// Se o app for para segundo plano, esse tempo fica registrado como "sem medição".

import { gravarLocal, lerLocal, obter, removerLocal } from '../core/armazem.js';
import { hojeISO, relogio } from '../core/datas.js';
import { criarRastreador, formatarRitmo, qualidadeSinal, ritmoMinKm } from '../logic/gps.js';
import { passadaMedia } from '../logic/estatisticas.js';
import { criarContadorPassos } from '../logic/passos.js';
import { INTERVALO_SEG, TIPOS_CAMINHADA, planoDoDia } from '../logic/plano.js';
import { abrirFolha, alternador, aviso, barraProgresso, botao, cartao, confirmar, segmentado, toast } from '../ui/componentes.js';
import { h, limpar, num, numCurto } from '../ui/dom.js';
import { ERROS_GPS, ouvirGPS, ouvirMovimento, pedirPermissaoMovimento, temGPS, temSensorMovimento } from '../ui/sensores.js';
import { bipe, liberarSom, liberarTela, manterTelaLigada, vibrar } from '../ui/som.js';
import { folhaCaminhada } from './acoes.js';

const CHAVE = 'caminhada';
const AQUECIMENTO_SEG = 5 * 60;
const MAX_ROTA = 400;

export function faseIntervalo(segundos) {
  if (segundos < AQUECIMENTO_SEG) return { nome: 'Aquecimento', detalhe: 'Ritmo normal', resta: AQUECIMENTO_SEG - segundos, rapido: false };
  const dentro = segundos - AQUECIMENTO_SEG;
  const bloco = Math.floor(dentro / INTERVALO_SEG);
  const rapido = bloco % 2 === 0;
  return { nome: rapido ? 'Rápido' : 'Normal', detalhe: rapido ? 'Passo acelerado, fôlego curto' : 'Recupere o fôlego', resta: INTERVALO_SEG - (dentro % INTERVALO_SEG), rapido, bloco };
}

const medicaoVazia = () => ({ passos: 0, metros: 0, rota: [], gps: { aceitos: 0, descartados: 0, somaPrecisao: 0 }, segundosForaDaTela: 0 });

function km(metros) {
  return numCurto(metros / 1000, 2);
}

// ---------- Teste de 100 passos ----------
function folhaTeste100() {
  const contador = criarContadorPassos();
  let parar = null;
  let semSensor = false;
  const visor = h('span', { class: 'crono-visor grande' }, '0');
  const estado = h('p', { class: 'texto-2 centro' }, 'Toque em começar, guarde o celular como vai usar na caminhada (bolso ou mão) e ande contando 100 passos em voz baixa.');
  let tick = null;
  const encerrar = () => {
    parar?.();
    parar = null;
    clearInterval(tick);
  };
  abrirFolha({
    titulo: 'Teste de 100 passos',
    corpo: h('div', { class: 'pilha centro' }, estado, visor, h('p', { class: 'texto-3' }, 'Passos contados pelo app')),
    rodape: (fechar) => {
      const comecar = botao({
        texto: 'Começar',
        icone: 'play',
        aoClicar: async () => {
          liberarSom();
          const ok = await pedirPermissaoMovimento();
          if (!ok) {
            estado.textContent = 'Sem permissão para o sensor de movimento. Libere nas configurações do navegador.';
            return;
          }
          comecar.hidden = true;
          terminar.hidden = false;
          estado.textContent = 'Andando… conte 100 passos e toque em "Terminei".';
          bipe('curto');
          parar = ouvirMovimento((x, y, z, t) => contador.amostra(x, y, z, t), () => {
            semSensor = true;
            estado.textContent = 'Este aparelho não enviou dados de movimento. Em computador não há sensor; use o celular.';
          });
          tick = setInterval(() => {
            visor.textContent = String(contador.passos);
          }, 300);
        },
      });
      const terminar = botao({
        texto: 'Terminei os 100 passos',
        icone: 'check',
        aoClicar: () => {
          encerrar();
          if (semSensor) return;
          const contou = contador.passos;
          const erro = Math.round(((contou - 100) / 100) * 100);
          gravarLocal('calibracao', { data: hojeISO(), contou });
          visor.textContent = String(contou);
          estado.textContent = erro === 0 ? 'Perfeito: contou exatamente 100.' : `Contou ${contou} de 100 (${erro > 0 ? '+' : ''}${erro}%). ${Math.abs(erro) <= 5 ? 'Dentro do esperado para celular.' : 'Tente com o celular no bolso da frente, bem preso.'}`;
          terminar.hidden = true;
          bipe('fim');
        },
      });
      terminar.hidden = true;
      return [botao({ texto: 'Fechar', variante: 'secundario', aoClicar: () => fechar() }), comecar, terminar];
    },
    aoFechar: encerrar,
  });
}

export default function telaCaminhada(ctx) {
  const plano = planoDoDia(obter());
  let c = lerLocal(CHAVE) || {
    inicio: null,
    pausadoEm: null,
    pausas: 0,
    tipo: plano.tipoCaminhada,
    meta: plano.metaMin,
    avisouMeta: false,
    medir: { passos: temSensorMovimento(), gps: temGPS() },
    medicao: medicaoVazia(),
  };
  if (!c.medir) c.medir = { passos: false, gps: false };
  if (!c.medicao) c.medicao = medicaoVazia();

  const raiz = h('div', { class: 'treino' });
  let tick = null;
  let refs = {};
  let ultimaFase = null;

  // Medição desta abertura da tela (somada ao que já estava salvo).
  const base = structuredClone(c.medicao);
  const contador = criarContadorPassos();
  const rastreador = criarRastreador();
  let pararMovimento = null;
  let pararGPS = null;
  let sensorOk = null; // null = ainda não sabemos
  let erroGPS = null;
  let ultimoGPS = null;
  let passosAntes = 0;
  let ultimoPassoEm = 0;
  let escondidoDesde = null;
  let salvoEm = 0;
  const passada = passadaMedia(obter());

  const rodando = () => Boolean(c.inicio && !c.pausadoEm);
  const salvar = () => gravarLocal(CHAVE, c);
  const decorrido = () => {
    if (!c.inicio) return 0;
    const fim = c.pausadoEm || Date.now();
    return Math.max(0, (fim - c.inicio - c.pausas) / 1000);
  };

  const passosTotal = () => base.passos + contador.passos;
  const metrosGPS = () => base.metros + rastreador.metros;
  const usandoGPS = () => c.medir.gps && (rastreador.resumo.aceitos > 0 || base.gps.aceitos > 0);
  const distancia = () => {
    if (usandoGPS()) return { metros: metrosGPS(), estimada: false };
    if (c.medir.passos && passada && passosTotal() > 0) return { metros: passosTotal() * passada, estimada: true };
    return { metros: null, estimada: false };
  };

  function consolidar() {
    const r = rastreador.resumo;
    const rota = [...base.rota, ...rastreador.rota];
    c.medicao = {
      passos: passosTotal(),
      metros: metrosGPS(),
      rota: rota.length > MAX_ROTA ? rota.filter((_, i) => i % Math.ceil(rota.length / MAX_ROTA) === 0) : rota,
      gps: {
        aceitos: base.gps.aceitos + r.aceitos,
        descartados: base.gps.descartados + r.descartados,
        somaPrecisao: base.gps.somaPrecisao + (r.precisaoMedia || 0) * r.aceitos,
      },
      segundosForaDaTela: c.medicao.segundosForaDaTela,
    };
  }

  function ligarSensores() {
    if (c.medir.passos && !pararMovimento) {
      pararMovimento = ouvirMovimento(
        (x, y, z, t) => {
          if (!rodando()) return;
          sensorOk = true;
          contador.amostra(x, y, z, t);
        },
        () => {
          if (sensorOk == null) sensorOk = false;
          atualizarVisor();
        },
      );
    }
    if (c.medir.gps && !pararGPS) {
      pararGPS = ouvirGPS(
        (pos) => {
          erroGPS = null;
          ultimoGPS = Date.now();
          if (!rodando()) return;
          // Se o sensor de passos funciona e já contou passos, ele decide se você está andando.
          const andando = sensorOk && contador.passos > 0 ? Date.now() - ultimoPassoEm < 10000 : null;
          rastreador.adicionar(pos, { andando });
        },
        (e) => {
          erroGPS = ERROS_GPS[e.code] || 'Erro no GPS.';
          atualizarVisor();
        },
      );
    }
  }

  function desligarSensores() {
    pararMovimento?.();
    pararGPS?.();
    pararMovimento = null;
    pararGPS = null;
  }

  function aoMudarVisibilidade() {
    if (!rodando()) return;
    if (document.visibilityState === 'hidden') {
      escondidoDesde = Date.now();
    } else if (escondidoDesde) {
      c.medicao.segundosForaDaTela += Math.round((Date.now() - escondidoDesde) / 1000);
      escondidoDesde = null;
      // Ao voltar, recomeça o trecho do GPS e o ritmo de passos (não inventa o que não mediu).
      rastreador.pausar();
      contador.pausar();
      consolidar();
      salvar();
      desenhar();
    }
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade);

  function atualizarVisor() {
    const seg = decorrido();
    if (contador.passos !== passosAntes) {
      passosAntes = contador.passos;
      ultimoPassoEm = Date.now();
    }
    if (refs.visor) refs.visor.textContent = relogio(seg);
    if (refs.barra) {
      const fr = Math.min(1, seg / (c.meta * 60));
      refs.barra.firstChild.style.width = `${Math.round(fr * 100)}%`;
      refs.barra.setAttribute('aria-valuenow', String(Math.round(fr * 100)));
    }
    if (refs.passos) {
      refs.passos.textContent = c.medir.passos ? (sensorOk === false ? 'sem sensor' : num(passosTotal())) : '—';
      refs.cadencia.textContent = c.medir.passos && sensorOk ? `${contador.cadencia(performance.now())}` : '—';
      const d = distancia();
      refs.distancia.textContent = d.metros != null ? `${d.estimada ? '≈ ' : ''}${km(d.metros)}` : '—';
      refs.distanciaRotulo.textContent = d.estimada ? 'km (estimado)' : 'km';
      const vel = usandoGPS() ? rastreador.velocidade(Date.now()) : 0;
      refs.velocidade.textContent = usandoGPS() ? num(vel, 1) : '—';
      refs.ritmo.textContent = d.metros != null && !d.estimada ? formatarRitmo(ritmoMinKm(d.metros, seg)) : '—';
      const q = qualidadeSinal(rastreador.precisao);
      const semSinal = c.medir.gps && rodando() && ultimoGPS && Date.now() - ultimoGPS > 30000;
      refs.sinal.textContent = !c.medir.gps ? 'desligado' : erroGPS ? 'erro' : semSinal ? 'perdido' : q.texto;
      refs.sinal.dataset.nivel = semSinal || erroGPS ? 'ruim' : q.nivel;
      refs.sinalDetalhe.textContent = rastreador.precisao != null && c.medir.gps ? `±${Math.round(rastreador.precisao)} m` : 'GPS';
      refs.avisoSensor.textContent = erroGPS || (sensorOk === false ? 'O sensor de movimento não respondeu: os passos não serão contados neste aparelho.' : '');
      refs.avisoSensor.hidden = !refs.avisoSensor.textContent;
    }
    if (refs.trava) {
      refs.trava.tempo.textContent = relogio(seg);
      const d = distancia();
      refs.trava.dados.textContent = `${c.medir.passos ? `${num(passosTotal())} passos` : ''}${d.metros != null ? ` · ${d.estimada ? '≈' : ''}${km(d.metros)} km` : ''}`;
    }
    if (c.tipo === 'intervalada' && refs.fase) {
      const f = faseIntervalo(seg);
      refs.fase.textContent = f.nome;
      refs.faseDetalhe.textContent = `${f.detalhe} · troca em ${relogio(f.resta)}`;
      refs.faseCaixa.classList.toggle('rapido', f.rapido);
      const chave = `${f.nome}-${f.bloco ?? 'a'}`;
      if (ultimaFase && ultimaFase !== chave && rodando()) {
        bipe('fim');
        vibrar([200, 100, 200]);
      }
      ultimaFase = chave;
    }
    if (!c.avisouMeta && seg >= c.meta * 60 && c.inicio) {
      c.avisouMeta = true;
      salvar();
      bipe('fim');
      vibrar([300, 120, 300]);
      toast('Meta de tempo batida!', { tipo: 'sucesso' });
    }
    if (rodando() && Date.now() - salvoEm > 5000) {
      salvoEm = Date.now();
      consolidar();
      salvar();
    }
  }

  function iniciarTick() {
    clearInterval(tick);
    tick = setInterval(atualizarVisor, 500);
    atualizarVisor();
  }

  async function sair() {
    if (c.inicio) {
      const mensagem = c.pausadoEm
        ? 'O cronômetro fica pausado. Você volta a ele pela tela Hoje.'
        : 'O tempo continua contando, mas passos e distância só são medidos com esta tela aberta.';
      const ok = await confirmar({ titulo: 'Sair do cronômetro?', mensagem, ok: 'Sair' });
      if (!ok) return;
      consolidar();
      salvar();
    } else {
      removerLocal(CHAVE);
    }
    ctx.navegar('#/hoje');
  }

  async function descartar() {
    const ok = await confirmar({ titulo: 'Descartar caminhada?', mensagem: 'O tempo e a medição serão apagados.', ok: 'Descartar', perigo: true });
    if (!ok) return;
    desligarSensores();
    removerLocal(CHAVE);
    liberarTela();
    ctx.navegar('#/hoje');
  }

  function resumoMedicao() {
    consolidar();
    const d = distancia();
    const m = c.medicao;
    const mediu = (c.medir.passos && sensorOk) || usandoGPS();
    if (!mediu) return null;
    return {
      passos: c.medir.passos && sensorOk ? m.passos : null,
      metros: d.metros != null ? Math.round(d.metros) : null,
      distanciaEstimada: d.estimada,
      segundos: Math.round(decorrido()),
      gps: usandoGPS() ? { aceitos: m.gps.aceitos, descartados: m.gps.descartados, precisaoMedia: m.gps.aceitos ? Math.round(m.gps.somaPrecisao / m.gps.aceitos) : null } : null,
      rota: usandoGPS() ? m.rota : [],
      segundosForaDaTela: m.segundosForaDaTela,
    };
  }

  function finalizar() {
    const minutos = Math.max(1, Math.round(decorrido() / 60));
    if (!c.pausadoEm) {
      c.pausadoEm = Date.now();
      contador.pausar();
      rastreador.pausar();
    }
    const medicao = resumoMedicao();
    salvar();
    desenhar();
    folhaCaminhada({
      minutos,
      tipo: c.tipo,
      medicao,
      aoSalvar: () => {
        desligarSensores();
        removerLocal(CHAVE);
        liberarTela();
        ctx.navegar('#/hoje');
      },
    });
  }

  async function iniciar() {
    liberarSom();
    manterTelaLigada();
    // Permissões precisam ser pedidas dentro do toque.
    if (c.medir.passos) {
      const ok = await pedirPermissaoMovimento();
      if (!ok) {
        c.medir.passos = false;
        toast('Sem permissão para o sensor de movimento: os passos não serão contados.', { tipo: 'aviso', duracao: 6000 });
      }
    }
    c.inicio = Date.now();
    salvar();
    ligarSensores();
    bipe('curto');
    desenhar();
  }

  function travarTela() {
    const tempo = h('span', { class: 'crono-visor grande' }, relogio(decorrido()));
    const dados = h('p', { class: 'trava-dados' }, '');
    let segurando = null;
    const progresso = h('span', { class: 'trava-progresso' });
    const destravar = h('button', { type: 'button', class: 'trava-botao' }, progresso, h('span', null, 'Segure para destravar'));
    const camada = h('div', { class: 'trava', role: 'dialog', 'aria-label': 'Tela travada' }, tempo, dados, destravar);
    const soltar = () => {
      clearTimeout(segurando);
      segurando = null;
      progresso.classList.remove('cheio');
    };
    destravar.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      progresso.classList.add('cheio');
      segurando = setTimeout(() => {
        refs.trava = null;
        camada.remove();
      }, 1500);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) destravar.addEventListener(ev, soltar);
    document.body.append(camada);
    refs.trava = { tempo, dados, camada };
    atualizarVisor();
  }

  function cartaoMedicao() {
    const tile = (rotulo, chave, detalhe) => {
      const valor = h('span', { class: 'stat-valor' }, '—');
      const det = h('span', { class: 'stat-detalhe' }, detalhe);
      refs[chave] = valor;
      if (chave === 'distancia') refs.distanciaRotulo = det;
      if (chave === 'sinal') refs.sinalDetalhe = det;
      return h('div', { class: 'stat' }, h('span', { class: 'stat-rotulo' }, rotulo), valor, det);
    };
    const avisoSensor = h('p', { class: 'erro', hidden: true });
    refs.avisoSensor = avisoSensor;
    const grade = h(
      'div',
      { class: 'grade-stats compacta medicao' },
      tile('Passos', 'passos', 'sensor'),
      tile('Distância', 'distancia', 'km'),
      tile('Velocidade', 'velocidade', 'km/h agora'),
      tile('Ritmo médio', 'ritmo', 'min/km'),
      tile('Cadência', 'cadencia', 'passos/min'),
      tile('Sinal', 'sinal', 'GPS'),
    );
    const fora = c.medicao.segundosForaDaTela;
    return cartao(
      { titulo: 'Medição' },
      grade,
      avisoSensor,
      fora > 0 ? aviso({ tipo: 'aviso', texto: `O app ficou ${relogio(fora)} fora da tela. Passos e distância desse tempo não foram medidos (o app não inventa números).` }) : null,
    );
  }

  function cartaoPreparar() {
    const calibracao = lerLocal('calibracao');
    return cartao(
      { titulo: 'Medição real', subtitulo: 'Fica tudo só no seu aparelho.' },
      alternador({
        rotulo: 'Contar passos',
        detalhe: temSensorMovimento() ? 'Pelo sensor de movimento. Conta só passos com ritmo de caminhada.' : 'Este aparelho não tem sensor de movimento.',
        marcado: c.medir.passos,
        aoMudar: (v) => {
          c.medir.passos = v;
          salvar();
        },
      }),
      alternador({
        rotulo: 'Medir distância e velocidade',
        detalhe: temGPS() ? 'Pelo GPS. Funciona melhor ao ar livre.' : 'Este aparelho não tem GPS.',
        marcado: c.medir.gps,
        aoMudar: (v) => {
          c.medir.gps = v;
          salvar();
        },
      }),
      h('p', { class: 'texto-3' }, 'Mantenha esta tela aberta: com a tela bloqueada o celular pausa o GPS e o sensor. Use "Travar tela" para guardar no bolso sem tocar em nada.'),
      h(
        'div',
        { class: 'acoes' },
        botao({ texto: 'Conferir o contador: teste de 100 passos', icone: 'alvo', variante: 'fantasma', aoClicar: folhaTeste100 }),
      ),
      calibracao ? h('p', { class: 'texto-3' }, `Último teste: contou ${calibracao.contou} de 100 passos.`) : null,
    );
  }

  function desenhar() {
    limpar(raiz);
    clearInterval(tick);
    const trava = refs.trava;
    refs = { trava };
    const tipo = TIPOS_CAMINHADA[c.tipo];
    const visor = h('span', { class: 'crono-visor grande' }, relogio(decorrido()));
    const barra = barraProgresso(Math.min(1, decorrido() / (c.meta * 60)), 'Progresso da meta');
    refs.visor = visor;
    refs.barra = barra;

    let faseCaixa = null;
    if (c.tipo === 'intervalada') {
      const fase = h('strong', null, '');
      const faseDetalhe = h('span', null, '');
      faseCaixa = h('div', { class: 'fase-caminhada', 'aria-live': 'polite' }, fase, faseDetalhe);
      Object.assign(refs, { fase, faseDetalhe, faseCaixa });
    }

    const medindo = c.inicio && (c.medir.passos || c.medir.gps);
    raiz.append(
      h(
        'div',
        { class: 'pilha' },
        h('div', { class: 'treino-topo' }, botao({ icone: 'x', variante: 'fantasma', rotulo: 'Sair', aoClicar: sair }), h('div', { class: 'treino-topo-meio' }, h('span', null, 'Caminhada')), h('span')),
        h('h1', null, `Caminhada ${tipo.nome.toLowerCase()}`),
        h('p', { class: 'texto-2' }, tipo.descricao),
        c.inicio
          ? null
          : cartao(
              { titulo: 'Tipo de hoje' },
              segmentado({
                rotulo: 'Tipo de caminhada',
                opcoes: Object.entries(TIPOS_CAMINHADA).map(([id, t]) => ({ id, nome: t.nome })),
                valor: c.tipo,
                aoMudar: (v) => {
                  c.tipo = v;
                  salvar();
                  desenhar();
                },
              }),
            ),
        cartao({ classe: 'centro' }, visor, h('p', { class: 'texto-3' }, `Meta da semana: ${c.meta} min`), barra, faseCaixa),
        medindo ? cartaoMedicao() : null,
        h(
          'div',
          { class: 'acoes centro' },
          !c.inicio
            ? botao({ texto: 'Iniciar', icone: 'play', tamanho: 'lg', aoClicar: iniciar })
            : rodando()
              ? botao({
                  texto: 'Pausar',
                  icone: 'pausa',
                  variante: 'secundario',
                  tamanho: 'lg',
                  aoClicar: () => {
                    c.pausadoEm = Date.now();
                    contador.pausar();
                    rastreador.pausar();
                    consolidar();
                    salvar();
                    desenhar();
                  },
                })
              : botao({
                  texto: 'Continuar',
                  icone: 'play',
                  variante: 'secundario',
                  tamanho: 'lg',
                  aoClicar: () => {
                    liberarSom();
                    manterTelaLigada();
                    c.pausas += Date.now() - c.pausadoEm;
                    c.pausadoEm = null;
                    salvar();
                    ligarSensores();
                    desenhar();
                  },
                }),
          c.inicio ? botao({ texto: 'Finalizar', icone: 'check', tamanho: 'lg', aoClicar: finalizar }) : null,
        ),
        rodando() ? botao({ texto: 'Travar tela (bolso)', icone: 'cadeado', variante: 'secundario', bloco: true, aoClicar: travarTela }) : null,
        c.inicio ? null : cartaoPreparar(),
        c.tipo === 'subidas' ? h('p', { class: 'texto-3 centro' }, 'Na subida, passos curtos e tronco levemente à frente. Na descida, devagar.') : null,
        c.inicio ? botao({ texto: 'Descartar caminhada', icone: 'lixeira', variante: 'perigo-fantasma', bloco: true, aoClicar: descartar }) : null,
      ),
    );
    atualizarVisor();
    if (rodando()) iniciarTick();
  }

  if (rodando()) {
    manterTelaLigada();
    ligarSensores();
  }
  desenhar();

  return {
    titulo: 'Caminhada',
    telaCheia: true,
    conteudo: raiz,
    aoSair: () => {
      if (c.inicio) {
        consolidar();
        salvar();
      }
      clearInterval(tick);
      desligarSensores();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      refs.trava?.camada?.remove();
      liberarTela();
    },
    telaAtiva: () => rodando(),
  };
}
