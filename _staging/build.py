"""Gera as tabelas TMDL (Power Query + medidas) e grava no *.SemanticModel do PBIP.

Uso:  python _staging/build.py
Feche o Power BI Desktop antes de rodar; reabra o .pbip depois.
"""
import re
import shutil
import sys
import uuid
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
STAGING = RAIZ / "_staging"
M_DIR = STAGING / "m"
DAX_FILE = STAGING / "dax" / "medidas.dax"

T = "\t"

# (coluna, tipo TMDL, extras)
COLUNAS = {
    "Tipos": [
        ("TipoId", "int64", {}), ("TipoSlug", "string", {}), ("Tipo", "string", {"sortByColumn": "Ordem"}),
        ("Cor", "string", {}), ("Ordem", "int64", {}),
    ],
    "Pokemon": [
        ("PokemonId", "int64", {}), ("Slug", "string", {}), ("SpeciesId", "int64", {}),
        ("IsDefault", "boolean", {}), ("FormaSlug", "string", {}), ("IsMega", "boolean", {}),
        ("AlturaM", "double", {}), ("PesoKg", "double", {}),
        ("Tipo1", "string", {}), ("Tipo1Slug", "string", {}), ("Cor1", "string", {}),
        ("Tipo2", "string", {}), ("Tipo2Slug", "string", {}), ("Cor2", "string", {}),
        ("HP", "int64", {}), ("Ataque", "int64", {}), ("Defesa", "int64", {}),
        ("AtqEsp", "int64", {}), ("DefEsp", "int64", {}), ("Velocidade", "int64", {}),
        ("SlugEspecie", "string", {}), ("NomeEspecie", "string", {}), ("Categoria", "string", {}), ("Descricao", "string", {}),
        ("Geracao", "int64", {}), ("ChainId", "int64", {}), ("EvoluiDe", "int64", {}),
        ("NivelEvolucao", "int64", {}), ("Lendario", "boolean", {}), ("Mitico", "boolean", {}),
        ("Estagio", "int64", {}), ("EstagiosCadeia", "int64", {}),
        ("Forma", "string", {}), ("Nome", "string", {"sortByColumn": "OrdemDex"}), ("Numero", "string", {}),
        ("Total", "int64", {}), ("Regiao", "string", {}),
        ("GeracaoLabel", "string", {"sortByColumn": "Geracao"}), ("Raridade", "string", {}),
        ("ImgArte", "string", {"dataCategory": "ImageUrl"}),
        ("ImgHome", "string", {"dataCategory": "ImageUrl"}),
        ("ImgSprite", "string", {"dataCategory": "ImageUrl"}),
        ("ImgGif", "string", {"dataCategory": "ImageUrl"}),
        ("ImgArteShiny", "string", {"dataCategory": "ImageUrl"}),
        ("ImgHomeShiny", "string", {"dataCategory": "ImageUrl"}),
        ("ImgGifShiny", "string", {"dataCategory": "ImageUrl"}),
        ("Especial", "string", {}), ("TagCarta", "string", {}),
        ("OrdemDex", "int64", {}),
    ],
    "Fraquezas": [
        ("PokemonId", "int64", {}), ("TipoAtaque", "string", {}), ("TipoAtaqueSlug", "string", {}),
        ("OrdemTipo", "int64", {}), ("Multiplicador", "double", {}),
    ],
    "PokemonTipos": [("PokemonId", "int64", {}), ("Tipo", "string", {})],
    "Eficacia": [("Ataque", "string", {}), ("Defesa", "string", {}), ("Fator", "double", {})],
    "Golpes": [
        ("Tipo", "string", {}), ("Categoria", "string", {}), ("Papel", "string", {}), ("Nome", "string", {}),
        ("Poder", "int64", {}), ("Precisao", "int64", {}), ("Prioridade", "int64", {}),
    ],
    "Modo": [("Modo", "string", {"sortByColumn": "Ordem"}), ("Ordem", "int64", {})],
    "Cartas": [
        ("CartaId", "string", {}), ("NomeCarta", "string", {}), ("Raridade", "string", {}), ("NumeroCarta", "string", {}),
        ("Colecao", "string", {}), ("Serie", "string", {}), ("Lancamento", "dateTime", {"formatString": "dd/mm/yyyy"}),
        ("SpeciesId", "int64", {}), ("ImgCarta", "string", {"dataCategory": "ImageUrl"}),
        ("ImgCartaGrande", "string", {"dataCategory": "ImageUrl"}), ("RaridadeOrdem", "int64", {}),
        ("RaridadePT", "string", {}), ("TagForma", "string", {}),
    ],
    "EvoSel": [
        ("PokemonId", "int64", {}), ("SpeciesId", "int64", {}), ("ChainId", "int64", {}), ("Estagio", "int64", {}),
        ("IsDefault", "boolean", {}), ("NomeEspecie", "string", {}), ("Nome", "string", {}),
        ("Tipo1Slug", "string", {}), ("NivelEvolucao", "int64", {}), ("ImgGif", "string", {"dataCategory": "ImageUrl"}),
        ("ImgGifShiny", "string", {"dataCategory": "ImageUrl"}), ("OrdemEvo", "int64", {}),
    ],
    "FormaSel": [
        ("PokemonId", "int64", {}), ("SpeciesId", "int64", {}), ("ChainId", "int64", {}), ("Forma", "string", {}),
        ("Nome", "string", {}), ("Tipo1Slug", "string", {}), ("ImgGif", "string", {"dataCategory": "ImageUrl"}),
        ("ImgGifShiny", "string", {"dataCategory": "ImageUrl"}), ("OrdemDex", "int64", {}),
    ],
}

