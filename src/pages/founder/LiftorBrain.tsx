import FounderLayout from "@/components/founder/FounderLayout";
import LiftorBrainPanel from "@/components/founder/brain/LiftorBrainPanel";
import LiftorBrainInboundReplyPanel from "@/components/founder/brain/LiftorBrainInboundReplyPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LiftorBrain() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Link to="/founder/brain/sessions"><Button size="sm" variant="outline">Sessions</Button></Link>
          <Link to="/founder/brain/drafts"><Button size="sm" variant="outline">Drafts</Button></Link>
          <Link to="/founder/brain/audit"><Button size="sm" variant="outline">Audit</Button></Link>
          <Link to="/founder/brain/tools"><Button size="sm" variant="outline">Tools</Button></Link>
          <Link to="/founder/brain/provider"><Button size="sm" variant="outline">Provider</Button></Link>
          <span className="text-xs text-muted-foreground ml-2">
            External actions locked by design · drafts are internal only.
          </span>
        </div>
        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Co-Pilot chat</TabsTrigger>
            <TabsTrigger value="inbound">Inbound reply drafting</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-3">
            <LiftorBrainPanel />
          </TabsContent>
          <TabsContent value="inbound" className="mt-3">
            <LiftorBrainInboundReplyPanel />
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}