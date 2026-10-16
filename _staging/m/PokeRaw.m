// Consulta única na API GraphQL da PokeAPI (não carregada no modelo).
// Devolve um record com as listas: p (pokémon/formas), s (espécies), t (tipos),
// e (eficácia de tipos) e g (gerações).
let
    Consulta = "{ "
        & "p: pokemon_v2_pokemon(order_by:{id:asc}) { id name height weight is_default pokemon_species_id "
        & "pokemon_v2_pokemonstats { base_stat stat_id } "
        & "pokemon_v2_pokemontypes { slot type_id } "
        & "pokemon_v2_pokemonforms(limit:1) { form_name is_mega } } "
        & "s: pokemon_v2_pokemonspecies(order_by:{id:asc}) { id name generation_id evolution_chain_id evolves_from_species_id is_legendary is_mythical "
        & "pokemon_v2_pokemonevolutions(limit:1) { min_level evolution_trigger_id } "
        & "n: pokemon_v2_pokemonspeciesnames(where:{language_id:{_eq:9}}) { name genus } "
        & "d: pokemon_v2_pokemonspeciesflavortexts(limit:1, order_by:{version_id:desc}, where:{language_id:{_eq:9}}) { flavor_text } } "
        & "t: pokemon_v2_type(where:{id:{_lt:19}}) { id name } "
        & "e: pokemon_v2_typeefficacy { damage_type_id target_type_id damage_factor } "
        & "g: pokemon_v2_generation { id pokemon_v2_region { name } } "
        & "}",
    Resposta = Json.Document(
        Web.Contents(
            "https://beta.pokeapi.co",
            [
                RelativePath = "graphql/v1beta",
                Headers = [#"Content-Type" = "application/json"],
                Content = Json.FromValue([query = Consulta]),
                Timeout = #duration(0, 0, 5, 0)
            ]
        )
    ),
    Dados = Resposta[data]
in
    Dados
