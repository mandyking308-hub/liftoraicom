import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout } from "./_shared";
import { fetchDataRooms, fetchDataRoomItems, DATA_ROOM_STATUS_META, type DataRoomProfile, type DataRoomItem } from "@/lib/documentVaultEngine";

export default function DataRoom() {
  const [rooms, setRooms] = useState<DataRoomProfile[]>([]);
  const [items, setItems] = useState<DataRoomItem[]>([]);
  useEffect(() => { Promise.all([fetchDataRooms(), fetchDataRoomItems()]).then(([r,i]) => { setRooms(r); setItems(i); }).catch(() => {}); }, []);
  return (
    <DocLayout title="Data Rooms" subtitle="Data rooms start as draft and require founder approval before any external sharing or invitation. No public links by default.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Name</th><th className="text-left p-1">Type</th>
            <th className="text-left p-1">Status</th><th className="text-left p-1">Items</th>
            <th className="text-left p-1">Shareable items</th><th className="text-left p-1">Expires</th>
          </tr></thead>
          <tbody>
            {rooms.map(r => {
              const its = items.filter(i => i.data_room_id === r.id);
              const sharable = its.filter(i => i.share_allowed && i.item_status === "approved").length;
              const meta = DATA_ROOM_STATUS_META[r.data_room_status];
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-1 font-medium">{r.data_room_name}</td>
                  <td className="p-1 text-muted-foreground">{r.data_room_type}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${meta?.cls}`}>{meta?.label}</Badge></td>
                  <td className="p-1">{its.length}</td>
                  <td className="p-1">{sharable}</td>
                  <td className="p-1 text-muted-foreground">{r.access_expires_at ? new Date(r.access_expires_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
            {rooms.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No data rooms.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}