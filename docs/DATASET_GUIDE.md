# ORBIT AI — Flame in Freefall Dataset Package
Version 1.1 | RAG starter kit | Five-family initial scope

## Status (v1.2, 2026-11-14)
Raw PSI "Experimental table" CSVs for 10 investigations are collected in
data/raw/psi/<FAMILY>/<PSI-ID>_<NAME>/ (unchanged downloads). Raw sample folders
(images/video, 100s of GB) are intentionally NOT downloaded. Family overview PDFs
are in docs/papers/<FAMILY>/. A cleaned, unified table (one row per test)
is in data/processed/. Sources are listed in docs/metadata/source_register.csv
and investigations in docs/metadata/investigation_index.csv. All entries are "unverified"
until a reviewer checks them. The 04_AI_Knowledge_Base JSONL files are still templates:
do not index them as evidence.

| Family  | PSI ID  | Investigation | DOI |
|---------|---------|---------------|-----|
| SAFFIRE | PSI-98  | Saffire-I     | 10.60555/0t15-1z43 |
| SAFFIRE | PSI-99  | Saffire-II    | 10.60555/2chp-m469 |
| SAFFIRE | PSI-100 | Saffire-III   | 10.60555/040q-4h36 |
| BASS    | PSI-26  | BASS          | 10.60555/58h4-dy80 |
| BASS    | PSI-25  | BASS-II       | 10.60555/4qc4-de67 |
| FLEX    | PSI-69  | FLEX          | 10.60555/mbq8-0451 |
| FLEX    | PSI-68  | FLEX-2        | 10.60555/byp8-h018 |
| SAME    | PSI-102 | SAME          | 10.60555/gd4k-8h62 |
| SAME    | PSI-101 | SAME-R        | 10.60555/2np7-jv14 |
| ACME    | PSI-22  | ACME E-FIELD  | TODO (not found in DataCite) |

## Alignment with the supplied challenge brief
The uploaded Flame in Freefall requirements describe a dashboard for NASA PSI data,
24 combustion investigations and 12 TB of data in the challenge context, and AI
functions to summarize, rank, and interpret. Goals include finding relevant
investigations, supporting predictive modeling using ignition/flame propagation/
extinguishment data, and informing equipment design. PSI source types include
investigation overviews, data files/sample folders, and publications/DOIs. The
bonus Earth applications include water-mist extinguishers, smart smoke detectors,
and firefighter protective gear.

ACME, FLEX, BASS, SAFFIRE, and SAME are the five initial collection families
selected for this package. They are not claimed to cover all 24 investigations.
The brief does not list all 24 titles or provide measurement values; verify these
from PSI before adding records.

## Folders
01_Raw_Data: original downloads, unchanged.
02_Processed_Data: normalized experiment and measurement tables.
03_Research_Papers: papers/reports by family.
04_AI_Knowledge_Base: source-aware chunks and reviewed Q&A for RAG.
05_Metadata: source register, investigation index, dictionary, change log.
06_Collection_Templates: collection form, review checklist, RAG guidance, assignments.
07_Validation: retrieval test questions and quality gate.

## Workflow
1. Find a PSI investigation and confirm its exact title/identifier.
2. Register the source before extracting information.
3. Download available overviews, data files/sample folders, and publications.
4. Preserve original files unchanged.
5. Extract only facts explicitly present in sources; retain units and conditions.
6. Record source ID plus page/section/table/figure for every claim/value.
7. Leave unavailable values blank/unknown; never guess.
8. Obtain a second-person review.
9. Create RAG chunks with source title, URL, page, section and investigation ID.
10. Test retrieval and require citations or an explicit insufficient-evidence response.

## Sources
NASA PSI: https://psi.nasa.gov/
PSI repository: https://psi.nasa.gov/physci/repo
PSI research-area catalog:
https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/
NASA Technical Reports Server: https://ntrs.nasa.gov/
NASA Glenn: https://www.nasa.gov/glenn/

## RAG pipeline
Source files -> text/table extraction -> source-aware chunks -> embeddings ->
vector index -> retrieval -> LLM response with citations. Fine-tuning is not
required for the first prototype. Separate verbatim extracts, human summaries,
and AI-generated answers. The assistant should abstain when evidence is insufficient.

## Integrity and rights
Never invent oxygen, pressure, gravity, temperature, or result values. Preserve
units, conditions, uncertainty and measurement context. Distinguish observations,
interpretations, and engineering recommendations. Check each source's copyright,
license, third-party credits and redistribution terms.

## Team roles
Collector: finds and logs sources. Extractor: records metadata/measurements.
Reviewer: verifies facts and citations. RAG developer: chunks/indexes/tests.
Frontend developer: connects verified data to the dashboard.

Start with one ACME source and complete the entire pipeline before scaling.
