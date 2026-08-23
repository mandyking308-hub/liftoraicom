# Billionaire Access Verification — Batch 011 (2026 Source Rows 1001–1100)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **1001–1100**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **68** `verified_public_institutional`
- **30** `verified_institutional_restricted`
- **1** `legal_compliance_block`
- **1** `enhanced_compliance_review`
- **100 / 100** documented route/status outcomes

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 1001 | Penny Pritzker | PSP Partners / Pritzker family investment route | `verified_public_institutional` |
| 1002 | Stewart Rahr | Rahr family philanthropy / private investment route | `verified_institutional_restricted` |
| 1003 | David Rubenstein | The Carlyle Group / Rubenstein family institutional route | `verified_public_institutional` |
| 1004 | Sukanto Tanoto | RGE / Tanoto Foundation | `verified_public_institutional` |
| 1005 | Byron Trott | BDT & MSD Partners institutional route | `verified_public_institutional` |
| 1006 | Patrizio Vinciarelli | Vicor Corporation investor relations | `verified_public_institutional` |
| 1007 | Wang Jianlin | Dalian Wanda Group corporate route | `verified_public_institutional` |
| 1008 | Xu Jinfu & family | Guangzhou Tinci Materials listed-company route | `verified_public_institutional` |
| 1009 | Yang Chang-Chih | Compeq Manufacturing investor/corporate route | `verified_public_institutional` |
| 1010 | Yeung Kin-man | Biel Crystal corporate route | `verified_public_institutional` |
| 1011 | Jose Joao Abdalla Filho | Banco Clássico / Brazilian listed-equity investment route | `verified_institutional_restricted` |
| 1012 | Giuliana Benetton | Edizione / Benetton family investment route | `verified_institutional_restricted` |
| 1013 | Luciano Benetton | Edizione / Benetton family investment route | `verified_institutional_restricted` |
| 1014 | Maurizio Billi | Eurofarma corporate route | `verified_public_institutional` |
| 1015 | Olivier Bouygues | Bouygues investor/corporate route | `verified_public_institutional` |
| 1016 | Nikolai Buinov | Irkutsk Oil Company network — intelligence only | `legal_compliance_block` |
| 1017 | Hubert Burda | Hubert Burda Media corporate route | `verified_public_institutional` |
| 1018 | John Caudwell | Caudwell family investment/philanthropic route | `verified_institutional_restricted` |
| 1019 | Mahendra Choksi & family | Asian Paints family-shareholder route | `verified_institutional_restricted` |
| 1020 | William Conway Jr. | The Carlyle Group institutional route | `verified_public_institutional` |
| 1021 | Jim Coulter | TPG investor/corporate route | `verified_public_institutional` |
| 1022 | Yakir Gabay | Aroundtown investor/shareholder route | `verified_public_institutional` |
| 1023 | Vinod Rai Gupta | Havells India family-shareholder route | `verified_institutional_restricted` |
| 1024 | Ji Qi | H World Group investor/corporate route | `verified_public_institutional` |
| 1025 | Robert Johnson & family | New York Jets / Johnson family institutional route | `verified_public_institutional` |
| 1026 | Samuel Tak Lee | Tak Lee family private real-estate office | `verified_institutional_restricted` |
| 1027 | Lin Jianhua | Hangzhou First Applied Material listed-company route | `verified_public_institutional` |
| 1028 | David MacNeil | WeatherTech corporate route | `verified_public_institutional` |
| 1029 | Willy Michel | Ypsomed investor/family route | `verified_public_institutional` |
| 1030 | Aristotelis Mistakidis | Glencore historical asset / private investment route | `verified_institutional_restricted` |
| 1031 | Nguyen Thi Phuong Thao | VietJet investor/corporate route | `verified_public_institutional` |
| 1032 | Daniel Och | Willoughby Capital / private investment route | `verified_institutional_restricted` |
| 1033 | Dan Olsson | Stena Group corporate route | `verified_public_institutional` |
| 1034 | Ravi Pillai | RP Group corporate route | `verified_public_institutional` |
| 1035 | Mitchell Rales | Danaher/Enovis shareholder route and Glenstone Foundation | `verified_public_institutional` |
| 1036 | Rodger Riney & family | Riney family philanthropy / former Scottrade asset route | `verified_institutional_restricted` |
| 1037 | Klaus-Peter Schulenberg | CTS Eventim investor/corporate route | `verified_public_institutional` |
| 1038 | Richard Schulze | Best Buy founder/chair-emeritus / Schulze Family Foundation | `verified_institutional_restricted` |
| 1039 | Shi Yuzhu | Giant Network listed-company route | `verified_public_institutional` |
| 1040 | Alberto Siccardi & family | Medacta Group investor/corporate route | `verified_public_institutional` |
| 1041 | Takahisa Takahara | Unicharm investor/corporate route | `verified_public_institutional` |
| 1042 | Ivar Tollefsen | Fredensborg / Heimstaden institutional route | `verified_public_institutional` |
| 1043 | Xiang Guangda | Tsingshan Holding Group corporate route | `verified_public_institutional` |
| 1044 | Kumud Bajaj | Bajaj family holding-company route | `verified_institutional_restricted` |
| 1045 | Niraj Bajaj | Bajaj Group / Bajaj Auto institutional route | `verified_public_institutional` |
| 1046 | Shekhar Bajaj | Bajaj family corporate route | `verified_public_institutional` |
| 1047 | Todd Christopher | Vogue International historical asset after sale / private route | `verified_institutional_restricted` |
| 1048 | Sol Daurella | Coca-Cola Europacific Partners investor/board route | `verified_public_institutional` |
| 1049 | Dong Zengping | Sieyuan Electric listed-company investor route | `verified_public_institutional` |
| 1050 | Paul Gauselmann & family | MERKUR Group corporate route | `verified_public_institutional` |
| 1051 | Otto Happel | Private investment office / former GEA asset route | `verified_institutional_restricted` |
| 1052 | Stewart Horejsi & family | Berkshire Hathaway financial-asset / private foundation route | `verified_institutional_restricted` |
| 1053 | Hu Rongda & family | Zhejiang Sanmei Chemical Industry investor route | `verified_public_institutional` |
| 1054 | Samvel Karapetyan | Tashir Group network; sanctions/current political-legal exposure outside UK | `enhanced_compliance_review` |
| 1055 | Angelo Koo | CTBC Financial / Koo family institutional route | `verified_public_institutional` |
| 1056 | Kuok Khoon Hong | Wilmar International investor/corporate route | `verified_public_institutional` |
| 1057 | Lam Wai-ying | Biel Crystal family corporate route | `verified_public_institutional` |
| 1058 | Pablo Legorreta | Royalty Pharma investor/corporate route | `verified_public_institutional` |
| 1059 | Li Xiang | Li Auto investor relations | `verified_public_institutional` |
| 1060 | Joao Roberto Marinho | Grupo Globo corporate route | `verified_public_institutional` |
| 1061 | Jose Roberto Marinho | Grupo Globo corporate route | `verified_public_institutional` |
| 1062 | Harsh Mariwala | Marico investor/corporate route | `verified_public_institutional` |
| 1063 | N.R. Narayana Murthy | Infosys founder/family institutional route | `verified_institutional_restricted` |
| 1064 | Bob Parsons | YAM Worldwide / Bob & Renee Parsons Foundation | `verified_public_institutional` |
| 1065 | Qian Dongqi | Ecovacs Robotics investor/corporate route | `verified_public_institutional` |
| 1066 | Roger Samuelsson | SHL Medical corporate route | `verified_public_institutional` |
| 1067 | Pat Stryker | Bohemian Foundation / family philanthropy route | `verified_institutional_restricted` |
| 1068 | Tung Chee Chen | Orient Overseas International / OOCL investor route | `verified_public_institutional` |
| 1069 | Herbert Wertheim | Wertheim family investment/philanthropic route | `verified_institutional_restricted` |
| 1070 | Paul-Heinz Wesjohann & family | PHW Group corporate route | `verified_public_institutional` |
| 1071 | Xia Zuoquan | BYD financial-asset / Zhengxuan Investment route | `verified_institutional_restricted` |
| 1072 | Charles Zegar | Bloomberg LP private-company route | `verified_institutional_restricted` |
| 1073 | Zhang Wanzhen | Chaozhou Three-Circle Group listed-company founder/shareholder route | `verified_public_institutional` |
| 1074 | Neal Aronson | Roark Capital institutional route | `verified_public_institutional` |
| 1075 | David Blitzer | Blackstone / Harris Blitzer Sports & Entertainment route | `verified_public_institutional` |
| 1076 | Norman Braman | Braman Motorcars / family philanthropy route | `verified_public_institutional` |
| 1077 | Otto Philipp Braun | B. Braun family corporate route | `verified_institutional_restricted` |
| 1078 | Chan Laiwa & family | Fu Wah International Group corporate route | `verified_public_institutional` |
| 1079 | Chan Tan Ching-fen | Family real-estate / formal institutional route | `verified_institutional_restricted` |
| 1080 | Albert Chao & family | Westlake Corporation investor/corporate route | `verified_public_institutional` |
| 1081 | James Chao & family | Westlake Corporation investor/corporate route | `verified_public_institutional` |
| 1082 | Dorothy Chao Jenkins & family | Westlake family-shareholder route | `verified_institutional_restricted` |
| 1083 | Catharina Claas-Muhlhauser | CLAAS Group corporate route | `verified_public_institutional` |
| 1084 | Kommer Damen | Damen Shipyards Group corporate route | `verified_public_institutional` |
| 1085 | Kenneth Dart | Dart Enterprises private investment route | `verified_institutional_restricted` |
| 1086 | Jim Davis | Allegis Group corporate route | `verified_public_institutional` |
| 1087 | Edward DeBartolo Jr. | DeBartolo Holdings / family sports-real-estate route | `verified_public_institutional` |
| 1088 | Norbert Dentressangle & family | Dentressangle family investment office | `verified_institutional_restricted` |
| 1089 | Reinold Geiger | L'Occitane Group corporate route | `verified_public_institutional` |
| 1090 | April Goh | Nippon Paint family financial-asset route | `verified_institutional_restricted` |
| 1091 | Geoffrey Kwok | Sun Hung Kai Properties family-shareholder route | `verified_institutional_restricted` |
| 1092 | Jonathan Kwok | Sun Hung Kai Properties family-shareholder route | `verified_institutional_restricted` |
| 1093 | Louis Le Duff | Groupe Le Duff corporate route | `verified_public_institutional` |
| 1094 | Lee Yeow Seng | IOI Properties Group investor/corporate route | `verified_public_institutional` |
| 1095 | Jack Link & family | Jack Link's corporate route | `verified_public_institutional` |
| 1096 | Marc Lore | Wonder Group corporate route | `verified_public_institutional` |
| 1097 | Anand Mahindra | Mahindra Group corporate/investor route | `verified_public_institutional` |
| 1098 | Mohamed Mansour | Mansour Group corporate / Man Capital route | `verified_public_institutional` |
| 1099 | David Nahmad | Nahmad family art business / formal gallery route | `verified_institutional_restricted` |
| 1100 | Kentaro Ogawa | Zensho Holdings investor/corporate route | `verified_public_institutional` |

