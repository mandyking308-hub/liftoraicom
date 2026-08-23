# Billionaire Access Verification — Batch 001 Compliance Overrides

**Reviewed:** 2026-08-23  
**Applies to:** `docs/billionaire-access-verification-batch-001-2026-top100.md`

This file is an explicit override layer for Batch 001. During Batch 002, current sanctions verification showed that several Batch 001 records must not remain classified as ordinary institutional/source-age routes.

## Override rule

A public company, investor-relations desk, foundation or other institutional doorway may still be retained for ownership/network intelligence, but sanctions/compliance restrictions override route availability. `outreach_allowed` must remain `false` and downstream campaign selection must exclude these records unless specialist sanctions counsel has cleared the specific activity.

| Batch 001 row | Billionaire | Previous classification | Override classification | Reason / treatment | Evidence anchor |
|---:|---|---|---|---|---|
| 57 | Alexey Mordashov | `verified_institutional_source_age_warning` | `legal_compliance_block` | UK sanctions designation. Preserve Severstal/network intelligence but do not treat it as an outreach route. | https://www.gov.uk/government/news/foreign-secretary-announces-historic-round-of-sanctions-15-march-2022 ; https://www.gov.uk/guidance/russia-list-of-designations-and-sanctions-notices |
| 80 | Vladimir Potanin | `verified_public_institutional` | `legal_compliance_block` | UK-sanctioned; Interros/Nornickel route remains ownership intelligence only. | https://www.gov.uk/government/news/commission-opens-inquiry-into-the-potanin-foundation-as-founder-sanctioned ; https://www.gov.uk/guidance/russia-list-of-designations-and-sanctions-notices |
| 81 | Vagit Alekperov | `verified_public_institutional` | `legal_compliance_block` | UK sanctions designation. Preserve LUKOIL institutional relationship but block outreach. | https://www.gov.uk/government/news/uk-sanctions-178-russian-separatists-in-breakaway-regions ; https://www.gov.uk/guidance/russia-list-of-designations-and-sanctions-notices |
| 89 | Leonid Mikhelson | `verified_public_institutional` | `legal_compliance_block` | Current UK Sanctions List entry RUS1126; asset freeze and other sanctions. NOVATEK route is intelligence only. | https://search-uk-sanctions-list.service.gov.uk/designations/RUS1126/Individual |
| 99 | Suleiman Kerimov & family | `verified_public_institutional` | `legal_compliance_block` | Active sanctions exposure including current OFAC SDN status; official US Treasury notes UK sanctions as well. Preserve Polyus/network intelligence only. | https://ofac.treasury.gov/recent-actions/20220930 ; https://home.treasury.gov/news/press-releases/jy1102 |

## Corrected Batch 001 roll-up

After applying these overrides, Batch 001 should be interpreted as:

- **75** `verified_public_institutional`
- **14** `verified_institutional_restricted`
- **4** `verified_institutional_switchboard_or_postal`
- **2** `verified_institutional_source_age_warning`
- **5** `legal_compliance_block`
- **100 / 100** documented route/status outcomes

These overrides supersede the affected row classifications and the original Batch 001 summary totals during database reconciliation.
