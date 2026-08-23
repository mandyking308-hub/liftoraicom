# Billionaire Access Verification — Batch 001 (2026 Top 100 Sweep)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes around billionaire records.

## Scope caveat

The production Liftor Supabase project was not queryable from the connected session, so this batch could not be selected as the exact next 100 rows from `needs_manual_review`. Instead, this is a deterministic verification sweep of the current Forbes 2026 top 100 represented in the Liftor wealth layer. It must be reconciled by billionaire ID before database import.

This does **not** replace the existing 2,754-record universe. It enriches it.

## Verification rules

- Follow the money: company, family office, foundation, investment vehicle, board, investor relations, grants portal, institutional enquiry or other legitimate organisation-level doorway counts.
- A route does **not** need to relate to GHAT.
- No guessed personal emails, private phone numbers or private addresses.
- Restrictions are retained rather than deleting the route: invitation-only, opportunity-specific, no unsolicited proposals, customer/press-only, postal/switchboard-only, or source-age caution.
- `outreach_allowed` remains `false`; verification of a route is separate from approval to contact it.
- Shared organisations are deliberately reusable across connected family members.
- A documented closed/restricted route is still useful intelligence.

## Batch result

- **79** `verified_public_institutional`
- **14** `verified_institutional_restricted`
- **4** `verified_institutional_switchboard_or_postal`
- **3** `verified_institutional_source_age_warning`
- **100 / 100** have a documented institutional route status in this sweep.

> Important: “verified” here means the organisation and public institutional doorway are evidenced. It does **not** mean the billionaire personally receives messages sent through that channel, and it does not authorise outreach.

## Records

