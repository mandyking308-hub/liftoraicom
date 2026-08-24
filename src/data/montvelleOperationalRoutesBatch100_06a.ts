import type { MontvelleOperationalRoute } from "./montvelleOperationalRoutes";
type Row=readonly[string,string,string,string,string];
const ROWS:Row[]=[
["garrick-club","London","","",""],["reform-club","London","","",""],["east-india-club","London","","",""],
["royal-automobile-club","London / Surrey","+44 20 7930 2345","",""],["caledonian-club","London","+44 20 7235 5162","",""],
["oriental-club-london","London","","reservations@orientalclub.org.uk",""],["hurlingham-club","London","","",""],
["chelsea-arts-club","London","","",""],["home-grown-club","London","","",""],
["bluebird-city-club","London","+44 7353 005995","",""],["bluebird-chelsea-club","London","+44 7353 005995","",""],
["st-jamess-hotel-club","London","+44 20 7316 1600","",""],["bath-county-club","Bath","+44 1225 423732","",""],
["clifton-club-bristol","Bristol","","",""],["royal-scots-club","Edinburgh","+44 131 556 4270","",""],
["phyllis-court-club","Henley-on-Thames","","",""],["kingsbarns-golf-links","St Andrews","+44 1334 460860","",""],
["dundonald-links","Ayrshire","+44 1294 314000","",""],["grove-hertfordshire-club","Hertfordshire","+44 1923 294266","",""],
["royal-dublin-society","Dublin","+353 1 240 7296","",""],["druids-glen-golf-club","Ireland","+353 1 287 3600","",""],
["club-zum-rennweg","Zurich","+41 43 497 2160","",""],["cercle-munster","Luxembourg","","",""],
["industrieele-groote-club","Amsterdam","","",""],["real-casino-madrid","Madrid","","",""],
["mallorca-country-club","Mallorca","","",""],["real-circulo-labradores","Seville","","",""],["alma-stockholm","Stockholm","","",""],
["belas-clube-campo","Lisbon","+351 21 962 6640","",""],["golf-club-bologna","Bologna","","",""],["san-domenico-golf","Puglia","","",""],
["antognolla-golf","Perugia","","",""],["golfclub-beuerberg","Germany","","",""],["club-international-leipzig","Leipzig","","",""],
["drivers-business-club-munich","Munich","","",""],["country-club-schloss-langenstein","Germany","","",""],["green-eagle-golf","Germany","","",""],
["wirtschaftsclub-duesseldorf","Düsseldorf","","",""],["wirtschaftsclub-stuttgart","Stuttgart","","",""],["vinnustofa-kjarval","Reykjavik","","",""],
["city-club-san-francisco","San Francisco","+1 415 362 2480","",""],["amador-san-francisco","San Francisco","","",""],
["calamigos-private-club","Malibu / Los Angeles","+1 818 575 4400","",""],["astor-club-chicago","Chicago","","",""],
["fitler-club","Philadelphia","+1 215 575 9092","",""],["edison-house","Salt Lake City","+1 385 799 7630","",""],
["college-club-boston","Boston","+1 617 536 9510","",""],["george-town-club","Washington DC","","",""],
["charlotte-city-club","Charlotte","+1 704 334 3200","",""],["university-club-portland","Portland","+1 503 223 6237","",""]
];
export const MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_06_1:MontvelleOperationalRoute[]=ROWS.map(([supplierId,geography,phone,email,whatsapp])=>({
id:`${supplierId}-batch100-06-access`,supplierId,routeType:"reciprocal_access",label:`${supplierId} verified club-access route`,geography,
channels:[...(phone?[{channel:"phone" as const,value:phone}]:[]),...(email?[{channel:"email" as const,value:email}]:[]),...(whatsapp?[{channel:"whatsapp" as const,value:whatsapp}]:[]),{channel:"web" as const,value:"https://www.iacworldwide.com/clubs/"},{channel:"app" as const,value:"IAC app"}],
purpose:"Use any retained direct club contact plus the IAC official directory/app to check current reciprocal eligibility, request access and generate the required Letter of Introduction where the club is currently participating.",
accessPrerequisite:"Before promising access, confirm the club is currently listed/eligible through IAC or another valid reciprocal arrangement. Guest must hold qualifying home-club membership; host-club rules, visit limits and availability apply.",
sourceUrl:"https://www.iacworldwide.com/clubs/",sourceAuthority:"network_official",lastVerified:"2026-08-24",usableForFulfilment:true,
notes:"Direct phone/email is retained only where a published institutional route was identified; reciprocal status must still be checked at time of request."
}));
