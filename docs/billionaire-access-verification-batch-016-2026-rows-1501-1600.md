# Billionaire Access Verification — Batch 016 (2026 Source Rows 1501–1600)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **1501–1600**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **60** `verified_public_institutional`
- **35** `verified_institutional_restricted`
- **3** `enhanced_compliance_review`
- **1** `legal_compliance_block`
- **1** `deceased_remove_from_active_outreach`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institutional or asset route exists. It does not imply personal delivery and does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 1501 | Zhang Jian | AIMA Technology listed-company / investor route | `verified_public_institutional` |
| 1502 | Zhang Li | Guangzhou R&F Properties shareholder route / Kinetic Mines asset route; no longer R&F CEO | `verified_institutional_restricted` |
| 1503 | Zhu Xingming | Shenzhen Inovance Technology corporate / investor route | `verified_public_institutional` |
| 1504 | Sylvan Adams | Sylvan Adams Family Foundation / Israel-Premier Tech institutional route | `verified_public_institutional` |
| 1505 | Amy Adams Strunk | Tennessee Titans corporate / community route | `verified_public_institutional` |
| 1506 | Manohar Lal Agarwal | Haldiram family corporate route | `verified_institutional_restricted` |
| 1507 | John Arnold | Arnold Ventures | `verified_public_institutional` |
| 1508 | Harindarpal Banga | Caravel Group institutional route | `verified_public_institutional` |
| 1509 | Richard Branson | Virgin Group / Virgin Unite | `verified_public_institutional` |
| 1510 | J. Hyatt Brown | Brown & Brown investor / governance route | `verified_public_institutional` |
| 1511 | Herb Chambers | Herb Chambers Companies / family philanthropy | `verified_public_institutional` |
| 1512 | Richard Chang | SMIC historical founder route / semiconductor investment network | `verified_institutional_restricted` |
| 1513 | Chen Kaixuan | Liby Group corporate route | `verified_public_institutional` |
| 1514 | Chin Jong Hwa | TYC Brother Industrial listed-company route | `verified_public_institutional` |
| 1515 | Tim Cook | Apple corporate / investor relations | `verified_public_institutional` |
| 1516 | Jamie Dimon | JPMorgan Chase corporate / investor relations | `verified_public_institutional` |
| 1517 | Mathias Doepfner | Axel Springer corporate route | `verified_public_institutional` |
| 1518 | Fan Daidi | Giant Biogene listed-company route | `verified_public_institutional` |
| 1519 | Luca Garavoglia | Campari Group investor / family-control route | `verified_public_institutional` |
| 1520 | Ge Weidong | Chaos Investment private investment-office route | `verified_institutional_restricted` |
| 1521 | Stein Erik Hagen | Canica family investment / Orkla shareholder route | `verified_institutional_restricted` |
| 1522 | Jay Hennick | Colliers investor relations | `verified_public_institutional` |
| 1523 | Brett Hildebrand | IAG Capital Partners current investment route | `verified_institutional_restricted` |
| 1524 | Jay-Z | Roc Nation / Marcy Venture Partners institutional route | `verified_public_institutional` |
| 1525 | Jian Yao | Mindray minority-shareholder asset route; no operating role inferred | `verified_institutional_restricted` |
| 1526 | Rajeev Juneja | Mankind Pharma investor / corporate route | `verified_public_institutional` |
| 1527 | Kwek Leng Kee | Hong Leong family corporate / CDL asset route | `verified_institutional_restricted` |
| 1528 | Lam Kong | China Medical System Holdings corporate / investor route | `verified_public_institutional` |
| 1529 | Christian Latouche & family | Fiducial Group corporate route | `verified_public_institutional` |
| 1530 | Richard LeFrak & family | LeFrak corporate / family foundation route | `verified_public_institutional` |
| 1531 | Bernard Lewis & family | River Island legacy record — died 28 February 2026 | `deceased_remove_from_active_outreach` |
| 1532 | Liu Sheng | Zhongji Innolight listed-company / investor route | `verified_public_institutional` |
| 1533 | Kalanithi Maran | Sun Group / Sun TV Network investor route | `verified_public_institutional` |
| 1534 | George Alexander Muthoot | Muthoot Finance / Muthoot Group institutional route | `verified_public_institutional` |
| 1535 | George Jacob Muthoot | Muthoot Finance / Muthoot Group institutional route | `verified_public_institutional` |
| 1536 | George Thomas Muthoot | Muthoot Finance / Muthoot Group institutional route | `verified_public_institutional` |
| 1537 | Sara George Muthoot | Muthoot family institutional / ownership route | `verified_institutional_restricted` |
| 1538 | Adam Neumann | Flow current real-estate company route; WeWork treated as historical wealth source | `verified_public_institutional` |
| 1539 | Philip Niarchos | Niarchos family / Stavros Niarchos Foundation cultural-asset route | `verified_institutional_restricted` |
| 1540 | Nandan Nilekani | Infosys / EkStep Foundation / Nilekani philanthropy route | `verified_public_institutional` |
| 1541 | Stefan Olsson | Olsson family diversified / investment route | `verified_institutional_restricted` |
| 1542 | Maren Otto | Otto/ECE family asset route | `verified_institutional_restricted` |
| 1543 | Ranjan Pai | Manipal Education & Medical Group institutional route | `verified_public_institutional` |
| 1544 | Tor Peterson | Mercuria Energy Group institutional route | `verified_public_institutional` |
| 1545 | Victor Pinchuk | EastOne / Victor Pinchuk Foundation / Interpipe route | `verified_public_institutional` |
| 1546 | Bernard Saul II & family | B.F. Saul Company / Saul Centers institutional route | `verified_public_institutional` |
| 1547 | Leonard Schleifer | Regeneron investor / corporate route | `verified_public_institutional` |
| 1548 | Mikhail Shelkov | VSMPO-AVISMA ownership/network intelligence; sanctions exposure requires fresh jurisdictional review | `enhanced_compliance_review` |
| 1549 | Jeffrey Talpins | Element Capital private investment route | `verified_institutional_restricted` |
| 1550 | Larry Tanenbaum | Kilmer Group / sports ownership institutional route | `verified_public_institutional` |
| 1551 | Marcel Herrmann Telles & family | 3G Capital / family investment-philanthropy network | `verified_institutional_restricted` |
| 1552 | Ted Turner | Turner Foundation / Ted Turner Reserves | `verified_public_institutional` |
| 1553 | Barbara Tyson | Tyson Foods family-shareholder route | `verified_institutional_restricted` |
| 1554 | Wang Wenjing | Yonyou Network Technology listed-company route | `verified_public_institutional` |
| 1555 | Wong Luen Hei | China Lesso family / listed-company route | `verified_public_institutional` |
| 1556 | Eugene Wu | Shin Kong / TS Financial family-shareholder route | `verified_institutional_restricted` |
| 1557 | Wu Guanjiang & family | pharmaceutical family-company asset route | `verified_institutional_restricted` |
| 1558 | Yoo Jung-hyun | NXC / Nexon family-ownership route | `verified_institutional_restricted` |
| 1559 | Zheng Jianjiang & family | Ningbo AUX Electric founder / controlling-shareholder route | `verified_public_institutional` |
| 1560 | Selçuk Bayraktar | Baykar chairman/CTO route; defence-sector and PEP-family proximity require enhanced review | `enhanced_compliance_review` |
| 1561 | Zadik Bino & family | First International Bank / Paz family asset route | `verified_institutional_restricted` |
| 1562 | David Booth | Dimensional Fund Advisors institutional route | `verified_public_institutional` |
| 1563 | William Boyd & family | Boyd Gaming investor / family route | `verified_public_institutional` |
| 1564 | Chao Yung-Tsang | Taiwan cooling-components family-company route | `verified_institutional_restricted` |
| 1565 | Chen Qiongxiang | battery-sector ownership / family asset route | `verified_institutional_restricted` |
| 1566 | Jack Cowin | Competitive Foods Australia / Domino’s Pizza Enterprises shareholder route | `verified_public_institutional` |
| 1567 | Stephan Crétier | GardaWorld corporate route | `verified_public_institutional` |
| 1568 | Bennett Dorrance | Campbell’s family-shareholder route | `verified_institutional_restricted` |
| 1569 | Joseph Edelman | Perceptive Advisors institutional route | `verified_public_institutional` |
| 1570 | Alfredo Egydio Arruda Villela Filho | Itaúsa / Itaú family-shareholder route | `verified_institutional_restricted` |
| 1571 | Sandeep Engineer | Astral Ltd investor / corporate route | `verified_public_institutional` |
| 1572 | Jayme Garfinkel & family | Porto Seguro investor / family route | `verified_public_institutional` |
| 1573 | Gabriele Gebauer | textile family-company ownership route | `verified_institutional_restricted` |
| 1574 | Feridun Gecgel | Astor Enerji chairman / listed-company route | `verified_public_institutional` |
| 1575 | Fiona Geminder | Pact Group / family manufacturing route | `verified_institutional_restricted` |
| 1576 | Sam Goi | Tee Yih Jia / GSH corporate route | `verified_public_institutional` |
| 1577 | Anthony Hall | Australian technology investment / private-company route | `verified_institutional_restricted` |
| 1578 | Hans-Werner Hector | Hector Stiftung / SAP shareholding route | `verified_institutional_restricted` |
| 1579 | Michael Hintze | Hintze family investment / philanthropy route | `verified_institutional_restricted` |
| 1580 | Reid Hoffman | Greylock / Reinvent Capital institutional route | `verified_public_institutional` |
| 1581 | Douglas Hsu | Far Eastern Group corporate route | `verified_public_institutional` |
| 1582 | Wei Huang | Xinhu-linked real-estate / investment route | `verified_institutional_restricted` |
| 1583 | Bidzina Ivanishvili & family | ownership/investment network retained as intelligence only; current OFAC SDN designation | `legal_compliance_block` |
| 1584 | Hal Jackman | E-L Financial / Jackman Foundation route | `verified_public_institutional` |
| 1585 | Jian Jun | biomedical-products family/company route | `verified_institutional_restricted` |
| 1586 | Ipek Kirac | Koç Holding / Koç family institutional route | `verified_public_institutional` |
| 1587 | Martin Knauf | Knauf family ownership route | `verified_institutional_restricted` |
| 1588 | Anthony Langley | Langley Holdings corporate route | `verified_public_institutional` |
| 1589 | Li Zhiyuan | electrical-components family-company route | `verified_institutional_restricted` |
| 1590 | Liu Weiping | Weilong Delicious / Weilong Foods listed-company route | `verified_public_institutional` |
| 1591 | Farhad Moshiri | private investment / Usmanov-linked legacy network; Everton sold in 2024 | `enhanced_compliance_review` |
| 1592 | Jannie Mouton & family | PSG / family philanthropy route | `verified_public_institutional` |
| 1593 | Katharina Otto-Bernstein | Otto/ECE family asset / cultural-philanthropy route | `verified_institutional_restricted` |
| 1594 | Lirio Parisotto | Videolar / private investment route | `verified_institutional_restricted` |
| 1595 | David Peñaloza Alanís | Pinfra investor / corporate route | `verified_public_institutional` |
| 1596 | Alexander Ramlie | Indonesian mining investment / public-company route | `verified_public_institutional` |
| 1597 | Richard Sands | Constellation Brands investor / family route | `verified_public_institutional` |
| 1598 | Abhay Soi | Max Healthcare investor / corporate route | `verified_public_institutional` |
| 1599 | Jeff Sutton | Wharton Properties formal private-office route | `verified_institutional_restricted` |
| 1600 | Alain Taravella | Altarea investor / corporate route | `verified_public_institutional` |

