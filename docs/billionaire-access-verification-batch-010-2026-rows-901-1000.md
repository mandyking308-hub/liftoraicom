# Billionaire Access Verification — Batch 010 (2026 Source Rows 901–1000)

**Reviewed:** 2026-08-23  
**Batch size:** 100  
**Purpose:** External public-source verification of legitimate institutional access routes.

The production Liftor Supabase project is not queryable from this connected session, so this is a deterministic sweep of Forbes 2026 source rows **901–1000**. Reconcile by `billionaire_id` before import. No private contact details were guessed. `outreach_allowed` remains `false` for every row.

## Result

- **68** `verified_public_institutional`
- **28** `verified_institutional_restricted`
- **2** `verified_institutional_source_age_warning`
- **1** `verified_institutional_switchboard_or_postal`
- **1** `enhanced_compliance_review`
- **100 / 100** documented route/status outcomes

| Row | Billionaire | Institutional route | Status |
|---:|---|---|---|
| 901 | Joe Mansueto | Morningstar investor/corporate route | `verified_public_institutional` |
| 902 | Winifred J. Marquart | SC Johnson family corporate route | `verified_institutional_restricted` |
| 903 | Gail Miller & family | Larry H. Miller Company / Miller family philanthropy | `verified_public_institutional` |
| 904 | Henning Oldendorff | Oldendorff Carriers corporate route | `verified_public_institutional` |
| 905 | Miuccia Prada | Prada Group investor relations | `verified_public_institutional` |
| 906 | Wang Yanqing | Wuxi Lead Intelligent Equipment investor/corporate route | `verified_public_institutional` |
| 907 | Hans Peter Wild | Capri-Sun / Wild Group corporate route | `verified_public_institutional` |
| 908 | Wendy Abrams | Medline investor relations / family asset route | `verified_institutional_restricted` |
| 909 | George Bishop | GeoSouthern Energy corporate route | `verified_public_institutional` |
| 910 | Ben Chestnut | Mailchimp/Intuit historical asset route after sale | `verified_institutional_restricted` |
| 911 | Beatriz Davila de Santo Domingo | AB InBev / Santo Domingo family financial-asset route | `verified_institutional_restricted` |
| 912 | N. Murray Edwards | Canadian Natural Resources investor relations | `verified_public_institutional` |
| 913 | Fang Wei | Liaoning Fangda Group corporate route | `verified_public_institutional` |
| 914 | Somurai Jaruphnit | CP Group / CPF family-shareholder route | `verified_institutional_restricted` |
| 915 | Jason Jiang | Focus Media listed-company route | `verified_public_institutional` |
| 916 | Rupert Johnson Jr. | Franklin Resources investor relations | `verified_public_institutional` |
| 917 | Egor Kulkov | Pharmstandard / CMR Surgical institutional asset route | `verified_institutional_restricted` |
| 918 | Li Min | Rockchip Electronics investor/corporate route | `verified_public_institutional` |
| 919 | Liang Zhaoxian | Galanz Group corporate route | `verified_public_institutional` |
| 920 | Niels Peter Louis-Hansen | Coloplast investor/shareholder route | `verified_public_institutional` |
| 921 | Drayton McLane Jr. | McLane Group / family institutional route | `verified_public_institutional` |
| 922 | Erwin Franz Mueller | Müller retail corporate route | `verified_public_institutional` |
| 923 | Vikas Oberoi | Oberoi Realty investor relations | `verified_public_institutional` |
| 924 | Fatih Ozmen | Sierra Nevada Corporation corporate route | `verified_public_institutional` |
| 925 | George Prokopiou & family | Dynacom / Sea Traders shipping route | `verified_public_institutional` |
| 926 | Leonid Radvinsky | Fenix International / OnlyFans corporate route | `verified_institutional_restricted` |
| 927 | Ugur Sahin | BioNTech investor relations | `verified_public_institutional` |
| 928 | Roberto Sallouti | BTG Pactual institutional / investor route | `verified_public_institutional` |
| 929 | Dan Snyder | Snyder family private investment route after Commanders sale | `verified_institutional_restricted` |
| 930 | Steven Udvar-Hazy | Former Air Lease founder/chairman; Air Lease acquired/renamed Sumisho Air Lease in April 2026 — relationship requires fresh mapping | `verified_institutional_source_age_warning` |
| 931 | Richard White | WiseTech investor relations / founder-executive-director route; July 2026 role change | `verified_institutional_source_age_warning` |
| 932 | Hansjoerg Wyss | Wyss Foundation / Wyss institutional philanthropy | `verified_institutional_restricted` |
| 933 | Michael Xie | Fortinet investor relations | `verified_public_institutional` |
| 934 | Anil Agarwal & family | Vedanta investor relations | `verified_public_institutional` |
| 935 | Andrej Babis | Government of the Czech Republic / Prime Minister's Office | `enhanced_compliance_review` |
| 936 | Cai Kui | Longfor family financial-asset/cofounder route | `verified_institutional_restricted` |
| 937 | Eleanor Butt Crook & family | H-E-B family corporate route | `verified_institutional_restricted` |
| 938 | David Filo | Yahoo historical asset / private philanthropic-investment route | `verified_institutional_restricted` |
| 939 | Abhay Firodia | Force Motors / Firodia group investor/corporate route | `verified_public_institutional` |
| 940 | John Gandel | Gandel Group private investment route | `verified_institutional_restricted` |
| 941 | Adi Godrej | Godrej family asset / Godrej Industries route; retired from active chair role | `verified_institutional_restricted` |
| 942 | Nadir Godrej | Godrej Industries current corporate route | `verified_public_institutional` |
| 943 | Carlos Hank Rhon & family | Grupo Hermes / Banorte family institutional route | `verified_public_institutional` |
| 944 | Hsieh Wen-Ta | Hon. Precision investor/corporate route | `verified_public_institutional` |
| 945 | Jiang Weiping & family | Tianqi Lithium investor relations | `verified_public_institutional` |
| 946 | Marc Ladreit de Lacharriere | Fimalac corporate/investment route | `verified_public_institutional` |
| 947 | Lee Yeow Chor | IOI Corporation investor relations | `verified_public_institutional` |
| 948 | Li Chunan | LONGi Green Energy investor/shareholder route | `verified_public_institutional` |
| 949 | Song Zuowen | Nanshan Group corporate route | `verified_public_institutional` |
| 950 | Friede Springer | Axel Springer family-shareholder route | `verified_institutional_restricted` |
| 951 | Eric Sprott | Sprott Inc / family investment asset route | `verified_institutional_restricted` |
| 952 | Vlad Tenev | Robinhood investor relations | `verified_public_institutional` |
| 953 | Eric Yuan & family | Zoom investor relations | `verified_public_institutional` |
| 954 | Abdulla bin Ahmad Al Ghurair & family | Al Ghurair Investment corporate route | `verified_public_institutional` |
| 955 | Anne Beaufour | Ipsen family-shareholder route | `verified_institutional_restricted` |
| 956 | Baiju Bhatt | Robinhood investor/shareholder route | `verified_public_institutional` |
| 957 | Du Jiangtao & family | Inner Mongolia Junzheng Energy/Chemical listed-company route | `verified_public_institutional` |
| 958 | James Duff | Duff Capital Investors / Southern Tire Mart | `verified_public_institutional` |
| 959 | Thomas Duff | Duff Capital Investors / Southern Tire Mart | `verified_public_institutional` |
| 960 | Carlo Fidani | Orlando Corporation corporate route | `verified_public_institutional` |
| 961 | Laurence Graff & family | Graff corporate route | `verified_public_institutional` |
| 962 | Pansy Ho | Shun Tak / MGM China institutional route | `verified_public_institutional` |
| 963 | Rajiv Jain | GQG Partners investor/corporate route | `verified_public_institutional` |
| 964 | Nirmal Minda | UNO Minda investor relations | `verified_public_institutional` |
| 965 | Fabien Pinckaers | Odoo corporate route | `verified_public_institutional` |
| 966 | Theodore Rachmat | Triputra Group corporate route | `verified_public_institutional` |
| 967 | Renzo Rosso & family | OTB Group corporate route | `verified_public_institutional` |
| 968 | Gil Shwed | Check Point investor/corporate route | `verified_public_institutional` |
| 969 | Alexandre Van Damme | AB InBev family financial-asset route | `verified_institutional_restricted` |
| 970 | Anna Katharina Viessmann | Viessmann Generations / family investment structure | `verified_institutional_restricted` |
| 971 | Zhang Jianzhong | Moore Threads listed-company investor route; company-level export-control caution | `verified_public_institutional` |
| 972 | David Baszucki | Roblox investor relations | `verified_public_institutional` |
| 973 | Angela Bennett | Wright Prospecting private mining-family route | `verified_institutional_restricted` |
| 974 | Han Arming Hanafia | DCI Indonesia investor relations | `verified_public_institutional` |
| 975 | Carl Icahn | Icahn Enterprises investor relations | `verified_public_institutional` |
| 976 | Andreas Martinos & family | Minerva Marine shipping corporate route | `verified_public_institutional` |
| 977 | Nancy Mills Barnett | Medline investor relations / family asset route | `verified_institutional_restricted` |
| 978 | Falguni Nayar | Nykaa / FSN E-Commerce investor relations | `verified_public_institutional` |
| 979 | Anthony Pritzker | Pritzker Private Capital / family investment office | `verified_institutional_restricted` |
| 980 | Phil Ruffin | Treasure Island / Ruffin corporate route | `verified_public_institutional` |
| 981 | Lynn Schusterman & family | Charles and Lynn Schusterman Family Philanthropies | `verified_institutional_restricted` |
| 982 | Donald Sterling | Sterling family private real-estate / formal-office route | `verified_institutional_switchboard_or_postal` |
| 983 | Gustav Magnar Witzoe | SalMar investor relations / family-shareholder route | `verified_public_institutional` |
| 984 | Sid Bass | Bass family private investment-office route | `verified_institutional_restricted` |
| 985 | Danielle Bellon & family | Sodexo family-shareholder route | `verified_institutional_restricted` |
| 986 | Martin Bouygues | Bouygues investor relations | `verified_public_institutional` |
| 987 | Chen Weiliang | MetaX Integrated Circuits listed-company route | `verified_public_institutional` |
| 988 | Miguel Fluxa Rossello | Iberostar Group corporate route | `verified_public_institutional` |
| 989 | Paul Foster | Franklin Mountain Investments / former refining asset network | `verified_institutional_restricted` |
| 990 | Fu Liquan | Dahua Technology investor/corporate route | `verified_public_institutional` |
| 991 | Antonio Gracias | Valor Equity Partners institutional route | `verified_public_institutional` |
| 992 | Maggie Hardy | 84 Lumber corporate route | `verified_public_institutional` |
| 993 | Hu Kaijun | China Grand Enterprises / Grand Pharma institutional route | `verified_public_institutional` |
| 994 | Hamilton James & family | Blackstone founder/emeritus / private-philanthropic route | `verified_institutional_restricted` |
| 995 | Michael Jordan | 23XI Racing / current professional-business route | `verified_institutional_restricted` |
| 996 | Patrick Lee | Lee & Man Paper investor relations | `verified_public_institutional` |
| 997 | Jorge Mas | MasTec investor relations | `verified_public_institutional` |
| 998 | C. Dean Metropoulos | Metropoulos & Co. private investment route | `verified_public_institutional` |
| 999 | John Middleton | Philadelphia Phillies / Middleton family institutional route | `verified_public_institutional` |
| 1000 | Patrice Motsepe | African Rainbow Minerals investor relations / Motsepe Foundation | `verified_public_institutional` |

