# Billionaire Access Verification — Batch 026 (2026 Source Rows 2501–2600)

**Reviewed:** 2026-08-24  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **2501–2600**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **68** `verified_public_institutional`
- **22** `verified_institutional_restricted`
- **1** `verified_institutional_source_age_warning`
- **7** `enhanced_compliance_review`
- **2** `legal_compliance_block`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institutional or asset route exists. It does not imply personal delivery and does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 2501 | Bulent Eczacibasi | Eczacıbaşı Holding family/corporate route | `verified_public_institutional` |
| 2502 | Fernando Espinosa Abdalá | Grupo PiSA / Laboratorios PiSA family corporate route | `verified_public_institutional` |
| 2503 | Leopoldo Espinosa Abdalá | Grupo PiSA / Laboratorios PiSA family asset route | `verified_institutional_restricted` |
| 2504 | Richard Fairbank | Capital One chairman/CEO corporate-investor route | `verified_public_institutional` |
| 2505 | Dylan Field | Figma cofounder/CEO corporate route | `verified_public_institutional` |
| 2506 | Doris Fisher | Gap cofounder/family shareholder route | `verified_institutional_restricted` |
| 2507 | Christina Flügel | Mast-Jägermeister family shareholder route | `verified_institutional_restricted` |
| 2508 | Ge Tairong | Zhejiang Rongtai Electric Material shareholder/family route | `verified_institutional_restricted` |
| 2509 | Premchand Godha | Ipca Laboratories chairman/MD investor route | `verified_public_institutional` |
| 2510 | Konstantin Goncharov & family | Novotrans transport/logistics route; Russia strategic-sector review | `enhanced_compliance_review` |
| 2511 | Jeffrey Gundlach | DoubleLine Capital founder/CEO institutional route | `verified_public_institutional` |
| 2512 | Patrick Hanrahan | Stanford / Tableau founder-legacy professional route | `verified_institutional_restricted` |
| 2513 | Georg Haub | Tengelmann / Haub family investment route | `verified_institutional_restricted` |
| 2514 | He Zhaoxi | Sangfor Technologies chairman/cofounder investor route | `verified_public_institutional` |
| 2515 | Fabian Hedin | Lovable cofounder/CTO corporate route | `verified_public_institutional` |
| 2516 | Magic Johnson | Magic Johnson Enterprises institutional route | `verified_public_institutional` |
| 2517 | Gloria Joseph | Mercury General family insurance/shareholder route | `verified_institutional_restricted` |
| 2518 | Bachtiar Karim | Musim Mas Group family corporate route | `verified_public_institutional` |
| 2519 | Ke Xiping & family | Xiamen Hengxing Group chairman/corporate route | `verified_public_institutional` |
| 2520 | Brad Keywell | Lightbank / private investment route | `verified_public_institutional` |
| 2521 | Lalit Khaitan | Radico Khaitan family corporate-investor route | `verified_public_institutional` |
| 2522 | Sidney Kimmel | Sidney Kimmel Foundation / family philanthropy route | `verified_institutional_restricted` |
| 2523 | Jonas Kleberg | Wallenius/Kleberg family shipping route | `verified_institutional_restricted` |
| 2524 | Robert Knauf & family | Knauf Group family corporate route | `verified_public_institutional` |
| 2525 | Vladimir Krupchak | Pulp Mill Holding / Arkhangelsk industrial network; Russia compliance review | `enhanced_compliance_review` |
| 2526 | Raj Kumar | RB Capital founder/chairman institutional route | `verified_public_institutional` |
| 2527 | Ramesh Kunhikannan | Kaynes Technology founder/MD investor route | `verified_public_institutional` |
| 2528 | Kwek Leng Keow | Hong Leong Group Singapore family asset route | `verified_institutional_restricted` |
| 2529 | Kwek Leng Peck | Hong Leong Group / City Developments family corporate route | `verified_public_institutional` |
| 2530 | Lai Guogui & family | CFMOTO founder/chairman corporate-investor route | `verified_public_institutional` |
| 2531 | Lee Sang-hoon | ABL Bio founder/CEO listed-company route | `verified_public_institutional` |
| 2532 | Art Levinson | Apple board / Calico executive institutional route | `verified_public_institutional` |
| 2533 | Li Jiaquan | Lomon Group founder/chairman corporate route | `verified_public_institutional` |
| 2534 | Li Zhigang | Wuhan DR Laser Technology chairman investor route | `verified_public_institutional` |
| 2535 | Lim Chap Huat | Soilbuild Group founder/family corporate route | `verified_public_institutional` |
| 2536 | Harald Link | B.Grimm Group chairman/family corporate route | `verified_public_institutional` |
| 2537 | Marc Lipschultz | Blue Owl Capital co-CEO institutional route | `verified_public_institutional` |
| 2538 | Liu Gexin & family | Sichuan Kelun Pharmaceutical founder/chairman investor route | `verified_public_institutional` |
| 2539 | Liu Shengjun | Himile Mechanical shareholder/former-supervisor route | `verified_institutional_restricted` |
| 2540 | Lu Hongyan | G-bits Network Technology chairman investor route | `verified_public_institutional` |
| 2541 | Lu Lili | East Money Information / Wanda Film minority-shareholder asset route | `verified_institutional_restricted` |
| 2542 | Lu Ruibo | Impro Precision Industries founder/chairman route | `verified_public_institutional` |
| 2543 | Lu Yiwen | DR Corporation cofounder/listed-company route | `verified_public_institutional` |
| 2544 | Ma Fei | Shenzhen FRD Science & Technology founder/chairman route | `verified_public_institutional` |
| 2545 | Vitali Machitski & family | Vi Holding / Russian diversified industrial network; compliance review | `enhanced_compliance_review` |
| 2546 | Yusaku Maezawa | Start Today / Maezawa private investment route | `verified_public_institutional` |
| 2547 | Mao Zhongwu | SANY Heavy Equipment legacy executive/asset route; current role needs refresh | `verified_institutional_source_age_warning` |
| 2548 | Yves-Loic Martin | Eurofins Scientific board/shareholder route | `verified_public_institutional` |
| 2549 | Terence (Terry) Matthews | Wesley Clover / telecom investment route | `verified_public_institutional` |
| 2550 | Jim McKelvey | Block/Square cofounder / current board-founder network route | `verified_public_institutional` |
| 2551 | Shalom Meckenzie & family | DraftKings shareholder / SBTech legacy route | `verified_institutional_restricted` |
| 2552 | Kirill Minovalov | Avangard Bank / Avangard Agro institutional network; Russia compliance review | `enhanced_compliance_review` |
| 2553 | Bobby Murphy | Snap cofounder/CTO investor route | `verified_public_institutional` |
| 2554 | Edward Netylko | Pulse pharmaceutical distribution network; Russia compliance review | `enhanced_compliance_review` |
| 2555 | Dmitry Nikolaev | Russian coal/industrial network; strategic-sector compliance review | `enhanced_compliance_review` |
| 2556 | Julia Oetker | Oetker family holding route | `verified_institutional_restricted` |
| 2557 | Anton Osika | Lovable cofounder/CEO corporate route | `verified_public_institutional` |
| 2558 | Nelson Peltz | Trian Partners institutional route | `verified_public_institutional` |
| 2559 | Ronald Perelman | MacAndrews & Forbes private investment route | `verified_institutional_restricted` |
| 2560 | Jose Isaac Peres & family | Multiplan founder/chairman investor route | `verified_public_institutional` |
| 2561 | G.V. Prasad | Dr. Reddy’s Laboratories co-chair/MD investor route | `verified_public_institutional` |
| 2562 | Qin Hua | Gambol Pet Group chairman/CEO investor route | `verified_public_institutional` |
| 2563 | Satish Reddy | Dr. Reddy’s Laboratories chairman/family route | `verified_public_institutional` |
| 2564 | Kishin RK | RB Capital founder/CEO institutional route | `verified_public_institutional` |
| 2565 | Brian Roberts | Comcast chairman/CEO investor route | `verified_public_institutional` |
| 2566 | Deniz Sahenk | Doğuş Group family asset route | `verified_institutional_restricted` |
| 2567 | Dhruv Sawhney | Triveni Engineering / family industrial route | `verified_public_institutional` |
| 2568 | Gerald Schwartz | Onex Corporation founder/chairman institutional route | `verified_public_institutional` |
| 2569 | Ronnie Screwvala | upGrad / Unilazer institutional route | `verified_public_institutional` |
| 2570 | Thaksin Shinawatra | Private investment/family network; former Thai prime minister / PEP review | `enhanced_compliance_review` |
| 2571 | Evgeny (Eugene) Shvidler | Metals/investment network — intelligence only; UK designated RUS1100 | `legal_compliance_block` |
| 2572 | Dean Solon | Shoals Technologies founder/board/shareholder route | `verified_public_institutional` |
| 2573 | Michael Steinhardt | Retired investment / family philanthropy route | `verified_institutional_restricted` |
| 2574 | Suh Kyung-bae | Amorepacific chairman/corporate route | `verified_public_institutional` |
| 2575 | Teresita Sy-Coson | SM Investments / BDO family corporate route | `verified_public_institutional` |
| 2576 | Tan Yu Yeh | MR D.I.Y. Group founder/family retail route | `verified_public_institutional` |
| 2577 | Teo Swee Ann | Espressif Systems founder/CEO investor route | `verified_public_institutional` |
| 2578 | Hans Thomann | Thomann music retail family corporate route | `verified_public_institutional` |
| 2579 | Michael Tojner | Montana Tech Components / Global Equity Partners route | `verified_public_institutional` |
| 2580 | Jose Llorens Torra | Llotor / EPSA Internacional mining-investment route | `verified_public_institutional` |
| 2581 | Shintaro Tsuji | Sanrio founder/honorary-chairman corporate route | `verified_public_institutional` |
| 2582 | Surin Upatkoon | Berjaya/Magnum-linked investment route | `verified_institutional_restricted` |
| 2583 | Rolly van Rappard | CVC Capital Partners cofounder institutional route | `verified_public_institutional` |
| 2584 | Sekar Vembu | Zoho family/software shareholder route | `verified_institutional_restricted` |
| 2585 | Wang Minwen | Hangzhou Lion Electronics chairman / Xianhe family holdings route | `verified_public_institutional` |
| 2586 | Allan Wong | VTech cofounder/chairman corporate route | `verified_public_institutional` |
| 2587 | Rick Workman | Heartland Dental founder/executive-chair route | `verified_public_institutional` |
| 2588 | Wu Cheng | Guocheng Mining chairman / Guocheng holding route | `verified_public_institutional` |
| 2589 | Ingrid Wu | AAC Technologies cofounder/non-executive-director shareholder route | `verified_institutional_restricted` |
| 2590 | Wu Zhigang & family | Holiland bakery founder/family corporate route | `verified_public_institutional` |
| 2591 | Xu Xudong & family | Ningbo Xusheng Group / auto-parts listed-company route | `verified_public_institutional` |
| 2592 | Yang Yunchun | Sai MicroElectronics chairman/general-manager investor route | `verified_public_institutional` |
| 2593 | Vladimir Yevtushenkov | Sistema/telecom investment network — intelligence only; UK designated RUS1332 | `legal_compliance_block` |
| 2594 | Yi Dasheng | Hunan Fortune Group chairman corporate route | `verified_public_institutional` |
| 2595 | Yu Lili | Changsha Jingjia Microelectronics director/shareholder route | `verified_institutional_restricted` |
| 2596 | Zhang Liguo | Harbin Fuerjia Technology founder/chairman investor route | `verified_public_institutional` |
| 2597 | Zhang Shilong & family | SG Micro / semiconductor listed-company route | `verified_public_institutional` |
| 2598 | Zhong Huaijun | Food-sector family/private-company institutional route; no direct personal channel inferred | `verified_institutional_restricted` |
| 2599 | Anita Zucker | The InterTech Group family industrial route | `verified_public_institutional` |
| 2600 | Chirayu Amin | Alembic Pharmaceuticals / family pharma route | `verified_public_institutional` |

