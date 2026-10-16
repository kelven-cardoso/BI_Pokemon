// Modo de exibição do destaque central (segmentador de botões desconectado).
let
    Fonte = #table(
        type table [Modo = text, Ordem = Int64.Type],
        {{"Normal", 1}, {"✨ Shiny", 2}, {"🃏 Cartas", 3}}
    )
in
    Fonte
