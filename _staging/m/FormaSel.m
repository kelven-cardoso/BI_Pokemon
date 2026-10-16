// Cópia desconectada usada pelo visual de Formas (mesma ideia da EvoSel).
let
    Base = Table.SelectColumns(Pokemon,
        {"PokemonId", "SpeciesId", "ChainId", "Forma", "Nome", "Tipo1Slug", "ImgGif", "ImgGifShiny", "OrdemDex"})
in
    Base
