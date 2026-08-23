# Billionaire Access Verification — Batch 002 (2026 Ranks 101–200)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes around billionaire records.

## Scope caveat

The production Liftor Supabase project is not queryable from this connected session. This batch is therefore a deterministic sweep of Forbes 2026 ranks **101–200**, not a claim that these are the exact next 100 `needs_manual_review` rows in the Jan-2025 2,754-record production universe. Reconcile by billionaire ID before import.

The sweep enriches the existing universe; it does not replace it.

## Verification rules

- Follow the money: company, family office, foundation, investment vehicle, board, investor relations, grant portal, institutional enquiry or other legitimate organisation-level doorway.
- A route does **not** need to relate to GHAT.
- No guessed personal emails, private phone numbers or private residential addresses.
- Restrictions are retained instead of deleting the route.
- Sanctions/compliance blocks override the existence of a public institutional channel.
- Deceased records are preserved as intelligence but removed from active-person outreach.
- `outreach_allowed` remains `false` for every row pending a separate campaign/compliance decision.

## Batch result

- **80** `verified_public_institutional`
- **10** `verified_institutional_restricted`
- **4** `verified_institutional_source_age_warning`
- **1** `verified_institutional_switchboard_or_postal`
- **4** `legal_compliance_block`
- **1** `deceased_remove_from_active_outreach`
- **100 / 100** have a documented route/status outcome.

> “Verified” means the organisation and institutional doorway are evidenced. It does not mean the billionaire personally receives messages sent through that channel, and it does not authorise outreach.

## Records

