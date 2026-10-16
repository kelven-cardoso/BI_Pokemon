# Pokédex em Power BI

Relatório Power BI (formato **PBIP**: PBIR + TMDL) que transforma dados públicos de Pokémon numa Pokédex interativa e animada, construída com o visual **HTML Content** e medidas DAX que geram HTML + CSS.

### ▶ [Abrir o relatório publicado](https://app.powerbi.com/view?r=eyJrIjoiYmJkMDYwNjItM2Y1NC00YWYyLThhZWQtZTQyMTk4ZGUzOGYwIiwidCI6ImM1NjhjODQyLWIwODItNDAyNi1hZDIxLTY0YTk0NWQyODkwZiJ9)

5 páginas: **Pokédex · Arena · Tipos · Quiz · Safari**. A primeira carga leva alguns segundos (sprites e cartas vêm da internet).

## Destaques

- **Dados ao vivo via API**: uma única consulta GraphQL na [PokeAPI](https://pokeapi.co) traz 1.302 Pokémon (formas incluídas), atributos, tipos, cadeias evolutivas e a tabela de eficácia de tipos.
- **17,5 mil cartas do Pokémon TCG** a partir do repositório oficial [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data), casadas com a forma exibida (Mega, Gigantamax, regionais).
- **Fundo dinâmico por tipo**: bolhas (Água), brasas (Fogo), raios (Elétrico), folhas, neve, almas, ondas psíquicas... tudo em CSS.
- **Modos Normal / ✨ Shiny / 🃏 Cartas**, com galeria de cartas e prévia holográfica ao passar o mouse.
- **Evolução clicável** com animação de evolução (silhuetas alternando, raios e clarão) e **formas clicáveis** (Mega X/Y, Gigantamax...).
- **Arena**: batalhas 1x1 ou Time de 3 com troca de Pokémon, em JavaScript dentro do HTML Content — fórmula de dano oficial (nível 50, STAB, tipos, crítico), IA que escolhe golpes e troca quando o confronto é ruim, Mega Evolução e Gigantamax, intro "VS", efeitos de golpe próprios de cada tipo, previsão de vitória, modo automático e simulação de 1.000 batalhas.
- **Tipos**: roda de tipos com setas animadas (ataque e defesa), matriz 18×18, ranking das 171 combinações defensivas e cobertura ofensiva, mais uma calculadora de confronto.
- **Safari**: minijogo estilo GBA desenhado em canvas — ande pelo mato, encontre Pokémon selvagens (shiny 1 em 50) e capture com Pokébola, Grande Bola, Ultra Bola e Fruta, usando a fórmula de captura da 3ª geração.
- **Quiz "Quem é esse Pokémon?"**: silhueta, 4 opções ou digitar o nome, cronômetro, dicas, sequência, recorde e filtro por geração.
- Radar de atributos em SVG, fraquezas/resistências calculadas (até 4× e imunidades), filtros por geração, tipo e lendários.

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| `Pokemon.SemanticModel/` | Modelo (TMDL) gerado pelos scripts |
| `Pokemon.Report/` | Relatório (PBIR) gerado pelos scripts |
| `_staging/m/` | Consultas Power Query (M) |
| `_staging/dax/medidas.dax` | Medidas DAX (HTML/CSS) |
| `_staging/js/` | Páginas em JavaScript (`comum`, `arena`, `tipos`, `quiz`, `safari`) e teste em Node (`teste_arena.js`) |
| `_staging/build.py` | Grava as consultas e medidas no modelo |
| `_staging/build_report.py` | Monta a página e os visuais |

## Como abrir

1. Power BI Desktop com os recursos de PBIP, TMDL e PBIR habilitados.
2. Abra `Pokemon.pbip` e clique em **Atualizar** (fontes anônimas: `beta.pokeapi.co` e `raw.githubusercontent.com`).
3. O visual **HTML Content** (AppSource) é carregado automaticamente. Ícones de tipo: [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons) (MIT).

Para alterar: edite os arquivos em `_staging/`, feche o Desktop e rode `python _staging/build.py` e `python _staging/build_report.py`.

---
Dados: PokeAPI e Pokémon TCG Data. Pokémon e marcas relacionadas pertencem à Nintendo, Game Freak e The Pokémon Company; projeto sem fins comerciais.
