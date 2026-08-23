# Billionaire Access Verification — Batch 005 (2026 Ranks 401–500)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes around billionaire records.

## Scope caveat

The production Liftor Supabase project is not queryable from this connected session. This is therefore a deterministic sweep of Forbes 2026 sequence rows **401–500**, not a claim that these are the exact next 100 `needs_manual_review` rows in the Jan-2025 2,754-record production universe. Reconcile each person to `billionaire_id` before database import.

This enriches the existing universe; it does not replace it.

## Verification rules

- Follow the money: operating company, family investment office, foundation, board, investor relations, nonprofit, private-equity firm or other legitimate professional institution.
- A route does **not** need to relate to GHAT.
- No guessed personal emails, private phone numbers or residential addresses.
- Restrictions remain attached to the route instead of deleting it.
- Sanctions/compliance blocks override the existence of a public institutional doorway.
- `outreach_allowed = false` for every record until a separate campaign/compliance decision.

## Batch result

- **77** `verified_public_institutional`
- **16** `verified_institutional_restricted`
- **3** `verified_institutional_source_age_warning`
- **1** `verified_institutional_switchboard_or_postal`
- **2** `legal_compliance_block`
- **1** `enhanced_compliance_review`
- **100 / 100** have a documented route/status outcome.

> “Verified” means a legitimate institution and public/professional doorway are evidenced. It does not mean the billionaire personally reads messages sent to that institution, and it does not authorise outreach.

## Records

