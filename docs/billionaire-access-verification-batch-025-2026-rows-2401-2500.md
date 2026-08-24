# Billionaire Access Verification — Batch 025 (2026 Source Rows 2401–2500)

**Reviewed:** 2026-08-24  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **2401–2500**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **64** `verified_public_institutional`
- **26** `verified_institutional_restricted`
- **4** `verified_institutional_source_age_warning`
- **5** `enhanced_compliance_review`
- **1** `legal_compliance_block`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institutional or asset route exists. It does not imply personal delivery and does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 2401 | Jack Cogen | CoreWeave shareholder/former director; current company governance/IR asset route | `verified_institutional_source_age_warning` |
| 2402 | Sasson Dayan & family | Banco Daycoval corporate/institutional route | `verified_public_institutional` |
| 2403 | Diego Della Valle | Tod's Group / family corporate route | `verified_public_institutional` |
| 2404 | Christian Dreyer | AMAZONE Group owner/chairman corporate route | `verified_public_institutional` |
| 2405 | Justus Dreyer | AMAZONE Group owner/chairman corporate route | `verified_public_institutional` |
| 2406 | Fang Hongbo | Midea Group chairman/CEO investor route | `verified_public_institutional` |
| 2407 | Artur Grynbaum | Grupo Boticário advisory-board/corporate route | `verified_public_institutional` |
| 2408 | Hao Hong | Asymchem Laboratories chairman/founder investor route | `verified_public_institutional` |
| 2409 | Eric Hémar | ID Logistics chairman/CEO investor route | `verified_public_institutional` |
| 2410 | Huang Xu | Rockchip Electronics founder/chairman listed-company route | `verified_public_institutional` |
| 2411 | Harvey Jones | NVIDIA legacy director/shareholder route | `verified_institutional_restricted` |
| 2412 | Igor Khudokormov | Prodimex Group agriculture route; Russia compliance review | `enhanced_compliance_review` |
| 2413 | Kim Jung-min | NXC/Nexon inherited family asset route | `verified_institutional_restricted` |
| 2414 | Kim Jung-youn | NXC/Nexon inherited family asset route | `verified_institutional_restricted` |
| 2415 | Carsten Koerl | Sportradar founder/CEO investor route | `verified_public_institutional` |
| 2416 | Lai Jianfa | ZTO Express former executive/shareholder route | `verified_institutional_source_age_warning` |
| 2417 | Guy Laliberté | Lune Rouge / One Drop institutional route | `verified_public_institutional` |
| 2418 | Margarita Latsis Catsiapis & family | Latsis family investment/banking-shipping route | `verified_institutional_restricted` |
| 2419 | Lau Cho Kun | Hap Seng Consolidated / Gek Poh / Lei Shing Hong asset route | `verified_public_institutional` |
| 2420 | Mariarosa Lavelli | Technoprobe family shareholder route | `verified_institutional_restricted` |
| 2421 | Lee Hae-jin | NAVER board chairman/corporate route | `verified_public_institutional` |
| 2422 | Vladimir Leshchikov | Slavyanskiy Mir / Moscow real-estate route; Russia compliance review | `enhanced_compliance_review` |
| 2423 | Charles Liang | Super Micro Computer founder/CEO investor route | `verified_public_institutional` |
| 2424 | Liang Yunchao | By-health chairman listed-company route | `verified_public_institutional` |
| 2425 | Lin Fanlian | Order Group chairman corporate route | `verified_public_institutional` |
| 2426 | K.C. Liu | Advantech chairman/cofounder investor route | `verified_public_institutional` |
| 2427 | Aloke Lohia | Indorama Ventures founder/chairman investor route | `verified_public_institutional` |
| 2428 | Brandt Louie | H.Y. Louie / London Drugs family corporate route | `verified_public_institutional` |
| 2429 | Lu Di | DJI early investor/financial-manager legacy asset route | `verified_institutional_restricted` |
| 2430 | Cargill MacMillan III | Cargill family corporate route | `verified_institutional_restricted` |
| 2431 | John MacMillan | Cargill family corporate route | `verified_institutional_restricted` |
| 2432 | Martha MacMillan | Cargill family corporate route | `verified_institutional_restricted` |
| 2433 | William MacMillan | Cargill family corporate route | `verified_institutional_restricted` |
| 2434 | Satish Mehta | Emcure Pharmaceuticals founder/CEO investor route | `verified_public_institutional` |
| 2435 | Ulrich Mommert & family | Private investment/horse-racing route; ZKW sold to LG in 2018 | `verified_institutional_restricted` |
| 2436 | Jahm Najafi | The Najafi Companies investment-office route | `verified_public_institutional` |
| 2437 | Helene Odfjell | Odfjell family shipping/drilling asset route | `verified_institutional_restricted` |
| 2438 | Sam Pollock | Brookfield institutional/private-equity route | `verified_public_institutional` |
| 2439 | Ren Jianhua | Hangzhou Robam Appliances chairman listed-company route | `verified_public_institutional` |
| 2440 | Francisco Jose Riberas Mera | Gestamp / Gonvarri family industrial route | `verified_public_institutional` |
| 2441 | Juan Maria Riberas Mera | Gestamp / Gonvarri family industrial route | `verified_public_institutional` |
| 2442 | Martine Rothblatt | United Therapeutics founder/chair/CEO investor route | `verified_public_institutional` |
| 2443 | Carlos Sanchez | Brazilian generic-drugs family corporate route | `verified_public_institutional` |
| 2444 | Steven Sarowitz | Paylocity founder/shareholder / Wayfarer Foundation route | `verified_public_institutional` |
| 2445 | Ivan Savvidis & family | Agrocom / PAOK institutional network; sanctions/PEP outside UK | `enhanced_compliance_review` |
| 2446 | James Scapa | Altair Engineering founder; Siemens acquisition legacy route | `verified_institutional_source_age_warning` |
| 2447 | Phil Shawe | TransPerfect cofounder/CEO corporate route | `verified_public_institutional` |
| 2448 | S.D. Shibulal | Axilor Ventures / Infosys founder network route | `verified_public_institutional` |
| 2449 | Sergey Shishkarev | Delo Group transport route; Russia strategic-sector compliance review | `enhanced_compliance_review` |
| 2450 | Leonid Simanovsky | Novatek/investment network — intelligence only; UK designated | `legal_compliance_block` |
| 2451 | Hal Steinbrenner | New York Yankees family ownership route | `verified_public_institutional` |
| 2452 | Jessica Steinbrenner | New York Yankees family ownership route | `verified_institutional_restricted` |
| 2453 | Jennifer Steinbrenner Swindal | New York Yankees family ownership route | `verified_institutional_restricted` |
| 2454 | Harley Sy | SM Investments / BDO family corporate route | `verified_public_institutional` |
| 2455 | Sze Man Bok | Hengan International cofounder/chairman investor route | `verified_public_institutional` |
| 2456 | Andrew Tan | Alliance Global / Megaworld chairman investor route | `verified_public_institutional` |
| 2457 | Min-Liang Tan | Razer cofounder/CEO corporate route | `verified_public_institutional` |
| 2458 | Tang Xiuguo | SANY Group cofounder/executive corporate route | `verified_public_institutional` |
| 2459 | Andrew Tisch | Loews corporate/family route | `verified_public_institutional` |
| 2460 | Torsten Toeller | Fressnapf founder/owner corporate route | `verified_public_institutional` |
| 2461 | Kenny Troutt | WinStar Farm / private investment route | `verified_public_institutional` |
| 2462 | Igor Tulchinsky | WorldQuant founder/CEO institutional route | `verified_public_institutional` |
| 2463 | Paul Van Zuydam | Le Creuset owner/private-company route | `verified_public_institutional` |
| 2464 | Pacal Vanhalst & family | TVH family industrial route | `verified_institutional_restricted` |
| 2465 | Sandro Veronesi & family | Oniverse founder/chairman corporate route | `verified_public_institutional` |
| 2466 | Ricardo Villela Marino | Itaú Unibanco / Moreira Salles-Villela family route | `verified_institutional_restricted` |
| 2467 | Rodolfo Villela Marino | Itaú Unibanco / Moreira Salles-Villela family route | `verified_institutional_restricted` |
| 2468 | Eduardo Voigt Schwartz | WEG family shareholder route | `verified_institutional_restricted` |
| 2469 | Mariana Voigt Schwartz Gomes | WEG family shareholder route | `verified_institutional_restricted` |
| 2470 | Wang Chaobin | Zhonglu Group / Wang Chaobin Charitable Foundation route | `verified_public_institutional` |
| 2471 | Richard Warke | Augusta Group mining investment route | `verified_public_institutional` |
| 2472 | Xiang Wenbo | SANY Heavy Industry chairman/executive route | `verified_public_institutional` |
| 2473 | Tony Xu | DoorDash cofounder/CEO investor route | `verified_public_institutional` |
| 2474 | Ye Xiaoping | Hangzhou Tigermed Consulting chairman investor route | `verified_public_institutional` |
| 2475 | Yoshiaki Yoshida | DHC legacy wealth route; DHC sold to ORIX in 2023 | `verified_institutional_source_age_warning` |
| 2476 | Yu Qibing & family | Kibing Group former-chairman/shareholder route | `verified_institutional_restricted` |
| 2477 | Yuan Zhongxue | Sailun Group chairman/corporate route | `verified_public_institutional` |
| 2478 | Zeng Kaitian | 37 Interactive Entertainment/37Games cofounder route | `verified_public_institutional` |
| 2479 | Zhang Yubo | Moore Threads Technology cofounder listed-company route | `verified_public_institutional` |
| 2480 | Ivan Zhao | Notion cofounder/CEO corporate route | `verified_public_institutional` |
| 2481 | Mohammad Abunayyan | Vision Invest / ACWA Power institutional route | `verified_public_institutional` |
| 2482 | A. Jayson Adair | Copart executive chairman/investor route | `verified_public_institutional` |
| 2483 | Sanjay Agarwal | AU Small Finance Bank founder/CEO investor route | `verified_public_institutional` |
| 2484 | Aziz Akhannouch & family | Morocco Head of Government / Akwa family network; public-official review | `enhanced_compliance_review` |
| 2485 | Dmitry Alexeyev | DNS retail founder/private-company route | `verified_institutional_restricted` |
| 2486 | Akirov Alfred | Alrov Properties founder/chairman investor route | `verified_public_institutional` |
| 2487 | Jeremy Allaire | Circle cofounder/CEO investor/corporate route | `verified_public_institutional` |
| 2488 | Patricia Angelini Rossi | AntarChile / Empresas Copec family shareholder route | `verified_institutional_restricted` |
| 2489 | Ben Ashkenazy | Ashkenazy Acquisition Corporation institutional route | `verified_public_institutional` |
| 2490 | Kapil Bhatia | InterGlobe/IndiGo family corporate-investor route | `verified_institutional_restricted` |
| 2491 | Annika Bootsman Kleberg | Wallenius/Kleberg family shipping route | `verified_institutional_restricted` |
| 2492 | R.G. Chandramogan | Hatsun Agro Product founder/chairman investor route | `verified_public_institutional` |
| 2493 | Chen Shiliang | Tongkun Group chairman/family chemical-fiber route | `verified_public_institutional` |
| 2494 | Chen Zhisong | Yealink Network Technology cofounder/chairman listed-company route | `verified_public_institutional` |
| 2495 | Cheng Zhenghui | LifeTech Scientific early founder/shareholder asset route | `verified_institutional_restricted` |
| 2496 | Chu Mang Yee & family | Hopson Development Holdings family investor route | `verified_public_institutional` |
| 2497 | Lucio Co | Cosco Capital / Puregold corporate-investor route | `verified_public_institutional` |
| 2498 | Agustín Coppel Luken | Grupo Coppel chairman/family corporate route | `verified_public_institutional` |
| 2499 | Bharat Desai | Syntel legacy wealth / family investment-philanthropic route | `verified_institutional_restricted` |
| 2500 | Viren Doshi | Waaree Energies family shareholder route | `verified_public_institutional` |

