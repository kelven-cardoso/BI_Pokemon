"""Monta a página Pokédex no *.Report (PBIR).

Uso:  python _staging/build_report.py
Feche o Power BI Desktop antes. Os visuais usam nomes fixos com o prefixo PREFIXO;
rodar de novo apaga e recria só esses visuais.
"""
import json
import shutil
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
STAGING = RAIZ / "_staging"
HTML_VISUAL = "htmlContent443BE3AD55E043BF878BED274D3A6855"  # HTML Content (AppSource, edição padrão)
SCHEMA_VISUAL = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.4.0/schema.json"
PREFIXO = "a1b2c3d4e5f6"
PAGINA_ARENA = PREFIXO + "aaaa0002"
# (id da página, nome exibido, sufixo das medidas <HTML>/<CSS>)
PAGINAS_JS = [(PAGINA_ARENA, "Arena", "Arena"), (PREFIXO + "aaaa0003", "Tipos", "Matriz Tipos"),
              (PREFIXO + "aaaa0004", "Quiz", "Quiz"), (PREFIXO + "aaaa0005", "Safari", "Safari")]
SCHEMA_PAGINA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json"

LARGURA, ALTURA = 1280, 720
FUNDO = "#0B0E14"
CARTAO = "#141922"
TEXTO = "#E9ECF2"
DESTAQUE = "#FFCB05"


# ---------- helpers de expressão ----------
def lit(v):
    return {"expr": {"Literal": {"Value": v}}}


def cor(hexa):
    return {"solid": {"color": lit(f"'{hexa}'")}}


def medida(nome, tabela="_Medidas"):
    return {"Measure": {"Expression": {"SourceRef": {"Entity": tabela}}, "Property": nome}}


def coluna(tabela, nome):
    return {"Column": {"Expression": {"SourceRef": {"Entity": tabela}}, "Property": nome}}


def container(fundo=None, raio=0, pad=0):
    obj = {
        "title": [{"properties": {"show": lit("false")}}],
        "dropShadow": [{"properties": {"show": lit("false")}}],
        "visualHeader": [{"properties": {"show": lit("false")}}],
        "padding": [{"properties": {k: lit(f"{pad}D") for k in ("top", "bottom", "left", "right")}}],
    }
    if fundo:
        obj["background"] = [{"properties": {"show": lit("true"), "color": cor(fundo), "transparency": lit("0D")}}]
        obj["border"] = [{"properties": {"show": lit("true"), "color": cor("#232A37"), "radius": lit(f"{raio}D")}}]
    else:
        obj["background"] = [{"properties": {"show": lit("false")}}]
        obj["border"] = [{"properties": {"show": lit("false")}}]
    return obj


def pos(x, y, w, h, z):
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "tabOrder": z}


# ---------- visuais ----------
def html_visual(pos_, html, css, sampling=None, clicavel=False):
    proj = {"content": {"projections": [{
        "field": medida(html), "queryRef": f"_Medidas.{html}", "nativeQueryRef": html}]}}
    query = {"queryState": proj}
    if sampling:
        proj["sampling"] = {"projections": [{
            "field": coluna(*sampling), "queryRef": ".".join(sampling), "nativeQueryRef": sampling[1], "active": True}]}
        query["sortDefinition"] = {"sort": [{"field": coluna(*sampling), "direction": "Ascending"}], "isDefaultSort": True}
    objects = {
        "stylesheet": [{"properties": {"stylesheet": {"expr": medida(css)}}}],
        "contentFormatting": [{"properties": {"showRawHtml": lit("false")}}],
        "crossFilter": [{"properties": {"enabled": lit("true" if clicavel else "false"), "useTransparency": lit("false")}}],
        # o próprio visual grava isto ao abrir (modo de linhas em dois divs, usado por todo o CSS)
        "compatibility": [{"properties": {"legacyRendering": lit("true")}}],
    }
    return pos_, {"visualType": HTML_VISUAL, "query": query, "objects": objects,
                  "visualContainerObjects": container(), "drillFilterOtherVisuals": True}, None


