# Billionaire Access Verification — Batch 032 (2026 Source Rows 3101–3200)

**Reviewed:** 2026-08-24  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **3101–3200**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **48** `verified_public_institutional`
- **31** `verified_institutional_restricted`
- **10** `verified_institutional_source_age_warning`
- **11** `enhanced_compliance_review`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institutional or asset route exists. It does not imply personal delivery and does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 3101 | John H. MacMillan IV, IV. | Cargill family-shareholder route | `verified_institutional_restricted` |
| 3102 | Sandra MacMillan | Cargill family-shareholder route | `verified_institutional_restricted` |
| 3103 | Kate MacMillan Reed | Cargill family-shareholder route | `verified_institutional_restricted` |
| 3104 | Alexander Mamut & family | Private investment/media asset network; Russia-linked and sanctioned in Canada/Ukraine, fresh UK/US/EU screen required | `enhanced_compliance_review` |
| 3105 | Bruce Mathieson | Mathieson family hotel/gaming investment route | `verified_institutional_restricted` |
| 3106 | Deepak Mehta | Deepak Nitrite family corporate/investor route | `verified_public_institutional` |
| 3107 | Jeffrey Michael & family | CorVel/data-management family corporate route | `verified_institutional_restricted` |
| 3108 | Oleg Misevra | Russian coal/energy investment route; no hard designation asserted, jurisdiction-specific screening required | `enhanced_compliance_review` |
| 3109 | Nikita Mishin | Former Globaltrans/ports asset route; non-UK sanctions exposure and Russian-origin network require fresh screening | `enhanced_compliance_review` |
| 3110 | Pat Neal | Neal Communities founder/chairman homebuilding route | `verified_public_institutional` |
| 3111 | Ngo Chi Dung | VPBank chairman / banking route | `verified_public_institutional` |
| 3112 | Nguyen Dang Quang | Masan Group chairman / consumer-banking route | `verified_public_institutional` |
| 3113 | Konstantin Nikolaev | Former Globaltrans/ports route; current EU sanctions exposure requires compliance review and fresh UK screening | `enhanced_compliance_review` |
| 3114 | Bastian Nominacher | Celonis cofounder/co-CEO institutional route | `verified_public_institutional` |
| 3115 | Vadim Novinsky | Smart Holding/steel asset route; Ukraine sanctions and political/religious exposure require review | `enhanced_compliance_review` |
| 3116 | Boris Nuraliev | 1C Company founder/director software route | `verified_public_institutional` |
| 3117 | Vitaly Orlov | Norebo owner/fishing route; Norebo EU/Norway sanctions exposure requires enhanced review | `enhanced_compliance_review` |
| 3118 | Benjamin Zhengmin Pan & family | AAC Technologies cofounder/CEO / listed-company route | `verified_public_institutional` |
| 3119 | Pan Shiyi | SOHO China founder/shareholder route; no current executive role relied upon | `verified_institutional_restricted` |
| 3120 | Anne Pedrero | Cargill family-shareholder route | `verified_institutional_restricted` |
| 3121 | Aluru Jagadish Prasad | Amara Raja family battery-business route | `verified_institutional_restricted` |
| 3122 | Qi Xiangdong | Qi-Anxin Technology chairman / cybersecurity route | `verified_public_institutional` |
| 3123 | Qiao Zhiyong | Sichuan Qiaoyuan Gas chairman / listed-company route | `verified_public_institutional` |
| 3124 | Michael Rees | Blue Owl Capital co-president/institutional route | `verified_public_institutional` |
| 3125 | Chad Richison | Paycom founder/chairman/CEO route | `verified_public_institutional` |
| 3126 | Hartley Rogers | Hamilton Lane executive/institutional asset-management route | `verified_public_institutional` |
| 3127 | J.K. Rowling | Literary-rights / publisher-agent institutional route | `verified_institutional_restricted` |
| 3128 | Thomas Sandell | Sandell Asset Management/private-investment route | `verified_institutional_restricted` |
| 3129 | Steven Schuurman | Elastic cofounder/board member / listed-company route | `verified_public_institutional` |
| 3130 | Arnold Schwarzenegger | Entertainment/investment professional route; former public official | `verified_institutional_restricted` |
| 3131 | Niraj Shah | Wayfair cofounder/CEO / listed-company route | `verified_public_institutional` |
| 3132 | Sanjeev Shah | Everest Food Products chairman / corporate route | `verified_public_institutional` |
| 3133 | Shin Dong-joo | Lotte family-shareholder / private-investment route | `verified_institutional_restricted` |
| 3134 | Maxim Shubarev | Setl Group real-estate route; Russia-based fresh sanctions screening required | `enhanced_compliance_review` |
| 3135 | Scott Smith | Cloud-computing/private technology investment route; exact current operating entity requires freshness check | `verified_institutional_source_age_warning` |
| 3136 | Jeff Sprecher | Intercontinental Exchange chairman/CEO / listed-company route | `verified_public_institutional` |
| 3137 | Bruce Springsteen | Music-rights / professional-management route | `verified_institutional_restricted` |
| 3138 | Marco Squinzi | Mapei family corporate/governance route | `verified_public_institutional` |
| 3139 | Veronica Squinzi | Mapei family corporate/governance route | `verified_public_institutional` |
| 3140 | Derek Stevens | Circa Resorts & Casino / casino-hospitality corporate route | `verified_public_institutional` |
| 3141 | Manny Stul | Moose Toys / family corporate route | `verified_public_institutional` |
| 3142 | Sun Hongjun | Shanghai Awinic Technology chairman / listed-company route | `verified_public_institutional` |
| 3143 | Leyla Tara Suyabatmaz | ENKA family-shareholder route | `verified_institutional_restricted` |
| 3144 | Sam Tarascio | Salta Properties founder/chairman real-estate route | `verified_public_institutional` |
| 3145 | Winai Teawsomboonkij | Thai food-company ownership route; current person-specific operating role needs confirmation | `verified_institutional_source_age_warning` |
| 3146 | Maxim Tebar | Stihl family-shareholder route | `verified_institutional_restricted` |
| 3147 | Marciano Testa | Agibank founder / 2026 listed-fintech route | `verified_public_institutional` |
| 3148 | Nutchamai Thanombooncharoen | Carabao Group cofounder/major-shareholder route | `verified_public_institutional` |
| 3149 | Gary Tharaldson | Tharaldson Hospitality founder/private hotel route | `verified_public_institutional` |
| 3150 | Clemens Toennies | Tönnies Group family-owner/corporate route | `verified_public_institutional` |
| 3151 | Robert Toennies | Tönnies family-shareholder route | `verified_institutional_restricted` |
| 3152 | Mustafa Latif Topbas | BİM / family retail-investment route | `verified_institutional_restricted` |
| 3153 | Tony Townley | Zaxby's cofounder/investment route | `verified_institutional_restricted` |
| 3154 | James Truchard | National Instruments founder legacy; company acquired by Emerson in 2023 | `verified_institutional_source_age_warning` |
| 3155 | Phillippe Van de Vyvere | Sea-Invest family shipping-terminal corporate route | `verified_public_institutional` |
| 3156 | Bart van Malderen | Drylock Technologies founder/CEO corporate route | `verified_public_institutional` |
| 3157 | Andrii Verevskyi | Kernel Holding founder/chairman; former Ukrainian MP/PEP history | `enhanced_compliance_review` |
| 3158 | Shigefumi Wada | Obic family software-company route | `verified_public_institutional` |
| 3159 | Wang Xiancheng | JCHX Mining Management vice-chairman / listed-company route | `verified_public_institutional` |
| 3160 | Wang Zelong | Titanium-dioxide/chemical-company shareholder route | `verified_institutional_restricted` |
| 3161 | Wen Pengcheng & family | Wens Foodstuffs family/shareholder route | `verified_institutional_restricted` |
| 3162 | Myron Wentz | USANA founder/board/shareholder route | `verified_institutional_restricted` |
| 3163 | Nicholas Woodman | GoPro founder/CEO/chairman / listed-company route | `verified_public_institutional` |
| 3164 | Xie Juhua & family | Chinese pharmaceutical family/shareholder route; current operating role needs confirmation | `verified_institutional_source_age_warning` |
| 3165 | Xie Yi | Suzhou thermal-products company founder/owner route | `verified_public_institutional` |
| 3166 | Xiu Laigui | Xiuzheng Pharmaceutical founder/chairman route | `verified_public_institutional` |
| 3167 | Xu Jiangnan | Vitamin/pharmaceutical manufacturing family route | `verified_public_institutional` |
| 3168 | Xu Shijun & family | Nantong manufacturing family corporate route | `verified_institutional_restricted` |
| 3169 | Xu Wanmao | Ningbo education-investment route | `verified_institutional_restricted` |
| 3170 | Yang Xuegang | China Risun Group chairman/coking route | `verified_public_institutional` |
| 3171 | Zan Shengda | Zongyi Group diversified corporate route | `verified_public_institutional` |
| 3172 | Yasemin Zeynep Keyman | ENKA/Tara family construction-shareholder route | `verified_institutional_restricted` |
| 3173 | Zhang Chuanwei & family | Ming Yang Smart Energy chairman / listed-company route | `verified_public_institutional` |
| 3174 | Zhang Feng & family | Zhejiang XCC Group chairman / listed-company route | `verified_public_institutional` |
| 3175 | Zhang Hongwei | United Energy/Orient Group founder asset route; former chairman status requires freshness check | `verified_institutional_source_age_warning` |
| 3176 | Zhang Jianhui | Beijing HyperStrong Technology chairman/CEO / listed-company route | `verified_public_institutional` |
| 3177 | Zhang Keqiang | Poly Developments/Qinghai Salt Lake shareholder route; historic bribery conviction | `enhanced_compliance_review` |
| 3178 | Zhang Xin | SOHO China cofounder/shareholder route; former executive role | `verified_institutional_source_age_warning` |
| 3179 | Zhao Mantang | Shengda Resources largest-shareholder route; son is chairman | `verified_institutional_restricted` |
| 3180 | Zheng Wei | Haisco Pharmaceutical substantial-shareholder route; stepped down in 2024 | `verified_institutional_source_age_warning` |
| 3181 | Zheng Xiaodong | Shanghai manufacturing/private-company route; current role requires freshness confirmation | `verified_institutional_source_age_warning` |
| 3182 | Kostyantin Zhevago | Ferrexpo controlling-shareholder route; ongoing Ukrainian legal/reputational proceedings | `enhanced_compliance_review` |
| 3183 | Zhou Liangzhang & family | Hangzhou electrical-equipment family corporate route | `verified_public_institutional` |
| 3184 | Zhu Weisong | Shanghai online-games/toys corporate route | `verified_public_institutional` |
| 3185 | Craig Abod | Carahsoft founder/CEO public-sector IT route | `verified_public_institutional` |
| 3186 | Joe Agresti | Dream Motor Group / auto-dealership investment route | `verified_public_institutional` |
| 3187 | Giannis Alafouzos & family | Shipping / Panathinaikos institutional route | `verified_institutional_restricted` |
| 3188 | Christian Angermayer | Apeiron Investment Group founder route | `verified_public_institutional` |
| 3189 | Silvana Armani | Giorgio Armani family/executive ownership route | `verified_public_institutional` |
| 3190 | Takaya Awata | Toridoll Holdings founder/CEO / listed-company route | `verified_public_institutional` |
| 3191 | Petr Bely | Russian pharmacy/healthcare asset route; fresh sanctions and entity verification required | `enhanced_compliance_review` |
| 3192 | Leone Benetton | Edizione/Benetton family-investment route | `verified_institutional_restricted` |
| 3193 | Abigail Bennett | Brown-Forman family-shareholder route | `verified_institutional_restricted` |
| 3194 | Rafal Brzoska | InPost founder/CEO / listed-company route | `verified_public_institutional` |
| 3195 | Cai Hongbin | Lianyungang pharmaceutical-company shareholder route; exact current role needs confirmation | `verified_institutional_source_age_warning` |
| 3196 | Caspar Callerström | EQT/private-equity financial-services route | `verified_public_institutional` |
| 3197 | James Cameron | Lightstorm Entertainment / film-production professional route | `verified_institutional_restricted` |
| 3198 | Christian Chabot | Tableau founder legacy; Salesforce acquisition makes old company route stale | `verified_institutional_source_age_warning` |
| 3199 | Chang Hyung-Jin | Young Poong Group family metals route | `verified_institutional_restricted` |
| 3200 | Chang Kuo-Cheng | Evergreen/transportation family-shareholder route | `verified_institutional_restricted` |