RELACOES = [
    ("Fraquezas.PokemonId", "Pokemon.PokemonId", False),
    ("PokemonTipos.PokemonId", "Pokemon.PokemonId", True),
]


def q(nome: str) -> str:
    """Nome TMDL entre aspas simples quando necessário."""
    return f"'{nome}'" if re.search(r"[^A-Za-z0-9_]", nome) else nome


def bloco_m(codigo: str, nivel: int) -> str:
    pre = T * nivel
    return "\n".join((pre + l) if l.strip() else "" for l in codigo.strip("\n").splitlines())


def tabela_tmdl(nome: str) -> str:
    m = (M_DIR / f"{nome}.m").read_text(encoding="utf-8")
    out = [f"table {q(nome)}", ""]
    for col, tipo, extra in COLUNAS[nome]:
        out.append(f"{T}column {q(col)}")
        out.append(f"{T*2}dataType: {tipo}")
        if tipo == "int64":
            out.append(f"{T*2}formatString: 0")
        for k, v in extra.items():
            out.append(f"{T*2}{k}: {v}")
        out.append(f"{T*2}summarizeBy: none")
        out.append(f"{T*2}sourceColumn: {col}")
        out.append("")
    out.append(f"{T}partition {q(nome)} = m")
    out.append(f"{T*2}mode: import")
    out.append(f"{T*2}source =")
    out.append(bloco_m(m, 4))
    out.append("")
    return "\n".join(out) + "\n"


def css_tipos() -> str:
    m = (M_DIR / "Tipos.m").read_text(encoding="utf-8")
    pares = re.findall(r'\{"([a-z]+)", "[^"]+", "(#[0-9A-Fa-f]{6})"', m)
    regras = []
    for slug, cor in pares:
        r, g, b = (int(cor[i:i + 2], 16) for i in (1, 3, 5))
        rgba = lambda a: f"rgba({r},{g},{b},{a})"
        regras.append(
            f".bg-{slug} {{ background-color: {cor}; }} .c-{slug} {{ color: {cor}; }} "
            f".fl-{slug} {{ fill: {cor}; stroke: {cor}; }} .bc-{slug} {{ border-color: {cor}; }} "
            f".gl-{slug} {{ background-image: radial-gradient(circle, {rgba(.55)} 0%, {rgba(.18)} 38%, {rgba(0)} 68%); }} "
            f".sf-{slug} {{ background-color: {rgba(.16)}; }} "
            f".sh-{slug} {{ box-shadow: 0 0 22px {rgba(.45)}; }}"
        )
    return '"\n' + "\n".join(regras) + '\n"'


def ler_medidas():
    texto = DAX_FILE.read_text(encoding="utf-8")
    partes = re.split(r"^-- @measure (.+?) \| (.+?)\s*$", texto, flags=re.M)
    medidas = [("<CSS> Tipos", "<HTML>\\CSS", css_tipos())]
    for i in range(1, len(partes), 3):
        nome, pasta, corpo = partes[i].strip(), partes[i + 1].strip(), partes[i + 2].strip()
        medidas.append((nome, pasta, corpo))
    return medidas + medidas_paginas_js()