## Critical current-role / quality notes

- **Andrej Babiš:** official Czech government pages identify him as Prime Minister in August 2026. Treat the Government Office as the current institutional route and require public-official/PEP compliance review; do not substitute Agrofert as though it were his current public-office channel.
- **Richard White:** WiseTech confirms he ceased being Executive Chair in July 2026 but remains Co-Founder, Executive Director and Chief Innovation Officer. Preserve WiseTech as an institutional route with the changed-role warning.
- **Steven Udvar-Házy:** Air Lease was acquired and renamed Sumisho Air Lease on 8 April 2026. The old public-company IR/board mapping is stale; re-map his current professional route before any use.
- **Dan Snyder:** sold the Washington Commanders in 2023. Do not use the Commanders as a current route to him.
- **Michael Jordan:** sold the Charlotte Hornets control stake; 23XI Racing remains a current institutional/business route and should not be represented as a personal inbox.
- **Zhang Jianzhong / Moore Threads:** the company route is current, but company-level U.S. export-control restrictions should be retained as a compliance note; this is not being labelled an individual sanctions block.

## Reusable clusters

- Medline: Wendy Abrams + Nancy Mills Barnett, plus earlier Medline-family records.
- Robinhood: Vlad Tenev + Baiju Bhatt.
- Duff Capital / Southern Tire Mart: James Duff + Thomas Duff.
- AB InBev family-asset routes: Beatriz Davila de Santo Domingo + Alexandre Van Damme, plus prior related records.
- Godrej: Adi Godrej + Nadir Godrej, with current-role distinctions retained.

## Import intent

Reconcile each row to `billionaire_id`, preserve stronger existing evidence, write route restrictions and review date, keep `outreach_allowed=false`, and require current-role/compliance refreshes for warning and enhanced-review records before downstream campaign selection.