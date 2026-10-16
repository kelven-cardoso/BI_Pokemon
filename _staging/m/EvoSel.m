// Cópia desconectada (sem relacionamento) usada pelo visual de Evolução.
// O clique num estágio filtra só esta tabela; as medidas leem o clique com ISFILTERED.
let
    Base = Table.SelectColumns(Pokemon,
        {"PokemonId", "SpeciesId", "ChainId", "Estagio", "IsDefault", "NomeEspecie", "Nome",
         "Tipo1Slug", "NivelEvolucao", "ImgGif", "ImgGifShiny"}),
    Ordem = Table.AddColumn(Base, "OrdemEvo", each
        [Estagio] * 100000000 + [SpeciesId] * 100000 + [PokemonId], Int64.Type)
in
    Ordem
