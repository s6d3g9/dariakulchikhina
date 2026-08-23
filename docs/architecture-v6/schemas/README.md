# Shell v6 contract schemas

Машиночитаемый companion к документам `55–60`.

| Schema | Назначение |
|---|---|
| `claim.schema.json` | утверждение World Model |
| `type-profile.schema.json` | версия типа предметного мира |
| `instrument-manifest.schema.json` | декларация инструмента/widget |
| `surface-plan.schema.json` | семантический план renderer'а |
| `command-envelope.schema.json` | единственный write-envelope UI |

JSON Schema проверяет структуру. Отдельный semantic validator обязан проверять provenance DAG, dependency cycles/closure, policy inheritance, feasibility, version compatibility и action risk.

До реализации packages эти схемы являются draft contract source. После принятия ADR-0011 canonical runtime schemas должны быть перенесены в `packages/contracts`/`packages/surface-contracts`, а docs должны импортировать или генерировать их без копирования.
