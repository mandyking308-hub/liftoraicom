# Billionaire Access Verification — Batch 016 Corrections

**Reviewed:** 2026-08-24  
**Applies to:** `docs/billionaire-access-verification-batch-016-2026-rows-1501-1600.md`

This overlay records current-source corrections identified during a fresh quality-control pass. It supersedes the affected row descriptions/statuses during later `billionaire_id` reconciliation.

| Row | Billionaire | Stored issue | Corrected route / status |
|---:|---|---|---|
| 1502 | Zhang Li | Stored as a routine restricted R&F asset route | Guangzhou R&F / Kinetic Mines shareholder route; former R&F CEO with bribery-admission/reputational history. Use `enhanced_compliance_review` before any campaign selection. |
| 1514 | Chin Jong Hwa | Incorrectly mapped to TYC Brother Industrial | **Minth Group**. Forbes 2026 identifies Chin as Minth's founder and largest shareholder; he stepped down in 2019. Use Minth as `verified_institutional_restricted` shareholder/family route, not a current executive route. |
| 1518 | Fan Daidi | Stored as an ordinary public company route | Giant Biogene remains the correct asset/founder route, but Fan ceased serving as chief science officer in 2023. Treat as `verified_institutional_restricted` founder/shareholder route unless a current person-specific institutional role is separately verified. |
| 1525 | Jian Yao | Any implication of management access is incorrect | Jian is Xu Hang's ex-wife and received a minority Mindray stake after their divorce. Mindray is `verified_institutional_restricted` shareholder-only route. |
| 1531 | Bernard Lewis | Preserve any active-person classification only if present | Bernard Lewis died in February 2026. Preserve River Island family/business intelligence but use `deceased_remove_from_active_outreach`. |
| 1544 | Tor Peterson | Any current Glencore executive inference is stale | Peterson stepped down from Glencore in 2021. Retain Glencore as `verified_institutional_restricted` shareholder/wealth-asset route only. |
| 1548 | Mikhail Shelkov | Do not invent a UK/US/EU sanctions designation | Latest cross-jurisdiction evidence checked did not list Shelkov under US, UK or EU asset freezes, though Ukraine sanctions exposure exists. Use `enhanced_compliance_review` and fresh screening before activity. |
| 1556 | Eugene Wu | Pre-merger Shin Kong route may be stale | Shin Kong financial assets have undergone corporate restructuring/merger. Retain family financial route with `verified_institutional_source_age_warning` until current role/entity reconciliation. |
| 1557 | Wu Guanjiang & family | Any management route is stale | Forbes 2026 says Wu no longer has a management role at Chongqing Zhifei Biological Products and holds under 5%. Use `verified_institutional_restricted` shareholder-only route. |
| 1565 | Chen Qiongxiang | Do not inherit CATL executive access from other CATL billionaires | Chen is an early CATL investor. Use `verified_institutional_restricted` shareholder route only. |
| 1573 | Gabriele Gebauer | Generic textile-family route understates evidence | Forbes 2026 says she owns nearly 96% of MEWA; MEWA's current legal notice identifies the **Gabriele Gebauer MEWA Stiftung**. Use MEWA / foundation as `verified_public_institutional`. |
| 1574 | Feridun Geçgel | Generic utility-equipment route understates evidence | Geçgel is current chairman and controlling shareholder of **Astor Enerji**. Use `verified_public_institutional`. |
| 1577 | Anthony Hall | Generic technology route understates evidence | Hall remains technical director and cofounder of **Pro Medicus**. Use current Pro Medicus corporate/investor route as `verified_public_institutional`. |
| 1579 | Michael Hintze | CQS as current route is stale | Forbes 2026 says Hintze sold most CQS assets to Manulife in 2024 and started **Deltroit** with his own capital. Use Deltroit as current `verified_institutional_restricted` private-investment route. |
| 1582 | Wei Huang | Generic real-estate route omits legal/reputational risk | Preserve Shenzhen New World / asset route but require `enhanced_compliance_review` before use. |
| 1583 | Bidzina Ivanishvili & family | UK/US sanctions must not be conflated | Ivanishvili is US OFAC-designated; current evidence checked did not show a UK designation. For this UK-based system, retain `enhanced_compliance_review` with explicit US-sanctions/PEP warning rather than falsely labelling him UK-sanctioned. |
| 1585 | Jian Jun | Generic biomedical route understates evidence | Jian is current chairwoman of **Imeik Technology Development**. Use listed-company route as `verified_public_institutional`. |
| 1589 | Li Zhiyuan | Generic electrical-components route understates evidence | Li chairs **Hainan Jinpan Smart Technology**. Use listed-company route as `verified_public_institutional`. |
| 1590 | Liu Weiping | Generic packaged-food route understates evidence | Liu chairs **WL Delicious / Weilong Delicious Global Holdings**. Use listed-company route as `verified_public_institutional`. |
| 1591 | Farhad Moshiri | Everton is no longer a current route | The Friedkin Group completed the Everton acquisition in December 2024. Use Moshiri's current private-investment network only and require `enhanced_compliance_review` because of historic association with sanctioned Alisher Usmanov/USM. |
| 1594 | Lirio Parisotto | Generic investment route can be strengthened | Forbes 2026 says he remains majority owner of Videolar, merged with Innova, alongside a diversified investment portfolio. Use Videolar/Innova as restricted institutional asset route. |

## Current evidence anchors

- Forbes 2026 profiles for Chin Jong Hwa, Fan Daidi, Jian Yao, Liu Sheng, Tor Peterson, Wu Guanjiang, Chen Qiongxiang, Gabriele Gebauer, Feridun Geçgel, Anthony Hall, Michael Hintze, Jian Jun, Li Zhiyuan, Liu Weiping and Lirio Parisotto.
- MEWA current legal notice for operating-company/foundation structure.
- Current Everton/Friedkin ownership reporting for Farhad Moshiri role drift.
- Current cross-jurisdiction sanctions screening for Mikhail Shelkov and Bidzina Ivanishvili.

`outreach_allowed` remains `false` for every corrected record. Do not overwrite stronger person-specific evidence later discovered in production.