def dropdown(pos_, tabela, col):
    objects = {
        "data": [{"properties": {"mode": lit("'Dropdown'")}}],
        "header": [{"properties": {"show": lit("false")}}],
        "items": [{"properties": {"fontColor": cor(TEXTO), "background": cor(CARTAO), "textSize": lit("10D")}}],
        "selection": [{"properties": {"singleSelect": lit("true")}}],
    }
    return pos_, {
        "visualType": "slicer",
        "query": {"queryState": {"Values": {"projections": [{
            "field": coluna(tabela, col), "queryRef": f"{tabela}.{col}", "nativeQueryRef": col, "active": True}]}}},
        "objects": objects, "visualContainerObjects": container(CARTAO, 12, 2), "drillFilterOtherVisuals": True,
    }, None


def estados(padrao, selecionado, hover=None):
    """Propriedades por estado (default / hover / selecionado) do segmentador de botões."""
    out = [{"properties": padrao, "selector": {"id": "default"}}]
    if hover:
        out.append({"properties": hover, "selector": {"id": "interaction:hover"}})
    out.append({"properties": selecionado, "selector": {"id": "selection:selected"}})
    return out


def botoes(pos_, tabela, col, *, colunas, linhas, orientacao, imagem=None, fonte=9, raio=12,
           busca=False, fundo_container=CARTAO, pad=10, cor_sel="#2E3850", texto_sel="#FFFFFF",
           filtro_visual=None):
    """Segmentador de botões (advancedSlicerVisual)."""
    instancias = {"data": [{"dataViewWildcard": {"matchingOption": 1}}], "id": "default"}
    objects = {
        "general": [{"properties": {"selfFilterEnabled": lit("true" if busca else "false")}}],
        "selection": [{"properties": {"singleSelect": lit("true")}}],
        "layout": [{"properties": {
            "style": lit("'Cards'"), "orientation": lit(f"{orientacao}L"), "autoGrid": lit("false"),
            "columnCount": lit(f"{colunas}L"), "rowCount": lit(f"{linhas}L"), "cellPadding": lit("6L")}}],
        "overFlow": [{"properties": {"overFlowStyle": lit("1L"), "overFlowDirection": lit("0L")}}],
        "value": estados(
            {"show": lit("true"), "fontColor": cor("#C9CFDA"), "fontSize": lit(f"{fonte}D"),
             "bold": lit("true"), "horizontalAlignment": lit("'center'")},
            {"fontColor": cor(texto_sel)}, {"fontColor": cor("#FFFFFF")}),
        "label": [{"properties": {"show": lit("false")}}],
        "fillCustom": estados(
            {"show": lit("true"), "fillColor": cor("#1A2030"), "transparency": lit("0D")},
            {"fillColor": cor(cor_sel)}, {"fillColor": cor("#252D40")}),
        "outline": estados(
            {"show": lit("true"), "lineColor": cor("#283041"), "weight": lit("1D")},
            {"lineColor": cor(DESTAQUE), "weight": lit("2D")}),
        "shapeCustomRectangle": [{"properties": {
            "tileShape": lit("'rectangleRounded'"), "rectangleRoundedCurve": lit(f"{raio}L")}}],
        "selectionIcon": [{"properties": {"show": lit("false")}}],
    }
    if imagem:
        objects["image"] = [
            {"properties": {"show": lit("true"), "sourceType": lit("'imageData'"), "position": lit("'Top'")}},
            {"properties": {"image": {"expr": {"Aggregation": {
                "Expression": coluna(tabela, imagem), "Function": 3}}}}, "selector": instancias},
        ]
    if busca:
        objects["search"] = [{"properties": {
            "fontColor": cor(TEXTO), "backgroundShow": lit("true"), "backgroundColor": cor("#1A2030"),
            "iconColor": cor("#8A93A3"), "borderShow": lit("false"), "cornerRadius": lit("10D")}}]
    visual = {
        "visualType": "advancedSlicerVisual",
        "query": {"queryState": {"Values": {"projections": [{
            "field": coluna(tabela, col), "queryRef": f"{tabela}.{col}", "nativeQueryRef": col, "active": True}]}}},
        "objects": objects,
        "visualContainerObjects": container(fundo_container, 18, pad),
        "drillFilterOtherVisuals": True,
    }
    return pos_, visual, filtro_visual


