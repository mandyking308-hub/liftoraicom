import { useEffect, useState } from "react";
import { LFLayout, LFSection, StatusBadge } from "./_shared";
import { fetchLaunchProfiles, type LaunchProfileRow } from "@/lib/launchFactoryEngine";

export default function LFBrand() {
  const [profiles, setProfiles] = useState<LaunchProfileRow[]>([]);
  useEffect(() => { fetchLaunchProfiles().then(setProfiles).catch(() => {}); }, []);
  return (
    <LFLayout title="Brand" subtitle="Brand name, public-facing name and website URL per business. Editing brand names is internal; publishing remains approval-gated.">
      <LFSection title="Brand profiles">
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No launch profiles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr><th className="text-left p-2">Brand</th><th className="text-left p-2">Public name</th><th className="text-left p-2">Website</th><th className="text-left p-2">Status</th></tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-b border-border/20">
                    <td className="p-2 font-medium">{p.brand_name ?? "—"}</td>
                    <td className="p-2">{p.public_brand_name ?? "—"}</td>
                    <td className="p-2 text-primary">{p.website_url ?? "—"}</td>
                    <td className="p-2"><StatusBadge status={p.launch_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LFSection>
    </LFLayout>
  );
}