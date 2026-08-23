# Billionaire Access Verification — Batch 004 (2026 Ranks 301–400)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes around billionaire records.

## Scope caveat

The production Liftor Supabase project is not queryable from this connected session. This is therefore a deterministic sweep of Forbes 2026 sequence rows **301–400**, not a claim that these are the exact next 100 `needs_manual_review` rows in the Jan-2025 2,754-record production universe. Reconcile each person to `billionaire_id` before database import.

## Verification rules

- Follow the money through legitimate public/professional institutions: operating company, investment firm, family office, foundation, board, IR, formal corporate office or equivalent.
- No guessed personal emails, private phone numbers or private residential addresses.
- Restricted/private-office routes remain useful intelligence and are retained with restrictions.
- Sanctions/compliance blocks override route availability.
- `outreach_allowed = false` for every row until a separate campaign/compliance decision.

## Batch result

- **83** `verified_public_institutional`
- **8** `verified_institutional_restricted`
- **3** `verified_institutional_switchboard_or_postal`
- **1** `verified_institutional_source_age_warning`
- **5** `legal_compliance_block`
- **100 / 100** have a documented route/status outcome.

> “Verified” means an evidenced institutional doorway exists. It does not mean the billionaire personally reads messages sent there and does not authorise outreach.

## Records