def filtro_valor(nome, tabela, col, valor):
    """filterConfig de um visual: mantém só um valor da coluna."""
    return {"filters": [{
        "name": nome,
        "field": coluna(tabela, col),
        "type": "Categorical",
        "filter": {
            "Version": 2,
            "From": [{"Name": "t", "Entity": tabela, "Type": 0}],
            "Where": [{"Condition": {"In": {
                "Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": col}}],
                "Values": [[{"Literal": {"Value": valor}}]]}}}],
        },
        "howCreated": "User",
    }]}


def navegador(pos_):
    """Navegador de páginas nativo (pageNavigator) em pílulas."""
    def est(padrao, hover, sel):
        return [{"properties": padrao, "selector": {"id": "default"}},
                {"properties": hover, "selector": {"id": "hover"}},
                {"properties": sel, "selector": {"id": "selected"}}]
    objects = {
        "layout": [{"properties": {"cellPadding": lit("4L")}}],
        "shape": [{"properties": {"tileShape": lit("'pill'")}}],
        "fill": est({"show": lit("true"), "fillColor": cor("#1A2030"), "transparency": lit("0D")},
                    {"fillColor": cor("#252D40")}, {"fillColor": cor(DESTAQUE)}),
        "text": est({"show": lit("true"), "fontColor": cor("#C9CFDA"), "fontSize": lit("9D"), "bold": lit("true"),
                     "leftMargin": lit("2L"), "rightMargin": lit("2L")},
                    {"fontColor": cor("#FFFFFF")}, {"fontColor": cor("#11151D")}),
        "outline": est({"show": lit("true"), "lineColor": cor("#283041"), "weight": lit("1D")},
                       {"lineColor": cor("#FFFFFF")}, {"lineColor": cor(DESTAQUE)}),
    }
    return pos_, {"visualType": "pageNavigator", "objects": objects,
                  "visualContainerObjects": container(), "drillFilterOtherVisuals": True}, None


VISUAIS = {
    "01": html_visual(pos(0, 0, LARGURA, ALTURA, 0), "<HTML> Fundo", "<CSS> Fundo"),
    "02": html_visual(pos(24, 48, 320, 40, 1000), "<HTML> Marca", "<CSS> Marca"),
    "03": dropdown(pos(16, 94, 118, 32, 2000), "Pokemon", "GeracaoLabel"),
    "04": dropdown(pos(140, 94, 118, 32, 3000), "PokemonTipos", "Tipo"),
    "13": botoes(pos(264, 94, 84, 32, 3500), "Pokemon", "Especial", colunas=1, linhas=1, orientacao=2,
                 fonte=9, raio=10, fundo_container=None, pad=0, cor_sel=DESTAQUE, texto_sel="#11151D",
                 filtro_visual=filtro_valor(PREFIXO + "f0000002", "Pokemon", "Especial", "'★ Lendários'")),
    "05": botoes(pos(16, 134, 332, 570, 4000), "Pokemon", "Nome", colunas=3, linhas=5, orientacao=0,
                 imagem="ImgSprite", busca=True),
    "06": html_visual(pos(364, 14, 472, 462, 5000), "<HTML> Hero", "<CSS> Hero"),
    "14": botoes(pos(520, 18, 316, 30, 5500), "Modo", "Modo", colunas=3, linhas=1, orientacao=2,
                 fonte=9, raio=999, fundo_container=None, pad=0, cor_sel=DESTAQUE, texto_sel="#11151D"),
    "07": html_visual(pos(360, 486, 480, 218, 6000), "<HTML> Evolução Moldura", "<CSS> Moldura"),
    "08": html_visual(pos(372, 524, 456, 172, 7000), "<HTML> Evolução Item", "<CSS> Evolução Item",
                      sampling=("EvoSel", "OrdemEvo"), clicavel=True),
    "09": html_visual(pos(856, 16, 408, 290, 8000), "<HTML> Atributos", "<CSS> Atributos"),
    "10": html_visual(pos(856, 318, 408, 222, 9000), "<HTML> Fraquezas", "<CSS> Fraquezas"),
    "11": html_visual(pos(856, 552, 408, 152, 10000), "<HTML> Formas Moldura", "<CSS> Moldura"),
    "12": html_visual(pos(868, 590, 384, 108, 11000), "<HTML> Formas Item", "<CSS> Formas Item",
                      sampling=("FormaSel", "OrdemDex"), clicavel=True),
    "15": navegador(pos(16, 12, 332, 30, 20000)),
}

