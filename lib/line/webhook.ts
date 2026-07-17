import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { replyMessages, getProfile, manualHeroCard } from "./push";
import { APP_URL, LIFF } from "./liff";
import { matchCommand, isCancel, labelOf, type CommandKey } from "./fuzzy";

/**
 * Inbound LINE bot handler — ported from aai_mvp/app/monitor_routes.py `/line/webhook`. Text commands
 * (help/menu/list/status/manage/leaderboard/report/cancel), RSVP postbacks, issue-capture (via the
 * webhook_await_issue table — serverless has no in-memory state), and follow/unfollow. Replies are text +
 * quick-reply chips (the rich menu remains the primary visual UX).
 */
const MANUAL_URL = `${APP_URL}/manual`; // public guide website (no login)
const MANUAL_IMG = `${APP_URL}/manual/line-manual.png`; // square poster (1040²) for the tappable Flex hero card — add your own branded /manual/line-manual.png when self-hosting

const ABBR = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function reportMonth(now = new Date()): { rm: string; label: string } {
  const b = new Date(now.getTime() + 7 * 3600 * 1000);
  const y = b.getUTCFullYear() + 543, m = b.getUTCMonth() + 1;
  return { rm: `${y}-${String(m).padStart(2, "0")}`, label: `${ABBR[m]} ${y}` };
}
const STATUS_THAI: Record<string, string> = { not_started: "ยังไม่เริ่ม", in_progress: "กำลังดำเนินการ", completed: "เสร็จสิ้น" };

// ── reply helpers ──────────────────────────────────────────────────────────
type QrItem = { type: "action"; action: Record<string, string> };
const chip = (label: string, text: string): QrItem => ({ type: "action", action: { type: "message", label, text } });
const DEFAULT_QR: QrItem[] = [
  chip("📤 ส่งข้อมูล", "ส่งข้อมูล"), chip("📊 สถานะ", "สถานะ"), chip("🏆 อันดับ", "อันดับ"),
  chip("⚙️ จัดการ", "จัดการ"), chip("💬 ช่วยเหลือ", "ช่วยเหลือ"),
  { type: "action", action: { type: "uri", label: "🌐 เปิดเว็บแอป", uri: LIFF("/dashboard") } },
];
const textMsg = (text: string, chips: QrItem[] = DEFAULT_QR) => ({ type: "text", text, quickReply: { items: chips.slice(0, 13) } });
async function reply(replyToken: string | undefined, text: string, chips: QrItem[] = DEFAULT_QR) {
  if (replyToken) await replyMessages(replyToken, [textMsg(text, chips)]);
}

type Db = ReturnType<typeof supabaseAdmin>;
async function projectMap(db: Db): Promise<Map<number, string>> {
  const { data } = await db.from("monitor_projects").select("project_id,project_name").eq("active", true);
  return new Map(((data ?? []) as { project_id: number; project_name: string }[]).map((p) => [p.project_id, p.project_name]));
}
async function activeSubs(db: Db, lineUserId: string): Promise<number[]> {
  const { data } = await db.from("monitor_contacts").select("project_id").eq("line_user_id", lineUserId).eq("active", true);
  return [...new Set(((data ?? []) as { project_id: number }[]).map((c) => c.project_id))];
}

const REGISTER_PROMPT = `🔔 ยังไม่ได้สมัครรับการแจ้งเตือน\nลงทะเบียนรับแจ้งเตือน (เลือกโครงการที่รับผิดชอบ) ที่เว็บแอป:\n${LIFF("/register")}\n\nพิมพ์ "สถานะ" เพื่อดูสถานะการส่งเดือนนี้`;
const MENU_TEXT = `📋 เมนู NEDP — พิมพ์หรือแตะปุ่มด้านล่างได้เลยค่ะ\n• ส่งข้อมูล — ดูโครงการ + กรอกผลรายเดือน\n• สถานะ — ความคืบหน้าการส่งเดือนนี้\n• อันดับ — ลีดเดอร์บอร์ดของโครงการ\n• จัดการ — จัดการ/ยกเลิกการแจ้งเตือน\n• แจ้งปัญหา — แจ้งทีมงาน\n• คู่มือการใช้งาน — พิมพ์ "คู่มือ" หรือแตะ 📖 ด้านล่าง`;
// Help reply gets a tappable คู่มือ button in front of the default chips.
const HELP_QR: QrItem[] = [{ type: "action", action: { type: "uri", label: "📖 คู่มือ", uri: MANUAL_URL } }, ...DEFAULT_QR];
const MANUAL_TEXT = `📖 คู่มือการใช้งาน NEDP\nวิธีใช้ระบบทั้งหมด — เปิดอ่านฉบับเต็มได้ที่:\n${MANUAL_URL}`;
// Reply led by the big, TAPPABLE manual card (giga Flex hero → whole image opens /manual). Text + the 📖
// คู่มือ chip still carry an explicit link. Used for คู่มือ / ช่วยเหลือ / welcome.
async function replyWithManualImage(replyToken: string | undefined, text: string, chips: QrItem[] = HELP_QR) {
  if (replyToken) await replyMessages(replyToken, [manualHeroCard(MANUAL_IMG, MANUAL_URL), textMsg(text, chips)]);
}

