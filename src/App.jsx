import { useState } from "react";
import { currentUser, logout as doLogout } from "./auth";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Work from "./pages/Work.jsx";
import NoCompany from "./pages/NoCompany.jsx";
import { TG_BOT } from "./config";

export default function App() {
  const [user, setUser] = useState(currentUser());

  const signOut = () => {
    doLogout();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  // Signed up but in no company yet. Open signup means this state is normal, not
  // an error: the account exists, it just holds no membership. There is nothing
  // to protect here beyond what the server already refuses -- a session with no
  // member row is rejected by get_current_member on every data endpoint, so this
  // screen shows the product and the one action that changes the state.
  //
  // The check is `!user.orgId` rather than a flag, so a session saved by ANY
  // login path (email, Telegram widget, phone code) lands here correctly.
  if (!user.orgId)
    return (
      <NoCompany
        name={user.name}
        botName={TG_BOT}
        onJoined={setUser}
        onLogout={signOut}
      />
    );

  // Same role split as the Mini App: /api/board for managers+, /api/mywork for
  // field. A worker sees ONLY their own tasks -- and even if this routing were
  // bypassed, the backend answers a field session with 403 on every /api/web/*
  // financial endpoint, so the split is enforced, not decorative.
  if (user.accessLevel === "field")
    return <Work user={user} onLogout={signOut} />;

  return <Dashboard user={user} onLogout={signOut} />;
}