| Rank | Billionaire | Organisation / route | Access mode | Restriction / note | Verification | Source / evidence anchor |
|---:|---|---|---|---|---|---|
| 101 | Vladimir Lisin | NLMK Investor Relations | Public IR | Wealth-source company route | verified_public_institutional | https://nlmk.com/en/ir/ |
| 102 | Gina Rinehart | Hancock Prospecting | Corporate enquiry | Private-company institutional route | verified_public_institutional | https://www.hancockprospecting.com.au/ |
| 103 | Yu Yong | CMOC Group | Investor relations | Public listed-company route linked to mining wealth | verified_public_institutional | https://en.cmoc.com/ |
| 104 | Stuart Hoegner | Tether | Public corporate support | Institutional company route, not personal | verified_public_institutional | https://tether.to/ |
| 105 | Huang Shilin | CATL | Investor relations | Shared CATL institutional route | verified_public_institutional | https://www.catl.com/en/ |
| 106 | Christy Walton | Children’s Scholarship Fund | Nonprofit institutional contact | Walton is Board Member Emeritus; valid route but not a personal/general grant channel | verified_institutional_restricted | https://scholarshipfund.org/about/board/ |
| 107 | Stefan Persson | H&M Group | Investor relations | Family wealth-source company route | verified_public_institutional | https://hmgroup.com/investors/ |
| 108 | Gennady Timchenko | Timchenko Foundation | Foundation contact / application system | Public foundation route exists, **but Timchenko is UK-sanctioned; compliance block overrides outreach** | legal_compliance_block | https://fondtimchenko.ru/contacts/ ; https://search-uk-sanctions-list.service.gov.uk/ |
| 109 | David Tepper | Tepper Sports & Entertainment / Carolina Panthers | Corporate organisation route | Institutional organisation route; use purpose-appropriate channel only | verified_public_institutional | https://www.panthers.com/about-us/ |
| 110 | Harry Triguboff | Meriton | Head-office enquiry / contact form | Founder and managing director directly evidenced by Meriton | verified_public_institutional | https://www.meriton.com.au/contact-us/ |
| 111 | Steve Cohen | Point72 | Corporate / institutional contact | Investment-firm route | verified_public_institutional | https://point72.com/ |
| 112 | Rupert Murdoch & family | News Corp | Investor relations / corporate enquiry | Chairman Emeritus / family-trust corporate route | verified_public_institutional | https://newscorp.com/investor-contact-info/ |
| 113 | Diane Hendricks | ABC Supply | Corporate contact | Founder/chair family company route | verified_public_institutional | https://www.abcsupply.com/ |
| 114 | Stanley Kroenke | Kroenke Sports & Entertainment | Corporate organisation route | Sports/real-estate group route | verified_public_institutional | https://www.therams.com/ |
| 115 | Todd Graves | Raising Cane’s | Corporate contact | Founder/CEO company route | verified_public_institutional | https://www.raisingcanes.com/ |
| 116 | Ernest Garcia II | Carvana | Investor relations | Controlling-shareholder relationship evidenced; corporate route only | verified_public_institutional | https://investors.carvana.com/ |
| 117 | Wang Chuanfu | BYD | Investor relations | Founder/chairman company route | verified_public_institutional | https://www.bydglobal.com/ |
| 118 | John Fredriksen | Frontline | Investor relations | Public shipping-company route tied to Fredriksen interests | verified_public_institutional | https://www.frontlineplc.cy/ |
| 119 | Kumar Birla | Aditya Birla Group / Hindalco | Corporate / investor relations | Current group-chair route | verified_public_institutional | https://www.adityabirla.com/ |
| 120 | Michael Platt | BlueCrest Capital Management | Formal institutional office | BlueCrest explicitly says it does not offer managed-fund interests to outside/third-party investors; retain as restricted institutional route | verified_institutional_restricted | https://www.bluecrestcapital.com/ |
| 121 | Vinod Adani | Adani Group / Adani Enterprises | Investor relations | Family/infrastructure institutional route; verify exact current role before campaign use | verified_public_institutional | https://www.adanienterprises.com/investors |
| 122 | Qin Yinglin | Muyuan Foods | Listed-company / shareholder route | Current 2026 chairman/controlling-shareholder relationship evidenced | verified_public_institutional | https://www.muyuanfoods.com/ |
| 123 | Chen Tianshi | Cambricon Technologies | Investor relations | Institutional route identified; contact evidence should be freshness-checked before use | verified_institutional_source_age_warning | https://www.cambricon.com/ |
| 124 | Dang Yanbao | Baofeng Energy | Investor relations / corporate contact | Wealth-source company route | verified_public_institutional | https://www.baofengenergy.com/ |
| 125 | Kwong Siu-hing | Sun Hung Kai Properties | Investor relations | Family wealth-source company route | verified_public_institutional | https://www.shkp.com/ |
| 126 | Henry Nicholas III | Nicholas Academic Centers / Nicholas philanthropy | Nonprofit institutional route | Philanthropic route exists but no broad unsolicited-funding assumption | verified_institutional_restricted | https://nicholasacademiccenters.com/ |
| 127 | Andrey Melnichenko & family | Melnichenko-linked foundation / historical EuroChem wealth route | Institutional intelligence only | **UK-sanctioned; asset freeze/travel/trust-services restrictions. Do not treat public route as outreach permission.** | legal_compliance_block | https://search-uk-sanctions-list.service.gov.uk/designations/RUS0774/Individual |
| 128 | Andrew Forrest & family | Minderoo Foundation | Foundation / partnership route | Direct family philanthropy route | verified_public_institutional | https://www.minderoo.org/ |
| 129 | Jerry Jones & family | Dallas Cowboys / Jones family philanthropy | Corporate / community route | Owner-family institutional route | verified_public_institutional | https://www.dallascowboys.com/ |
| 130 | Takemitsu Takizaki | KEYENCE | Investor relations | Founder/shareholder wealth-source route | verified_public_institutional | https://www.keyence.co.jp/investor/en/ |
| 131 | Andre Esteves | BTG Pactual | Investor relations | Current 2026 chairman relationship and IR channel evidenced | verified_public_institutional | https://ri.btgpactual.com/en/ |
| 132 | Renata Kellnerova & family | PPF Group / Kellner Family Foundation | Corporate / foundation route | Family-controlled investment group and philanthropy route | verified_public_institutional | https://www.ppf.eu/ |
| 133 | Low Tuck Kwong | Bayan Resources | Investor / corporate route | Current 2026 controlling-shareholder relationship evidenced | verified_public_institutional | https://www.bayan.com.sg/ |
| 134 | Nancy Walton Laurie | Nancy Walton Laurie Foundation | Foundation office / filing route | Filing indicates preselected grantees and no unsolicited requests; retain route but classify restricted | verified_institutional_restricted | https://projects.propublica.org/nonprofits/organizations/912121667 |
| 135 | Prince Alwaleed Bin Talal Alsaud | Kingdom Holding / Alwaleed Philanthropies | Investor / philanthropic route | Strong family investment/philanthropy institutions | verified_public_institutional | https://kingdom.com.sa/ |
| 136 | Dhanin Chearavanont | Charoen Pokphand Group | Corporate contact | Family conglomerate route | verified_public_institutional | https://www.cpgroupglobal.com/ |
| 137 | John Doerr | Kleiner Perkins | Venture-firm institutional route | Partner / investment-firm route | verified_public_institutional | https://www.kleinerperkins.com/ |
| 138 | Jorge Paulo Lemann & family | Fundação Lemann | Foundation route | Institutional philanthropy route; funding access is programme-led rather than assumed open | verified_institutional_restricted | https://fundacaolemann.org.br/ |
| 139 | R. Budi Hartono | Bank Central Asia | Investor relations | Family wealth-source company route | verified_public_institutional | https://www.bca.co.id/ |
| 140 | Alejandro Baillères Gual & family | Industrias Peñoles / Grupo BAL | Investor relations | Current 2026 investor channel | verified_public_institutional | https://www.penoles.com.mx/en/investors/ |
| 141 | Philip Anschutz | The Anschutz Foundation | Foundation application / institutional contact | Foundation route with formal grant process | verified_public_institutional | https://theanschutzfoundation.org/ |
| 142 | John Menard Jr | Menards | Corporate contact | Private-company route | verified_public_institutional | https://www.menards.com/ |
| 143 | Chen Jianhua | Hengli Group | Corporate contact | Chairman/founder corporate route | verified_public_institutional | https://www.hengli.com/ |
| 144 | Donald Bren | Irvine Company | General corporate enquiry | Current chairman relationship and head-office contact evidenced | verified_public_institutional | https://www.irvinecompany.com/contact/ |
| 145 | Georg Schaeffler | Schaeffler AG | Investor relations | Family shareholder/company route | verified_public_institutional | https://www.schaeffler.com/en/investor-relations/ |
| 146 | Brett Adcock | Figure AI | Public contact form | Founder/CEO company route | verified_public_institutional | https://www.figure.ai/company |
| 147 | Karl Albrecht Jr & family | ALDI SÜD | Corporate enquiry | Private family group; purpose-limited corporate route rather than personal access | verified_institutional_restricted | https://www.aldi.com/ |
| 148 | Beate Heister | ALDI SÜD | Corporate enquiry | Shared ALDI SÜD family route; no assumption of personal delivery | verified_institutional_restricted | https://www.aldi.com/ |
| 149 | Michael Hartono | Bank Central Asia | Investor relations | Shared Hartono family public-company route | verified_public_institutional | https://www.bca.co.id/ |
| 150 | Nik Storonsky | Revolut | Corporate / business route | Founder/CEO company channel | verified_public_institutional | https://www.revolut.com/ |
| 151 | Eric Li | Geely Holding | Corporate / investor route | Founder/chairman wealth-source route | verified_public_institutional | https://www.geely.com/ |
| 152 | Zhong Huijuan | Hansoh Pharma | Investor relations | Founder/chairwoman company route | verified_public_institutional | https://www.hspharm.com/ |
| 153 | Torstein Hagen | Viking Holdings | Investor relations | Current executive-chairman route | verified_public_institutional | https://ir.viking.com/ |
| 154 | James Ratcliffe | INEOS | Corporate contact | Founder/chairman industrial-group route | verified_public_institutional | https://www.ineos.com/contact-us/ |
| 155 | Wang Ning & family | Pop Mart | Corporate / investor route | Founder/chair/CEO company route | verified_public_institutional | https://www.popmart.com/ |
| 156 | Ludwig Merckle | Heidelberg Materials / Merckle Service | Investor / governance route | Current board and material-shareholder relationship evidenced; formal institutional doorway | verified_public_institutional | https://www.heidelbergmaterials.com/en/company/supervisory-board/ludwig-merckle |
| 157 | Sarath Ratanavadi | Gulf Development | Investor relations / contact form | Current 2026 major shareholder and CEO relationship; live IR channel | verified_public_institutional | https://investor.gulf.co.th/ |
| 158 | Theo Albrecht Jr & family | ALDI Nord | Corporate contact | Family group route; purpose-limited and not personal | verified_institutional_restricted | https://www.aldi-nord.de/hilfe-kontakt.html |
| 159 | Edwin Chen | Surge AI | Business/company route | Founder company route; use commercial/institutional enquiry only | verified_public_institutional | https://www.surgehq.ai/ |
| 160 | Charlene de Carvalho-Heineken & family | Heineken N.V. | Investor relations | Family controlling-shareholder route | verified_public_institutional | https://www.theheinekencompany.com/investors |
| 161 | Eric Smidt | Harbor Freight / Smidt-linked philanthropy | Corporate / philanthropic route | Founder/owner institutional route | verified_public_institutional | https://www.harborfreight.com/ |
| 162 | John Collison | Stripe | Corporate / partnership route | President/co-founder company route | verified_public_institutional | https://stripe.com/contact |
| 163 | Patrick Collison | Stripe | Corporate / partnership route | CEO/co-founder company route | verified_public_institutional | https://stripe.com/contact |
| 164 | David Sun | Kingston Technology | Corporate contact | Co-founder institutional route | verified_public_institutional | https://www.kingston.com/en/company/contact |
| 165 | John Tu | Kingston Technology | Corporate contact | Shared co-founder company route | verified_public_institutional | https://www.kingston.com/en/company/contact |
| 166 | Brad Jacobs | QXO | Investor relations | Founder/chairman public-company route | verified_public_institutional | https://investors.qxo.com/ |
| 167 | Jan Koum | Koum Family Foundation | Formal foundation / postal route | No robust open public enquiry channel evidenced; preserve formal institutional record rather than guessing | verified_institutional_switchboard_or_postal | https://projects.propublica.org/nonprofits/ |
| 168 | Zhou Qunfei & family | Lens Technology | Investor relations | Company route evidenced; contact evidence should be freshness-checked before use | verified_institutional_source_age_warning | https://www.hnlens.com/ |
| 169 | Lu Xiangyang | BYD | Investor relations | Co-founder/shareholder company route | verified_public_institutional | https://www.bydglobal.com/ |
| 170 | Stephen Ross | Related Companies / Related Ross | Corporate contact | Founder/chair institutional route | verified_public_institutional | https://www.related.com/ |
| 171 | Arthur Dantchik | Susquehanna International Group | Institutional company route | Shared SIG route; not personal | verified_public_institutional | https://sig.com/ |
| 172 | Li Shuirong & family | Rongsheng Petrochemical | Investor relations | Family wealth-source company route | verified_public_institutional | https://www.cnrspc.com/ |
| 173 | Anders Holch Povlsen | BESTSELLER | Corporate contact | Owner/CEO private-company route | verified_public_institutional | https://bestseller.com/contact |
| 174 | Wang Wei | SF Holding | Investor relations / corporate route | Founder/chair wealth-source route | verified_public_institutional | https://www.sf-express.com/ |
| 175 | Mikhail Fridman | LetterOne historical affiliation | Compliance intelligence, not route | LetterOne says Fridman has no involvement/influence after sanctions; UK sanction remains. **Do not use LetterOne as a route to Fridman.** | legal_compliance_block | https://letterone.com/contact-us/ ; https://www.gov.uk/guidance/russia-list-of-designations-and-sanctions-notices |
| 176 | Enrique Razon Jr | ICTSI | Investor relations | Chairman/controlling-shareholder company route | verified_public_institutional | https://www.ictsi.com/investors |
| 177 | George Kaiser | George Kaiser Family Foundation | Foundation contact | Direct family philanthropy route | verified_public_institutional | https://www.gkff.org/ |
| 178 | Charles Ergen | EchoStar / DISH | Investor relations / corporate route | Founder/chair family company route | verified_public_institutional | https://ir.echostar.com/ |
| 179 | Peter Mallouk | Creative Planning | Corporate contact | President/CEO wealth-planning company route | verified_public_institutional | https://creativeplanning.com/contact/ |
| 180 | Johann Rupert & family | Richemont | Investor relations | Family controlling-shareholder / chairman route | verified_public_institutional | https://www.richemont.com/investors/ |
| 181 | Zhang Zhidong | Tencent | Investor relations | Founder/shareholder corporate route; contact evidence should be freshness-checked before use | verified_institutional_source_age_warning | https://www.tencent.com/en-us/investors.html |
| 182 | Harold Hamm & family | Continental Resources | Corporate contact | Founder/chair family energy-company route | verified_public_institutional | https://www.clr.com/ |
| 183 | Zou Zhinong & family | Suzhou TFC Optical Communication | Investor / listed-company route | Company link evidenced; public contact should be freshness-checked before use | verified_institutional_source_age_warning | https://www.tfcsz.com/ |
| 184 | Adam Foroughi | AppLovin | Investor relations | Founder/CEO public-company route | verified_public_institutional | https://investors.applovin.com/ |
| 185 | Radhakishan Damani | Avenue Supermarts (DMart) | Investor / company-secretary route | Founder/shareholder wealth-source route | verified_public_institutional | https://www.dmartindia.com/investor-relations |
| 186 | Friedhelm Loh | Friedhelm Loh Group | Corporate contact | Owner/chair industrial-group route | verified_public_institutional | https://www.friedhelm-loh-group.com/ |
| 187 | Peter Woo | Wheelock / Wharf group | Investor / corporate route | Family property-company route | verified_public_institutional | https://www.wharfholdings.com/ |
| 188 | Ray Dalio | Dalio Philanthropies | Foundation contact | Foundation publishes contact details but explicitly states it does **not accept unsolicited proposals or donation requests** | verified_institutional_restricted | https://www.daliophilanthropies.org/about/ |
| 189 | Wang Liping & family | Jiangsu Hengli Hydraulic | Corporate / shareholder route | Forbes and 2026 corporate-control evidence identify Wang as founder/chairman; company-level route | verified_public_institutional | https://www.henglihydraulics.com/ |
| 190 | Terry Gou | Hon Hai / Foxconn | Investor relations | Founder/shareholder electronics-company route | verified_public_institutional | https://www.honhai.com/en-us/investor-relations |
| 191 | Donald Newhouse | Advance Publications | Legacy institutional context | **Donald E. Newhouse died in 2026. Remove from active-person outreach; preserve organisation/family intelligence only.** | deceased_remove_from_active_outreach | https://www.advance.com/ |
| 192 | Hussain Sajwani | DAMAC Group / DAMAC Foundation | Corporate / foundation route | Founder/chair family-company and philanthropy route | verified_public_institutional | https://www.damacproperties.com/ ; https://damacfoundation.org/ |
| 193 | James Dyson | James Dyson Foundation | Foundation contact | Direct founder-family philanthropy route | verified_public_institutional | https://www.jamesdysonfoundation.com/ |
| 194 | Shahid Khan | Flex-N-Gate / Jaguars | Corporate route | Owner/founder company route | verified_public_institutional | https://www.flex-n-gate.com/ |
| 195 | Antonia Ax:son Johnson & family | Axel Johnson | Direct corporate / family investment route | Family-company institutional contact | verified_public_institutional | https://www.axeljohnson.se/ |
| 196 | Jaime Gilinski Bacal | GNB Sudameris | Banking / corporate route | Board/family banking route | verified_public_institutional | https://www.gnbsudameris.com.co/ |
| 197 | Ann Walton Kroenke | Audrey J. Walton & Ann Walton Kroenke Charitable Foundation / Kroenke family organisations | Foundation / family institutional route | Private foundation is selection-led; no open unsolicited-funding assumption | verified_institutional_restricted | https://projects.propublica.org/nonprofits/ |
| 198 | Xavier Niel & family | iliad | Investor relations | Founder/family-controlled telecom route | verified_public_institutional | https://www.iliad.fr/en/investors |
| 199 | Alisher Usmanov | Art, Science and Sport / historical USM-linked institutions | Institutional intelligence only | **Usmanov remains UK-sanctioned. Preserve route intelligence for ownership/network mapping; block outreach/transactions absent specialist sanctions clearance.** | legal_compliance_block | https://search-uk-sanctions-list.service.gov.uk/ |
| 200 | David Vélez & family | Nu Holdings / Nubank | Investor relations | Founder/global CEO public-company route | verified_public_institutional | https://investors.nu/ |

