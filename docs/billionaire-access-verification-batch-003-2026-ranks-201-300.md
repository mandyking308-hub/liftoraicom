# Billionaire Access Verification — Batch 003 (2026 Ranks 201–300)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes around billionaire records.

## Scope caveat

The production Liftor Supabase project is not queryable from this connected session. This is therefore a deterministic sweep of Forbes 2026 ranks **201–300**, not a claim that these are the exact next 100 `needs_manual_review` rows in the Jan-2025 2,754-record production universe. Reconcile each person to `billionaire_id` before database import.

This enriches the existing universe; it does not replace it.

## Verification rules

- Follow the money: company, family office, foundation, investment vehicle, board, investor relations, grant portal, institutional enquiry or another legitimate organisation-level doorway.
- A route does **not** need to relate to GHAT.
- No guessed personal emails, private phone numbers or private residential addresses.
- A route is retained even when it is restricted, programme-specific, postal-only or requires a freshness recheck.
- Sanctions/compliance restrictions override the existence of a public institutional channel.
- `outreach_allowed` remains `false` for every row pending a separate campaign/compliance decision.
- Shared organisations should be propagated across linked family members rather than researched repeatedly.

## Batch result

- **81** `verified_public_institutional`
- **11** `verified_institutional_restricted`
- **3** `verified_institutional_switchboard_or_postal`
- **2** `verified_institutional_source_age_warning`
- **2** `legal_compliance_block`
- **1** `enhanced_compliance_review`
- **100 / 100** have a documented route/status outcome.

> “Verified” means the organisation and institutional doorway are evidenced. It does not mean the billionaire personally receives messages sent through that channel, and it does not authorise outreach.

## Records

