import type { MontvelleOperationalRoute } from "./montvelleOperationalRoutes";

type Row = readonly [string,MontvelleOperationalRoute["routeType"],string,string,string,string];
const ROWS: Row[] = [
  ["mcqueens-flowers","general","https://www.mcqueensflowers.com/pages/our-locations","+44 (0)7301 035337","sales@mcqueensflowers.com","Flowers, gifting, bespoke arrangements and event enquiries."],
  ["wild-at-heart","concierge","https://wildatheart.com/pages/contact-us","+44 20 7229 1174","concierge@wildatheart.com","Dedicated flower concierge, gifting and last-minute floral requests."],
  ["neill-strain","general","https://neillstrain.com/pages/contactus","+44 20 7235 6469","belgravia@neillstrain.com","Luxury flowers, bespoke orders and event floral requests."],
  ["lavender-green","general","https://lavendergreen.co.uk/contact/","+44 20 8171 1001","","Luxury flower orders, events and floral styling."],
  ["larry-walshe","events","https://www.larrywalshe.com/contact-us/","+44 (0)208 540 5305","thestudio@larrywalshe.com","International wedding, celebration and floral-event enquiries."],
  ["moyses-stevens","general","https://www.moysesflowers.co.uk/contact-us","020 8772 0094","info@moysesflowers.co.uk","Flower orders, delivery, gifting, events and bespoke commissions."],
  ["putnam-putnam","events","https://putnamflowers.com/","","","Luxury floral and event design enquiry route."],
  ["lewis-miller-design","events","https://www.lewismillerdesign.com/inquire","212 614 2734","info@lewismillerdesign.com","Luxury floral design, events and bespoke flower enquiries."],
  ["transperfect","general","https://www.transperfect.com/contact","+44 20 7061 2000","","Translation, interpretation and urgent multilingual support."],
  ["rws-language","general","https://www.rws.com/about/contact-us/","","","Translation, interpretation and multilingual-services enquiry route."],
  ["languageline","service_centre","https://www.languageline.com/uk","0800 169 2879","enquiries@languageline.co.uk","On-demand language access, interpretation and translation."],
  ["da-languages","general","https://www.dalanguages.co.uk/","0161 464 7407","enquiries@dalanguages.co.uk","Telephone, video, face-to-face interpretation and translation."],
  ["translation-people","general","https://www.thetranslationpeople.com/","+44 (0)20 7112 5340","london@thetranslationpeople.com","Translation and interpreting support through the London office."],
  ["dhl-express","service_centre","https://www.dhl.com/gb-en/home/contact-us.html","","","Urgent express courier and international shipping requests."],
  ["fedex","service_centre","https://www.fedex.com/en-gb/customer-support.html","","","Urgent domestic and international express shipping support."],
  ["ups","service_centre","https://www.ups.com/gb/en/support/contact-us","","","Express parcel and international logistics support."],
  ["time-matters","service_centre","https://www.time-matters.com/contact/","","","Time-critical logistics, same-day and onboard-courier enquiries."],
  ["world-courier","service_centre","https://www.worldcourier.com/contact-us/","","","Specialist time-critical global courier and logistics enquiries."],
  ["take-a-chef","general","https://www.takeachef.com/","","","Source and book a private chef for a home, villa or event."],
  ["yhangry","general","https://yhangry.com/","","","Private-chef and at-home dining enquiries."],
  ["chefmaison","general","https://chefmaison.com/","","","Private-chef booking for homes, holidays and celebrations."],
  ["dineindulge","general","https://www.dineindulge.co.uk/","","","Private-chef and luxury at-home dining requests."],
];

export const MONTVELLE_OPERATIONAL_ROUTES_FINAL_022: MontvelleOperationalRoute[] = ROWS.map(
  ([supplierId,routeType,web,phone,email,purpose]) => ({
    id:`${supplierId}-final-1000-route`, supplierId, routeType,
    label:`${supplierId} official concierge fulfilment route`,
    geography:"Supplier service area",
    channels:[
      ...(phone ? [{channel:"phone" as const,value:phone}] : []),
      ...(email ? [{channel:"email" as const,value:email}] : []),
      {channel:"web" as const,value:web},
    ],
    purpose, sourceUrl:web, sourceAuthority:"supplier_official",
    lastVerified:"2026-08-24", usableForFulfilment:true,
  }),
);
