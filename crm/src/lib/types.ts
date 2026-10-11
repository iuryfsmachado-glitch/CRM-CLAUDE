export type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
  kind: "open" | "won" | "lost";
};

export type Source = { id: string; name: string };

export type Lead = {
  id: string;
  stage_id: string;
  source_id: string | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  position: number;
  created_at: string;
};

export type Note = { id: string; lead_id: string; content: string; created_at: string };

export type Task = {
  id: string;
  lead_id: string;
  title: string;
  remind_at: string;
  completed_at: string | null;
};

export type ActionResult<T = undefined> =
  | { ok: false; error: string }
  | { ok: true; data: T };