| Rank | Billionaire | Organisation / route | Access mode | Restriction / note | Verification | Source / evidence anchor |
|---:|---|---|---|---|---|---|
| 201 | Uday Kotak | Kotak Mahindra Bank | Investor relations / corporate | Founder/director wealth-source route | verified_public_institutional | https://www.kotak.com/en/investor-relations.html |
| 202 | Jack Dangermond | Esri | Corporate / business enquiry | Founder-led company route | verified_public_institutional | https://www.esri.com/en-us/contact |
| 203 | Joseph Lau | Chinese Estates Holdings | Investor / corporate route | Family property-company route | verified_public_institutional | https://www.chineseestates.com/ |
| 204 | Jason Chang | ASE Technology Holding | Investor relations | Founder/chair semiconductor route | verified_public_institutional | https://www.aseglobal.com/investors/ |
| 205 | Robert Kuok | Kuok Group / Kerry Group | Corporate / investor route | Family conglomerate route | verified_public_institutional | https://www.kuokgroup.com/ |
| 206 | Barry Lam | Quanta Computer | Investor relations | Founder/chair company route | verified_public_institutional | https://www.quantatw.com/ |
| 207 | Sunil Mittal | Bharti Enterprises / Bharti Airtel | Corporate / investor relations | Founder/chair telecom route | verified_public_institutional | https://www.bharti.com/ |
| 208 | Ralph Lauren & family | Ralph Lauren Corporation | Investor relations / foundation | Founder/executive-chairman route | verified_public_institutional | https://investor.ralphlauren.com/ |
| 209 | Pei Zhenhua | Suzhou TA&A Ultra Clean / CATL | Listed-company investor route | Chairman of Suzhou TA&A and material CATL shareholder; institutional asset route | verified_public_institutional | https://www.cninfo.com.cn/ |
| 210 | Robert Kraft | The Kraft Group / Kraft Family Foundation | Corporate / philanthropic | Legitimate family institutional route; no assumption that general enquiries reach Kraft personally | verified_institutional_restricted | https://thekraftgroup.com/ |
| 211 | Hasso Plattner & family | Hasso Plattner Foundation / HPI | Foundation / institution | Direct philanthropy/education route; funding access is programme-led | verified_institutional_restricted | https://www.plattnerfoundation.org/ |
| 212 | Bubba Cathy | Chick-fil-A / WinShape Foundation | Corporate / foundation | Shared Cathy family route | verified_public_institutional | https://www.chick-fil-a.com/ |
| 213 | Dan Cathy | Chick-fil-A / WinShape Foundation | Corporate / foundation | Shared Cathy family route | verified_public_institutional | https://www.chick-fil-a.com/ |
| 214 | Trudy Cathy White | Chick-fil-A / WinShape Foundation | Corporate / foundation | Shared Cathy family route | verified_public_institutional | https://winshape.org/ |
| 215 | Laurene Powell Jobs | Emerson Collective | Institutional / partnership | Direct organisation founded by Powell Jobs; engagement is initiative/partner-led rather than a personal inbox | verified_institutional_restricted | https://www.emersoncollective.com/ |
| 216 | Dmitri Bukhman | Playrix | Corporate contact | Co-founder company route | verified_public_institutional | https://playrix.com/ |
| 217 | Igor Bukhman | Playrix | Corporate contact | Shared co-founder company route | verified_public_institutional | https://playrix.com/ |
| 218 | Edward Johnson IV | Fidelity Investments | Corporate / governance | Johnson family company route | verified_public_institutional | https://www.fidelity.com/ |
| 219 | Cao Renxian | Sungrow | Investor relations | Founder/chairman renewable-energy company route | verified_public_institutional | https://en.sungrowpower.com/investor |
| 220 | Hamdi Ulukaya | Chobani / Tent Partnership for Refugees | Corporate / nonprofit | Founder-led company and nonprofit route | verified_public_institutional | https://www.tent.org/ |
| 221 | Ivan Glasenberg | Glencore | Investor / shareholder route | Former CEO and major-shareholder connection; company route is institutional intelligence, not a personal channel | verified_institutional_restricted | https://www.glencore.com/investors |
| 222 | Wang Weixiu & family | Zhongji Innolight | Investor / listed-company route | Founder-family wealth-source route; current family executive linkage | verified_public_institutional | https://www.innolight.com/ |
| 223 | David Reuben | Reuben Brothers | Formal investment-office route | Private investment group; use formal office/corporate correspondence only | verified_institutional_switchboard_or_postal | https://www.reubenbrothers.com/ |
| 224 | Simon Reuben | Reuben Brothers | Formal investment-office route | Shared private investment-group route | verified_institutional_switchboard_or_postal | https://www.reubenbrothers.com/ |
| 225 | Joseph Tsai | Alibaba Group | Investor relations / corporate | Co-founder/chairman route | verified_public_institutional | https://www.alibabagroup.com/en-US/investor-relations |
| 226 | Ken Fisher | Fisher Investments | Corporate / institutional | Founder/executive-chairman investment-firm route | verified_public_institutional | https://www.fisherinvestments.com/en-us/contact-us |
| 227 | Sandra Ortega Mera | Fundación Paideia Galiza / Inditex-related holdings | Foundation / institutional | Family philanthropic route; do not infer a personal route from Inditex shareholder status | verified_institutional_restricted | https://www.paideia.es/ |
| 228 | Alexander Karp | Palantir Technologies | Investor relations | Co-founder/CEO public-company route | verified_public_institutional | https://investors.palantir.com/ |
| 229 | J. Christopher Reyes | Reyes Holdings | Corporate contact | Shared family distribution-company route | verified_public_institutional | https://www.reyesholdings.com/ |
| 230 | Jude Reyes | Reyes Holdings | Corporate contact | Shared family distribution-company route | verified_public_institutional | https://www.reyesholdings.com/ |
| 231 | Anthoni Salim | Indofood / Salim Group | Investor relations / corporate | Family conglomerate route | verified_public_institutional | https://www.indofood.com/investor-relation |
| 232 | Richard Kinder | Kinder Morgan / Kinder Foundation | Investor relations / foundation | Founder/executive-chairman route | verified_public_institutional | https://ir.kindermorgan.com/ |
| 233 | Charles Schwab | The Charles Schwab Corporation | Investor relations / foundation | Founder/chairman route | verified_public_institutional | https://www.schwab.com/investor-relations |
| 234 | Orlando Bravo | Thoma Bravo | Investment-firm contact | Founder/managing partner route; access is deal/portfolio/institutional rather than general personal outreach | verified_institutional_restricted | https://www.thomabravo.com/contact |
| 235 | Lin Muqin & family | Eastroc Beverage | Investor / listed-company route | Chairman/CEO and controlling-shareholder route | verified_public_institutional | https://www.sse.com.cn/ |
| 236 | Anthony Pratt | Visy / Pratt Industries | Corporate contact | Executive-chairman family industrial route | verified_public_institutional | https://www.visy.com/contact-us |
| 237 | Kushal Pal Singh | DLF | Investor relations | Family property-company route | verified_public_institutional | https://www.dlf.in/investor |
| 238 | Andrew Beal | Beal Bank / Beal Financial | Formal banking office | Private founder-owned bank; preserve formal institutional route rather than guess direct contact | verified_institutional_switchboard_or_postal | https://www.bealbank.com/contact-us |
| 239 | James Goodnight | SAS | Corporate contact | Co-founder/CEO company route | verified_public_institutional | https://www.sas.com/en_us/contact.html |
| 240 | Vikram Lal & family | Eicher Motors / Eicher Group Foundation | Investor / foundation | Family motorcycle/industrial route | verified_public_institutional | https://www.eichermotors.com/investors/ |
| 241 | Qi Shi & family | East Money Information | Investor relations | Founder/chairman route; listed-company investor contact is publicly disclosed | verified_public_institutional | https://www.eastmoney.com/ |
| 242 | George Roberts | KKR | Investor relations / corporate | Co-founder investment-firm route | verified_public_institutional | https://ir.kkr.com/ |
| 243 | David Steward | World Wide Technology | Corporate contact | Founder/chairman company route | verified_public_institutional | https://www.wwt.com/contact-us |
| 244 | Sun Piaoyang | Jiangsu Hengrui Pharmaceuticals | Investor / listed-company route | Chairman/controlling-shareholder pharma route | verified_public_institutional | https://www.hengrui.com/en/ |
| 245 | Chris Larsen | Ripple | Corporate / impact route | Co-founder/executive-chair route | verified_public_institutional | https://ripple.com/contact/ |
| 246 | Marijke Mars | Mars, Incorporated | Corporate / family-owner route | Shared Mars family institutional route | verified_public_institutional | https://www.mars.com/contact-us |
| 247 | Pamela Mars | Mars, Incorporated | Corporate / family-owner route | Shared Mars family institutional route | verified_public_institutional | https://www.mars.com/contact-us |
| 248 | Valerie Mars | Mars, Incorporated | Corporate / family-owner route | Shared Mars family institutional route | verified_public_institutional | https://www.mars.com/contact-us |
| 249 | Victoria Mars | Mars, Incorporated | Corporate / family-owner route | Shared Mars family institutional route | verified_public_institutional | https://www.mars.com/contact-us |
| 250 | Francine von Finck & family | SGS investor relations | Public IR through material family investment | Current Forbes identifies an SGS stake, but the family’s investment structure is private; revalidate linkage immediately before use | verified_institutional_source_age_warning | https://www.sgs.com/en/investor-relations |
| 251 | Leon Black | Debra and Leon Black Family Foundation | Private foundation / formal institutional | Direct family philanthropy exists but is not treated as an open unsolicited-funding route | verified_institutional_restricted | https://projects.propublica.org/nonprofits/ |
| 252 | Charoen Sirivadhanabhakdi & family | ThaiBev / TCC Group | Investor relations / corporate | Family conglomerate route | verified_public_institutional | https://thaibev.com/investor-relations/ |
| 253 | Zhou Chaonan | Range Intelligent Computing Technology Group | Investor relations | Founder/chairman listed-company route; published IR channel exists | verified_institutional_source_age_warning | http://www.rangeidc.com/ |
| 254 | Vinod Khosla | Khosla Ventures | Investment-firm contact | Founder route | verified_public_institutional | https://www.khoslaventures.com/ |
| 255 | Alexander Gerko | XTX Markets | Corporate / institutional | Founder/co-CEO trading-firm route | verified_public_institutional | https://www.xtxmarkets.com/contact/ |
| 256 | Viatcheslav Kantor | Acron / Kantor-linked institutions | Compliance intelligence only | **UK sanctions designation RUS1127; asset freeze, trust-services sanctions and director-disqualification sanction. Block outreach.** | legal_compliance_block | https://www.gov.uk/government/publications/the-uk-sanctions-list |
| 257 | Jim Pattison | Jim Pattison Group | Corporate contact | Founder/chairman diversified-group route | verified_public_institutional | https://www.jimpattison.com/contact-us/ |
| 258 | Andreas Struengmann & family | ATHOS / family investment structure | Investment-office route | Direct family investment organisation | verified_public_institutional | https://www.athos.de/ |
| 259 | Thomas Struengmann & family | ATHOS / family investment structure | Investment-office route | Shared family investment-office route | verified_public_institutional | https://www.athos.de/ |
| 260 | Ravi Jaipuria | RJ Corp / Varun Beverages | Corporate / investor relations | Founder/chairman consumer franchise route | verified_public_institutional | https://www.varunbeverages.com/investors/ |
| 261 | Nadia Thiele & family | Knorr-Bremse | Investor relations / family-shareholder route | Family wealth asset route | verified_public_institutional | https://ir.knorr-bremse.com/ |
| 262 | Rafael del Pino | Ferrovial | Investor relations | Chairman/family-shareholder route | verified_public_institutional | https://www.ferrovial.com/en/ir-shareholders/ |
| 263 | Christopher Hohn | Children’s Investment Fund Foundation / TCI | Foundation / investment office | Direct foundation/fund route; grantmaking/partnerships are strategy-led rather than assumed open | verified_institutional_restricted | https://ciff.org/ |
| 264 | Pierre Omidyar | Omidyar Network | Institutional / philanthropic | Founder route; use programme/partner pathways rather than personal outreach | verified_institutional_restricted | https://omidyar.com/ |
| 265 | Finn Rausing | Tetra Laval | Corporate / family-owner route | Shared Rausing family industrial route | verified_public_institutional | https://www.tetralaval.com/contact |
| 266 | Jorn Rausing | Tetra Laval | Corporate / family-owner route | Shared Rausing family industrial route | verified_public_institutional | https://www.tetralaval.com/contact |
| 267 | Kirsten Rausing | Tetra Laval / Alborada Trust | Corporate / philanthropic | Shared family corporate route; philanthropic route also exists | verified_public_institutional | https://www.tetralaval.com/contact |
| 268 | Chung Yong-ji | Caregen | Investor relations | Founder/CEO and controlling-shareholder route; KRX filings identify an IR function | verified_public_institutional | https://www.caregen.co.kr/ |
| 269 | Carl Cook | Cook Group | Corporate contact | Family medical-device group route | verified_public_institutional | https://www.cookgroup.com/contact/ |
| 270 | Tilman Fertitta | Fertitta Entertainment / Landry’s | Corporate contact | Founder/CEO private-group route | verified_public_institutional | https://www.landrysinc.com/contact-us |
| 271 | Ernesto Bertarelli | B-FLEXION / Bertarelli Foundation | Investment office / foundation | Direct family investment/philanthropy route | verified_public_institutional | https://www.bflexion.com/ |
| 272 | Robert Duggan | Summit Therapeutics | Investor relations | Executive-chairman / major-investor biotech route | verified_public_institutional | https://investors.smmttx.com/ |
| 273 | Elizabeth Johnson | Fidelity Investments | Corporate / governance | Johnson family company route | verified_public_institutional | https://www.fidelity.com/ |
| 274 | Zhu Yi | Sichuan Biokin Pharmaceutical | Investor relations | Chairman/founder route; live 2026 investor contact page | verified_public_institutional | https://ir.baili-pharm.com/en/investor-relations/investor-contacts/ |
| 275 | Sherry Brydson | Thomson Reuters / Woodbridge family ownership | Investor / corporate route | Thomson family investment/company route | verified_public_institutional | https://ir.thomsonreuters.com/ |
| 276 | Henry Kravis | KKR | Investor relations / corporate | Co-founder investment-firm route | verified_public_institutional | https://ir.kkr.com/ |
| 277 | Liang Wenfeng | DeepSeek / High-Flyer | Official company service / institutional | DeepSeek publishes an official service channel, but it is not represented as a founder/personal inbox | verified_institutional_restricted | https://www.deepseek.com/ |
| 278 | Wang Laisheng | Luxshare Precision | Investor / listed-company route | Family electronics-components route | verified_public_institutional | https://www.luxshare-ict.com/ |
| 279 | Dan Friedkin | The Friedkin Group | Corporate contact | Chairman/CEO family investment group route | verified_public_institutional | https://www.friedkin.com/ |
| 280 | Charlie Mills | Medline | Corporate contact | Family medical-supplies company route | verified_public_institutional | https://www.medline.com/about-us/contact-us/ |
| 281 | Juan Carlos Escotet | Banesco | Corporate / banking route | Founder/chairman financial-group route | verified_public_institutional | https://www.banesco.com/ |
| 282 | Lin Bin | Xiaomi | Investor relations | Co-founder/vice-chairman corporate route | verified_public_institutional | https://ir.mi.com/ |
| 283 | Wang Laichun | Luxshare Precision | Investor / listed-company route | Chairwoman/family electronics route | verified_public_institutional | https://www.luxshare-ict.com/ |
| 284 | Li Xiting | Mindray | Investor relations | Co-founder/chairman medical-device route | verified_public_institutional | https://www.mindray.com/en/investors |
| 285 | Liu Yongxing | East Hope Group | Corporate contact | Founder/chairman private conglomerate route | verified_public_institutional | https://www.easthope.cn/ |
| 286 | Martin Lorentzon | Spotify | Investor relations / founder route | Co-founder/shareholder route | verified_public_institutional | https://investors.spotify.com/ |
| 287 | John Malone | Liberty Media | Investor relations | Chairman/family investment-company route | verified_public_institutional | https://www.libertymedia.com/investors |
| 288 | Abdulsamad Rabiu | BUA Group / ASR Africa | Corporate / foundation | Founder/chairman and direct philanthropy route | verified_public_institutional | https://www.buagroup.com/ |
| 289 | Arthur Blank | Arthur M. Blank Family Foundation | Foundation contact | Direct family philanthropy route | verified_public_institutional | https://blankfoundation.org/ |
| 290 | Charles Butt | H-E-B / Holdsworth Center | Corporate / nonprofit | Family grocery-company and philanthropy/education route | verified_public_institutional | https://www.heb.com/static-page/contact-us |
| 291 | Francesco Gaetano Caltagirone | Cementir Holding | Investor relations | Chairman/family industrial route | verified_public_institutional | https://www.cementirholding.com/en/investors |
| 292 | Thomas Schmidheiny | Holcim / Max Schmidheiny Foundation | Investor / foundation | Family cement/philanthropy route | verified_public_institutional | https://www.holcim.com/investors |
| 293 | Gong Hongjia & family | Hikvision | Investor / shareholder route | Founder-investor wealth-source connection | verified_public_institutional | https://www.hikvision.com/en/about-us/investor-relations/ |
| 294 | Johann Graf | NOVOMATIC | Corporate contact | Founder/owner gaming-group route | verified_public_institutional | https://www.novomatic.com/en/contact |
| 295 | Gabe Newell | Valve | Corporate / partner route | Founder company route but Valve’s public channels are support/partner-purpose specific; no general personal route inferred | verified_institutional_restricted | https://www.valvesoftware.com/en/ |
| 296 | Mikhail Prokhorov | ONEXIM-linked investment network | Institutional intelligence / compliance review | Current screening indicates no US/UK/EU designation in a 2026 sanctions guide, but other-jurisdiction sanctions/PEP signals exist; require jurisdiction-specific review before any activity | enhanced_compliance_review | https://www.onexim.ru/ |
| 297 | Wei Jianjun & family | Great Wall Motor | Investor relations | Chairman/controlling-shareholder automaker route | verified_public_institutional | https://www.gwm-global.com/investor/ |
| 298 | Riley Bechtel & family | Bechtel | Corporate contact | Family engineering-group route | verified_public_institutional | https://www.bechtel.com/contact/ |
| 299 | Andrei Guryev & family | PhosAgro | Compliance intelligence only | **UK sanctions designation RUS1125; asset freeze and trust-services sanctions. Preserve PhosAgro network intelligence but block outreach.** | legal_compliance_block | https://www.gov.uk/government/publications/the-uk-sanctions-list |
| 300 | Liang Wengen | SANY Group / SANY Heavy Industry | Investor / corporate route | Founder/chair industrial-company route | verified_public_institutional | https://www.sanyglobal.com/ |