# só formas padrão na lista (as variantes aparecem no painel Formas)
FILTRO_PAGINA = {
    "name": PREFIXO + "f0000001",
    "field": coluna("Pokemon", "IsDefault"),
    "type": "Categorical",
    "filter": {
        "Version": 2,
        "From": [{"Name": "p", "Entity": "Pokemon", "Type": 0}],
        "Where": [{"Condition": {"In": {
            "Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "IsDefault"}}],
            "Values": [[{"Literal": {"Value": "true"}}]]}}}],
    },
    "howCreated": "User",
    "isHiddenInViewMode": True,
}


def escrever(caminho: Path, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")


def main():
    rel = next(RAIZ.glob("*.Report"))
    defn = rel / "definition"
    backup = STAGING / "backup" / ("report-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    shutil.copytree(defn, backup)
    print("backup:", backup.relative_to(RAIZ))

    rj = json.loads((defn / "report.json").read_text(encoding="utf-8"))
    pcv = rj.setdefault("publicCustomVisuals", [])
    if HTML_VISUAL not in pcv:
        pcv.append(HTML_VISUAL)
    escrever(defn / "report.json", rj)

    pages = json.loads((defn / "pages" / "pages.json").read_text(encoding="utf-8"))
    pagina = next(p for p in pages["pageOrder"] if not p.startswith(PREFIXO + "aaaa"))
    pdir = defn / "pages" / pagina
    pj = json.loads((pdir / "page.json").read_text(encoding="utf-8"))
    pj.update({"displayName": "Pokédex", "displayOption": "FitToPage", "width": LARGURA, "height": ALTURA})
    pj["objects"] = {
        "background": [{"properties": {"color": cor(FUNDO), "transparency": lit("0D")}}],
        "outspace": [{"properties": {"color": cor(FUNDO), "transparency": lit("0D")}}],
    }
    pj.pop("visualInteractions", None)
    pj["filterConfig"] = {"filters": [FILTRO_PAGINA]}
    escrever(pdir / "page.json", pj)

    vdir = pdir / "visuals"
    if vdir.exists():
        for d in vdir.iterdir():
            if d.name.startswith(PREFIXO):
                shutil.rmtree(d)
    for sufixo, (posicao, visual, filtro) in VISUAIS.items():
        nome = PREFIXO + sufixo.rjust(8, "0")
        dados = {"$schema": SCHEMA_VISUAL, "name": nome, "position": posicao, "visual": visual}
        if filtro:
            dados["filterConfig"] = filtro
        escrever(vdir / nome / "visual.json", dados)
    print(f"{len(VISUAIS)} visuais gravados em", vdir.relative_to(RAIZ))

    # ---------- páginas em JavaScript: um visual HTML Content em tela cheia + navegador ----------
    for pid, titulo, medida in PAGINAS_JS:
        adir = defn / "pages" / pid
        if adir.exists():
            shutil.rmtree(adir)
        escrever(adir / "page.json", {
            "$schema": SCHEMA_PAGINA, "name": pid, "displayName": titulo,
            "displayOption": "FitToPage", "height": ALTURA, "width": LARGURA,
            "objects": {
                "background": [{"properties": {"color": cor(FUNDO), "transparency": lit("0D")}}],
                "outspace": [{"properties": {"color": cor(FUNDO), "transparency": lit("0D")}}],
            },
        })
        itens = [(pid[-4:] + "0101", html_visual(pos(0, 0, LARGURA, ALTURA, 0), f"<HTML> {medida}", f"<CSS> {medida}")),
                 (pid[-4:] + "0199", navegador(pos(16, 12, 420, 30, 1000)))]
        for sufixo, (posicao, visual, _) in itens:
            nome = PREFIXO + sufixo
            escrever(adir / "visuals" / nome / "visual.json",
                     {"$schema": SCHEMA_VISUAL, "name": nome, "position": posicao, "visual": visual})
        if pid not in pages["pageOrder"]:
            pages["pageOrder"].append(pid)
        print(f"página {titulo} gravada em", adir.relative_to(RAIZ))
    pages["pageOrder"] = [pagina] + [pid for pid, _, _ in PAGINAS_JS]
    pages["activePageName"] = pagina
    escrever(defn / "pages" / "pages.json", pages)


if __name__ == "__main__":
    main()