// ── issue-capture state (webhook_await_issue table; serverless-safe) ─────────
async function isAwaiting(db: Db, chatId: string): Promise<boolean> {
  const { data } = await db.from("webhook_await_issue").select("expires_at").eq("chat_id", chatId).maybeSingle();
  if (!data) return false;
  if (new Date(data.expires_at as string).getTime() < Date.now()) { await db.from("webhook_await_issue").delete().eq("chat_id", chatId); return false; }
  return true;
}
async function setAwaiting(db: Db, chatId: string) {
  await db.from("webhook_await_issue").upsert({ chat_id: chatId, expires_at: new Date(Date.now() + 15 * 60000).toISOString() });
}
async function clearAwaiting(db: Db, chatId: string) { await db.from("webhook_await_issue").delete().eq("chat_id", chatId); }

const ISSUE_LIMIT_PER_HOUR = 10;
async function issueRateLimited(db: Db, lineUserId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("monitor_issues")
    .select("id", { count: "exact", head: true }).eq("line_user_id", lineUserId).gte("created_at", since);
  return (count ?? 0) >= ISSUE_LIMIT_PER_HOUR;
}

/** Resolve the LINE reporter's name (ผู้แจ้ง) — same footer web reports get. Registered contacts resolve via
 *  monitor_contacts.display_name; unregistered users fall back to the LINE profile name. */