## High-value reusable route clusters

- Tether → Stuart Hoegner plus already-researched Tether-linked billionaire records.
- CATL → Huang Shilin plus Robin Zeng from Batch 001.
- Adani institutional routes → Vinod Adani plus Gautam Adani from Batch 001, with role-specific qualification.
- BYD → Wang Chuanfu and Lu Xiangyang.
- Bank Central Asia → R. Budi Hartono and Michael Hartono.
- ALDI SÜD → Karl Albrecht Jr and Beate Heister.
- Stripe → John Collison and Patrick Collison.
- Kingston Technology → David Sun and John Tu.
- Tencent → Zhang Zhidong plus Ma Huateng from Batch 001, with freshness check before use.
- Walton/Kroenke branch → Nancy Walton Laurie and Ann Walton Kroenke have distinct private foundations and should not automatically inherit Walton Family Foundation access rules.

## Critical data-quality corrections

1. **Donald Newhouse:** died in 2026. Keep the historic wealth/organisation record but remove him from active-person targeting.
2. **Gennady Timchenko, Andrey Melnichenko, Mikhail Fridman and Alisher Usmanov:** public institutions may exist around them, but UK sanctions/compliance controls override outreach. These rows are not outreachable simply because an email, IR desk or foundation exists.
3. **Mikhail Fridman / LetterOne:** LetterOne publicly states Fridman stepped down and has no involvement or influence. Therefore LetterOne is not to be misrepresented as a current path to him.
4. **Nancy Walton Laurie:** her foundation’s public filing indicates preselected charitable recipients / no unsolicited requests. The foundation is useful relationship intelligence, not an open grant door.
5. **Ray Dalio:** Dalio Philanthropies publishes a contact but explicitly rejects unsolicited proposals/donation requests. Keep both facts.
6. **Private-company routes:** Meriton, ABC Supply, Menards, Figure, BESTSELLER, INEOS and others remain legitimate institutional routes even without public-market IR.

## Import intent

When the production Liftor database becomes accessible, reconcile every row to `billionaire_id` and update/create the relevant access pathway with:

- `organisation_name`
- `source_url`
- `route_access_mode`
- `route_restriction_notes`
- `last_reviewed_at = 2026-08-23`
- verification state above
- `outreach_allowed = false`

For `legal_compliance_block` and `deceased_remove_from_active_outreach`, add a hard blocker at the person/coverage level so downstream campaign tools cannot select the record merely because an institutional route exists.

Do not overwrite stronger evidence. Do not delete older routes; supersede, downgrade or block them with dated review notes where necessary.
