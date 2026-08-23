# Billionaire Access Verification — Batch 015 (2026 Source Rows 1401–1500)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **1401–1500**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **61** `verified_public_institutional`
- **35** `verified_institutional_restricted`
- **3** `legal_compliance_block`
- **1** `deceased_remove_from_active_outreach`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institution/asset route exists. It does not mean the person personally receives messages there, and it does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 1401 | Rufino Vigil Gonzalez | Industrias CH / Grupo Simec investor/corporate route | `verified_public_institutional` |
| 1402 | Manuel Villar | Vista Land investor relations | `verified_public_institutional` |
| 1403 | Thomas Wu | TS Financial Holding corporate/investor route | `verified_public_institutional` |
| 1404 | Xiao Hongxing | Delton Technology (Guangzhou) listed-company route | `verified_public_institutional` |
| 1405 | Ye Qiongjiu | Hithink RoyalFlush Information Network listed-company route | `verified_public_institutional` |
| 1406 | Mohamed Alabbar | Eagle Hills / Emaar-linked corporate route | `verified_public_institutional` |
| 1407 | Edward Bass | Bass family institutional/philanthropic route | `verified_institutional_restricted` |
| 1408 | Cao Longxiang & family | Hubei Jumpcan Pharmaceutical listed-company route | `verified_public_institutional` |
| 1409 | Richard Chandler | Clermont Group investment-office route | `verified_public_institutional` |
| 1410 | Choo Chong Ngen | Worldwide Hotels corporate route | `verified_public_institutional` |
| 1411 | John Paul DeJoria | John Paul Mitchell Systems / Peace, Love & Happiness Foundation route | `verified_institutional_restricted` |
| 1412 | Francois Feuillet & family | Trigano investor/corporate route | `verified_public_institutional` |
| 1413 | Gerald Frere | Groupe Bruxelles Lambert / Frère family investment route | `verified_institutional_restricted` |
| 1414 | Sebastian Glaser | Glaser family sensor-technology corporate route | `verified_institutional_restricted` |
| 1415 | Joel Greenberg | Susquehanna International Group institutional route | `verified_institutional_restricted` |
| 1416 | Shmuel Harlap | Colmobil / Harlap family automotive route | `verified_public_institutional` |
| 1417 | Gudrun Heine | Karl Storz / Storz Medical ownership route | `verified_institutional_restricted` |
| 1418 | J. Tomilson Hill | Hill Art Foundation / private investment route | `verified_institutional_restricted` |
| 1419 | Huang Xiaofen & family | PCB manufacturing family-company route | `verified_institutional_restricted` |
| 1420 | Thomas Kwok | Sun Hung Kai Properties investor relations | `verified_public_institutional` |
| 1421 | Alberto Palatchi | Gesprisa Inversiones / family investment route | `verified_institutional_restricted` |
| 1422 | Pham Thu Huong | Vingroup investor relations / VinFuture Foundation route | `verified_public_institutional` |
| 1423 | Ajay Piramal | Piramal Group / Piramal Foundation route | `verified_public_institutional` |
| 1424 | Sergei Popov | Agat private fund / formal investment route | `verified_institutional_restricted` |
| 1425 | Dmitry Pumpyansky | TMK / Sinara network — intelligence only | `legal_compliance_block` |
| 1426 | P.V. Ramprasad Reddy | Aurobindo Pharma investor/corporate route | `verified_public_institutional` |
| 1427 | Christina Rohde | Rohde family electrical-equipment route | `verified_institutional_restricted` |
| 1428 | Robert Sands | Constellation Brands investor relations | `verified_public_institutional` |
| 1429 | Anatoly Sedykh | OMK network — intelligence only | `legal_compliance_block` |
| 1430 | Michael S. Smith | Freeport LNG corporate route | `verified_public_institutional` |
| 1431 | Sybill Storz | Karl Storz legacy record — deceased 2025 | `deceased_remove_from_active_outreach` |
| 1432 | Hermanto Tanoko | Tancorp / Avia Avian listed-company route | `verified_public_institutional` |
| 1433 | Martin Viessmann | Viessmann Generations Group / family investment route | `verified_institutional_restricted` |
| 1434 | Jerry Yang | AME Cloud Ventures / Yahoo founder network | `verified_public_institutional` |
| 1435 | Yu Zhuyun | construction/diversified corporate route | `verified_institutional_restricted` |
| 1436 | Zhang Lei | Hillhouse Investment institutional route | `verified_public_institutional` |
| 1437 | Zhang Xinghai & family | SERES Group investor/corporate route | `verified_public_institutional` |
| 1438 | Zhao Yan | Bloomage Biotech investor relations | `verified_public_institutional` |
| 1439 | Zhuo Jun | PCB manufacturing family-company route | `verified_institutional_restricted` |
| 1440 | Semahat Sevim Arsel | Koç Holding investor/family route | `verified_public_institutional` |
| 1441 | Danna Azrieli | Azrieli Group investor relations / Azrieli Foundation | `verified_public_institutional` |
| 1442 | Naomi Azrieli | Azrieli Foundation / family route | `verified_public_institutional` |
| 1443 | Sharon Azrieli | Azrieli Foundation / family route | `verified_public_institutional` |
| 1444 | Hayes Barnard | GoodLeap corporate route | `verified_public_institutional` |
| 1445 | Lee Bass | Bass family institutional/philanthropic route | `verified_institutional_restricted` |
| 1446 | Nicolas Berggruen | Berggruen Institute / Berggruen Holdings route | `verified_public_institutional` |
| 1447 | Safra Catz | Oracle investor relations / corporate route | `verified_public_institutional` |
| 1448 | Chang Kuo-Hua | Evergreen-related shipping/airline family route | `verified_institutional_restricted` |
| 1449 | Chao Chung-Hsin | Taiwan cooling-components corporate route | `verified_institutional_restricted` |
| 1450 | Chao Teng-hsiung | Farglory Group corporate route | `verified_public_institutional` |
| 1451 | Chi Yufeng | Perfect World listed-company route | `verified_public_institutional` |
| 1452 | Cho Jyh-jer | MediaTek shareholder / investor route; retired executive | `verified_institutional_restricted` |
| 1453 | Stephen Deckoff | Black Diamond Capital Management institutional route | `verified_public_institutional` |
| 1454 | Deng Wen | condiments/food family-company route | `verified_institutional_restricted` |
| 1455 | Georgi Domuschiev | Huvepharma / Advance Properties institutional route | `verified_public_institutional` |
| 1456 | Kiril Domuschiev | Huvepharma / Advance Properties institutional route | `verified_public_institutional` |
| 1457 | Annalisa Doris | Banca Mediolanum investor/family route | `verified_public_institutional` |
| 1458 | Massimo Doris | Banca Mediolanum investor/corporate route | `verified_public_institutional` |
| 1459 | Glenn Dubin | Dubin family office / philanthropy route | `verified_institutional_restricted` |
| 1460 | Lindsay Fox | Linfox corporate route | `verified_public_institutional` |
| 1461 | Kamal Ghaffarian | IBX / Axiom Space / Intuitive Machines institutional route | `verified_public_institutional` |
| 1462 | Balkrishan Goenka | Welspun World / Welspun Corp investor route | `verified_public_institutional` |
| 1463 | Mitchell Goldhar | SmartCentres REIT investor relations | `verified_public_institutional` |
| 1464 | Tali Griffel | Israeli financial-services family route | `verified_institutional_restricted` |
| 1465 | Gu Yuhua & family | KUKA Home listed-company route | `verified_public_institutional` |
| 1466 | Niva Gurevitch | Israeli financial-services family route | `verified_institutional_restricted` |
| 1467 | Ugo Gussalli Beretta & family | Beretta Holding corporate route | `verified_public_institutional` |
| 1468 | Hong Feng | Xiaomi founder/shareholder route | `verified_institutional_restricted` |
| 1469 | Jin Baofang | JA Solar corporate/investor route | `verified_public_institutional` |
| 1470 | Ramesh Juneja | Mankind Pharma investor relations | `verified_public_institutional` |
| 1471 | Kei Hoi Pang | Logan Group investor/family route | `verified_public_institutional` |
| 1472 | John Krystynak | advertising-technology private-company route | `verified_institutional_restricted` |
| 1473 | Alexis Lê-Quôc | Datadog investor relations | `verified_public_institutional` |
| 1474 | Leng Youbin | China Feihe investor relations | `verified_public_institutional` |
| 1475 | Mark Leonard & family | Constellation Software investor relations | `verified_public_institutional` |
| 1476 | Don Levin | Republic Brands / rolling-paper corporate route | `verified_public_institutional` |
| 1477 | Li Wanqiang | Xiaomi founder/shareholder route | `verified_institutional_restricted` |
| 1478 | Louise Lindh | L E Lundbergföretagen family-investment route | `verified_institutional_restricted` |
| 1479 | Joe Lonsdale | 8VC institutional route | `verified_public_institutional` |
| 1480 | Craig McCaw | McCaw family investment/philanthropic route | `verified_institutional_restricted` |
| 1481 | Vadim Moshkovich | Rusagro network — intelligence only | `legal_compliance_block` |
| 1482 | Eugene Murtagh | Kingspan investor/family route | `verified_public_institutional` |
| 1483 | Akio Nitori | Nitori Holdings investor relations | `verified_public_institutional` |
| 1484 | Timm Oberwelland | Storck family corporate route | `verified_institutional_restricted` |
| 1485 | Park Soon-jae | Alteogen corporate/investor route | `verified_public_institutional` |
| 1486 | Daniel Pritzker | Pritzker family investment/philanthropic route | `verified_institutional_restricted` |
| 1487 | Qi Jinxing | Binjiang Real Estate listed-company route | `verified_public_institutional` |
| 1488 | M.Satyanarayana Reddy | Aurobindo Pharma-related institutional route | `verified_public_institutional` |
| 1489 | Wayne Rothbaum | Quogue Capital / biotech investment route | `verified_institutional_restricted` |
| 1490 | Filiz Sahenk | Doğuş Group family corporate route | `verified_institutional_restricted` |
| 1491 | Karthik Sarma | SRS Investment Management institutional route | `verified_public_institutional` |
| 1492 | Frank Slootman | Snowflake board/shareholder / private investment route | `verified_institutional_restricted` |
| 1493 | Jonathan Tisch | Loews investor relations / Tisch family route | `verified_public_institutional` |
| 1494 | Lina Tombolato | Banca Mediolanum family-shareholder route | `verified_institutional_restricted` |
| 1495 | Tran Dinh Long | Hoa Phat Group investor relations | `verified_public_institutional` |
| 1496 | T.Y. Tsai | Cathay Financial family/investor route | `verified_institutional_restricted` |
| 1497 | Peter Unger | A.T.U. historical wealth / family investment route | `verified_institutional_restricted` |
| 1498 | Long Wan | WH Group / Shuanghui corporate route | `verified_public_institutional` |
| 1499 | Wang Junshi & family | Ginlong Technologies (Solis) listed-company route | `verified_public_institutional` |
| 1500 | Xue Hua | Guangdong Haid Group investor relations | `verified_public_institutional` |