async function lineReporter(db: Db, lineUserId: string): Promise<{ name: string | null; accountId: string | null }> {
  const [{ data: contact }, { data: acct }] = await Promise.all([
    db.from("monitor_contacts").select("display_name").eq("line_user_id", lineUserId)
      .not("display_name", "is", null).order("registered_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("accounts").select("id").eq("line_user_id", lineUserId).maybeSingle(),
  ]);
  let name = (contact?.display_name as string | undefined)?.trim() || null;
  if (!name) {
    const p = await getProfile(lineUserId);
    if (p.ok && p.name) name = p.name.trim();
  }
  return { name, accountId: (acct?.id as string | undefined) ?? null };
}

async function createIssue(db: Db, description: string, lineUserId: string): Promise<string> {
  const { name, accountId } = await lineReporter(db, lineUserId);
  const body = [description.trim(), name ? `— ผู้แจ้ง: ${name}` : null].filter(Boolean).join("\n").slice(0, 2000);
  const { data } = await db.from("monitor_issues")
    .insert({ description: body, line_user_id: lineUserId, reporter_account_id: accountId, status: "open", created_at: new Date().toISOString() })
    .select("id").single();
  if (!data) throw new Error("issue insert failed");
  const id = Number(data.id);
  const ticket = `NEDP-${1000 + id}`;
  await db.from("monitor_issues").update({ ticket }).eq("id", id);
  return ticket;
}

// ── command handlers ────────────────────────────────────────────────────────
async function cmdList(db: Db, targetId: string, replyToken?: string) {
  const subs = await activeSubs(db, targetId);
  if (!subs.length) return reply(replyToken, REGISTER_PROMPT);
  const pmap = await projectMap(db);
  const lines = subs.map((id) => `• ${pmap.get(id) ?? `#${id}`}`).join("\n");
  await reply(replyToken, `📋 โครงการที่คุณดูแล (${subs.length})\n${lines}\n\nกรอกผลรายเดือนที่เว็บแอป:\n${LIFF("/submit")}`);
}
async function cmdStatus(db: Db, targetId: string, replyToken?: string) {
  const subs = await activeSubs(db, targetId);
  if (!subs.length) return reply(replyToken, REGISTER_PROMPT);
  const pmap = await projectMap(db);
  const { rm, label } = reportMonth();
  const { data: submissions } = await db.from("monitor_submissions").select("project_id,status").in("project_id", subs).eq("report_month", rm);
  const statusOf = new Map(((submissions ?? []) as { project_id: number; status: string }[]).map((s) => [s.project_id, s.status]));
  let done = 0;
  const lines = subs.map((id) => {
    const sv = statusOf.get(id) ?? "not_started";
    if (sv === "completed") done++;
    const icon = sv === "completed" ? "✅" : sv === "in_progress" ? "🟡" : "⬜";
    return `${icon} ${pmap.get(id) ?? `#${id}`} — ${STATUS_THAI[sv] ?? sv}`;
  }).join("\n");
  await reply(replyToken, `📊 สถานะการส่ง · เดือน ${label}\nส่งแล้ว ${done}/${subs.length} โครงการ\n\n${lines}\n\nจัดการสถานะพื้นที่: ${LIFF("/status")}`);
}
async function cmdManage(db: Db, targetId: string, replyToken?: string) {
  const subs = await activeSubs(db, targetId);
  if (!subs.length) return reply(replyToken, REGISTER_PROMPT);
  const pmap = await projectMap(db);
  const lines = subs.map((id) => `• ${pmap.get(id) ?? `#${id}`}\n   ยกเลิก: พิมพ์ "ยกเลิก ${id}"`).join("\n");
  await reply(replyToken, `⚙️ จัดการการแจ้งเตือน (${subs.length} โครงการ)\n${lines}\n\nยกเลิกทุกโครงการ: พิมพ์ "ยกเลิกทั้งหมด"`);
}
async function cmdLeaderboard(replyToken?: string) {
  const { label } = reportMonth();
  await reply(replyToken, `🏆 อันดับการส่งข้อมูล · เดือน ${label}\nส่งเร็ว + ครบ = แต้มเยอะ\n\nดูอันดับเต็มที่เว็บแอป:\n${LIFF("/leaderboard")}`);
}
async function cmdReport(db: Db, targetId: string, replyToken?: string) {
  await setAwaiting(db, targetId);
  const qr: QrItem[] = [chip("บอทไม่ตอบ", "บอทไม่ตอบสนอง"), chip("ลิงก์เสีย", "ลิงก์ส่งข้อมูลเปิดไม่ได้"), chip("ข้อมูลผิด", "ข้อมูลโครงการไม่ถูกต้อง")];
  await reply(replyToken, `🛠️ แจ้งปัญหา\nพิมพ์รายละเอียดปัญหาที่พบ แล้วส่งมาที่แชตนี้ได้เลยค่ะ ทีมงานพร้อมช่วยเหลือ`, qr);
}

async function dispatchCommand(db: Db, cmd: Exclude<CommandKey, "cancel">, targetId: string, replyToken?: string) {
  switch (cmd) {
    case "help": case "menu": return replyWithManualImage(replyToken, MENU_TEXT, HELP_QR);
    case "manual": return replyWithManualImage(replyToken, MANUAL_TEXT, HELP_QR);
    case "list": return cmdList(db, targetId, replyToken);
    case "status": return cmdStatus(db, targetId, replyToken);
    case "manage": return cmdManage(db, targetId, replyToken);
    case "leaderboard": return cmdLeaderboard(replyToken);
    case "report": return cmdReport(db, targetId, replyToken);
  }
}

async function handleCancel(db: Db, text: string, targetId: string, replyToken?: string) {
  const arg = text
    .replace("ยกเลิกทั้งหมด", "ทั้งหมด").replace("ยกเลิก", "").replace("unsubscribe", "")
    .replace("unsub", "").replace("stop", "").replace("เลิก", "").trim();
  const subs = await activeSubs(db, targetId);
  const pmap = await projectMap(db);
  const unsub = async (pid: number) => {
    await db.from("monitor_contacts").update({ active: false }).eq("line_user_id", targetId).eq("project_id", pid);
    try { await db.rpc("web_unsubscribe_by_line", { p_pid: pid, p_line_user_id: targetId }); } catch { /* best-effort */ }
  };

  if (["ทั้งหมด", "all", "*"].includes(arg)) {
    for (const pid of subs) await unsub(pid);
    return reply(replyToken, "ยกเลิกการแจ้งเตือนทุกโครงการแล้ว ✅\nลงทะเบียนใหม่ได้ที่เว็บแอปทุกเมื่อ");
  }
  if (arg) {
    const pid = subs.find((id) => String(id) === arg || (pmap.get(id) ?? "").includes(arg));
    if (pid != null) { await unsub(pid); return reply(replyToken, `ยกเลิกการแจ้งเตือนแล้ว ✅\n${pmap.get(pid) ?? `#${pid}`}`); }
    return reply(replyToken, "ไม่พบโครงการตามที่ระบุในรายการที่สมัครไว้");
  }
  if (!subs.length) return reply(replyToken, REGISTER_PROMPT);
  return cmdManage(db, targetId, replyToken);
}

async function handleText(db: Db, text: string, targetId: string | null, replyToken?: string) {
  const t = (text || "").trim();
  // issue-capture FSM: free text is captured; an exact command / cancel bails out and is processed normally
  if (targetId && (await isAwaiting(db, targetId))) {
    const [cmd, exact] = matchCommand(t);
    if ((exact && cmd) || isCancel(t)) {
      await clearAwaiting(db, targetId);
    } else {
      await clearAwaiting(db, targetId);
      if (await issueRateLimited(db, targetId)) {
        return reply(replyToken, "คุณแจ้งปัญหาบ่อยเกินไปในช่วงนี้ กรุณารอสักครู่แล้วลองใหม่อีกครั้งค่ะ 🙏");
      }
      const ticket = await createIssue(db, t, targetId);
      return reply(replyToken, `✅ รับเรื่องแล้ว\nหมายเลขติดตาม: ${ticket}\nทีมงานจะตรวจสอบและดำเนินการโดยเร็วที่สุดค่ะ`);
    }
  }
  if (isCancel(t)) { if (targetId) return handleCancel(db, t, targetId, replyToken); }

  const [cmd, , suggestions] = matchCommand(t);
  if (cmd && targetId) return dispatchCommand(db, cmd, targetId, replyToken);
  if (suggestions.length) {
    const chips = suggestions.map((c) => chip(labelOf(c), labelOf(c)));
    return reply(replyToken, `คุณหมายถึง… ${suggestions.map(labelOf).join(" / ")} ?`, chips);
  }
  if (targetId && (await activeSubs(db, targetId)).length) return reply(replyToken, MENU_TEXT);
  return reply(replyToken, REGISTER_PROMPT);
}

async function handleRsvp(db: Db, data: string, targetId: string | null, replyToken?: string) {
  const [tag, vidS, resp] = data.split(":");
  if (tag !== "rsvp" || (resp !== "yes" && resp !== "no") || !targetId) return;
  const vid = Number(vidS);
  const { data: visit } = await db.from("monitor_site_visits").select("id,title,event_when,venue").eq("id", vid).maybeSingle();
  if (!visit) return;
  const now = new Date().toISOString();
  const { data: existing } = await db.from("monitor_site_visit_rsvps").select("id").eq("visit_id", vid).eq("line_user_id", targetId).maybeSingle();
  if (existing) {
    await db.from("monitor_site_visit_rsvps").update({ response: resp, responded_at: now }).eq("id", existing.id);
  } else {
    const { data: c } = await db.from("monitor_contacts").select("display_name").eq("line_user_id", targetId).limit(1).maybeSingle();
    await db.from("monitor_site_visit_rsvps").insert({ visit_id: vid, line_user_id: targetId, contact_name: c?.display_name ?? null, response: resp, responded_at: now });
  }
  let msg = resp === "yes" ? "✅ บันทึกแล้ว — คุณตอบรับว่า จะเข้าร่วม ค่ะ" : "✅ บันทึกแล้ว — คุณตอบว่า ไม่สะดวกเข้าร่วม ค่ะ";
  msg += `\n📣 ${visit.title}`;
  if (visit.event_when) msg += `\n🗓 ${visit.event_when}`;
  if (visit.venue) msg += `\n📍 ${visit.venue}`;
  if (replyToken) await replyMessages(replyToken, [{ type: "text", text: msg }]);
}

type LineEvent = {
  type?: string; replyToken?: string;
  source?: { userId?: string; groupId?: string; roomId?: string };
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

/** Process a LINE webhook body. Each event is isolated (one failure doesn't abort the batch). */
export async function handleWebhook(body: { events?: LineEvent[] }): Promise<void> {
  const db = supabaseAdmin();
  for (const ev of body.events ?? []) {
    const replyToken = ev.replyToken;
    const src = ev.source ?? {};
    const targetId = src.groupId || src.roomId || src.userId || null;
    try {
      if (ev.type === "follow" || ev.type === "join") {
        await replyWithManualImage(replyToken, `🔔 ยินดีต้อนรับสู่ NEDP — ระบบติดตามและแจ้งเตือนรายเดือน\n\nลงทะเบียนรับแจ้งเตือน (เลือกโครงการที่รับผิดชอบ) ที่เว็บแอป:\n${LIFF("/register")}\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมด`);
      } else if (ev.type === "unfollow" || ev.type === "leave") {
        if (targetId) await db.from("monitor_contacts").update({ active: false }).eq("line_user_id", targetId);
      } else if (ev.type === "postback") {
        await handleRsvp(db, ev.postback?.data ?? "", targetId, replyToken);
      } else if (ev.type === "message" && ev.message?.type === "text") {
        await handleText(db, ev.message.text ?? "", targetId, replyToken);
      }
    } catch (e) {
      try {
        const { rm } = reportMonth();
        await db.from("monitor_notifications").insert({
          project_id: null, report_month: rm, channel: "line", recipient: targetId,
          reminder_type: "error", status: "failed", error: String((e as Error).message).slice(0, 500), sent_at: new Date().toISOString(),
        });
      } catch { /* ignore log failure */ }
      try { if (replyToken) await replyMessages(replyToken, [{ type: "text", text: "ขออภัยค่ะ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะคะ 🙏" }]); } catch { /* ignore */ }
    }
  }
}
