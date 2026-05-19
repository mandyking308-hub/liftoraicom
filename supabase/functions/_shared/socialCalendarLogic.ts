// Shared logic for Social Calendar Engine. Internal only — no external scheduling.

export type Platform =
  | "instagram" | "tiktok" | "youtube_shorts" | "facebook"
  | "linkedin" | "x" | "blog" | "newsletter";

export const DEFAULT_PLATFORMS: Platform[] = [
  "instagram", "tiktok", "youtube_shorts", "facebook",
];

export const ALLOWED_CAL_TYPES = [
  "seven_day","fourteen_day","thirty_day","ninety_day",
  "campaign","revenue_goal","evergreen","launch","retention","custom",
] as const;

export function daysForType(t: string, fallback = 30): number {
  switch (t) {
    case "seven_day": return 7;
    case "fourteen_day": return 14;
    case "thirty_day": return 30;
    case "ninety_day": return 90;
    default: return fallback;
  }
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// NeonCandy fallback cadence (only when business has no cadence rules)
export const NEONCANDY_DEFAULTS: Record<string, { time: string; label: string }[]> = {
  instagram: [
    { time: "11:30", label: "Boom in My Step" },
    { time: "16:30", label: "Can't Wait" },
    { time: "20:30", label: "Sassy Princess" },
  ],
  tiktok: [
    { time: "11:30", label: "Boom in My Step" },
    { time: "16:30", label: "Can't Wait" },
    { time: "20:30", label: "Sassy Princess" },
  ],
  youtube_shorts: [
    { time: "16:30", label: "Can't Wait" },
    { time: "20:30", label: "Sassy Princess" },
  ],
  facebook: [
    { time: "11:30", label: "Boom in My Step" },
    { time: "20:30", label: "Sassy Princess" },
  ],
};

export function defaultTimesForPlatform(platform: string): string[] {
  switch (platform) {
    case "instagram": return ["11:30", "16:30", "20:30"];
    case "tiktok": return ["12:00", "18:00", "21:00"];
    case "youtube_shorts": return ["17:00", "20:00"];
    case "facebook": return ["10:00", "19:00"];
    case "linkedin": return ["08:30", "12:30"];
    case "x": return ["09:00", "13:00", "18:00"];
    case "blog": return ["10:00"];
    case "newsletter": return ["09:00"];
    default: return ["12:00"];
  }
}

export type CalendarItem = {
  platform: string;
  planned_date: string;
  planned_time: string;
  day_number: number;
  week_number: number;
  slot_label: string;
  content_item_id?: string | null;
  asset_id?: string | null;
  status: string;
  approval_status: string;
  asset_status: string;
  compliance_status: string;
  queue_readiness: string;
  block_reason?: string | null;
  notes?: string | null;
};

export type GenerationInput = {
  start_date: string;
  days_count: number;
  platforms: string[];
  cadence_rules: Array<{
    platform: string;
    preferred_times: string[] | null;
    preferred_days?: string[] | null;
    posts_per_day?: number | null;
  }>;
  content_items: Array<{
    id: string;
    platform?: string | null;
    asset_readiness_status?: string | null;
    compliance_status?: string | null;
    publish_readiness?: string | null;
    hook?: string | null;
    title?: string | null;
  }>;
  businessNameLower?: string;
};

export function generateCalendarItems(input: GenerationInput): {
  items: CalendarItem[];
  missing_assets: string[];
  compliance_warnings: string[];
  readiness_score: number;
} {
  const items: CalendarItem[] = [];
  const missing_assets: string[] = [];
  const compliance_warnings: string[] = [];
  const start = new Date(input.start_date + "T00:00:00Z");
  const isNeon = (input.businessNameLower ?? "").includes("neoncandy");

  const cadenceByPlatform: Record<string, string[]> = {};
  for (const p of input.platforms) {
    const rule = input.cadence_rules.find((r) => r.platform === p);
    let times = rule?.preferred_times ?? null;
    if (!times || times.length === 0) {
      if (isNeon && NEONCANDY_DEFAULTS[p]) {
        times = NEONCANDY_DEFAULTS[p].map((s) => s.time);
      } else {
        times = defaultTimesForPlatform(p);
      }
    }
    cadenceByPlatform[p] = times;
  }

  // Pool of content per platform (or generic)
  const poolByPlatform: Record<string, typeof input.content_items> = {};
  for (const p of input.platforms) {
    poolByPlatform[p] = input.content_items.filter(
      (c) => !c.platform || c.platform === p
    );
  }

  let ptr: Record<string, number> = {};
  for (const p of input.platforms) ptr[p] = 0;

  for (let d = 0; d < input.days_count; d++) {
    const day = addDays(start, d);
    const date = isoDate(day);
    const weekNum = Math.floor(d / 7) + 1;
    for (const platform of input.platforms) {
      const times = cadenceByPlatform[platform];
      for (const t of times) {
        const pool = poolByPlatform[platform] ?? [];
        const c = pool.length ? pool[ptr[platform] % pool.length] : null;
        if (c) ptr[platform] = (ptr[platform] + 1) % Math.max(pool.length, 1);

        let asset_status = "unknown";
        let block_reason: string | null = null;
        let status = "planned";
        let queue_readiness = "not_ready";
        let compliance_status = "not_reviewed";

        if (!c) {
          status = "needs_content";
          block_reason = "no_content_available";
        } else {
          if (c.asset_readiness_status === "ready") asset_status = "ready";
          else if (c.asset_readiness_status === "missing") {
            asset_status = "missing";
            status = "needs_asset";
            block_reason = "missing_asset";
            missing_assets.push(`${date} ${platform} ${t}`);
          } else if (c.asset_readiness_status === "rights_review_required") {
            asset_status = "rights_review_required";
            status = "blocked";
            block_reason = "rights_review_required";
          }
          if (c.compliance_status === "blocked") {
            compliance_status = "blocked";
            status = "blocked";
            block_reason = "compliance_blocked";
            compliance_warnings.push(`${date} ${platform}`);
          } else if (c.compliance_status === "needs_review") {
            compliance_status = "needs_review";
          } else if (c.compliance_status === "passed") {
            compliance_status = "passed";
          }
          if (c.publish_readiness === "ready" && asset_status === "ready" && compliance_status !== "blocked") {
            queue_readiness = "ready_for_review";
          }
        }

        items.push({
          platform,
          planned_date: date,
          planned_time: t,
          day_number: d + 1,
          week_number: weekNum,
          slot_label: isNeon && NEONCANDY_DEFAULTS[platform]
            ? (NEONCANDY_DEFAULTS[platform].find((s) => s.time === t)?.label ?? null) ?? ""
            : `${platform} ${t}`,
          content_item_id: c?.id ?? null,
          asset_id: null,
          status,
          approval_status: "draft",
          asset_status,
          compliance_status,
          queue_readiness,
          block_reason,
          notes: null,
        });
      }
    }
  }

  const total = items.length || 1;
  const readyish = items.filter((i) => i.status === "planned" || i.queue_readiness === "ready_for_review").length;
  const readiness_score = Math.round((readyish / total) * 100);

  return { items, missing_assets, compliance_warnings, readiness_score };
}
