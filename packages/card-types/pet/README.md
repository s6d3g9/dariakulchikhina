# packages/card-types/pet

Питомец — instance = «мой Рекс», type = порода (немецкая овчарка).

## Instance (мой Рекс)

- HEADER: name, species, breed, age.
- TIMELINE: acquired → vaccinations schedule → training milestones → health checks → grooming.
- SUMMARY: weight, next vet-visit, vaccination status.
- Left: vet clinics, food catalog, toys, grooming services, insurance.
- Right: vet chat, trainer chat, dog-walker.
- Top: my pet photos/videos, journey journal.
- Bottom: my pet journal (mood, behavior notes).

## Type (порода)

- Left: breed-specific catalog (food, supplies, breeders, schools).
- Right: breed community, breeders forums, show-dogs clubs.
- Top: breed standard, champions, show content.
- Bottom: breed news, genetic concerns, tips.

## Primitives

`ownership-registry` (animal-title), `credentials-vault` (pedigree, vaccinations), `booking` (vet appointments), `subscription-engine` (pet insurance, food delivery), `identity`, `media-pipeline`, `messenger`, `feed`.

## Sensitive

Medical data отдельный encryption scope. Owner-only + explicitly-shared vets.

## Phase

4 (care / wellness vertical).
