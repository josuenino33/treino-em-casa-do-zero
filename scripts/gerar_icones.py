"""Gera os ícones PNG do app a partir do mesmo desenho do icons/icon.svg.

Uso: python scripts/gerar_icones.py   (precisa do Pillow: pip install pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent / "icons"
AZUL = (37, 106, 191, 255)
BRANCO = (255, 255, 255, 255)
ESCALA = 4  # desenha maior e reduz, para bordas suaves


def bezier(p0, p1, p2, p3, passos=600):
    pontos = []
    for i in range(passos + 1):
        t = i / passos
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pontos.append((x, y))
    return pontos


# Mesmo caminho do SVG (grade 512): uma trilha subindo da esquerda para a direita.
CAMINHO = (
    bezier((128, 388), (208, 388), (196, 292), (268, 292))
    + bezier((268, 292), (340, 292), (332, 196), (384, 160))
)


def desenhar(tamanho, mascaravel=False):
    s = tamanho * ESCALA
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if mascaravel:
        d.rectangle([0, 0, s, s], fill=AZUL)
        fator, deslocamento = 0.72, s * 0.14
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=AZUL)
        fator, deslocamento = 1.0, 0
    k = s / 512 * fator

    def ponto(p):
        return (p[0] * k + deslocamento, p[1] * k + deslocamento)

    # Traço "carimbado" com círculos bem próximos: fica liso nas curvas.
    r = 22 * k
    for x, y in (ponto(p) for p in CAMINHO):
        d.ellipse([x - r, y - r, x + r, y + r], fill=BRANCO)
    # Ponto de chegada.
    cx, cy = ponto((384, 160))
    rc = 34 * k
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=BRANCO)
    # Ponto de partida, vazado.
    px, py = ponto((128, 388))
    rp, borda = 30 * k, 14 * k
    d.ellipse([px - rp, py - rp, px + rp, py + rp], fill=BRANCO)
    d.ellipse([px - rp + borda, py - rp + borda, px + rp - borda, py + rp - borda], fill=AZUL)
    return img.resize((tamanho, tamanho), Image.LANCZOS)


def main():
    RAIZ.mkdir(exist_ok=True)
    desenhar(192).save(RAIZ / "icon-192.png")
    desenhar(512).save(RAIZ / "icon-512.png")
    desenhar(512, mascaravel=True).save(RAIZ / "icon-maskable-512.png")
    # O iOS não usa transparência: fundo cheio.
    desenhar(180, mascaravel=False).convert("RGB").save(RAIZ / "apple-touch-icon.png")
    print("Ícones gerados em", RAIZ)


if __name__ == "__main__":
    main()