## Critical current-role and compliance corrections

1. **Jack Cogen:** CoreWeave disclosed in April 2026 that he would not stand for re-election and would step off the board at the annual meeting. Keep CoreWeave as a shareholder/asset route, but do not represent him as a continuing director after that point.
2. **Christian and Justus Dreyer:** AMAZONE itself identifies both as owner/managing-board leaders; this is a strong current family-company route.
3. **Hao Hong:** current Forbes evidence identifies him as founder/chairman of dual-listed Asymchem Laboratories.
4. **Lai Jianfa:** left his ZTO executive/director roles in May 2022. ZTO remains a shareholder/asset route, not a current operating-executive route.
5. **Mariarosa Lavelli:** widow of Technoprobe founder Giuseppe Crippa and an 11% shareholder; use Technoprobe as a family-asset route rather than implying a management role.
6. **Lee Hae-jin:** NAVER's own July 2026 materials identify him as Board Chairman, making NAVER a current institutional route.
7. **Ulrich Mommert:** sold ZKW to LG in 2018. Do not use ZKW as a current operating route to him.
8. **Ivan Savvidis:** sanctions/PEP signals exist outside the UK. Store as enhanced compliance review unless/until a specific applicable UK designation is evidenced.
9. **Leonid Simanovsky:** confirmed on UK financial-sanctions material (Group ID 14583). Preserve Novatek/investment intelligence only and hard-block outreach.
10. **Yoshiaki Yoshida:** ORIX acquired DHC beginning in 2023. DHC is historical wealth evidence, not a current direct operating route to Yoshida.
11. **Yu Qibing:** current Forbes describes him as former chairman of Kibing Group. Keep Kibing as shareholder/asset intelligence rather than current executive access.
12. **Aziz Akhannouch:** current 2026 Moroccan government materials identify him as Head of Government. Any engagement requires a public-official/PEP compliance gate; do not treat Akwa corporate access as ordinary outreach.
13. **Bharat Desai:** Syntel was sold to Atos in 2018. Use current family investment/philanthropic structures rather than Syntel as an active executive route.
14. **No Russian record was hard-blocked merely because of nationality.** Where current UK designation evidence was not found, the route is either restricted or escalated for enhanced review rather than falsely labelled sanctioned.

