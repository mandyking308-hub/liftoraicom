import FounderLayout from "@/components/founder/FounderLayout";
import LiftorBrainPanel from "@/components/founder/brain/LiftorBrainPanel";
import LiftorBrainInboundReplyPanel from "@/components/founder/brain/LiftorBrainInboundReplyPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LiftorBrain() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 pt-4">
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