## Critical evidence / quality notes

1. **Alexander Mamut:** a current sanctions aggregation shows Canadian and Ukrainian sanctions exposure, while a 2025 US/UK/EU sanctions guide records no US/UK/EU asset-freeze listing. Keep as enhanced compliance rather than inventing a UK block.
2. **Nikita Mishin:** Forbes 2026 says his Globaltrans/port holdings are historical and that he is UK-resident with dual citizenship. Sanctions evidence is jurisdiction-dependent; use enhanced review, not a guessed hard UK block.
3. **Konstantin Nikolaev:** current evidence shows EU sanctions exposure. Do not automatically translate that into a UK designation; require fresh UK screening before any activity.
4. **Vadim Novinsky:** Ukraine sanctions/asset-seizure exposure is documented. Treat Smart Holding/steel as ownership intelligence and require enhanced review.
5. **Vitaly Orlov:** Norebo was added to EU sanctions in 2025 and faced Norwegian restrictions. This is an entity/network compliance issue; fresh person/entity screening is required.
6. **Benjamin Zhengmin Pan:** AAC Technologies' 2025 annual report and 2026 HKEX filings confirm he remains executive director and CEO.
7. **Steven Schuurman:** Forbes 2026 says he remains on Elastic's board after serving as CEO from 2012–2017.
8. **Sun Hongjun:** Forbes 2026 identifies him as chairman of Shanghai Awinic Technology.
9. **Marciano Testa:** Agibank completed a US IPO in February 2026; Reuters identifies Testa as its founder, making the listed fintech a strong current route.
10. **Nutchamai Thanombooncharoen:** current 2026 Carabao materials identify her as a cofounder and major shareholder.
11. **Wang Xiancheng:** Forbes 2026 identifies him as vice-chairman of JCHX Mining Management; his son chairs the listed company.
12. **Zhang Feng:** Forbes 2026 identifies him as chairman of Zhejiang XCC Group.
13. **Zhang Hongwei:** Forbes 2026 calls him the former chairman of United Energy Group; retain a freshness warning rather than presenting him as current management.
14. **Zhang Jianhui:** Forbes 2026 identifies him as chairman and CEO of Beijing HyperStrong Technology, public since January 2025.
15. **Zhang Keqiang:** Poly Developments/Qinghai Salt Lake are asset routes. Historic bribery conviction means any future campaign should pass enhanced reputational review.
16. **Zhao Mantang:** Forbes 2026 identifies him as Shengda Resources' largest shareholder; his son Zhao Qing is chairman. This is a shareholder route, not an executive route.
17. **Zheng Wei:** Forbes 2026 says he stepped down from Haisco Pharmaceutical in 2024 but remains a substantial shareholder.
18. **Kostyantin Zhevago:** Ferrexpo continues to identify him as controlling shareholder while Ukrainian legal proceedings remain material; keep behind enhanced review.

## Import intent

When production Liftor access is restored, reconcile each row to `billionaire_id` and update/create the route with `organisation_name`, `source_url`, `route_access_mode`, `route_restriction_notes`, `last_reviewed_at = 2026-08-24`, the verification state above and `outreach_allowed = false`.

For `enhanced_compliance_review`, require fresh sanctions/PEP/reputational screening before campaign selection. For `verified_institutional_source_age_warning`, recheck the exact current organisation/role before use. Do not overwrite stronger person-specific evidence already present in Liftor.