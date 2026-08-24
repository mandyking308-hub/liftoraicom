import type { MontvelleOperationalRoute } from "./montvelleOperationalRoutes";
type Row=readonly[string,string,string,string,string];
const ROWS:Row[]=[
["fort-schuyler-club","Utica","+1 315 797 0170","",""],["crescent-club-dallas","Dallas","+1 214 871 3297","",""],
["winelair-dc","Washington DC","+1 202 525 1209","",""],["outrigger-canoe-club","Honolulu","","",""],
["club-bardo","Savannah","+1 912 238 5158","",""],["pillars-hotel-club","Fort Lauderdale","","",""],
["university-club-orlando","Orlando","","",""],["sarasota-yacht-club","Sarasota","","",""],
["governors-club-tallahassee","Tallahassee","","",""],["university-club-tampa","Tampa","","",""],
["commerce-club-atlanta","Atlanta","","",""],["michigan-shores-club","Chicago / Wilmette","","",""],
["union-league-chicago","Chicago","","",""],["des-moines-embassy-club","Des Moines","","",""],
["kelowna-yacht-club","Kelowna","","",""],["hollyburn-country-club","Vancouver","","",""],
["terminal-city-club","Vancouver","+1 604 681 4121","",""],["vancouver-club","Vancouver","","",""],
["vancouver-lawn-tennis","Vancouver","","",""],["manitoba-club","Winnipeg","","",""],
["london-club-canada","London, Ontario","","",""],["rideau-club","Ottawa","","",""],
["calgary-petroleum-club","Calgary","+1 403 269 7981","",""],["eau-claire-athletic-club","Calgary","+1 825 962 3222","",""],
["cambridge-club-toronto","Toronto","+1 416 862 1077","",""],["adelaide-club-toronto","Toronto","+1 416 367 9957","",""],
["albany-club-toronto","Toronto","+1 416 364 5471","",""],["university-club-mexico","Mexico City","","",""],
["club-union-panama","Panama City","+507 208 5300","","+507 6378 5076"],["club-union-santiago","Santiago, Chile","","",""],
["diplomatic-club-doha","Doha","+974 4484 7444","",""],["british-club-singapore","Singapore","+65 6467 4311","enquiries@britishclub.org.sg",""],
["hollandse-club","Singapore","+65 6464 5225","sales@hollandseclub.org.sg",""],["one15-marina","Singapore","+65 6305 6988","membership.sc@one15marina.com",""],
["singapore-swimming-club","Singapore","+65 6342 3600","enquiry@sswimclub.org.sg",""],["swiss-club-singapore","Singapore","+65 6591 9420","recept@swissclub.org.sg",""],
["seoul-club","Seoul","+82 2 2238 7666","seoulclub@seoulclub.org",""],["bangkok-club","Bangkok","+66 2 679 5550","info@thebangkokclub.com",""],
["pacific-city-club-bangkok","Bangkok","+66 2 653 2451","membership@pacificcityclub.com",""],["bombay-gymkhana","Mumbai","","",""],
["quorum-mumbai","Mumbai","+91 7208898778","",""],["quorum-gurgaon","Gurgaon","+91 7703908030","",""],
["modernist-mumbai","Mumbai","+91 22 69828000","",""],["club-mumbai","Mumbai","+91 22 66117777","lm@theclubmumbai.com",""],
["stellar-gymkhana","Delhi NCR","","",""],["jolies-mumbai","Mumbai","","",""],
["country-club-hong-lok-yuen","Hong Kong","","",""],["city-tattersalls-sydney","Sydney","","",""],
["sandstones-club-sydney","Sydney","+61 451 132 734","",""],["alabang-country-club","Philippines","+63 2 8842 3530","",""]
];
export const MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_06_2:MontvelleOperationalRoute[]=ROWS.map(([supplierId,geography,phone,email,whatsapp])=>({
id:`${supplierId}-batch100-06-access`,supplierId,routeType:"reciprocal_access",label:`${supplierId} verified club-access route`,geography,
channels:[...(phone?[{channel:"phone" as const,value:phone}]:[]),...(email?[{channel:"email" as const,value:email}]:[]),...(whatsapp?[{channel:"whatsapp" as const,value:whatsapp}]:[]),{channel:"web" as const,value:"https://www.iacworldwide.com/clubs/"},{channel:"app" as const,value:"IAC app"}],
purpose:"Use any retained direct club contact plus the IAC official directory/app to check current reciprocal eligibility, request access and generate the required Letter of Introduction where the club is currently participating.",
accessPrerequisite:"Before promising access, confirm the club is currently listed/eligible through IAC or another valid reciprocal arrangement. Guest must hold qualifying home-club membership; host-club rules, visit limits and availability apply.",
sourceUrl:"https://www.iacworldwide.com/clubs/",sourceAuthority:"network_official",lastVerified:"2026-08-24",usableForFulfilment:true,
notes:"Direct phone/email is retained only where a published institutional route was identified; reciprocal status must still be checked at time of request."
}));
