# Billionaire Access Verification — Batch 033 (2026 Source Rows 3201–3300)

**Reviewed:** 2026-08-24  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

This is a deterministic sweep of Forbes 2026 source rows **3201–3300**. Reconcile by `billionaire_id` before production import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **57** `verified_public_institutional`
- **24** `verified_institutional_restricted`
- **6** `verified_institutional_source_age_warning`
- **11** `enhanced_compliance_review`
- **2** `legal_compliance_block`
- **100 / 100** documented route/status outcomes

> “Verified” means an evidenced institutional or asset route exists. It does not imply personal delivery and does not authorise outreach.

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 3201 | Chen Ailian & family | Zhejiang Wanfeng Auto Wheel / Wanfeng Auto Holding chairman route | `verified_public_institutional` |
| 3202 | Chen Baozhen | Wangsu Science & Technology founder/shareholder asset route; substantial stake sales mean no current executive access assumed | `verified_institutional_restricted` |
| 3203 | Chen Huxiong | Shanghai M&G Stationery vice-chairman/president route | `verified_public_institutional` |
| 3204 | Chen Qingzhou & family | Hytera Communications founder/chairman corporate route | `verified_public_institutional` |
| 3205 | Eduard Chukhlebov | UMMC / Kirov Non-Ferrous Metal Processing Plant network — intelligence only; UK RUS2072 | `legal_compliance_block` |
| 3206 | Steve Conine | Wayfair cofounder/co-chairman / investor route | `verified_public_institutional` |
| 3207 | Luigi Cremonini & family | Cremonini Group / Inalca chairman family corporate route | `verified_public_institutional` |
| 3208 | Benoit Dageville | Snowflake cofounder/president-products institutional route | `verified_public_institutional` |
| 3209 | Andrea Della Valle | Tod’s family executive/private-company route | `verified_public_institutional` |
| 3210 | Ashwin Desai | Aether Industries founder/managing-director listed-company route | `verified_public_institutional` |
| 3211 | Diamantis Diamantides & family | Delta Tankers / Marmaras Navigation owner shipping route | `verified_public_institutional` |
| 3212 | Dou Zhenggang | Hangzhou Jinjiang Group chairman route | `verified_public_institutional` |
| 3213 | Ali Erdemoglu | Erdemoğlu Holding / family carpet-manufacturing route | `verified_public_institutional` |
| 3214 | Laurence Escalante | Virtual Gaming Worlds founder/CEO corporate route | `verified_public_institutional` |
| 3215 | Roger Federer | On Holding shareholder / Roger Federer Foundation asset-philanthropy route; not a personal corporate channel | `verified_institutional_restricted` |
| 3216 | Anton Fedun | Fedun family oil-and-gas/private-asset route; Russia-origin wealth and 2026 UK company-role changes require fresh screening | `enhanced_compliance_review` |
| 3217 | Ekaterina Fedun | Fedun family oil-and-gas/private-asset route; Russia-origin wealth requires fresh jurisdictional screening | `enhanced_compliance_review` |
| 3218 | Guillermo Fierro | Grupo Fierro private financial/investment group route | `verified_institutional_restricted` |
| 3219 | Per Franzén | EQT senior leadership/private-equity institutional route | `verified_public_institutional` |
| 3220 | Victor Fung | Fung Group / Li & Fung family corporate route | `verified_public_institutional` |
| 3221 | William Fung | Fung Group / Li & Fung family corporate route | `verified_public_institutional` |
| 3222 | Paritosh Garg | Happy Forgings founder/chairman listed-company route | `verified_public_institutional` |
| 3223 | Gyorgy Gattyan | Docler Holding founder/investment route | `verified_public_institutional` |
| 3224 | Jane Goldman | Solil Management / Goldman family real-estate route | `verified_institutional_restricted` |
| 3225 | Daniela Grogg | Grogg family pharmaceutical/private-asset route | `verified_institutional_restricted` |
| 3226 | Nicole Grogg-Hotzer & family | Grogg family pharmaceutical/private-asset route | `verified_institutional_restricted` |
| 3227 | Vildan Gulcelik | ENKA shareholder/family asset route; no executive access assumed | `verified_institutional_restricted` |
| 3228 | Rajinder Gupta | Trident founder/chairman-emeritus plus sitting Indian Rajya Sabha member; public-official gate required | `enhanced_compliance_review` |
| 3229 | Markus Hannebauer | think-cell cofounder/software corporate route | `verified_public_institutional` |
| 3230 | Fahed Hariri | Har Investment Fund / private family investment route | `verified_institutional_restricted` |
| 3231 | Orion Hindawi | Tanium cofounder/CEO enterprise-software route | `verified_public_institutional` |
| 3232 | Arthur Xiaobo Hong | Vipshop cofounder/shareholder / listed-company investor route | `verified_public_institutional` |
| 3233 | Hong Seok-joh | BGF / CU convenience-store family corporate route | `verified_public_institutional` |
| 3234 | Huang Qiaoling | Songcheng Group / Songcheng Performance Development founder route | `verified_public_institutional` |
| 3235 | Ryan Israel | Pershing Square Capital Management partner route | `verified_public_institutional` |
| 3236 | Subbamma Jasti | Jasti Family Trust / Cohance Lifesciences shareholding route; no operating role assumed | `verified_institutional_restricted` |
| 3237 | Laurent Junique | TDCX founder/chairman customer-experience company route | `verified_public_institutional` |
| 3238 | Sergey Kasyanenko & family | Russian tea/coffee operating-company route; fresh sanctions and jurisdiction screen required | `enhanced_compliance_review` |
| 3239 | Mehmet Kazanci | Kazancı Holding / Aksa group corporate route | `verified_public_institutional` |
| 3240 | Peter Kelly | Softcat founder/shareholder route; founder is no longer relied upon as current executive management | `verified_institutional_restricted` |
| 3241 | Aditya Khemka | Aditya Infotech / CP PLUS founder-managing-director route | `verified_public_institutional` |
| 3242 | Igor Kudryashkin | UMMC / Svyatogor network — intelligence only; UK RUS2059 | `legal_compliance_block` |
| 3243 | Carl-Anton Kunz | German plumbing/heating-supplies family ownership route | `verified_institutional_restricted` |
| 3244 | Walter Kurtz | German appliances family-asset route; exact current operating linkage needs use-time refresh | `verified_institutional_source_age_warning` |
| 3245 | Valery Kustov | EFKO founder/food-production route; Russian-origin exposure requires current jurisdictional screen | `enhanced_compliance_review` |
| 3246 | Hans Langer | EOS founder / industrial 3D-printing corporate route | `verified_public_institutional` |
| 3247 | Brian Lawson | Brookfield senior private-equity/investment institutional route | `verified_public_institutional` |
| 3248 | Lee Joon-ho | NHN / online-games founder-shareholder route | `verified_public_institutional` |
| 3249 | Lee Su-jin | Yanolja founder/chairman hospitality-technology route | `verified_public_institutional` |
| 3250 | Li Guoqiang | Zhongsheng Group cofounder/vice-chairman/CEO auto-retail route | `verified_public_institutional` |
| 3251 | Li Haizhou & family | Shenzhen machinery family-asset route; exact current listed-company linkage needs refresh | `verified_institutional_source_age_warning` |
| 3252 | Li San Yim | Lonking Holdings construction-equipment corporate/shareholder route | `verified_public_institutional` |
| 3253 | Lin Por-Shih | Taiwan Glass family industrial/shareholder route | `verified_public_institutional` |
| 3254 | James Litinsky | MP Materials chairman/CEO listed-company route | `verified_public_institutional` |
| 3255 | Liu Jianwei | Chinese electronic-control-systems asset route; current executive/company linkage needs refresh | `verified_institutional_source_age_warning` |
| 3256 | Christian Louboutin | Christian Louboutin company / brand institutional route | `verified_public_institutional` |
| 3257 | Lu Zhongfang | Education/automotive asset route; wealth-source-to-current-institution linkage is not sufficiently fresh | `verified_institutional_source_age_warning` |
| 3258 | Ma Xiuhui | Opple Lighting founder/executive family route | `verified_public_institutional` |
| 3259 | Simone Maag de Moura Cunha | Straumann/medical-device family shareholding route | `verified_institutional_restricted` |
| 3260 | Donald Mackenzie | CVC Capital Partners cofounder/private-equity legacy route; no current executive access assumed | `verified_institutional_restricted` |
| 3261 | Cyrus Madon | Brookfield private-equity / business-partners institutional route | `verified_public_institutional` |
| 3262 | Prayudh Mahagitsiri | PM Group / coffee-shipping family corporate route | `verified_public_institutional` |
| 3263 | Alexander Mikhalskiy | Sportmaster/Ostin cofounder route; Russian-origin network requires fresh jurisdictional screening | `enhanced_compliance_review` |
| 3264 | Eugene MIkhaylov | Russian agribusiness family route; no hard UK designation asserted, fresh screening required | `enhanced_compliance_review` |
| 3265 | Sergey Mikhaylov | Russian agribusiness family route; no hard UK designation asserted, fresh screening required | `enhanced_compliance_review` |
| 3266 | Dariusz Milek | CCC founder/chairman retail/real-estate route | `verified_public_institutional` |
| 3267 | Stuart Miller | Lennar executive-chairman/homebuilding route | `verified_public_institutional` |
| 3268 | Fulvio Montipò & family | Interpump Group founder/chairman industrial route | `verified_public_institutional` |
| 3269 | Bob Muglia | Former Snowflake CEO / current software-board-investment network; company wealth source is historical | `verified_institutional_restricted` |
| 3270 | Catharina Mühleis | STIHL family shareholder route | `verified_institutional_restricted` |
| 3271 | Ivan Müller Botelho | Energisa family power-generation/corporate route | `verified_public_institutional` |
| 3272 | Ong Leong Huat | Malaysian property/construction/financial-services family asset route | `verified_institutional_restricted` |
| 3273 | Niti Osathanugrah | Osotspa/energy-drink and investment family route | `verified_public_institutional` |
| 3274 | Kalpana Parekh | Pidilite family shareholding/adhesives asset route | `verified_institutional_restricted` |
| 3275 | Kevin Plank | Under Armour founder/CEO / investor route | `verified_public_institutional` |
| 3276 | Denise Prenosil | Dick’s Sporting Goods family-shareholder route | `verified_institutional_restricted` |
| 3277 | Quek Leng Chye | Hong Leong Singapore family diversified-asset route | `verified_institutional_restricted` |
| 3278 | Aidyn Rakhimbayev | BI Group founder/chairman real-estate/construction route | `verified_public_institutional` |
| 3279 | Alexander Rinke | Celonis cofounder/co-CEO enterprise-software route | `verified_public_institutional` |
| 3280 | Alan Rydge | Event Hospitality & Entertainment family asset route | `verified_institutional_restricted` |
| 3281 | K. Rai Sahi | Morguard founder/chairman/CEO real-estate route | `verified_public_institutional` |
| 3282 | Oliver Samwer | Rocket Internet / Global Founders Capital technology-investment route | `verified_public_institutional` |
| 3283 | Shyam Sankar | Palantir chief-technology/executive institutional route | `verified_public_institutional` |
| 3284 | Eddy Kusnadi Sariaatmadja | Emtek media/technology corporate route | `verified_public_institutional` |
| 3285 | Arno Schodl | think-cell cofounder/software route | `verified_public_institutional` |
| 3286 | Antonio Luiz Seabra | Natura founder/family shareholding route; no current operating role assumed | `verified_institutional_restricted` |
| 3287 | Jerry Seinfeld | Entertainment representation/production/philanthropic route; no broad corporate inbox represented as personal access | `verified_institutional_restricted` |
| 3288 | Weijian Shan | PAG executive-chairman/private-equity route | `verified_public_institutional` |
| 3289 | Vijay Shekhar Sharma | One97 Communications / Paytm founder-CEO route | `verified_public_institutional` |
| 3290 | Yuri Shefler | Stoli/SPI family spirits route; Russian-origin exposure and cross-border disputes require fresh compliance screening | `enhanced_compliance_review` |
| 3291 | Hua Shen | Semiconductor wealth route; exact current corporate linkage needs use-time verification | `verified_institutional_source_age_warning` |
| 3292 | Ben Silbermann | Pinterest cofounder/executive-chairman institutional route | `verified_public_institutional` |
| 3293 | Christian Sinding | EQT senior leadership/private-equity route | `verified_public_institutional` |
| 3294 | Anatoly Skurov | Russian coal/fertilizer asset route; fresh UK/EU/US sanctions screen required | `enhanced_compliance_review` |
| 3295 | Timothy Springer | Harvard Medical School / biotech-investment and Moderna-shareholder route; not a general solicitation channel | `verified_institutional_restricted` |
| 3296 | Zachary Stern | Private liquor-family asset route | `verified_institutional_restricted` |
| 3297 | Eddy Sugianto | Indonesian coal-company/shareholder route; exact current operating linkage should be refreshed before use | `verified_institutional_source_age_warning` |
| 3298 | Tony Tan Caktiong | Jollibee Foods founder/chairman corporate route | `verified_public_institutional` |
| 3299 | Prachak Tangkaravakoon | TOA Paint family corporate/shareholder route | `verified_public_institutional` |
| 3300 | Hary Tanoesoedibjo | MNC Group founder/executive plus political-party leadership; enhanced PEP/public-affairs review required | `enhanced_compliance_review` |

## Critical checks

- Eduard Chukhlebov is currently listed under UK sanctions reference RUS2072; UMMC/Kirov routes are intelligence only.
- Igor Kudryashkin is currently listed under UK sanctions reference RUS2059; UMMC/Svyatogor routes are intelligence only.
- Rajinder Gupta entered India’s Rajya Sabha in 2025 and remains a current public official in 2026, so Trident is not treated as an ordinary un-gated commercial route.
- Anton Fedun resigned his UK hotel directorships in March 2026; those historic company roles are not used as current access.
- Russian-origin records without evidenced UK designations are kept in enhanced review rather than falsely labelled sanctioned.