## Critical corrections / evidence notes

1. **Bernard Lewis died on 28 February 2026.** Preserve River Island history, but exclude him from active targeting.
2. **Bidzina Ivanishvili is currently on the U.S. OFAC SDN List.** OFAC states direct dealings with Ivanishvili are generally prohibited absent exemption/authorisation. Store a hard compliance block.
3. **Selçuk Bayraktar is currently Baykar’s chairman and CTO.** Baykar is a defence/UAV manufacturer and Bayraktar is closely connected to Turkey’s political leadership; require enhanced PEP/defence compliance review rather than ordinary outreach selection.
4. **Farhad Moshiri sold his Everton stake to The Friedkin Group in December 2024.** Everton must not be treated as his current access route. His remaining private-investment and Usmanov-linked history warrants enhanced review.
5. **Mikhail Shelkov:** do not invent a UK sanctions block. Current evidence requires jurisdiction-specific sanctions screening before any campaign use.
6. **Adam Neumann:** use **Flow**, not WeWork, as the current operating-company route.
7. **Brett Hildebrand:** use **IAG Capital Partners** as the current institutional route rather than treating Credit One/Sherman Financial as a direct operating channel.
8. **Jian Yao:** Mindray is an asset/shareholder route resulting from a divorce settlement; do not imply an executive role.
9. **Liu Weiping** is a cofounder of Weilong’s packaged-food business; the current listed company provides the institutional route.
10. **Feridun Gecgel** chairs Astor Enerji and owns a controlling stake; this is a strong current public-company route.

