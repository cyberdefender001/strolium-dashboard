import { useEffect, useState } from "react";
import { currentUser, logout as doLogout } from "./auth";
import { redeemHandoff, saveEmailSession } from "./api/emailauth";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Work from "./pages/Work.jsx";
import NoCompany from "./pages/NoCompany.jsx";
import { TG_BOT } from "./config";
import TrialExpiredDialog from "./components/TrialExpiredDialog.jsx";
import JoinLinkNotice from "./components/JoinLinkNotice.jsx";

export default function App() {
  const [user, setUser] = useState(currentUser());
  // Blocks the login screen from flashing while a handoff code is redeemed.
  const [handoff, setHandoff] = useState(
    () => new URLSearchParams(window.location.search).get("h") || null
  );

  // An invite code in the hash: <site>/#/join?code=XXXXXXXX
  //
  // Read here rather than in NoCompany alone, because the interesting case is
  // the one NoCompany never sees -- a user who ALREADY has a company opening the
  // link. Declared before any conditional return, since hooks cannot run after
  // one.
  const [joinCode, setJoinCode] = useState(() => {
    try {
      const m = (window.location.hash || "").match(/[?&]code=([A-Za-z0-9]+)/);
      return m ? m[1].toUpperCase() : "";
    } catch {
      return "";
    }
  });

  // One-tap arrival from the Mini App. The URL carries a single-use, 60-second
  // code -- never a session token, which would otherwise sit in browser history
  // and referrer headers. We trade it for a real session and strip it from the
  // address bar immediately so it cannot be copied, shared or replayed.
  useEffect(() => {
    if (!handoff) return;
    let alive = true;
    (async () => {
      try {
        const session = await redeemHandoff(handoff);
        if (alive) setUser(saveEmailSession(session));
      } catch {
        /* expired or already used -- fall through to the normal login screen */
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
        if (alive) setHandoff(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [handoff]);

  const signOut = () => {
    doLogout();
    setUser(null);
  };

  if (handoff && !user) return null; // brief: redeeming

  // Any successful sign-in or join lands here.
  //
  // The invite code has to be cleared at the same moment. It lives in App state
  // AND in the URL hash, and the notice below renders whenever a user with a
  // company still has one -- so joining through an invite link showed the
  // "this link is not for you" screen immediately after it had worked.
  const acceptUser = (u) => {
    setJoinCode("");
    try {
      if ((window.location.hash || "").includes("code=")) {
        window.location.hash = "/home";
      }
    } catch {
      /* the state above is what gates the notice; the hash is cosmetic */
    }
    setUser(u);
  };

  if (!user) return <Login onLogin={acceptUser} />;

  // Signed up but in no company yet. Open signup makes this state normal, not an
  // error: the account exists, it just holds no membership. Nothing needs
  // protecting here beyond what the server already refuses -- a session with no
  // member row is rejected by get_current_member on every data endpoint.
  //
  // Checked via !user.orgId rather than a flag, so a session saved by ANY login
  // path (email, Telegram widget, phone code, handoff) lands here correctly.
  if (!user.orgId)
    return (
      <NoCompany
        name={user.name}
        botName={TG_BOT}
        onJoined={acceptUser}
        onLogout={signOut}
      />
    );

  // An invite link opened by someone who is already in a company.
  //
  // Only NoCompany reads ?code=, and it only renders when !user.orgId -- so this
  // user went straight to their dashboard and the code vanished with no message.
  // The inviter testing his own link concluded it was broken; an invitee who
  // already has an account would report the same.
  if (joinCode)
    return (
      <JoinLinkNotice
        code={joinCode}
        companyName={user.company}
        onLogout={signOut}
        onDismiss={() => {
          // Strip the code so a refresh does not show this again.
          try {
            window.location.hash = "/home";
          } catch {
            /* hash is cosmetic here; clearing state is what matters */
          }
          setJoinCode("");
        }}
      />
    );

  // Same role split as the Mini App: /api/board for managers+, /api/mywork for
  // field. A worker sees ONLY their own tasks -- and even if this routing were
  // bypassed, the backend answers a field session with 403 on every /api/web/*
  // financial endpoint, so the split is enforced, not decorative.
  // Mounted alongside whichever screen is showing, not inside one of them: the
  // 402 can come from any write on any page, including the worker view.
  return (
    <>
      {user.accessLevel === "field" ? (
        <Work user={user} onLogout={signOut} />
      ) : (
        <Dashboard user={user} onLogout={signOut} />
      )}
      <TrialExpiredDialog />
    </>
  );
}