| # | Billionaire | Organisation / route | Access mode | Restriction / note | Verification | Official source anchor |
|---:|---|---|---|---|---|---|
| 1 | Elon Musk | Tesla Investor Relations / Board communications | Public IR / governance | Institutional route, not personal | verified_public_institutional | https://ir.tesla.com/ |
| 2 | Larry Page | Alphabet Investor Relations | Public IR | Shared Alphabet route | verified_public_institutional | https://abc.xyz/investor/ |
| 3 | Sergey Brin | Alphabet Investor Relations | Public IR | Shared Alphabet route | verified_public_institutional | https://abc.xyz/investor/ |
| 4 | Jeff Bezos | Amazon Investor Relations | Public IR | Corporate route | verified_public_institutional | https://ir.aboutamazon.com/ |
| 5 | Mark Zuckerberg | Chan Zuckerberg Initiative opportunities | Application / institutional | Opportunity-specific; no general unsolicited route assumed | verified_institutional_restricted | https://chanzuckerberg.com/ |
| 6 | Larry Ellison | Oracle Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investor.oracle.com/ |
| 7 | Bernard Arnault & family | LVMH Investor Relations | Public IR | Corporate / family wealth-source route | verified_public_institutional | https://www.lvmh.com/en/investors |
| 8 | Jensen Huang | NVIDIA Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investor.nvidia.com/ |
| 9 | Warren Buffett | Berkshire Hathaway Board / Secretary correspondence | Governance correspondence | Formal institutional route | verified_public_institutional | https://www.berkshirehathaway.com/ |
| 10 | Amancio Ortega | Inditex Investor / shareholder relations | Public IR | Route is valid but some contact evidence is older; recheck immediately before use | verified_institutional_source_age_warning | https://www.inditex.com/ |
| 11 | Rob Walton & family | Walton Family Foundation | Foundation enquiry | Foundation does not generally accept unsolicited grant proposals | verified_institutional_restricted | https://www.waltonfamilyfoundation.org/ |
| 12 | Jim Walton & family | Walton Family Foundation | Foundation enquiry | Shared family route; proposal restrictions apply | verified_institutional_restricted | https://www.waltonfamilyfoundation.org/ |
| 13 | Michael Dell | Michael & Susan Dell Foundation | Foundation / funding route | Institutional funding process | verified_public_institutional | https://www.dell.org/ |
| 14 | Alice Walton | Walton Family Foundation | Foundation enquiry | Shared family route; proposal restrictions apply | verified_institutional_restricted | https://www.waltonfamilyfoundation.org/ |
| 15 | Steve Ballmer | Ballmer Group | Philanthropic institution | No broad personal/public route; use relevant programme/institutional channel | verified_institutional_restricted | https://ballmergroup.org/ |
| 16 | Carlos Slim Helu & family | Fundación Carlos Slim | Foundation contact | Public institutional enquiry | verified_public_institutional | https://fundacioncarlosslim.org/ |
| 17 | Changpeng Zhao | Binance corporate support / institutional ecosystem | Public corporate support | Corporate route, not personal | verified_public_institutional | https://www.binance.com/ |
| 18 | Michael Bloomberg | Bloomberg Philanthropies application system | Application manager | No general open call currently evidenced; opportunity-led | verified_institutional_restricted | https://www.bloomberg.org/ |
| 19 | Bill Gates | Gates Foundation RFP / Grand Challenges | Funding application | Much grantmaking is invitation-led; live calls exist | verified_institutional_restricted | https://www.gatesfoundation.org/ |
| 20 | Françoise Bettencourt Meyers & family | Fondation Bettencourt Schueller | Foundation contact | Public institutional route | verified_public_institutional | https://www.fondationbs.org/ |
| 21 | Mukesh Ambani | Reliance Industries Investor Relations | Public IR | Corporate route | verified_public_institutional | https://www.ril.com/ |
| 22 | Giancarlo Devasini | Tether support / corporate route | Public corporate support | Institutional company route, not personal | verified_public_institutional | https://tether.to/ |
| 23 | Thomas Peterffy | Interactive Brokers Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investors.interactivebrokers.com/ |
| 24 | Julia Koch & family | Koch corporate enquiry / grants | Corporate / grant route | Shared Koch institutional route | verified_public_institutional | https://www.kochinc.com/ |
| 25 | Charles Koch & family | Koch corporate enquiry / grants | Corporate / grant route | Shared Koch institutional route | verified_public_institutional | https://www.kochinc.com/ |
| 26 | Zhang Yiming | ByteDance corporate contact | Press / advertising / corporate | Purpose-limited public channels; no personal route | verified_institutional_restricted | https://www.bytedance.com/ |
| 27 | Zhong Shanshan | Nongfu Spring corporate / media contact | Public corporate | Wealth-source company route | verified_public_institutional | https://www.nongfuspring.com/ |
| 28 | Jeff Yass | Susquehanna International Group | Institutional sales / office route | Institutional trading/company route | verified_public_institutional | https://sig.com/ |
| 29 | Dieter Schwarz | Dieter Schwarz Stiftung | Funding application | Actual foundation funding/application route | verified_public_institutional | https://www.dieter-schwarz-stiftung.de/ |
| 30 | Germán Larrea | Grupo México Investor Relations | Public IR | Corporate wealth-source route | verified_public_institutional | https://www.gmexico.com/ |
| 31 | Gautam Adani | Adani Enterprises Investor Relations | Public IR | Corporate route | verified_public_institutional | https://www.adanienterprises.com/ |
| 32 | Tadashi Yanai | Fast Retailing Investor Relations | Public IR | Corporate route | verified_public_institutional | https://www.fastretailing.com/eng/ir/ |
| 33 | Ma Huateng | Tencent Investor Relations | Public IR | Route evidenced but source/contact details should be freshness-checked immediately before use | verified_institutional_source_age_warning | https://www.tencent.com/en-us/investors.html |
| 34 | Robin Zeng | CATL Investor Relations | Public IR | Corporate route | verified_public_institutional | https://www.catl.com/ |
| 35 | Iris Fontbona | Antofagasta plc Investor Relations | Public IR | Family wealth-source company route | verified_public_institutional | https://www.antofagasta.co.uk/investors/ |
| 36 | Masayoshi Son | SoftBank Group Investor Relations | Public IR / enquiry form | Corporate route | verified_public_institutional | https://group.softbank/en/ir |
| 37 | Ken Griffin | Citadel client / partner route | Institutional client/partner | Institutional route, not personal | verified_public_institutional | https://www.citadel.com/ |
| 38 | Jacqueline Mars | Mars global contact | Public corporate enquiry | Shared private-company route | verified_public_institutional | https://www.mars.com/ |
| 39 | John Mars | Mars global contact | Public corporate enquiry | Shared private-company route | verified_public_institutional | https://www.mars.com/ |
| 40 | Lukas Walton | Walton Family Foundation | Foundation enquiry | Shared family route; unsolicited-proposal restrictions apply | verified_institutional_restricted | https://www.waltonfamilyfoundation.org/ |
| 41 | Giovanni Ferrero | Ferrero global contact | Public corporate enquiry | Private-company institutional route | verified_public_institutional | https://www.ferrero.com/ |
| 42 | Li Ka-shing | Li Ka Shing Foundation | Funding submission / general contact | Public foundation funding route | verified_public_institutional | https://www.lksf.org/ |
| 43 | Mark Mateschitz | Red Bull corporate support / contact | Public corporate | Corporate route | verified_public_institutional | https://www.redbull.com/ |
| 44 | Gianluigi Aponte | MSC Foundation | Foundation contact | Shared Aponte family route | verified_public_institutional | https://www.mscfoundation.org/ |
| 45 | Rafaela Aponte-Diamant | MSC Foundation | Foundation contact | Shared Aponte family route | verified_public_institutional | https://www.mscfoundation.org/ |
| 46 | Andrea Pignataro | ION Group | Public corporate contact / offices | Corporate route | verified_public_institutional | https://iongroup.com/ |
| 47 | Klaus-Michael Kühne | Kühne Foundation | Foundation contact | Institutional foundation route | verified_public_institutional | https://www.kuehne-stiftung.org/ |
| 48 | Thomas Frist Jr | HCA Healthcare Investor Relations | Public IR | Current named IR function available | verified_public_institutional | https://investor.hcahealthcare.com/ |
| 49 | Alain Wertheimer | Chanel corporate / client / press route | Corporate switchboard / formal enquiry | Private company; no shareholder IR; use only purpose-appropriate channel | verified_institutional_restricted | https://www.chanel.com/ |
| 50 | Gérard Wertheimer | Chanel corporate / client / press route | Corporate switchboard / formal enquiry | Shared Chanel route; no shareholder IR | verified_institutional_restricted | https://www.chanel.com/ |
| 51 | Savitri Jindal | Jindal Foundation | Foundation contact | Family institutional route | verified_public_institutional | https://jindalfoundation.com/ |
| 52 | Stephen Schwarzman | Blackstone shareholder / institutional route | Public IR | Corporate route | verified_public_institutional | https://www.blackstone.com/ |
| 53 | Paolo Ardoino | Tether support / corporate route | Public corporate support | Institutional company route | verified_public_institutional | https://tether.to/ |
| 54 | Jean-Louis van der Velde | Tether / Bitfinex corporate route | Public corporate support | Institutional company route | verified_public_institutional | https://tether.to/ |
| 55 | William Ding | NetEase Investor Relations | Public IR | Corporate route | verified_public_institutional | https://ir.netease.com/ |
| 56 | Miriam Adelson | Las Vegas Sands Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investor.sands.com/ |
| 57 | Alexey Mordashov | Severstal Investor Relations | Public IR | Contact route is historically evidenced but needs immediate freshness recheck before use | verified_institutional_source_age_warning | https://www.severstal.com/ |
| 58 | Colin Huang | PDD Holdings Investor Relations | Public IR | Current corporate route | verified_public_institutional | https://investor.pddholdings.com/ |
| 59 | Eduardo Saverin | B Capital | General / investor / media contact | Direct institutional route to firm co-founded by Saverin | verified_public_institutional | https://b.capital/ |
| 60 | Eric Schmidt | Schmidt Futures | Institutional enquiry | Philanthropic/institutional route | verified_public_institutional | https://www.schmidtfutures.org/ |
| 61 | Idan Ofer | Kenon Holdings Investor Relations | Public IR | Strong route through public holding company tied to Ofer | verified_public_institutional | https://www.kenon-holdings.com/ |
| 62 | Eyal Ofer | Ofer Global | General institutional enquiry | Family investment-group route | verified_public_institutional | https://www.oferglobal.com/ |
| 63 | He Xiangjian | Midea Group | Public corporate contact | Wealth-source company route | verified_public_institutional | https://www.midea-group.com/ |
| 64 | Abigail Johnson | Fidelity | Corporate service / governance route | No personal route; use formal company/supplier/governance channel as appropriate | verified_institutional_switchboard_or_postal | https://www.fidelity.com/ |
| 65 | Zheng Shuliang | China Hongqiao Group | Investor / corporate contact | Wealth-source company route | verified_public_institutional | https://www.hongqiaochina.com/ |
| 66 | Marilyn Simons | Simons Foundation | Grant / programme contacts | Foundation institutional route | verified_public_institutional | https://www.simonsfoundation.org/ |
| 67 | Robert Pera | Ubiquiti | Investor Relations | Public IR | verified_public_institutional | https://ir.ui.com/ |
| 68 | Phil Knight | Nike Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investors.nike.com/ |
| 69 | Michal Strnad | CSG | Group contact | Direct institutional route through group led by Strnad | verified_public_institutional | https://czechoslovakgroup.com/ |
| 70 | Lakshmi Mittal | ArcelorMittal Investor Relations | Public IR | Corporate route | verified_public_institutional | https://corporate.arcelormittal.com/investors |
| 71 | Elaine Marshall | Koch corporate enquiry / grants | Corporate / grant route | Shared Koch institutional route | verified_public_institutional | https://www.kochinc.com/ |
| 72 | Shiv Nadar | Shiv Nadar Foundation | Foundation contact | Institutional philanthropic route | verified_public_institutional | https://www.shivnadarfoundation.org/ |
| 73 | Henry Samueli | Samueli Foundation | Foundation / grantseeker contact | Public institutional route | verified_public_institutional | https://samueli.org/ |
| 74 | Melinda French Gates | Pivotal | Institutional / programme route | Does not provide a broad unsolicited personal route; use relevant opportunity/partner channel | verified_institutional_restricted | https://www.pivotal.com/ |
| 75 | Stefan Quandt | BMW Group Investor Relations | Public IR | Shared BMW shareholder/company route | verified_public_institutional | https://www.bmwgroup.com/en/investor-relations.html |
| 76 | Reinhold Würth | Würth Group | General / corporate communications | Public institutional route | verified_public_institutional | https://www.wuerth.com/ |
| 77 | Lyndal Stephens Greth | Hunt Oil | Corporate development / public affairs / office | Family company route | verified_public_institutional | https://www.huntoil.com/ |
| 78 | Len Blavatnik | Access Industries | Public enquiry / offices | Family investment company route | verified_public_institutional | https://www.accessindustries.com/ |
| 79 | Susanne Klatten | BMW Group Investor Relations | Public IR | Shared BMW shareholder/company route | verified_public_institutional | https://www.bmwgroup.com/en/investor-relations.html |
| 80 | Vladimir Potanin | Interros / Nornickel | Corporate / investor enquiry | Public institutional route | verified_public_institutional | https://www.interros.ru/en/ |
| 81 | Vagit Alekperov | LUKOIL Investor / shareholder relations | Public IR | Wealth-source company route | verified_public_institutional | https://www.lukoil.com/ |
| 82 | François Pinault | Kering shareholder / corporate route | Public shareholder / corporate enquiry | Family wealth-source route | verified_public_institutional | https://www.kering.com/ |
| 83 | Jack Ma | Alibaba Group Investor Relations | Public IR | Corporate wealth-source route | verified_public_institutional | https://www.alibabagroup.com/en-US/investor-relations |
| 84 | Prajogo Pangestu | Barito Pacific investor / corporate secretary | Public IR / corporate secretary | Controlling-shareholder company route | verified_public_institutional | https://barito-pacific.com/ |
| 85 | MacKenzie Scott | Yield Giving | Official inquiry/process information | Yield Giving explicitly does not accept unsolicited candidate messages; beware impersonation/scam sites | verified_institutional_restricted | https://yieldgiving.com/ |
| 86 | Aliko Dangote | Dangote Group | Investor / partnerships / corporate enquiry | Strong public institutional route | verified_public_institutional | https://dangote.com/ |
| 87 | Peter Thiel | Thiel Foundation / Thiel Fellowship | Programme application / foundation contact | Fellowship applications are public; other Foundation access is purpose-specific | verified_institutional_restricted | https://thielfellowship.org/ |
| 88 | Emmanuel Besnier | Lactalis Group | Global corporate enquiry | Private company route; Lactalis identifies Besnier as chairman | verified_public_institutional | https://www.lactalis.com/ |
| 89 | Leonid Mikhelson | NOVATEK Investor Relations | Public IR / shareholder | Strong wealth-source company route | verified_public_institutional | https://www.novatek.ru/en/ |
| 90 | Daniel Gilbert | Gilbert Family Foundation | Foundation contact / current RFP route | Programme-specific grant route available | verified_public_institutional | https://gilbertfamilyfoundation.org/ |
| 91 | Lei Jun | Xiaomi Investor Relations | Public IR | Corporate route | verified_public_institutional | https://ir.mi.com/ |
| 92 | Andreas von Bechtolsheim | Arista Networks Investor Relations | Public IR | Corporate route | verified_public_institutional | https://investors.arista.com/ |
| 93 | Pham Nhat Vuong | Vingroup Investor Relations | Public IR | Corporate route | verified_public_institutional | https://vingroup.net/en/investor-relations |
| 94 | Vicky Safra | J. Safra Group / Safra National Bank | Formal corporate office / banking route | Family-owned group; no personal public route identified | verified_institutional_switchboard_or_postal | https://www.safra.com/ |
| 95 | Jay Y. Lee | Samsung Electronics Investor Relations | Public IR | Current corporate route | verified_public_institutional | https://www.samsung.com/global/ir/ |
| 96 | Cyrus Poonawalla | Serum Institute of India | Corporate headquarters / formal company route | Chairman relationship verified; no direct public general email relied upon | verified_institutional_switchboard_or_postal | https://www.seruminstitute.com/ |
| 97 | Rick Cohen | Symbotic | Investor Relations / partnership contact | Strong direct institutional route through company chaired/led by Cohen | verified_public_institutional | https://ir.symbotic.com/ |
| 98 | Israel Englander | Millennium Management | Formal headquarters / corporate office | Founder/chairman relationship verified; no public general email relied upon | verified_institutional_switchboard_or_postal | https://www.mlp.com/ |
| 99 | Suleiman Kerimov & family | Polyus | Investor Relations | Corporate wealth-source route; not represented as personal contact | verified_public_institutional | https://polyus.com/en/investors/ |
| 100 | Dilip Shanghvi | Sun Pharma | Investor / institutional investor contact | Founder/executive-chairman relationship and public investor channel | verified_public_institutional | https://sunpharma.com/ |

