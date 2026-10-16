// Ponte Pokémon x Tipo (1 ou 2 linhas por Pokémon) para o filtro de tipo.
let
    Base = Table.SelectColumns(Pokemon, {"PokemonId", "Tipo1", "Tipo2"}),
    Despivotado = Table.UnpivotOtherColumns(Base, {"PokemonId"}, "Slot", "Tipo"),
    Final = Table.SelectColumns(Table.SelectRows(Despivotado, each [Tipo] <> null), {"PokemonId", "Tipo"}),
    Tipado = Table.TransformColumnTypes(Final, {{"PokemonId", Int64.Type}, {"Tipo", type text}})
in
    Tipado
