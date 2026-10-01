// Fotos de progresso: guardadas só no aparelho (IndexedDB).

import { formatarData, formatarMes, hojeISO, ehISO } from '../core/datas.js';
import { listarFotos, removerFoto, salvarFoto } from '../core/fotos.js';
import { abrirFolha, botao, campo, cartao, confirmar, segmentado, toast, vazio } from '../ui/componentes.js';
import { h, limpar } from '../ui/dom.js';

const POSES = [
  { id: 'frente', nome: 'Frente' },
  { id: 'lado', nome: 'Lado' },
  { id: 'costas', nome: 'Costas' },
];
const nomePose = (id) => POSES.find((p) => p.id === id)?.nome || id;

export function secaoFotos(ctx, registrarLimpeza) {
  const corpo = h('div', { class: 'fotos' }, h('p', { class: 'texto-3' }, 'Carregando fotos…'));
  let urls = [];
  let fotos = [];
  const liberarUrls = () => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
  };
  registrarLimpeza(liberarUrls);
  const url = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };

  function novaFoto() {
    let pose = 'frente';
    const data = h('input', { type: 'date', value: hojeISO(), max: hojeISO() });
    const entrada = h('input', { type: 'file', accept: 'image/*', class: 'oculto-acessivel', id: 'arquivo-foto' });
    const estado = h('p', { class: 'texto-3', role: 'status' });
    const folha = abrirFolha({
      titulo: 'Nova foto de progresso',
      corpo: h(
        'div',
        { class: 'pilha' },
        h('p', { class: 'texto-2' }, 'Mesma luz, mesma roupa e mesma distância a cada mês. A foto fica só neste aparelho.'),
        h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Posição'), segmentado({ rotulo: 'Posição da foto', opcoes: POSES, valor: pose, aoMudar: (v) => (pose = v) })),
        campo({ rotulo: 'Data', entrada: data }),
        entrada,
        h('label', { for: 'arquivo-foto', class: 'btn btn-primario btn-bloco btn-lg' }, 'Tirar ou escolher foto'),
        estado,
      ),
    });
    entrada.addEventListener('change', async () => {
      const arquivo = entrada.files?.[0];
      if (!arquivo) return;
      estado.textContent = 'Salvando…';
      try {
        await salvarFoto(arquivo, ehISO(data.value) ? data.value : hojeISO(), pose);
        folha.fechar();
        toast('Foto salva no aparelho', { tipo: 'sucesso' });
        carregar();
      } catch (e) {
        estado.textContent = e.message || 'Não foi possível salvar a foto.';
      }
    });
  }

  function verFoto(foto) {
    abrirFolha({
      titulo: `${nomePose(foto.pose)} · ${formatarData(foto.data, { ano: true })}`,
      classe: 'folha-larga',
      corpo: h('img', { src: url(foto.blob), alt: `Foto de ${nomePose(foto.pose).toLowerCase()} em ${formatarData(foto.data, { ano: true })}`, class: 'foto-grande' }),
      rodape: (fechar) => [
        botao({
          texto: 'Apagar',
          icone: 'lixeira',
          variante: 'perigo',
          aoClicar: async () => {
            if (!(await confirmar({ titulo: 'Apagar foto?', mensagem: 'Ela será removida deste aparelho.', ok: 'Apagar', perigo: true }))) return;
            await removerFoto(foto.id);
            fechar();
            toast('Foto apagada');
            carregar();
          },
        }),
        botao({ texto: 'Fechar', variante: 'secundario', aoClicar: () => fechar() }),
      ],
    });
  }

  function comparar() {
    const porData = [...fotos].sort((a, b) => (a.data < b.data ? -1 : 1));
    let pose = porData.at(-1)?.pose || 'frente';
    const lado = (titulo) => {
      const sel = h('select', { 'aria-label': titulo });
      const img = h('img', { class: 'foto-grande', alt: '' });
      return { sel, img, el: h('div', { class: 'comparar-lado' }, sel, img) };
    };
    const a = lado('Foto da esquerda');
    const b = lado('Foto da direita');
    const preencher = () => {
      const lista = porData.filter((f) => f.pose === pose);
      for (const [lad, padrao] of [[a, lista[0]], [b, lista.at(-1)]]) {
        limpar(lad.sel);
        lista.forEach((f) => lad.sel.append(h('option', { value: f.id, selected: f === padrao }, formatarData(f.data, { ano: true }))));
        mostrar(lad);
      }
    };
    const mostrar = (lad) => {
      const f = fotos.find((x) => x.id === lad.sel.value);
      if (f) {
        lad.img.src = url(f.blob);
        lad.img.alt = `${nomePose(f.pose)} em ${formatarData(f.data, { ano: true })}`;
      } else {
        lad.img.removeAttribute('src');
      }
    };
    a.sel.addEventListener('change', () => mostrar(a));
    b.sel.addEventListener('change', () => mostrar(b));
    abrirFolha({
      titulo: 'Comparar fotos',
      classe: 'folha-larga',
      corpo: h(
        'div',
        { class: 'pilha' },
        segmentado({ rotulo: 'Posição', opcoes: POSES, valor: pose, aoMudar: (v) => { pose = v; preencher(); } }),
        h('div', { class: 'comparar' }, a.el, b.el),
      ),
    });
    preencher();
  }

  async function carregar() {
    liberarUrls();
    fotos = await listarFotos();
    limpar(corpo);
    if (!fotos.length) {
      corpo.append(vazio({ icone: 'camera', titulo: 'Nenhuma foto ainda', texto: 'Uma foto por mês (frente, lado e costas) mostra mudanças que a balança não mostra.' }));
      return;
    }
    const porMes = new Map();
    for (const f of fotos) {
      const mes = f.data.slice(0, 7);
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(f);
    }
    for (const [mes, lista] of porMes) {
      corpo.append(
        h('h3', { class: 'secao-titulo' }, formatarMes(`${mes}-01`)),
        h(
          'div',
          { class: 'grade-fotos' },
          lista.map((f) =>
            h(
              'button',
              { type: 'button', class: 'foto-mini', onClick: () => verFoto(f), 'aria-label': `Ver foto de ${nomePose(f.pose).toLowerCase()}, ${formatarData(f.data, { ano: true })}` },
              h('img', { src: url(f.blob), alt: '', loading: 'lazy' }),
              h('span', null, `${nomePose(f.pose)} · ${formatarData(f.data)}`),
            ),
          ),
        ),
      );
    }
    if (fotos.length >= 2) corpo.append(botao({ texto: 'Comparar antes e depois', variante: 'secundario', bloco: true, aoClicar: comparar }));
  }

  carregar();
  return cartao({ titulo: 'Fotos', subtitulo: 'Ficam só neste aparelho', acao: botao({ texto: 'Adicionar', icone: 'camera', variante: 'fantasma', aoClicar: novaFoto }) }, corpo);
}
