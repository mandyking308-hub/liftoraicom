// Education campaign copy for the four portfolio brands.
// Stored as configuration only. NOTHING here sends. No provider is contacted.
// Deliberately concise, credible, senior-education-group tone; no outcome overclaim.

import { EducationBusinessSlug } from "./educationBusinesses";

export interface EmailStep {
  step: number;
  key: "primary" | "follow_up_1" | "follow_up_2";
  subject: string;
  body: string;
  cta: string;
  wait_days: number;
}

export interface RoleVariant {
  role_family: string;
  subject: string;
  opening_line: string;
}

export interface BrandCopy {
  slug: EducationBusinessSlug;
  business_name: string;
  positioning: string;
  sequence: EmailStep[];
  role_variants: RoleVariant[];
  unsubscribe_required: true;
}

const SIGN_OFF = "\n\nIf this isn't your area, a pointer to the right colleague is genuinely helpful.\n\n{{sender_name}}\n{{brand_name}}\n{{unsubscribe_link}}";

export const EDUCATION_CAMPAIGN_COPY: Record<EducationBusinessSlug, BrandCopy> = {
  "billy-and-the-wild-forest": {
    slug: "billy-and-the-wild-forest",
    business_name: "Billy and the Wild Forest",
    positioning: "Emotional understanding, inclusion and beautifully illustrated literacy for every child.",
    sequence: [
      {
        step: 1,
        key: "primary",
        subject: "SEN-friendly reading for {{organisation_name}}",
        body:
          "Hello {{first_name}},\n\nI lead Billy and the Wild Forest — illustrated story resources written for children who find emotional language hard to reach, including SEN and SEND learners.\n\nThe books pair original hand-painted artwork with short, low-load text and simple talking points, so a teaching assistant or SENCo can use them in a ten-minute session without extra preparation. They are designed to sit alongside your existing inclusion and literacy provision rather than replace anything.\n\nWould it be useful if I sent a sample set and the accompanying inclusion notes for your team to look at?" +
          SIGN_OFF,
        cta: "Send a sample set and inclusion notes",
        wait_days: 0,
      },
      {
        step: 2,
        key: "follow_up_1",
        subject: "Re: SEN-friendly reading for {{organisation_name}}",
        body:
          "Hello {{first_name}},\n\nJust following up briefly. The part colleagues usually ask about first is the artwork — every page is original illustration, and we find that children who disengage from text will still stay with a picture and talk about what the character is feeling.\n\nHappy to send one title plus the SEN discussion sheet so you can judge it against your own provision." +
          SIGN_OFF,
        cta: "One sample title plus SEN discussion sheet",
        wait_days: 4,
      },
      {
        step: 3,
        key: "follow_up_2",
        subject: "Closing the loop — Billy and the Wild Forest",
        body:
          "Hello {{first_name}},\n\nI'll leave it here so I'm not adding to your inbox. If inclusion, wellbeing or reading-for-pleasure resourcing comes up across your schools later in the year, I'm glad to pick it up then.\n\nThank you for your time." +
          SIGN_OFF,
        cta: "Reply if useful later in the year",
        wait_days: 6,
      },
    ],
    role_variants: [
      {
        role_family: "sen",
        subject: "Inclusion resources for your SEND provision",
        opening_line: "I work with SENCos and inclusion leads on low-load, emotionally literate reading material.",
      },
      {
        role_family: "literacy",
        subject: "Illustrated reading-for-pleasure titles",
        opening_line: "I work with literacy leads on illustrated titles for reluctant and emerging readers.",
      },
      {
        role_family: "leadership",
        subject: "Inclusion and reading across your schools",
        opening_line: "I work with trust and group leaders on consistent inclusion-friendly reading provision.",
      },
    ],
    unsubscribe_required: true,
  },

  aurelia: {
    slug: "aurelia",
    business_name: "Aurelia",
    positioning: "Create. Learn. Achieve. Safely.",
    sequence: [
      {
        step: 1,
        key: "primary",
        subject: "Safer creative digital learning at {{organisation_name}}",
        body:
          "Hello {{first_name}},\n\nAurelia works with education groups on creative digital learning that is safe by design — Create. Learn. Achieve. Safely.\n\nThe usual tension we hear is that the tools students find engaging are the ones safeguarding leads are least comfortable with. We focus on that gap: creative activity, clear data handling, and controls your DSL can actually explain to governors.\n\nWould a short overview of how we structure that be worth fifteen minutes?" +
          SIGN_OFF,
        cta: "Fifteen-minute overview",
        wait_days: 0,
      },
      {
        step: 2,
        key: "follow_up_1",
        subject: "Re: safer creative digital learning",
        body:
          "Hello {{first_name}},\n\nAdding one detail in case it's the relevant one: we can share the safeguarding and data-handling summary first, before any product conversation, so your technology and safeguarding leads can screen it on their own terms.\n\nHappy to send that across." +
          SIGN_OFF,
        cta: "Send the safeguarding and data summary",
        wait_days: 4,
      },
      {
        step: 3,
        key: "follow_up_2",
        subject: "Closing the loop — Aurelia",
        body:
          "Hello {{first_name}},\n\nI'll stop here. If digital learning or safeguarding-led technology review lands on your plan later, I'd welcome the conversation then.\n\nThank you." +
          SIGN_OFF,
        cta: "Reply when digital review comes round",
        wait_days: 6,
      },
    ],
    role_variants: [
      {
        role_family: "digital",
        subject: "Creative digital learning, safeguarding-first",
        opening_line: "I work with digital learning leads on creative tools that pass safeguarding review.",
      },
      {
        role_family: "safeguarding",
        subject: "Safeguarding-led review of creative tools",
        opening_line: "I work with DSLs on the data-handling and control side of creative digital tools.",
      },
    ],
    unsubscribe_required: true,
  },

  kindnesss: {
    slug: "kindnesss",
    business_name: "Kindnesss",
    positioning: "Small acts. Big hearts.",
    sequence: [
      {
        step: 1,
        key: "primary",
        subject: "Wellbeing and PSHE resources for {{organisation_name}}",
        body:
          "Hello {{first_name}},\n\nKindnesss builds small, practical wellbeing and PSHE activities for schools — small acts, big hearts.\n\nThey are short by design: a five-minute tutor-time activity, a kindness prompt, a simple student-experience routine that doesn't need a new timetable slot or another staff training day.\n\nWould you like me to send the sample pack so your pastoral team can try one week of it?" +
          SIGN_OFF,
        cta: "Send the one-week sample pack",
        wait_days: 0,
      },
      {
        step: 2,
        key: "follow_up_1",
        subject: "Re: wellbeing and PSHE resources",
        body:
          "Hello {{first_name}},\n\nOne small clarification: the pack is intended to sit inside your existing PSHE and pastoral programme, not to replace it. Most schools use it for tutor time and student voice sessions.\n\nGlad to send it over if useful." +
          SIGN_OFF,
        cta: "Send the pack",
        wait_days: 4,
      },
      {
        step: 3,
        key: "follow_up_2",
        subject: "Closing the loop — Kindnesss",
        body:
          "Hello {{first_name}},\n\nI'll leave this with you. If wellbeing or student-experience resourcing comes up across your schools, I'd be happy to talk then.\n\nThank you for your time." +
          SIGN_OFF,
        cta: "Reply when wellbeing planning comes round",
        wait_days: 6,
      },
    ],
    role_variants: [
      {
        role_family: "wellbeing",
        subject: "Five-minute wellbeing routines for tutor time",
        opening_line: "I work with pastoral and wellbeing leads on short, repeatable routines.",
      },
      {
        role_family: "pshe",
        subject: "PSHE activities that fit the time you have",
        opening_line: "I work with PSHE and student experience leads on low-preparation activities.",
      },
    ],
    unsubscribe_required: true,
  },

  "kingsbridge-global": {
    slug: "kingsbridge-global",
    business_name: "Kingsbridge Global",
    positioning: "Education Without Borders.",
    sequence: [
      {
        step: 1,
        key: "primary",
        subject: "International partnership options for {{organisation_name}}",
        body:
          "Hello {{first_name}},\n\nKingsbridge Global works with education groups on cross-border partnership and international provision — Education Without Borders.\n\nMost of the groups we speak with are weighing the same question: whether to build international presence directly or through partnership, and what that means for academic standards and governance across regions.\n\nIf that's live for you, I'd be glad to share how we structure those partnerships." +
          SIGN_OFF,
        cta: "Share the partnership structure",
        wait_days: 0,
      },
      {
        step: 2,
        key: "follow_up_1",
        subject: "Re: international partnership options",
        body:
          "Hello {{first_name}},\n\nAdding one point: we can start with a written outline of the partnership and governance model for your region rather than a meeting, if that's easier to circulate internally.\n\nHappy to send it." +
          SIGN_OFF,
        cta: "Send the written outline",
        wait_days: 4,
      },
      {
        step: 3,
        key: "follow_up_2",
        subject: "Closing the loop — Kingsbridge Global",
        body:
          "Hello {{first_name}},\n\nI'll close this off here. If international expansion or partnership review appears on your group agenda, I'd welcome the conversation.\n\nThank you." +
          SIGN_OFF,
        cta: "Reply when international review is live",
        wait_days: 6,
      },
    ],
    role_variants: [
      {
        role_family: "international",
        subject: "Cross-border provision and governance",
        opening_line: "I work with international and regional education leaders on cross-border provision.",
      },
      {
        role_family: "partnerships",
        subject: "Partnership models for education groups",
        opening_line: "I work with partnership leads on structuring cross-border education partnerships.",
      },
    ],
    unsubscribe_required: true,
  },
};

export function copyForBusiness(slug: EducationBusinessSlug): BrandCopy {
  return EDUCATION_CAMPAIGN_COPY[slug];
}
