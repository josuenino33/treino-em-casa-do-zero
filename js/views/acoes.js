// Fluxos usados por mais de uma tela: medidas, caminhada manual, conquistas.

import { atualizar, obter } from '../core/armazem.js';
import { hojeISO, ehISO } from '../core/datas.js';
import { novoId } from '../core/esquema.js';
import { registrarConquistas } from '../logic/conquistas.js';
import { CAMPOS_MEDIDA, serieMedida } from '../logic/estatisticas.js';
import { TIPOS_CAMINHADA } from '../logic/plano.js';
import { formatarRitmo, ritmoMinKm } from '../logic/gps.js';
import { abrirFolha, aviso, botao, campo, entradaNumero, segmentado, toast } from '../ui/componentes.js';
import { h, num, numCurto } from '../ui/dom.js';
import { desenharRota } from '../ui/rota.js';
import { relogio } from '../core/datas.js';

export function verificarConquistas() {
  let novas = [];
  atualizar((e) => {
    novas = registrarConquistas(e);
  });
  if (novas.length > 2) {
    // Várias de uma vez (ex.: depois de restaurar um backup): um aviso só.
    setTimeout(() => toast(`${novas.length} conquistas desbloqueadas!`, { tipo: 'conquista', duracao: 6000, acao: { rotulo: 'Ver', fn: () => (location.hash = '#/conquistas') } }), 400);
  } else {
    novas.forEach((cq, i) => {
      setTimeout(() => toast(`Conquista: ${cq.nome}`, { tipo: 'conquista', duracao: 5000 }), 400 + i * 900);
    });
  }
  return novas;
}

function entradaData(valor) {
  return h('input', { type: 'date', value: valor, max: hojeISO(), required: true });
}

export function folhaMedidas({ medida = null, aoSalvar } = {}) {
  const e = obter();
  const valores = { ...(medida || {}) };
  const data = entradaData(medida?.data || hojeISO());
  const ultimo = (id) => serieMedida(e, id).at(-1)?.valor;
  const erro = h('p', { class: 'erro', role: 'alert', hidden: true });

  const campos = CAMPOS_MEDIDA.map((c) =>
    campo({
      rotulo: `${c.nome} (${c.unidade})`,
      dica: c.dica || (c.id === 'peso' ? 'Pela manhã, em jejum, depois do banheiro' : null),
      entrada: entradaNumero({
        valor: valores[c.id] ?? null,
        decimal: true,
        min: c.id === 'peso' ? 30 : 10,
        max: c.id === 'peso' ? 350 : 250,
        sufixo: c.unidade,
        placeholder: ultimo(c.id) != null ? `Último: ${numCurto(ultimo(c.id))}` : '',
        aoMudar: (v) => {
          valores[c.id] = v;
        },
      }),
    }),
  );

  abrirFolha({
    titulo: medida ? 'Editar medidas' : 'Registrar medidas',
    corpo: h(
      'div',
      { class: 'pilha' },
      campo({ rotulo: 'Data', entrada: data }),
      campos[0],
      h('details', { class: 'mais-medidas', open: Boolean(medida && CAMPOS_MEDIDA.slice(1).some((c) => medida[c.id] != null)) }, h('summary', null, 'Medidas do corpo (opcional)'), h('div', { class: 'grade-2' }, campos.slice(1))),
      erro,
    ),
    rodape: (fechar) => [
      botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => fechar() }),
      botao({
        texto: 'Salvar',
        aoClicar: () => {
          // Garante que o valor digitado por último foi lido.
          document.activeElement?.blur?.();
          const preenchidos = CAMPOS_MEDIDA.filter((c) => Number.isFinite(valores[c.id]));
          if (!ehISO(data.value)) {
            erro.textContent = 'Escolha uma data válida.';
            erro.hidden = false;
            return;
          }
          if (!preenchidos.length) {
            erro.textContent = 'Preencha pelo menos uma medida.';
            erro.hidden = false;
            return;
          }
          const registro = { id: medida?.id || novoId(), data: data.value };
          for (const c of CAMPOS_MEDIDA) if (Number.isFinite(valores[c.id])) registro[c.id] = valores[c.id];
          atualizar((st) => {
            const i = st.medidas.findIndex((m) => m.id === registro.id);
            if (i >= 0) st.medidas[i] = registro;
            else st.medidas.push(registro);
            if (!Number.isFinite(st.perfil.pesoInicial) && Number.isFinite(registro.peso)) st.perfil.pesoInicial = registro.peso;
          });
          fechar();
          toast('Medidas salvas', { tipo: 'sucesso' });
          verificarConquistas();
          aoSalvar?.();
        },
      }),
    ],
  });
}

export function salvarCaminhada(registro) {
  atualizar((st) => {
    const i = st.caminhadas.findIndex((c) => c.id === registro.id);
    if (i >= 0) st.caminhadas[i] = registro;
    else st.caminhadas.push(registro);
  });
  verificarConquistas();
}