## Critical current-role and compliance corrections

1. **Li Jiaquan** currently chairs **Lomon Group**; the titanium-dioxide business sold in 2016 is historic and should not be confused with a current direct operating route.
2. **Fabian Hedin** is current cofounder/CTO of **Lovable**; Anton Osika is the cofounder/CEO. These are current operating-company routes.
3. **Yves-Loic Martin** stepped down as Eurofins CTO in 2015 but remains a board member and material shareholder; Eurofins is therefore a valid institutional route without implying a current executive role.
4. **Lu Lili** is a minority shareholder in East Money Information and Wanda Film; do not represent her as an East Money executive.
5. **Liu Shengjun** is a Himile shareholder/former supervisor; store the company as an asset route rather than a current executive route.
6. **Mao Zhongwu** has older SANY Heavy Equipment executive evidence; classify as a freshness-warning route until a current role is independently reconfirmed.
7. **Edward Netylko** is linked to Russian pharmaceutical distributor Pulse. A real institutional route exists, but current Russia/jurisdictional screening is required before any activity.
8. **Thaksin Shinawatra** is a former Thai prime minister and remains a politically exposed figure. No UK sanctions block is asserted here; require enhanced PEP/compliance review.
9. **Evgeny Shvidler** is on the UK sanctions list (RUS1100). Preserve corporate/investment intelligence only and hard-block outreach.
10. **Yoshiaki Yoshida** does not appear in this batch; no DHC route has been inherited from the prior batch.
11. **Wang Minwen** chairs Hangzhou Lion Electronics and also has major family holdings in Xianhe; both are institutional asset routes.
12. **Ingrid Wu** is a cofounder and non-executive director of AAC Technologies but is not involved in day-to-day operations; classify the route accordingly.
13. **Yang Yunchun** is current chairman and general manager of Sai MicroElectronics, making it a strong current public-company route.
14. **Vladimir Yevtushenkov** is on the UK sanctions list (RUS1332). Preserve Sistema/network intelligence only and hard-block outreach.
15. **Yu Lili** stepped down as vice chair of Changsha Jingjia Microelectronics in August 2024 but remains a director; do not use a stale vice-chair title.
16. **No Russian person was hard-blocked merely because of nationality.** Where a current applicable designation was not confirmed, records were retained as enhanced review or ordinary restricted/public institutional routes depending on the evidence.

