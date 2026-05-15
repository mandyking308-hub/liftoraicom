import FounderLayout from "@/components/founder/FounderLayout";
import CreativeAssetLibraryPanel from "@/components/founder/assets/CreativeAssetLibraryPanel";

export default function CreativeAssetsHub() {
  return (
    <FounderLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Creative Asset Library</h1>
          <p className="text-sm text-muted-foreground">Per-business brand, video, image, music, copy and creative assets — registry only, no external upload or publish.</p>
        </div>
        <CreativeAssetLibraryPanel />
      </div>
    </FounderLayout>
  );
}