| Seq. | Billionaire | Organisation / route | Access mode | Restriction / note | Verification | Source / evidence anchor |
|---:|---|---|---|---|---|---|
| 301 | Ramzi Musallam | Veritas Capital | Investment-firm contact | CEO/managing-partner route | verified_public_institutional | https://www.veritascapital.com/ |
| 302 | Carl Bennet | Carl Bennet AB / Getinge | Family investment company / IR | Direct holding-company and portfolio route | verified_public_institutional | https://www.carlbennetab.se/ |
| 303 | Tobi Lütke | Shopify | Investor relations | Co-founder/CEO public-company route | verified_public_institutional | https://investors.shopify.com/ |
| 304 | German Khan | Alfa-linked historical business network | Compliance intelligence only | **UK-sanctioned, RUS0666. Institutional links are retained for network intelligence but blocked for outreach.** | legal_compliance_block | https://www.gov.uk/government/publications/the-uk-sanctions-list |
| 305 | Nicky Oppenheimer & family | Oppenheimer Generations / Brenthurst Foundation | Family office / foundation | Direct family investment/philanthropy route | verified_public_institutional | https://www.ogfza.com/ |
| 306 | Mark Stevens | S-Cubed Capital | Private investment office | Direct professional institution but not a broad general-outreach channel | verified_institutional_restricted | https://scubedcap.com/ |
| 307 | Tahir & family | Mayapada Group / Tahir Foundation | Corporate / foundation | Founder-family route | verified_public_institutional | https://www.mayapadagroup.com/ |
| 308 | Pierre Chen | YAGEO Corporation | Investor relations | Founder/chairman electronics route | verified_public_institutional | https://www.yageo.com/en/InvestorRelations |
| 309 | Chen Tao & family | Victory Giant Technology | Listed-company / investor route | Chairman/founder hardware route | verified_public_institutional | https://www.shpcb.com/ |
| 310 | Antony Ressler | Ares Management | Investor relations | Co-founder/executive-chair route | verified_public_institutional | https://ir.aresmgmt.com/ |
| 311 | Patrick Soon-Shiong | NantWorks / ImmunityBio | Corporate / investor relations | Founder/chairman life-sciences route | verified_public_institutional | https://ir.immunitybio.com/ |
| 312 | Wu Jianshu | Ningbo Tuopu Group | Listed-company investor route | Chairman/family company route | verified_public_institutional | https://www.tuopu.com/ |
| 313 | Douglas Leone | Sequoia Capital | Investment-firm route | Former senior partner; use firm/institutional channel only, not implied personal routing | verified_institutional_restricted | https://www.sequoiacap.com/ |
| 314 | Fredrik Lundberg | Lundbergföretagen | Investor relations | Founder-family investment-company route | verified_public_institutional | https://www.lundbergforetagen.se/en/investor-relations/ |
| 315 | Theo Müller | Unternehmensgruppe Theo Müller | Corporate contact | Founder/owner dairy-group route | verified_public_institutional | https://www.muellergroup.com/ |
| 316 | Leonid Fedun | LUKOIL historical wealth-source route | Historical institutional link | 2026 sanctions guide shows no US/UK/EU designation, but his current operating link to LUKOIL is weaker after retirement; revalidate before use | verified_institutional_source_age_warning | https://www.lukoil.com/ |
| 317 | Jimmy Haslam | Haslam Sports Group / Cleveland Browns | Corporate / sports ownership | Direct family institutional route | verified_public_institutional | https://www.clevelandbrowns.com/ |
| 318 | Karel Komárek | KKCG / Allwyn | Family investment group / corporate | Founder route | verified_public_institutional | https://kkcg.com/ |
| 319 | Ken Langone | Invemed Associates | Private investment firm | Direct professional office but not a broad general-outreach channel | verified_institutional_restricted | https://www.invemed.com/ |
| 320 | Magdalena Martullo-Blocher | EMS-CHEMIE | Investor / corporate | CEO/family controlling-shareholder route | verified_public_institutional | https://www.ems-group.com/en/investors/ |
| 321 | Dustin Moskovitz | Asana / Open Philanthropy | Investor / philanthropic | Co-founder company and family philanthropy ecosystem | verified_public_institutional | https://investors.asana.com/ |
| 322 | Blair Parry-Okeden | Cox Enterprises | Corporate / family-owner route | Cox family institutional route | verified_public_institutional | https://www.coxenterprises.com/contact-us |
| 323 | Sulaiman Al Habib | Dr. Sulaiman Al Habib Medical Group | Investor relations | Founder/chair healthcare route | verified_public_institutional | https://hmg.com/en/InvestorRelations |
| 324 | Ernest Garcia III | Carvana | Investor relations | Founder/CEO route | verified_public_institutional | https://investors.carvana.com/ |
| 325 | Graeme Hart | Rank Group | Formal private investment-office route | Private holding structure; preserve formal office route rather than invent direct contact | verified_institutional_switchboard_or_postal | https://www.rankgroup.co.nz/ |
| 326 | Jim Kennedy | Cox Enterprises / James M. Cox Foundation | Corporate / foundation | Family media-enterprise route | verified_public_institutional | https://www.coxenterprises.com/ |
| 327 | Daniel Křetínský | EP Group / EPH | Corporate / investment group | Founder/controlling-shareholder route | verified_public_institutional | https://www.epgroup.eu/ |
| 328 | Li Ping | CATL | Investor relations | Vice-chairman/current major-shareholder route | verified_public_institutional | https://www.catl.com/en/investors/ |
| 329 | Carrie Perrodo & family | Perenco | Corporate / family-owner route | Family oil-company route | verified_public_institutional | https://www.perenco.com/contact |
| 330 | Viktor Vekselberg | Renova-linked network | Compliance intelligence only | **UK-sanctioned RUS0867 and current US OFAC SDN. Block outreach.** | legal_compliance_block | https://sanctionssearch.ofac.treas.gov/Details.aspx?id=24306 |
| 331 | Randa Duncan Williams | Enterprise Products Partners | Investor relations / board | Duncan family pipeline-company route | verified_public_institutional | https://ir.enterpriseproducts.com/ |
| 332 | Micky Arison | Carnival Corporation | Investor relations | Chairman/family-shareholder route | verified_public_institutional | https://www.carnivalcorp.com/investors |
| 333 | Dannine Avara | Enterprise Products Partners | Investor relations / family-owner | Shared Duncan family route | verified_public_institutional | https://ir.enterpriseproducts.com/ |
| 334 | Bruce Cheng | Delta Electronics | Investor / corporate | Founder/chair family electronics route | verified_public_institutional | https://www.deltaww.com/en-US/investor |
| 335 | Murali Divi & family | Divi’s Laboratories | Investor relations | Founder/managing-director pharma route | verified_public_institutional | https://www.divislabs.com/investor-relations/ |
| 336 | Michael Federmann & family | Elbit Systems / Federmann Enterprises | Investor relations | Family controlling-shareholder route | verified_public_institutional | https://elbitsystems.com/investor-relations/ |
| 337 | Milane Frantz | Enterprise Products Partners | Investor relations / family-owner | Shared Duncan family route | verified_public_institutional | https://ir.enterpriseproducts.com/ |
| 338 | Tom Gores | Platinum Equity | Private-equity firm contact | Founder/chairman route | verified_public_institutional | https://www.platinumequity.com/contact/ |
| 339 | Juan Roig | Mercadona / EDEM | Corporate / foundation | President/family company route | verified_public_institutional | https://info.mercadona.es/en/contact |
| 340 | You Xiaoping & family | Huafon Group / Huafon Chemical | Corporate / listed-company route | Founder-family controlling route | verified_public_institutional | https://www.huafeng.com/ |
| 341 | Anthony Bamford & family | JCB | Corporate contact | Chairman/family industrial-company route | verified_public_institutional | https://www.jcb.com/en-gb/about/contact-us |
| 342 | Josh Harris | 26North / Harris Blitzer Sports & Entertainment | Investment-firm / corporate | Founder route | verified_public_institutional | https://www.26north.com/ |
| 343 | Jeffery Hildebrand | Hilcorp | Corporate contact | Founder/executive-chair private-energy route | verified_public_institutional | https://www.hilcorp.com/contact-us/ |
| 344 | Luis Carlos Sarmiento | Grupo Aval | Investor relations | Founder/family banking-group route | verified_public_institutional | https://www.grupoaval.com/en/investor-relations |
| 345 | Robert F. Smith | Vista Equity Partners / Fund II Foundation | Investment firm / foundation | Founder route | verified_public_institutional | https://www.vistaequitypartners.com/contact/ |
| 346 | Jean-Michel Besnier | Lactalis Group | Global corporate enquiry | Shared Besnier family company route | verified_public_institutional | https://www.lactalis.com/en/contact-us/ |
| 347 | Marie Besnier Beauvalot | Lactalis Group | Global corporate enquiry | Shared Besnier family company route | verified_public_institutional | https://www.lactalis.com/en/contact-us/ |
| 348 | Daniel Ek | Spotify | Investor relations | Co-founder/CEO route | verified_public_institutional | https://investors.spotify.com/ |
| 349 | Michael Kim | MBK Partners | Private-equity firm contact | Founder/partner route | verified_public_institutional | https://www.mbkpartnerslp.com/ |
| 350 | Fernando Roberto Moreira Salles | Itaú / Moreira Salles family institutions | Family shareholder / institutional | Strong family-business link, but corporate IR is not represented as a direct personal route | verified_institutional_restricted | https://www.itau.com.br/relacoes-com-investidores/ |
| 351 | Seo Jung-jin | Celltrion | Investor relations | Founder/chairman biotech route | verified_public_institutional | https://www.celltrion.com/en-us/ir |
| 352 | Harry Stine & family | Stine Seed Company | Corporate contact | Founder/family agriculture route | verified_public_institutional | https://www.stineseed.com/contact/ |
| 353 | Vincent Bolloré & family | Bolloré SE | Investor / corporate | Family controlling-group route | verified_public_institutional | https://www.bollore.com/en/investors/ |
| 354 | David Cheriton | Stanford Computer Science | Public professional institutional route | Current academic/professional institution; do not infer a private investment inbox | verified_public_institutional | https://cs.stanford.edu/people/david-cheriton |
| 355 | Scott Duncan | Enterprise Products Partners | Investor relations / family-owner | Shared Duncan family route | verified_public_institutional | https://ir.enterpriseproducts.com/ |
| 356 | Lee Boo-jin | Hotel Shilla | Investor / corporate | President/CEO family-business route | verified_public_institutional | https://www.hotelshilla.net/ |
| 357 | Yi Zheng | Hithink RoyalFlush Information Network | Listed-company / investor route | Founder/chairman/CEO route | verified_public_institutional | https://www.10jqka.com.cn/ |
| 358 | Zeng Fangqin | Lingyi iTech | Listed-company / investor route | Chairwoman/founder route | verified_public_institutional | https://www.lingyiitech.com/ |
| 359 | Mong-Koo Chung | Hyundai Motor Group | Investor / foundation | Family chairman-emeritus route | verified_public_institutional | https://www.hyundaimotorgroup.com/ |
| 360 | Iskander Makhmudov | UMMC-linked network | Compliance intelligence only | **UK-sanctioned RUS1643 and current US OFAC SDN. Block outreach.** | legal_compliance_block | https://www.gov.uk/government/publications/the-uk-sanctions-list |
| 361 | Georg Stumpf | Stumpf Group | Corporate / investment group | Founder property/investment route | verified_public_institutional | https://www.stumpf.at/ |
| 362 | Michael Rubin | Fanatics | Corporate / partnership | Founder/CEO route | verified_public_institutional | https://www.fanaticsinc.com/contact |
| 363 | Nassef Sawiris | NNS Group / OCI-linked investments | Family investment office / investor | Direct investment-office route | verified_public_institutional | https://www.nns.com/ |
| 364 | Brian Chesky | Airbnb | Investor relations | Co-founder/CEO route | verified_public_institutional | https://investors.airbnb.com/ |
| 365 | Pauline MacMillan Keinath | Cargill | Corporate / family-owner | Cargill family institutional route | verified_public_institutional | https://www.cargill.com/contact |
| 366 | Lee Seo-hyun | Samsung C&T | Corporate / investor | Samsung family executive route | verified_public_institutional | https://www.samsungcnt.com/eng/ir/ |
| 367 | Robert Pender | Venture Global | Investor relations | Co-founder/co-CEO LNG route | verified_public_institutional | https://investors.ventureglobal.com/ |
| 368 | Michael Sabel | Venture Global | Investor relations | Shared co-founder/co-CEO route | verified_public_institutional | https://investors.ventureglobal.com/ |
| 369 | Xu Gaoming | Laopu Gold | HK-listed company / investor route | Founder/chairman jewelry route | verified_public_institutional | https://www1.hkexnews.hk/ |
| 370 | Law Kar Po | Park Hotel Group | Corporate contact | Founder/chairman family hotel route | verified_public_institutional | https://www.parkhotelgroup.com/contact-us |
| 371 | Otto Toto Sugiri | DCI Indonesia | Investor relations / corporate | Co-founder/CEO data-centre route | verified_public_institutional | https://dci-indonesia.com/investor-relations/ |
| 372 | Roman Abramovich & family | Fordstam / current UK corporate holdings | Compliance intelligence only | **UK-sanctioned RUS0270. Current Companies House records continue to show active controlled entities, but outreach is blocked.** | legal_compliance_block | https://find-and-update.company-information.service.gov.uk/disqualified-officers/natural/5igLfNboSOFovx--t0SZLTYsAKw |
| 373 | Maria Asuncion Aramburuzabala & family | Tresalia Capital | Family investment office | Founder/chair investment route | verified_public_institutional | https://www.tresalia.com/ |
| 374 | Todd Boehly | Eldridge | Investment-company contact | Co-founder/chairman route | verified_public_institutional | https://www.eldridge.com/ |
| 375 | David Geffen | David Geffen Foundation | Private foundation | Direct family philanthropy exists, but no open grant/general personal route is assumed | verified_institutional_restricted | https://projects.propublica.org/nonprofits/ |
| 376 | Rajan Mittal | Bharti Enterprises | Corporate contact | Shared Mittal family telecom route | verified_public_institutional | https://www.bharti.com/contact-us/ |
| 377 | Rakesh Mittal | Bharti Enterprises | Corporate contact | Shared Mittal family telecom route | verified_public_institutional | https://www.bharti.com/contact-us/ |
| 378 | Terrence Pegula | Pegula Sports & Entertainment / Buffalo Bills | Corporate / sports ownership | Founder/owner route | verified_public_institutional | https://www.buffalobills.com/about-us/contact-us |
| 379 | Viktor Rashnikov | MMK-linked network | Compliance intelligence only | **UK-sanctioned RUS1028. Preserve ownership/company intelligence but block outreach.** | legal_compliance_block | https://www.gov.uk/government/publications/the-uk-sanctions-list |
| 380 | Zhang Xuexin & family | Xinfa Group | Corporate / family aluminium route | Founder-family wealth-source route | verified_public_institutional | http://www.xinfagroup.com.cn/ |
| 381 | Massimiliana Landini Aleotti & family | Menarini Group | Corporate contact | Family-owned pharmaceutical group route | verified_public_institutional | https://www.menarini.com/en-us/contact-us |
| 382 | Lin Li | Liye Group | Corporate / investment-group route | Founder/chairman investment group; group subsidiary publishes public corporate contact | verified_public_institutional | https://www.liyeelectric.com/ |
| 383 | William Ackman | Pershing Square Capital Management | Investment-firm contact / IR | Founder/CEO route | verified_public_institutional | https://pershingsquareholdings.com/ |
| 384 | Cho Jung-ho | Meritz Financial Group | Investor / corporate | Chairman/family financial-group route | verified_public_institutional | https://www.meritzgroup.com/ |
| 385 | Mat Ishbia | UWM Holdings | Investor relations | Chairman/CEO public-company route | verified_public_institutional | https://investors.uwm.com/ |
| 386 | Nathan Kirsh | Kirsh Group / Jetro Holdings | Formal private-company route | Private family structure; formal corporate office route retained rather than guessed direct contact | verified_institutional_switchboard_or_postal | https://www.jetroholdings.com/ |
| 387 | Liu Debing | Knowledge Atlas Technology (Zhipu / Z.ai) | Investor relations / business enquiry | Chairman/co-founder; current 2026 listed-company IR route is published | verified_public_institutional | https://www.zhipuai.cn/en/about |
| 388 | Pedro Moreira Salles | Itaú / Moreira Salles family institutions | Family shareholder / institutional | Strong family-business link, but IR is not represented as a direct personal route | verified_institutional_restricted | https://www.itau.com.br/relacoes-com-investidores/ |
| 389 | Odd Reitan & family | REITAN | Corporate contact | Founder/family retail group route | verified_public_institutional | https://reitan.no/en/contact |
| 390 | Alexandra Schörghuber & family | Schörghuber Group | Family holding-company contact | Direct family corporate route | verified_public_institutional | https://www.schoerghuber.group/en/contact/ |
| 391 | Pavel Tykač | Sev.en Global Investments / Sev.en Energy | Investment / corporate contact | Owner route | verified_public_institutional | https://www.7gi.com/ |
| 392 | Nathan Blecharczyk | Airbnb | Investor relations | Co-founder route | verified_public_institutional | https://investors.airbnb.com/ |
| 393 | Chen Dongsheng | Taikang Insurance Group | Corporate / governance | Founder/chairman insurance route | verified_public_institutional | https://www.taikang.com/ |
| 394 | Laurent Dassault | Dassault Aviation / Groupe Dassault | Investor / family corporate | Shared Dassault family route | verified_public_institutional | https://www.dassault-aviation.com/en/group/finance/ |
| 395 | Thierry Dassault | Dassault Aviation / Groupe Dassault | Investor / family corporate | Shared Dassault family route | verified_public_institutional | https://www.dassault-aviation.com/en/group/finance/ |
| 396 | Elisabeth DeLuca & family | Subway | Corporate / family-owner route | Founder-family restaurant group route | verified_public_institutional | https://www.subway.com/en-us/contactus |
| 397 | Jeff Greene | Greene real-estate / philanthropic institutions | Formal family office / philanthropy | Public institutional presence exists but no broad personal inbox is assumed | verified_institutional_restricted | https://www.greeneinstitute.org/ |
| 398 | Marie-Hélène Habert-Dassault | Dassault Aviation / Groupe Dassault | Investor / family corporate | Shared Dassault family route | verified_public_institutional | https://www.dassault-aviation.com/en/group/finance/ |
| 399 | Bruce Kovner | CAM Capital | Private investment office | Direct professional family-office route; not treated as broad unsolicited access | verified_institutional_restricted | https://www.camcapital.com/ |
| 400 | Eric Wittouck | Artal Group | Formal private holding-company route | Private family holding structure; use formal corporate correspondence only | verified_institutional_switchboard_or_postal | https://www.artal.com/ |