JS_DIR = STAGING / "js"

# páginas em JavaScript: nome da medida -> arquivos (o comum.* entra antes de todos)
PAGINAS_JS = {"Arena": "arena", "Matriz Tipos": "tipos", "Quiz": "quiz", "Safari": "safari"}


def literal_dax(texto: str, tamanho: int = 4000) -> str:
    """Texto -> literais DAX concatenados (pedaços curtos, aspas duplas dobradas)."""
    texto = texto.replace('"', '""')
    partes = [texto[i:i + tamanho] for i in range(0, len(texto), tamanho)] or [""]
    return "\n& ".join(f'"{p}"' for p in partes)


def ler_js(nome: str) -> str:
    texto = (JS_DIR / nome).read_text(encoding="utf-8")
    if nome.endswith(".js") and '"' in texto:
        sys.exit(f"{nome} não pode ter aspas duplas.")
    return texto


JS_DADOS = '''VAR _pk = CONCATENATEX(
    ALL(Pokemon),
    "[" & Pokemon[PokemonId] & ",'" & SUBSTITUTE(Pokemon[Nome], "'", "\\'") & "'," & Pokemon[SpeciesId]
  & ",'" & Pokemon[Tipo1Slug] & "','" & Pokemon[Tipo2Slug] & "',"
  & COALESCE(Pokemon[HP], 1) & "," & COALESCE(Pokemon[Ataque], 1) & "," & COALESCE(Pokemon[Defesa], 1) & ","
  & COALESCE(Pokemon[AtqEsp], 1) & "," & COALESCE(Pokemon[DefEsp], 1) & "," & COALESCE(Pokemon[Velocidade], 1) & ","
  & IF(Pokemon[IsDefault], 1, 0) & "," & COALESCE(Pokemon[Geracao], 0) & "," & IF(Pokemon[Lendario] || Pokemon[Mitico], 1, 0) & "]",
    ",", Pokemon[OrdemDex], ASC
)
VAR _ef = CONCATENATEX(
    FILTER(ALL(Eficacia), Eficacia[Fator] <> 1),
    "'" & Eficacia[Ataque] & ">" & Eficacia[Defesa] & "':" & FORMAT(Eficacia[Fator], "0.0#", "en-US"),
    ","
)
VAR _gp = CONCATENATEX(
    ALL(Golpes),
    "['" & Golpes[Tipo] & "','" & Golpes[Categoria] & "','" & Golpes[Papel] & "','" & SUBSTITUTE(Golpes[Nome], "'", "\\'")
  & "'," & Golpes[Poder] & "," & Golpes[Precisao] & "," & Golpes[Prioridade] & "]",
    ","
)
VAR _tp = CONCATENATEX(ALL(Tipos), Tipos[TipoSlug] & ":['" & Tipos[Tipo] & "','" & Tipos[Cor] & "']", ",", Tipos[Ordem], ASC)
VAR _versao = COUNTROWS(ALL(Pokemon)) * 1000 + COUNTROWS(ALL(Golpes))
RETURN
    "window.ARENA_DADOS={v:" & _versao & ",pk:[" & _pk & "],ef:{" & _ef & "},gp:[" & _gp & "],tp:{" & _tp & "}};"'''


def medidas_paginas_js():
    """[JS Dados] (dados do modelo para o JavaScript) + <HTML>/<CSS> de cada página em JS."""
    comum_js, comum_css = ler_js("comum.js"), ler_js("comum.css")
    out = [("JS Dados", "Base", JS_DADOS)]
    for nome, arq in PAGINAS_JS.items():
        js = comum_js + "\n" + ler_js(arq + ".js")
        html = ("VAR _dados = [JS Dados]\nVAR _motor =\n" + literal_dax(js) + "\nRETURN\n"
                "    \"<div id='app-raiz'></div><script>\" & _dados & \"</script><script>\" & _motor & \"</script>\"")
        out.append((f"<HTML> {nome}", "<HTML>", html))
        out.append((f"<CSS> {nome}", "<HTML>\\CSS", literal_dax(comum_css + "\n" + ler_js(arq + ".css"))))
    return out