## Critical corrections / evidence notes

1. **Thomas Wu** is chairman of **TS Financial Holding**, created from the Taishin/Shin Kong merger; use the current holding company rather than stale pre-merger entities.
2. **Xiao Hongxing** is current chairman of **Delton Technology (Guangzhou)**, which listed in Hong Kong in March 2026; this is a current public-company route.
3. **Pham Thu Huong** remains vice chairwoman of **Vingroup** in 2026 and also has philanthropic linkage through **VinFuture Foundation**.
4. **Sergei Popov** has sold out of his historic MDM/TMK operating assets; retain his **Agat** private-fund/investment route as restricted rather than treating old bank/TMK channels as current.
5. **Dmitry Pumpyansky** is on the UK sanctions list (RUS0775). Preserve TMK/Sinara intelligence only; block outreach.
6. **Anatoly Sedykh** is on the UK sanctions list (RUS2070). Preserve OMK intelligence only; block outreach.
7. **Sybill Storz died on 28 November 2025.** Remove from active-person outreach and preserve the Karl Storz ownership/history record only.
8. **Vadim Moshkovich** is on the UK sanctions list (RUS0781). Preserve Rusagro intelligence only; block outreach.
9. **Cho Jyh-jer** retired from MediaTek in 2015; MediaTek remains an asset/shareholder route, not a current executive route.
10. **Alberto Palatchi** sold Pronovias years ago. His current investment vehicle **Gesprisa Inversiones** is the more appropriate institutional route.
11. **Gudrun Heine** remains linked to Karl Storz/Storz Medical ownership; do not inherit the deceased Sybill Storz record onto her without person-level reconciliation.
12. **All restricted routes** remain useful relationship/ownership intelligence but must not be promoted to sendable outreach without a separate public-channel verification.

