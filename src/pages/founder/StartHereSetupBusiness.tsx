import { Navigate } from "react-router-dom";

// Canonical setup journey is /founder/business-setup-tunnel.
// This route is preserved as a permanent redirect into the new-business mode
// of the tunnel so older bookmarks and links keep working.
export default function StartHereSetupBusiness() {
  return <Navigate to="/founder/business-setup-tunnel?mode=new" replace />;
}