## Selected public evidence anchors

- Forbes 2026 source CSV: https://raw.githubusercontent.com/AhoyLemon/kinda.fun/main/src/views/guillotine/csv/forbes-2026.csv
- CoreWeave governance / SEC 2026 filing: https://www.sec.gov/Archives/edgar/data/1769628/000176962826000191/crwv-20260422.htm
- AMAZONE owner/management evidence: https://amazone.co.uk/en-gb/service-support/for-the-press/press-releases/latest/double-jubilee-birthday-celebration-at-amazone-1483244
- NAVER July 2026 chairman evidence: https://navercorp.com/en/story/storyDetail?seq=10034603
- UK Sanctions List / Russia notices: https://www.gov.uk/guidance/russia-list-of-designations-and-sanctions-notices
- ORIX DHC acquisition evidence: https://www.orix.co.jp/grp/en/pdf/ir/library/20f/2023_3QE.pdf
- Technoprobe family history: https://www.technoprobe.com/company/our-history/foundation

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and write/update `organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`, `last_reviewed_at = 2026-08-24`, verification state above, and `outreach_allowed = false`.

For `legal_compliance_block`, add a hard person-level exclusion. For `enhanced_compliance_review`, require a current jurisdiction-specific sanctions/PEP screen before any campaign selection. Do not overwrite stronger prior evidence; supersede or annotate it.