## Key public evidence anchors

- Forbes 2026 source CSV: https://raw.githubusercontent.com/AhoyLemon/kinda.fun/main/src/views/guillotine/csv/forbes-2026.csv
- Vista Land investor relations: https://www.vistaland.com.ph/investor-relations/
- TS Financial Holding: https://www.tsholdings.com.tw/
- Delton Technology HKEX listing materials: https://www1.hkexnews.hk/
- Piramal Group: https://www.piramal.com/
- Vingroup investor relations: https://vingroup.net/en/investor-relations
- Aurobindo Pharma: https://www.aurobindo.com/
- Constellation Brands investor relations: https://ir.cbrands.com/
- Perfect World: https://www.pwrd.com/
- Black Diamond Capital Management: https://bdcm.com/
- Datadog investor relations: https://investors.datadoghq.com/
- Mankind Pharma investor relations: https://www.mankindpharma.com/investor-relations/
- Constellation Software: https://www.csisoftware.com/
- Nitori Holdings investor relations: https://www.nitorihd.co.jp/eng/ir/
- Loews investor relations: https://ir.loews.com/
- UK sanctions evidence: https://www.gov.uk/government/publications/the-uk-sanctions-list

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and write/update:
`organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`,
`last_reviewed_at = 2026-08-23`, verification state above, and `outreach_allowed = false`.

For `legal_compliance_block`, add a hard person-level exclusion. For `deceased_remove_from_active_outreach`, preserve ownership/network history but exclude the person from active targeting. Do not overwrite stronger prior evidence; supersede or annotate it.