## High-value reusable route clusters

- **Enterprise Products Partners** → Randa Duncan Williams, Dannine Avara, Milane Frantz and Scott Duncan.
- **Airbnb** → Brian Chesky and Nathan Blecharczyk (plus Joe Gebbia in the next sequence).
- **Bharti Enterprises** → Rajan Mittal and Rakesh Mittal, plus Sunil Mittal from Batch 003.
- **Dassault family** → Laurent Dassault, Thierry Dassault and Marie-Hélène Habert-Dassault.
- **Lactalis** → Jean-Michel Besnier and Marie Besnier Beauvalot, plus Emmanuel Besnier from Batch 001.
- **CATL** → Li Ping plus Robin Zeng, Huang Shilin and Pei Zhenhua-linked intelligence from earlier batches; retain exact role distinctions.
- **Moreira Salles / Itaú** → Fernando Roberto Moreira Salles and Pedro Moreira Salles.
- **Cox Enterprises** → Blair Parry-Okeden and Jim Kennedy.

## Critical data-quality / compliance notes

1. **German Khan:** current Companies House sanctions-disqualification record identifies UK Sanctions List reference RUS0666. Hard block.
2. **Viktor Vekselberg:** UK RUS0867 and current OFAC SDN record. Hard block.
3. **Iskander Makhmudov:** UK RUS1643 and current OFAC SDN record. Hard block.
4. **Roman Abramovich:** UK RUS0270 remains in force. Companies House also shows current UK corporate-control records; retain as intelligence, not outreach.
5. **Viktor Rashnikov:** UK RUS1028. Hard block.
6. **Leonid Fedun:** do not automatically classify every Russian billionaire as sanctioned. A 2026 sanctions guide records no US/UK/EU designation for Fedun, but his historical LUKOIL route has weakened after retirement, so it is stored as a freshness-warning route.
7. **Liu Debing:** Knowledge Atlas Technology/Zhipu is now Hong Kong-listed and its 2026 corporate materials publish investor relations. This is a strong current institutional route.
8. **Lin Li:** current Forbes identifies him as chairman of Liye Group. A Liye group subsidiary publishes a live public corporate channel, making the group a usable institutional route without inventing personal contact.

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and write/update the access pathway with `organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`, `last_reviewed_at = 2026-08-23`, the verification state above and `outreach_allowed = false`.

For every `legal_compliance_block`, add a hard person-level exclusion so downstream campaigns cannot select the person merely because their business has a public IR/contact page. Do not overwrite stronger prior evidence; supersede or annotate it.