// Resumo do que foi medido pelos sensores (só leitura: não dá para editar).
function cartaoMedido(m) {
  const kmh = m.metros != null && !m.distanciaEstimada && m.segundos > 0 ? (m.metros / m.segundos) * 3.6 : null;
  const itens = [
    m.passos != null ? ['Passos', num(m.passos)] : null,
    m.metros != null ? ['Distância', `${m.distanciaEstimada ? '≈ ' : ''}${numCurto(m.metros / 1000, 2)} km`] : null,
    kmh != null ? ['Velocidade média', `${numCurto(kmh, 1)} km/h`] : null,
    kmh != null ? ['Ritmo', `${formatarRitmo(ritmoMinKm(m.metros, m.segundos))} min/km`] : null,
  ].filter(Boolean);
  const fontes = [m.passos != null ? 'passos pelo sensor de movimento' : null, m.metros != null ? (m.distanciaEstimada ? 'distância estimada (passos × tamanho do seu passo)' : 'distância pelo GPS') : null].filter(Boolean);
  return h(
    'div',
    { class: 'medido' },
    h('p', { class: 'sobretitulo' }, 'Medido nesta caminhada'),
    h('div', { class: 'grade-stats compacta' }, itens.map(([r, v]) => h('div', { class: 'stat' }, h('span', { class: 'stat-rotulo' }, r), h('span', { class: 'stat-valor' }, v)))),
    desenharRota(m.rota),
    h('p', { class: 'texto-3' }, `Fonte: ${fontes.join(' e ')}.${m.gps ? ` GPS: ${m.gps.aceitos} leituras usadas, ${m.gps.descartados} descartadas (imprecisas ou com salto)${m.gps.precisaoMedia ? `, precisão média ±${m.gps.precisaoMedia} m` : ''}.` : ''}`),
    m.segundosForaDaTela > 0 ? aviso({ tipo: 'aviso', texto: `${relogio(m.segundosForaDaTela)} fora da tela sem medição.` }) : null,
  );
}

export function folhaCaminhada({ minutos = null, tipo = 'continua', aoSalvar, caminhada = null, medicao = null } = {}) {
  const medido = medicao || caminhada?.medicao || null;
  const dados = {
    minutos: caminhada?.minutos ?? minutos,
    tipo: caminhada?.tipo || tipo,
    passos: caminhada?.passos ?? null,
    distanciaKm: caminhada?.distanciaKm ?? null,
    sensacao: caminhada?.sensacao || 'ok',
  };
  const data = entradaData(caminhada?.data || hojeISO());
  const notas = h('textarea', { rows: 2, placeholder: 'Opcional', maxlength: 500 }, caminhada?.notas || '');
  const erro = h('p', { class: 'erro', role: 'alert', hidden: true });

  abrirFolha({
    titulo: caminhada ? 'Editar caminhada' : 'Registrar caminhada',
    corpo: h(
      'div',
      { class: 'pilha' },
      campo({ rotulo: 'Data', entrada: data }),
      campo({ rotulo: 'Duração (minutos)', entrada: entradaNumero({ valor: dados.minutos, min: 1, max: 600, sufixo: 'min', aoMudar: (v) => (dados.minutos = v) }) }),
      h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Tipo'), segmentado({ rotulo: 'Tipo de caminhada', opcoes: Object.entries(TIPOS_CAMINHADA).map(([id, t]) => ({ id, nome: t.nome })), valor: dados.tipo, aoMudar: (v) => (dados.tipo = v) })),
      medido ? cartaoMedido(medido) : null,
      medido?.passos != null ? null : campo({ rotulo: 'Passos', dica: 'Se o celular ou relógio contou', entrada: entradaNumero({ valor: dados.passos, min: 0, max: 100000, aoMudar: (v) => (dados.passos = v) }) }),
      medido?.metros != null ? null : campo({ rotulo: 'Distância (km)', dica: 'Opcional', entrada: entradaNumero({ valor: dados.distanciaKm, min: 0, max: 100, decimal: true, sufixo: 'km', aoMudar: (v) => (dados.distanciaKm = v) }) }),
      h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Como foi'), segmentado({ rotulo: 'Como foi', opcoes: [{ id: 'facil', nome: 'Fácil' }, { id: 'ok', nome: 'Na medida' }, { id: 'dificil', nome: 'Puxada' }], valor: dados.sensacao, aoMudar: (v) => (dados.sensacao = v) })),
      campo({ rotulo: 'Anotações', entrada: notas }),
      erro,
    ),
    rodape: (fechar) => [
      botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => fechar() }),
      botao({
        texto: 'Salvar',
        aoClicar: () => {
          document.activeElement?.blur?.();
          if (!(dados.minutos > 0)) {
            erro.textContent = 'Informe quantos minutos você caminhou.';
            erro.hidden = false;
            return;
          }
          if (!ehISO(data.value)) {
            erro.textContent = 'Escolha uma data válida.';
            erro.hidden = false;
            return;
          }
          salvarCaminhada({
            id: caminhada?.id || novoId(),
            data: data.value,
            minutos: dados.minutos,
            tipo: dados.tipo,
            passos: medido?.passos ?? dados.passos,
            distanciaKm: medido?.metros != null ? Number((medido.metros / 1000).toFixed(3)) : dados.distanciaKm,
            fonte: medido ? 'medido' : 'manual',
            medicao: medido,
            sensacao: dados.sensacao,
            notas: notas.value.trim(),
          });
          fechar();
          toast('Caminhada registrada', { tipo: 'sucesso' });
          aoSalvar?.();
        },
      }),
    ],
  });
}
