import { useEffect, useState } from "react";
import { getAssignees, createTask } from "../api/client";

// Create a task. Mirrors the Mini App's /assign flow: pick who, say what, set when.
// The deadline defaults to tomorrow 18:00 -- a task with no date is a task nobody
// does.

export default function NewTask({ onClose, onSaved }) {
  const [people, setPeople] = useState([]);
  const [assignee, setAssignee] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getAssignees()
      .then((p) => {
        setPeople(p);
        if (p.length) setAssignee(p[0].id);
      })
      .catch((e) => setErr(e.message || "Ishchilarni yuklab bo'lmadi."));

    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    setDeadline(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    );
  }, []);

  const save = async () => {
    setErr("");
    if (!assignee) return setErr("Ishchini tanlang.");
    if (!title.trim()) return setErr("Vazifa nomini yozing.");
    setBusy(true);
    try {
      await createTask([
        {
          assignee_id: assignee,
          title: title.trim(),
          description: desc.trim() || null,
          deadline: deadline || null,
          mode: "text",
        },
      ]);
      onSaved();
    } catch (e) {
      setErr(e.message || "Saqlab bo'lmadi.");
      setBusy(false);
    }
  };

  return (
    <div className="modal__wrap" onClick={onClose}>
      <div className="axp" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="axp__body" style={{ paddingTop: 22 }}>
          <h3 className="modal__title">Yangi vazifa</h3>

          <label className="fld">
            <span>Kimga</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role}
                </option>
              ))}
            </select>
          </label>

          <label className="fld">
            <span>Vazifa</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="masalan: 3-qavatga beton quyish"
            />
          </label>

          <label className="fld">
            <span>Tafsilot (ixtiyoriy)</span>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="qo'shimcha ko'rsatma"
            />
          </label>

          <label className="fld">
            <span>Muddat</span>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>

          {err && <div className="modal__err">{err}</div>}
        </div>

        <div className="axp__foot">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Bekor
          </button>
          <button className="btn-primary axp__save" onClick={save} disabled={busy}>
            {busy ? "Yuborilmoqda…" : "Yuborish"}
          </button>
        </div>
      </div>
    </div>
  );
}