## Critical current-role / compliance notes

- **Nikolai Buinov:** current UK sanctions/disqualification record identifies UK Sanctions List reference **RUS2408**. Irkutsk Oil Company links remain network intelligence only; hard-block downstream outreach.
- **Samvel Karapetyan:** sanctions exposure and current Armenian political/legal controversy warrant enhanced compliance review. This pass did not evidence a clean current UK designation equivalent to Buinov's, so do not fabricate one.
- **Marc Lore:** Forbes' source label still points to Jet.com, but Lore's current operating company is Wonder; current 2026 reporting identifies him as Wonder's founder/CEO. Use Wonder, not Jet.com, as the live operating route.
- **April Goh:** Forbes and Nippon Paint disclosures identify her wealth as a family financial-asset stake. Nippon Paint is an asset/shareholder route, not company-management access.
- **Yakir Gabay:** Aroundtown's May 2026 shareholder disclosure continues to identify Avisco/Vergepoint as controlled by Gabay, supporting a current public-company institutional route.
- **Dong Zengping:** 2026 exchange materials identify him as chairman/general manager of Sieyuan Electric, supporting a current listed-company route.
- **Hu Rongda:** current Forbes profile identifies him as founder of listed Zhejiang Sanmei Chemical Industry; use the public-company route.

## Reusable clusters

- Carlyle: David Rubenstein + William Conway Jr.
- Benetton/Edizione: Giuliana + Luciano Benetton.
- Bajaj: Kumud, Niraj and Shekhar Bajaj, plus earlier Bajaj-family records.
- Biel Crystal: Yeung Kin-man + Lam Wai-ying.
- Grupo Globo: Joao Roberto + Jose Roberto Marinho.
- Westlake: Albert Chao, James Chao and Dorothy Chao Jenkins.
- Sun Hung Kai Properties: Geoffrey + Jonathan Kwok, plus earlier family records.

## Import intent

Reconcile each row to `billionaire_id`, preserve stronger existing evidence, write route restrictions and review date, keep `outreach_allowed=false`, hard-exclude `legal_compliance_block`, and require fresh jurisdiction-specific screening for `enhanced_compliance_review`.