def medidas_tmdl() -> str:
    out = ["table _Medidas", ""]
    for nome, pasta, corpo in ler_medidas():
        out.append(f"{T}measure {q(nome)} = ```")
        out.append("")
        out.append(bloco_m(corpo, 3))
        out.append(f"{T*3}```")
        if not nome.startswith("<"):
            out.append(f"{T*2}formatString: 0")
        out.append(f"{T*2}displayFolder: {pasta}")
        out.append("")
    out += [
        f"{T}column Coluna", f"{T*2}dataType: string", f"{T*2}isHidden", f"{T*2}summarizeBy: none",
        f"{T*2}sourceColumn: Coluna", "",
        f"{T}partition _Medidas = m", f"{T*2}mode: import", f"{T*2}source =",
        bloco_m("let\n\tFonte = #table(type table [Coluna = text], {})\nin\n\tFonte", 4), "",
    ]
    return "\n".join(out) + "\n"


def expressao_tmdl() -> str:
    m = (M_DIR / "PokeRaw.m").read_text(encoding="utf-8")
    return "expression PokeRaw =\n" + bloco_m(m, 2) + "\n\tannotation PBI_ResultType = Record\n\n"


def relacoes_tmdl(existente: str) -> str:
    out = existente.rstrip("\n") + "\n\n" if existente.strip() else ""
    for de, para, ambos in RELACOES:
        if f"fromColumn: {de}" in existente:
            continue
        out += f"relationship {uuid.uuid4()}\n"
        if ambos:
            out += f"{T}crossFilteringBehavior: bothDirections\n"
        out += f"{T}fromColumn: {de}\n{T}toColumn: {para}\n\n"
    return out


def gravar(caminho: Path, texto: str):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(texto, encoding="utf-8", newline="\n")
    print("gravado:", caminho.relative_to(RAIZ))


def main():
    modelos = list(RAIZ.glob("*.SemanticModel/definition"))
    if not modelos:
        sys.exit("Nenhum *.SemanticModel/definition encontrado (o PBIP precisa estar em formato TMDL).")
    defn = modelos[0]

    backup = STAGING / "backup" / datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copytree(defn, backup / "definition")
    print("backup:", backup.relative_to(RAIZ))

    tabelas = ["Tipos", "Pokemon", "Fraquezas", "PokemonTipos", "EvoSel", "FormaSel", "Modo", "Cartas", "Eficacia", "Golpes"]
    for t in tabelas:
        gravar(defn / "tables" / f"{t}.tmdl", tabela_tmdl(t))
    gravar(defn / "tables" / "_Medidas.tmdl", medidas_tmdl())

    # expressão compartilhada PokeRaw
    exp = defn / "expressions.tmdl"
    atual = exp.read_text(encoding="utf-8") if exp.exists() else ""
    atual = re.sub(r"expression PokeRaw =.*?(?=^expression |\Z)", "", atual, flags=re.S | re.M)
    gravar(exp, (atual.rstrip("\n") + "\n\n" if atual.strip() else "") + expressao_tmdl())

    rel = defn / "relationships.tmdl"
    gravar(rel, relacoes_tmdl(rel.read_text(encoding="utf-8") if rel.exists() else ""))

    # model.tmdl: refs de tabela e ordem das consultas
    model = defn / "model.tmdl"
    texto = model.read_text(encoding="utf-8")
    ordem = '["PokeRaw","Tipos","Pokemon","Fraquezas","PokemonTipos","EvoSel","FormaSel","Modo","Cartas","Eficacia","Golpes","_Medidas"]'
    if "PBI_QueryOrder" in texto:
        texto = re.sub(r"annotation PBI_QueryOrder = .*", f"annotation PBI_QueryOrder = {ordem}", texto)
    else:
        texto = re.sub(r"(\nannotation [^\n]*\n)(?!.*\nannotation )",
                       lambda mt: mt.group(1) + f"\nannotation PBI_QueryOrder = {ordem}\n", texto, count=1, flags=re.S)
    for t in tabelas + ["_Medidas"]:
        if f"ref table {q(t)}" not in texto:
            texto = texto.rstrip("\n") + f"\n\nref table {q(t)}"
    # sem tabelas automáticas de data (a coluna Cartas[Lancamento] criaria uma)
    texto = texto.replace("annotation __PBI_TimeIntelligenceEnabled = 1", "annotation __PBI_TimeIntelligenceEnabled = 0")
    gravar(model, texto.rstrip("\n") + "\n")


if __name__ == "__main__":
    main()
