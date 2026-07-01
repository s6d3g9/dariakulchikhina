# Domain: v5-documents

## Purpose

Генерация и хранение документов: договоры, сметы, акты, технические задания. Mail-merge из project-data. DOCX output (иногда PDF).

## Entities (v5.3)

- `DocumentTemplate` — DOCX template с placeholders.
- `DocumentInstance` — generated document, linked к project/deal.
- `DocumentRevision` — version-история.
- `DocumentSignature` — e-signatures.
- `DocumentPackage` — bundle нескольких documents.

## Key operations

- Upload template (admin).
- Generate document from template + data.
- Edit manual (override generated content).
- Request signatures (internal + client).
- Archive versions.

## Business rules

- Generated documents immutable (revisions создают new).
- Signatures auditable.
- Client-visible only после approve.
- Archives retained per-legal requirements.

## Events

- `document.generated`
- `document.revised`
- `document.signed`
- `document.archived`

## External dependencies

- `projects` (data-source).
- `sellers` / `clients` / `contractors` (party data).
- `media-pipeline` (storage).
- `audit-log`.
- External: DOCX library (docx npm package).

## v5 → v6 migration

| v5 | v6 |
|---|---|
| DocumentTemplate | `pattern-template` с DOCX-render capability |
| DocumentInstance | `media-pipeline` output + metadata |
| DocumentRevision | versioned via pattern-engine |
| DocumentSignature | `credentials-vault` + signature-ceremony |
| DocumentPackage | compound Pattern-Card |

### Approach

- Document generation = **timeline-step handler** (external kind) что вызывает DOCX-template engine.
- Signatures — human-step в timeline, integration с e-signature services (DocuSign / ADobe Sign / native).
- Storage — media-pipeline (`35-disaster-recovery.md` retention).

### Phase

Phase 3.

## Open questions

- Multi-language documents — template-per-language vs single-template с runtime-subst.
- E-signature provider (DocuSign vs Russian-compliant e.g. КриптоПро).
- Blockchain-anchor для important docs — feature idea, not MVP.
