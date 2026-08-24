import type { MontvelleSupplier } from "./montvelleSupplierSeed";

type Row = readonly [string,string,MontvelleSupplier["category"],string,boolean,string,string];

const ROWS: Row[] = [
  ["mcqueens-flowers","McQueens Flowers","luxury_retail","UK / New York / South Korea",true,"Luxury florist with international studios","Bespoke flowers, same-day London delivery, events, gifting and international studio routes."],
  ["wild-at-heart","Wild at Heart","luxury_retail","UK / International events",true,"Luxury florist and concierge flower service","Flowers, gifting, events, contracts and dedicated concierge service."],
  ["neill-strain","Neill Strain Floral Couture","luxury_retail","London / Global event clients",false,"Luxury floral couture boutiques","Rare flowers, bespoke gifting and major-event floral design."],
  ["lavender-green","Lavender Green Flowers","luxury_retail","UK / International events",true,"Luxury florist and event studio","Flowers, subscriptions, weddings, events and corporate installations."],
  ["larry-walshe","Larry Walshe Studios","luxury_retail","UK / Italy / US / France / Global",true,"International luxury floral and event studios","Flowers, celebrations and destination event design."],
  ["moyses-stevens","Moyses Stevens","luxury_retail","UK / Global event clients",true,"Historic luxury florist and gifting house","Same-day London flowers, nationwide gifting, events, hotels and corporate services."],
  ["putnam-putnam","Putnam & Putnam","luxury_retail","US / Global event clients",false,"Luxury floral and event design studio","Flowers, weddings, events and editorial installations."],
  ["lewis-miller-design","Lewis Miller Design","luxury_retail","US / Global event clients",true,"Luxury floral and event design","Flowers, events, gifting and Palm Beach delivery."],
  ["transperfect","TransPerfect","concierge_network","Global",true,"Global translation and interpretation network","Translation, on-site and remote interpretation and multilingual support."],
  ["rws-language","RWS","concierge_network","Global",true,"Global language and localisation network","Translation, interpretation, localisation and language technology."],
  ["languageline","LanguageLine Solutions","concierge_network","Global",true,"24/7 language-access network","On-demand telephone, video and in-person interpretation plus translation."],
  ["da-languages","DA Languages","concierge_network","UK / Global remote",true,"Interpretation and translation network","Telephone, video, face-to-face interpretation and translation."],
  ["translation-people","The Translation People","concierge_network","UK / Europe / US",true,"International translation network","Translation, interpreting and multilingual business services."],
  ["dhl-express","DHL Express","relocation","Global",true,"Global time-critical courier network","Urgent international document, parcel and express-delivery fulfilment."],
  ["fedex","FedEx","relocation","Global",true,"Global express logistics network","Time-critical domestic and international courier services."],
  ["ups","UPS","relocation","Global",true,"Global parcel and logistics network","Express international shipping and urgent logistics."],
  ["time-matters","time:matters","relocation","Global",true,"Time-critical special logistics network","Urgent courier, onboard courier and same-day international logistics."],
  ["world-courier","World Courier","relocation","Global",true,"Specialist global courier network","High-touch, time- and temperature-sensitive global logistics."],
  ["take-a-chef","Take a Chef","private_staffing","Global",true,"Private-chef marketplace","Private chefs for homes, villas, holidays and celebrations."],
  ["yhangry","yhangry","private_staffing","UK / selected international markets",true,"Private-chef booking platform","Private chefs, dinner parties and home celebrations."],
  ["chefmaison","ChefMaison","private_staffing","Europe / selected global destinations",true,"Private-chef booking platform","Private chefs for homes, holidays and events."],
  ["dineindulge","Dineindulge","private_staffing","UK / Europe / selected destinations",true,"Private-chef and dining service","Private chefs and luxury dining experiences in homes and holiday properties."],
];

export const MONTVELLE_SUPPLIERS_FINAL_022: MontvelleSupplier[] = ROWS.map(
  ([id,name,category,coverage,networkMultiplier,multiplierReach,notes]) => ({
    id,name,category,coverage,networkMultiplier,multiplierReach,
    lifecycleStatus:"identified",outreachStatus:"not_contacted",websiteNameStatus:"sourcing_reference",notes,
  }),
);
