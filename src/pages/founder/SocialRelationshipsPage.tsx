import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RelationshipOverviewPanel,
  RelationshipConnectionsPanel,
  RelationshipDiscoveryPanel,
  RelationshipTargetListsPanel,
  RelationshipActionQueuePanel,
  RelationshipInboxPanel,
  RelationshipPoliciesPanel,
} from "@/components/founder/social-relationships/SocialRelationshipPanelsSafe";

const TAB_BY_PATH: Record<string, string> = {
  "/founder/social-relationships": "overview",
  "/founder/social-relationships/connections": "connections",
  "/founder/social-relationships/discovery": "discovery",
  "/founder/social-relationships/targets": "targets",
  "/founder/social-relationships/queue": "queue",
  "/founder/social-relationships/inbox": "inbox",
  "/founder/social-relationships/policies": "policies",
};

export default function SocialRelationshipsPage() {
  const location = useLocation();
  const [tab, setTab] = useState(TAB_BY_PATH[location.pathname] ?? "overview");
  const [businessId, setBusinessId] = useState(() => localStorage.getItem("liftor.activeBusinessId") || "");
  useEffect(() => setTab(TAB_BY_PATH[location.pathname] ?? "overview"), [location.pathname]);
  useEffect(() => { if (businessId) localStorage.setItem("liftor.activeBusinessId", businessId); }, [businessId]);

  return (
    <FounderLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Social Relationships</h1>
            <p className="text-sm text-muted-foreground">
              Founder-controlled discovery, networking and conversations. This is separate from{" "}
              <Link className="underline" to="/founder/social-autopilot">Social Autopilot publishing</Link>, which remains unchanged.
            </p>
          </div>
          <div className="w-72"><Label className="text-[11px]">Active business ID</Label><Input value={businessId} onChange={(event) => setBusinessId(event.target.value.trim())} placeholder="business_id" /></div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="discovery">Discovery</TabsTrigger><TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="queue">Action queue</TabsTrigger><TabsTrigger value="inbox">Social inbox</TabsTrigger>
            <TabsTrigger value="policies">Policies & safety</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4"><RelationshipOverviewPanel businessId={businessId} /></TabsContent>
          <TabsContent value="connections" className="mt-4"><RelationshipConnectionsPanel businessId={businessId} /></TabsContent>
          <TabsContent value="discovery" className="mt-4"><RelationshipDiscoveryPanel businessId={businessId} /></TabsContent>
          <TabsContent value="targets" className="mt-4"><RelationshipTargetListsPanel businessId={businessId} /></TabsContent>
          <TabsContent value="queue" className="mt-4"><RelationshipActionQueuePanel businessId={businessId} /></TabsContent>
          <TabsContent value="inbox" className="mt-4"><RelationshipInboxPanel businessId={businessId} /></TabsContent>
          <TabsContent value="policies" className="mt-4"><RelationshipPoliciesPanel businessId={businessId} /></TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}