## High-value reusable route clusters

The following shared institutional routes should be propagated to all linked billionaire records after ID reconciliation rather than researched repeatedly:

- Walton Family Foundation → Rob Walton, Jim Walton, Alice Walton, Lukas Walton.
- Alphabet Investor Relations → Larry Page, Sergey Brin.
- Koch institutional routes → Charles Koch, Julia Koch family, Elaine Marshall where the ownership/beneficial-interest linkage is retained in Liftor.
- Mars corporate route → Jacqueline Mars, John Mars.
- MSC Foundation → Gianluigi Aponte, Rafaela Aponte-Diamant.
- Chanel corporate route → Alain Wertheimer, Gérard Wertheimer.
- Tether institutional route → Giancarlo Devasini, Paolo Ardoino, Jean-Louis van der Velde, subject to each person’s current role/linkage record.
- BMW Investor Relations → Stefan Quandt, Susanne Klatten.

## Data-quality corrections / warnings

1. **MacKenzie Scott:** use only the official `yieldgiving.com` domain. Yield Giving itself warns about impersonation/scams and states that unsolicited messages suggesting candidates are not accepted. Do not ingest look-alike grant sites.
2. **Restricted is not failed:** CZI, Walton Family Foundation, Gates Foundation, Bloomberg Philanthropies, Pivotal, Yield Giving and Thiel-related programme routes remain valuable even when access is invitation-led or programme-specific.
3. **Private companies still have doors:** Chanel, Mars, Ferrero, Lactalis and Access Industries do not need public-market IR to count; formal corporate, foundation or office routes are valid.
4. **Source-age caution:** Inditex, Tencent and Severstal should be rechecked immediately before any future outreach because the best contact evidence found in this pass was not as fresh as the 2026 evidence for most of the batch.
5. **No route equals no guessing:** where only a formal office/switchboard was evidenced (Fidelity/Johnson, Safra, Serum Institute, Millennium), that weaker access mode is stored explicitly rather than fabricating a direct email.

## Import intent

When the production database becomes accessible, reconcile each row to `billionaire_id`, then update/create the relevant candidate/access pathway with:

- evidence-backed `organisation_name`
- `source_url`
- `route_access_mode`
- `route_restriction_notes`
- `last_reviewed_at = 2026-08-23`
- appropriate verification state above
- `outreach_allowed = false`

Do **not** overwrite stronger existing evidence. Do **not** delete older routes; supersede or downgrade them with review notes where necessary.