| Seq. | Billionaire | Organisation / route | Access mode | Restriction / note | Verification | Source anchor |
|---:|---|---|---|---|---|---|
| 401 | John Morris | Bass Pro Shops | Corporate contact | Founder/owner company route | verified_public_institutional | https://www.basspro.com/shop/en/contact-us |
| 402 | Hong Ra-hee | Samsung Foundation / Leeum Museum | Foundation / cultural institution | Family philanthropy route; programme/institution led rather than personal | verified_institutional_restricted | https://www.leeumhoam.org/ |
| 403 | Frank Lowy | Lowy Institute | Partnerships / sponsorship enquiry | Institute founded and chaired by Lowy; public partnership channel | verified_public_institutional | https://www.lowyinstitute.org/about/funding-support |
| 404 | Robert Rowling | TRT Holdings / Omni Hotels & Resorts | Corporate contact | Family holding/hotel route | verified_public_institutional | https://www.omnihotels.com/about-omni-hotels/contact-us |
| 405 | David Shaw | D. E. Shaw Group | Investment-firm contact | Institutional/business route, not broad personal outreach | verified_institutional_restricted | https://www.deshaw.com/contact-us |
| 406 | Les Wexner & family | Wexner Foundation | Foundation / leadership programme | Public institution but engagement is programme-led | verified_institutional_restricted | https://www.wexnerfoundation.org/ |
| 407 | David Duffield | Ridgeline | Corporate contact | Founder company route | verified_public_institutional | https://www.ridgelineapps.com/contact |
| 408 | Leo KoGuan | SHI International | Corporate contact | Co-founder/chairman IT-provider route | verified_public_institutional | https://www.shi.com/contact |
| 409 | Yuri Milner | DST Global | Investment-firm route | Private investment institution; use formal firm channel only | verified_institutional_restricted | https://dst-global.com/ |
| 410 | Azim Premji | Azim Premji Foundation | Foundation / grants | Direct philanthropy institution with grants activity | verified_public_institutional | https://azimpremjifoundation.org/ |
| 411 | Lynsi Snyder | In-N-Out Burger | Corporate contact | Owner/president company route | verified_public_institutional | https://www.in-n-out.com/contact |
| 412 | Tamara Gustavson | Public Storage | Investor relations | Family public-company route | verified_public_institutional | https://investors.publicstorage.com/ |
| 413 | Sri Prakash Lohia | Indorama Corporation / Indorama Ventures | Corporate / investor | Founder-family petrochemicals route | verified_public_institutional | https://www.indorama.com/contact-us |
| 414 | Wang Yusuo | ENN Group / ENN Natural Gas | Investor relations | Founder/chairman energy route | verified_public_institutional | https://ir.enn-ng.com/ |
| 415 | John Brown | Stryker | Investor relations | Founder-family wealth-source route; current personal operating role is historical, so recheck before use | verified_institutional_source_age_warning | https://investors.stryker.com/ |
| 416 | Michael Dorrell | Stonepeak | Investment-firm contact | Founder/CEO route; institutional/deal channel | verified_institutional_restricted | https://stonepeak.com/contact/ |
| 417 | Pang Kang | Foshan Haitian Flavouring & Food | Listed-company / investor route | Chairman/controlling-shareholder route | verified_public_institutional | https://www.haitian-food.com/ |
| 418 | Ronda Stryker | Stryker | Investor relations / family ownership | Direct family shareholder/company route | verified_public_institutional | https://investors.stryker.com/ |
| 419 | Justin Sun | TRON DAO / HTX ecosystem | Corporate / ecosystem route | Public institutional channels exist but should not be relabelled as a personal inbox | verified_institutional_restricted | https://tron.network/ |
| 420 | Denise York & family | San Francisco 49ers | Corporate / community route | Family sports-ownership route | verified_public_institutional | https://www.49ers.com/about-us/contact-us |
| 421 | Zhang Hejun | Ningbo Deye Technology | Investor / listed-company route | Founder/chairman route | verified_public_institutional | https://www.deye.com/ |
| 422 | Brian Armstrong | Coinbase | Investor relations | Co-founder/CEO route; Coinbase publishes a dedicated IR channel | verified_public_institutional | https://investor.coinbase.com/ |
| 423 | Stephen Bisciotti | Allegis Group / Baltimore Ravens | Corporate / foundation route | Founder-owner institutional route | verified_public_institutional | https://www.baltimoreravens.com/team/front-office-roster/stephen-bisciotti |
| 424 | Neil Bluhm | Rush Street / Rush Street Interactive | Investor / corporate | Founder-family gaming/real-estate route | verified_public_institutional | https://ir.rushstreetinteractive.com/ |
| 425 | Morris Chang | TSMC | Investor relations | Founder/chairman-emeritus semiconductor route | verified_public_institutional | https://investor.tsmc.com/ |
| 426 | Jay Chaudhry | Zscaler | Investor relations | Founder/CEO cybersecurity route | verified_public_institutional | https://ir.zscaler.com/ |
| 427 | Patrick Drahi | Altice | Corporate/investment route | Altice structure and listings have changed materially; verify exact current entity before use | verified_institutional_source_age_warning | https://www.altice.net/ |
| 428 | J. Joe Ricketts & family | Ricketts family philanthropy / Opportunity Education | Foundation/nonprofit | Family institutional route; funding/engagement is programme-specific | verified_institutional_restricted | https://www.opportunityeducation.org/ |
| 429 | Jean Salata | EQT | Corporate / investment-firm contact | Current senior Asia/EQT route | verified_public_institutional | https://eqtgroup.com/contact |
| 430 | Euisun Chung | Hyundai Motor | Investor relations | Executive-chairman/family route | verified_public_institutional | https://www.hyundai.com/worldwide/en/company/ir |
| 431 | Rekha Jhunjhunwala | Rare Enterprises | Formal private investment office | Private family investment structure; no broad public enquiry assumed | verified_institutional_switchboard_or_postal | https://www.rareenterprises.net/ |
| 432 | Sofie Kirk Kristiansen | KIRKBI | Family investment company | Direct LEGO-family investment-office route | verified_public_institutional | https://www.kirkbi.com/contact/ |
| 433 | Thomas Kirk Kristiansen | KIRKBI | Family investment company | Shared family investment route | verified_public_institutional | https://www.kirkbi.com/contact/ |
| 434 | Alexei Kuzmichev | Alfa-linked historical institutions | Compliance intelligence only | **UK-sanctioned RUS1029; asset freeze/trust-services/director-disqualification restrictions. Hard block outreach.** | legal_compliance_block | https://find-and-update.company-information.service.gov.uk/disqualified-officers/natural/_qOp2Yli717CKMJYxzpKLon-CTs |
| 435 | Steven Rales | Danaher | Investor relations / board | Co-founder/chairman company route | verified_public_institutional | https://investors.danaher.com/ |
| 436 | Leonard Stern | The Hartz Group | Corporate contact | Chairman/CEO family real-estate route | verified_public_institutional | https://www.hartz.com/contact/ |
| 437 | Agnete Kirk Thinggaard | KIRKBI | Family investment company | Shared LEGO-family route | verified_public_institutional | https://www.kirkbi.com/contact/ |
| 438 | Yitzhak Tshuva | Delek Group | Investor relations | Controlling-shareholder energy route | verified_public_institutional | https://ir.delek-group.com/ |
| 439 | Zhang Congyuan | Huali Industrial Group | Corporate / listed-company route | Founder/chairman footwear route | verified_public_institutional | https://www.huali-group.com/ |
| 440 | Joe Gebbia | Airbnb / Gebbia-linked philanthropy | Investor relations / institutional | Co-founder route through Airbnb; no personal inbox assumption | verified_public_institutional | https://investors.airbnb.com/ |
| 441 | Don Hankey | Hankey Group | Founder/company channel | Hankey Group publicly identifies Hankey as founder and provides formal company channels | verified_public_institutional | https://www.hankeygroup.com/ |
| 442 | Pankaj Patel | Zydus Lifesciences | Investor relations | Promoter/director family-pharma route | verified_public_institutional | https://www.zyduslife.com/investor/ |
| 443 | Daniel Tsai | Fubon Financial | Investor relations | Chairman/family finance route | verified_public_institutional | https://www.fubon.com/financialholdings/en/investors/ |
| 444 | Denise Coates | bet365 | Corporate contact | Private company; public channels are purpose-limited, not personal | verified_institutional_restricted | https://www.bet365.com/ |
| 445 | Michael Herz | Tchibo / maxingvest | Corporate/private holding route | Private family structure; purpose-limited route | verified_institutional_restricted | https://www.tchibo.com/ |
| 446 | Wolfgang Herz | Tchibo / maxingvest | Corporate/private holding route | Shared Herz family route; no broad personal channel | verified_institutional_restricted | https://www.tchibo.com/ |
| 447 | Paul Tudor Jones II | Tudor Investment Corporation | Investment-firm route | Professional institutional route; not general personal outreach | verified_institutional_restricted | https://www.tudor.com/ |
| 448 | Tatyana Kim | Wildberries / RWB | Corporate/business route | Founder-led e-commerce institution; use business-purpose route only | verified_public_institutional | https://www.wildberries.ru/ |
| 449 | Lu Weiding | Wanxiang Group | Corporate contact | Chairman/family diversified-group route | verified_public_institutional | https://www.wanxiang.com.cn/ |
| 450 | Samir Mehta | Torrent Pharmaceuticals | Investor relations | Chairman/family pharma route | verified_public_institutional | https://www.torrentpharma.com/investors |
| 451 | Sudhir Mehta | Torrent Power / Torrent Group | Investor relations | Family energy/pharma group route | verified_public_institutional | https://www.torrentpower.com/index.php/investors |
| 452 | Kerry Stokes | Australian Capital Equity / Seven-linked holdings | Corporate/investment route | Family investment route; current media holdings should be rechecked campaign-by-campaign | verified_public_institutional | https://www.ace.com.au/ |
| 453 | Maximilian Viessmann | Viessmann Generations Group | Family investment company | Chairman/family industrial investment route | verified_public_institutional | https://www.viessmann.family/ |
| 454 | Zhang Daocai | Sanhua Intelligent Controls | Investor / listed-company route | Founder-family industrial route | verified_public_institutional | https://www.sanhua.com/ |
| 455 | Marc Benioff | Salesforce | Investor relations / philanthropy | Founder/chairman/CEO route | verified_public_institutional | https://investor.salesforce.com/ |
| 456 | Francis Choi | Early Light International | Corporate route | Family/private group route; public-source contact quality is thinner than most rows, recheck before use | verified_institutional_source_age_warning | https://www.earlylight.com.hk/ |
| 457 | Andreas Halvorsen | Viking Global Investors | Investment-firm route | Founder/CEO professional office; institutional-only | verified_institutional_restricted | https://www.vikingglobal.com/ |
| 458 | Igor Olenicoff | Olen Properties | Corporate contact | Founder/owner real-estate route | verified_public_institutional | https://www.olenproperties.com/ |
| 459 | John Overdeck | Two Sigma | Corporate / investment-firm contact | Co-founder/co-chair route | verified_public_institutional | https://www.twosigma.com/contact/ |
| 460 | David Siegel | Two Sigma | Corporate / investment-firm contact | Shared co-founder/co-chair route | verified_public_institutional | https://www.twosigma.com/contact/ |
| 461 | Ron Baron | Baron Capital | Public institutional contact | Founder/CEO route with public firm contact | verified_public_institutional | https://www.baroncapitalgroup.com/ |
| 462 | Gayle Benson | New Orleans Saints / Benson Capital | Corporate/front-office route | Owner/CEO route; Saints publicly identifies executive office | verified_public_institutional | https://www.neworleanssaints.com/team/front-office-roster/ |
| 463 | Alain Bouchard | Alimentation Couche-Tard | Investor relations | Founder/executive-chairman route | verified_public_institutional | https://corporate.couche-tard.com/investors |
| 464 | Piero Ferrari & family | Ferrari | Investor relations | Vice-chairman/family shareholder route | verified_public_institutional | https://www.ferrari.com/en-EN/corporate/investors |
| 465 | Jonathan Gray | Blackstone | Investor relations / corporate | President/COO institutional route | verified_public_institutional | https://www.blackstone.com/investors/ |
| 466 | Viktor Kharitonin | Pharmstandard-linked assets | Compliance-reviewed institutional intelligence | Current specialist screening shows Canadian sanctions while a 2025 US/UK/EU guide records no US/UK/EU asset freeze. Require fresh jurisdiction-specific check before activity. | enhanced_compliance_review | https://www.debevoise.com/insights/publications/2025/11/a-guide-to-us-uk-and-eu-sanctions-and-export |
| 467 | Philippe Laffont | Coatue Management | Investment-firm contact | Founder route; institutional/deal channel | verified_institutional_restricted | https://www.coatue.com/ |
| 468 | Wolfgang Marguerre & family | Octapharma | Corporate contact | Founder/chairman healthcare-company route | verified_public_institutional | https://www.octapharma.com/contact |
| 469 | Gary Rollins & family | Rollins Inc. | Investor relations | Family public-company route | verified_public_institutional | https://www.rollins.com/investors |
| 470 | Dirk Rossmann & family | ROSSMANN | Corporate contact | Founder/family retail-company route | verified_public_institutional | https://unternehmen.rossmann.de/ |
| 471 | Patrick Ryan | Ryan Specialty | Investor relations | Founder/executive-chairman insurance route | verified_public_institutional | https://ir.ryanspecialty.com/ |
| 472 | Jacques Saadé Jr. | CMA CGM Group | Corporate / family route | Shared Saadé family shipping route | verified_public_institutional | https://www.cma-cgm.com/contact |
| 473 | Rodolphe Saadé | CMA CGM Group | Corporate contact | Chairman/CEO family-company route | verified_public_institutional | https://www.cma-cgm.com/contact |
| 474 | Tanya Saadé Zeenny | CMA CGM Group | Corporate / family route | Shared family shipping route | verified_public_institutional | https://www.cma-cgm.com/contact |
| 475 | Ling Tang | AppLovin investment link | Investor relations / ownership intelligence | Wealth is tied to a major pre-IPO AppLovin investment rather than an operating executive role; IR is asset-route intelligence, not personal access | verified_institutional_restricted | https://investors.applovin.com/ |
| 476 | Richard Tsai | Fubon Financial | Investor relations | Fubon-family finance route | verified_public_institutional | https://www.fubon.com/financialholdings/en/investors/ |
| 477 | Rinat Akhmetov | SCM | Corporate contact | Founder/owner Ukrainian holding-company route | verified_public_institutional | https://www.scm.com.cy/contact/ |
| 478 | Stanley Druckenmiller | Duquesne Family Office | Private investment office | Professional family-office route; no broad unsolicited channel assumed | verified_institutional_restricted | https://www.duquesnefamilyoffice.com/ |
| 479 | Judy Faulkner | Epic Systems | Corporate contact | Founder/CEO healthcare-software route | verified_public_institutional | https://www.epic.com/contact/ |
| 480 | Vyacheslav Kim | Kaspi.kz | Investor relations | Chairman/major-shareholder fintech route | verified_public_institutional | https://ir.kaspi.kz/ |
| 481 | Sami Mnaymneh | H.I.G. Capital | Investment-firm contact | Founder/executive-chairman route | verified_public_institutional | https://hig.com/contact/ |
| 482 | Guillaume Pousaz | Checkout.com | Corporate / partnership route | Founder/CEO fintech route | verified_public_institutional | https://www.checkout.com/contact-us |
| 483 | Tony Tamer | H.I.G. Capital | Investment-firm contact | Founder/executive-chairman route | verified_public_institutional | https://hig.com/contact/ |
| 484 | Tse Ping & family | Sino Biopharmaceutical | Investor relations | Founder-family pharmaceutical route | verified_public_institutional | https://www.sinobiopharm.com/en/investor-relations/ |
| 485 | Kelcy Warren | Energy Transfer | Investor relations | Executive-chairman/founder route | verified_public_institutional | https://ir.energytransfer.com/ |
| 486 | Dennis Washington | The Washington Companies | Corporate contact | Founder/chairman diversified-company route | verified_public_institutional | https://www.washingtoncompanies.com/contact |
| 487 | Rahel Blocher | EMS-CHEMIE | Investor relations | Family controlling-shareholder/company route | verified_public_institutional | https://www.ems-group.com/en/investors/ |
| 488 | Andrew Cherng | Panda Restaurant Group / Panda Cares | Corporate / foundation | Co-founder/family institutional route | verified_public_institutional | https://www.pandaexpress.com/contact-us |
| 489 | Peggy Cherng | Panda Restaurant Group / Panda Cares | Corporate / foundation | Shared co-founder/family route | verified_public_institutional | https://www.pandacares.org/ |
| 490 | Peter Gilgan | Mattamy Homes / Peter Gilgan Foundation | Corporate / foundation | Founder-family philanthropic route | verified_public_institutional | https://petergilganfoundation.org/ |
| 491 | Mikhail Gutseriev | SAFMAR/RussNeft historical network | Compliance intelligence only | **UK-sanctioned BEL0110 under Belarus regime; asset freeze, travel ban and director-disqualification sanction. Hard block outreach.** | legal_compliance_block | https://search-uk-sanctions-list.service.gov.uk/designations/BEL0110/Individual |
| 492 | Michael Kadoorie | CLP Holdings | Investor relations | Family controlling-shareholder/board route | verified_public_institutional | https://www.clpgroup.com/en/investors |
| 493 | Min Kao & family | Garmin | Investor relations | Co-founder/shareholder technology route | verified_public_institutional | https://www8.garmin.com/aboutGarmin/invRelations/ |
| 494 | Jim Kavanaugh | World Wide Technology | Corporate contact | Co-founder/CEO company route | verified_public_institutional | https://www.wwt.com/contact-us |
| 495 | Frederik Paulsen | Ferring Pharmaceuticals / Ferring Foundation | Corporate / foundation | Chairman/family healthcare route | verified_public_institutional | https://www.ferring.com/contact-us/ |
| 496 | Kjell Inge Røkke | Aker ASA | Investor relations | Main shareholder/chair industrial-investment route | verified_public_institutional | https://www.akerasa.com/investors |
| 497 | Zong Fuli | Wahaha | Corporate route | Chairwoman/family beverage-company route | verified_public_institutional | https://www.wahaha.com.cn/ |
| 498 | Maria Fernanda Amorim & family | Amorim family / Galp stake | Investor / family-holding route | Public-company asset route is valid, but not represented as a direct family inbox | verified_institutional_restricted | https://www.galp.com/corp/en/investors |
| 499 | Juergen Blickle | SEW-EURODRIVE | Corporate contact | Family industrial-company route | verified_public_institutional | https://www.sew-eurodrive.com/company/contact/contact.html |
| 500 | Hasmukh Chudgar & family | Intas Pharmaceuticals | Corporate contact | Founder-family pharmaceutical route | verified_public_institutional | https://www.intaspharma.com/contact-us/ |