## Selected public evidence anchors

- Forbes 2026 source/list profiles: https://www.forbes.com/billionaires/
- Lomon / Li Jiaquan Forbes profile: https://www.forbes.com/profile/li-jiaquan/
- Lu Lili Forbes profile: https://www.forbes.com/profile/lu-lili/
- Yves-Loic Martin Forbes profile: https://www.forbes.com/profile/yves-loic-martin/
- Qin Hua Forbes profile: https://www.forbes.com/profile/qin-hua/
- Dean Solon Forbes profile: https://www.forbes.com/profile/dean-solon/
- Wang Minwen Forbes profile: https://www.forbes.com/profile/wang-minwen/
- Wu Cheng Forbes profile: https://www.forbes.com/profile/wu-cheng/
- Ingrid Wu Forbes profile: https://www.forbes.com/profile/ingrid-wu/
- Yang Yunchun Forbes profile: https://www.forbes.com/profile/yang-yunchun/
- Zhang Liguo Forbes profile: https://www.forbes.com/profile/zhang-liguo/
- Yu Lili Forbes profile: https://www.forbes.com/profile/yu-lili/
- UK sanctions evidence: https://www.gov.uk/government/publications/the-uk-sanctions-list

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and write/update `organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`, `last_reviewed_at = 2026-08-24`, verification state above, and `outreach_allowed = false`.

For `legal_compliance_block`, add a hard person-level exclusion. For `enhanced_compliance_review`, require a current jurisdiction-specific sanctions/PEP screen before any campaign selection. Do not overwrite stronger prior evidence; supersede or annotate it.