## Key evidence anchors

- Forbes 2026 derivative source: https://raw.githubusercontent.com/AhoyLemon/kinda.fun/main/src/views/guillotine/csv/forbes-2026.csv
- OFAC Ivanishvili record: https://sanctionssearch.ofac.treas.gov/Details.aspx?id=52393
- OFAC FAQ 1204: https://ofac.treasury.gov/faqs/1204
- Baykar Selçuk Bayraktar biography: https://www.baykartech.com/en/selcuk-bayraktar/
- Everton / Friedkin takeover: https://www.premierleague.com/en/news/4199784
- Astor Enerji / Feridun Gecgel profile: https://www.forbes.com/profile/feridun-gecgel/
- River Island / Bernard Lewis company record: https://find-and-update.company-information.service.gov.uk/officers/zJ_7HwzHNSX_wxXUaYgpIsxPeqM/appointments

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and write/update `organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`, `last_reviewed_at = 2026-08-23`, the verification state above, and `outreach_allowed = false`.

For `legal_compliance_block` and `deceased_remove_from_active_outreach`, apply hard person-level exclusions. For `enhanced_compliance_review`, require a fresh jurisdiction-specific sanctions/PEP/sector review before campaign selection. Do not overwrite stronger prior evidence; supersede or annotate it.