## High-value reusable route clusters

- **KIRKBI / LEGO family** → Sofie Kirk Kristiansen, Thomas Kirk Kristiansen and Agnete Kirk Thinggaard, plus Kjeld Kirk Kristiansen in the next sequence.
- **Stryker** → John Brown and Ronda Stryker; retain the difference between historical founder link and current family-shareholder link.
- **Fubon** → Daniel Tsai and Richard Tsai.
- **Torrent Group** → Samir Mehta and Sudhir Mehta.
- **Two Sigma** → John Overdeck and David Siegel.
- **CMA CGM** → Jacques Saadé Jr., Rodolphe Saadé and Tanya Saadé Zeenny.
- **H.I.G. Capital** → Sami Mnaymneh and Tony Tamer.
- **Panda Restaurant Group / Panda Cares** → Andrew Cherng and Peggy Cherng.
- **Airbnb** → Joe Gebbia plus Brian Chesky and Nathan Blecharczyk from earlier batches.
- **Samsung family ecosystem** → Hong Ra-hee plus Jay Y. Lee and Lee Boo-jin / Lee Seo-hyun from earlier batches; use institution-specific channels, not family inference alone.

## Critical data-quality / compliance notes

1. **Alexey Kuzmichev:** UK Sanctions List reference RUS1029. Companies House records sanctions-based director disqualification beginning 9 April 2025. Hard block.
2. **Mikail/Mikhail Gutseriev:** UK Sanctions List reference BEL0110 under the Belarus regime. Current UK list records asset freeze, travel ban and director-disqualification sanction. Hard block.
3. **Viktor Kharitonin:** do not falsely label him UK-sanctioned. A 2025 specialist US/UK/EU sanctions guide records no US/UK/EU asset freeze, while Canada has sanctioned him. Store as `enhanced_compliance_review` and screen afresh before activity.
4. **Ling Tang:** Forbes’ wealth source is AppLovin, but the route is an investment/ownership link rather than an operating executive role. AppLovin IR is useful asset intelligence, not a personal message route.
5. **Frank Lowy:** the Lowy Institute provides a particularly strong institutional bridge because it is both founded/chair-led by Lowy and publishes partnership/donation/sponsorship enquiry routes.
6. **Brian Armstrong:** Coinbase publishes investor relations contact details and identifies Armstrong as co-founder/CEO, making this a strong public institutional route.
7. **Don Hankey:** Hankey Group directly identifies him as founder and publishes formal group channels. Use the institutional route rather than data-broker personal details.
8. **Private investment firms:** D. E. Shaw, DST Global, Stonepeak, Tudor, Viking Global, Coatue and Duquesne are retained as legitimate institutions but marked restricted when their public channels are not intended for general unsolicited outreach.

## Import intent

When production Liftor access is restored, reconcile every row to `billionaire_id` and create/update access pathways with:

- `organisation_name`
- `source_url`
- `route_access_mode`
- `route_restriction_notes`
- `last_reviewed_at = 2026-08-23`
- verification state above
- `outreach_allowed = false`

For `legal_compliance_block`, add a hard person-level exclusion in the coverage layer. For `enhanced_compliance_review`, require a fresh jurisdiction-specific sanctions screen before any campaign selection.

Do not delete older intelligence. Preserve it and supersede weaker or stale routes with dated evidence.