## High-value reusable route clusters

- **Chick-fil-A / WinShape** → Bubba Cathy, Dan Cathy, Trudy Cathy White.
- **Playrix** → Dmitri Bukhman, Igor Bukhman.
- **Reyes Holdings** → J. Christopher Reyes, Jude Reyes.
- **Mars** → Marijke, Pamela, Valerie and Victoria Mars, plus Jacqueline and John Mars from Batch 001.
- **ATHOS** → Andreas and Thomas Struengmann.
- **Tetra Laval** → Finn, Jorn and Kirsten Rausing.
- **Fidelity** → Edward Johnson IV and Elizabeth Johnson, plus Abigail Johnson from Batch 001.
- **KKR** → George Roberts and Henry Kravis.
- **Luxshare Precision** → Wang Laisheng and Wang Laichun.
- **Xiaomi** → Lin Bin plus Lei Jun from Batch 001.
- **CATL ecosystem** → Pei Zhenhua plus Robin Zeng from Batch 001 and Huang Shilin from Batch 002, with person-specific role notes retained.

## Critical data-quality / compliance notes

1. **Viatcheslav Kantor:** current UK sanctions notice (16 March 2026) confirms RUS1127 remains subject to asset freeze, trust-services sanctions and a director-disqualification sanction. Institutional links are intelligence only.
2. **Andrei Guryev:** the UK consolidated Russia list records Andrey Grigoryevich Guryev as RUS1125 with asset-freeze/trust-services sanctions. Block outreach despite the existence of PhosAgro corporate channels.
3. **Mikhail Prokhorov:** do not automatically put him in the same UK-sanctions bucket as Guryev/Kantor. A 2026 US/UK/EU sanctions guide records no US, UK or EU designation for him, while other-jurisdiction/PEP screening sources flag him. Store as enhanced compliance review rather than inventing a UK block.
4. **Qi Shi:** East Money’s listed-company materials publicly identify Qi as chairman and publish an investor-relations contact, so this is a strong institutional route.
5. **Zhu Yi:** Biokin’s current 2026 investor site publishes a dedicated investor-contact page; Forbes identifies Zhu as chairman. This is stronger evidence than a generic company association.
6. **Zhou Chaonan:** current billionaire sources identify Zhou as founder/chairman of Range Intelligent Computing Technology Group and market data publishes its IR channel. Recheck the exact company contact at use-time because accessible English-language primary material is thinner than for most of this batch.
7. **Francine von Finck:** Forbes currently identifies an SGS holding, but the family’s wider investment structure is private. Treat SGS as a useful institutional asset route, not proof that an IR enquiry reaches the family directly.
8. **DeepSeek / Liang Wenfeng:** DeepSeek publishes official service/contact information, but this is purpose-specific. Do not relabel it as Liang’s personal contact.

## Import intent

When production Liftor database access is available, reconcile every row to `billionaire_id` and update/create the relevant access pathway with:

- `organisation_name`
- `source_url`
- `route_access_mode`
- `route_restriction_notes`
- `last_reviewed_at = 2026-08-23`
- the verification state above
- `outreach_allowed = false`

For `legal_compliance_block`, add a hard person-level blocker so downstream campaign tools cannot select the record merely because a public corporate route exists. For `enhanced_compliance_review`, require a fresh jurisdiction-specific sanctions screen before campaign selection.

Do not overwrite stronger evidence. Do not delete older routes; supersede, downgrade or block them with dated review notes where necessary.
