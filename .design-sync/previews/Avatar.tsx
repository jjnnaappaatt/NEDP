import { Avatar } from "aai-next-dashboard";

// Account shape the Avatar reads. Without pictureUrl it renders a deterministic emoji on the
// person/project's colour disc (keyed by id + sourceProjectId); with one, it shows the photo.
const acct = (id: string, name: string, avatarColor: string, sourceProjectId?: number) =>
  ({ id, name, avatarColor, sourceProjectId });

/** Default look: a stable professional emoji on a brand-coloured disc, one per project. */
export function Emoji() {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <Avatar account={acct("p1", "จังหวัดตัวอย่าง ก", "#1a56db", 1)} size={48} />
      <Avatar account={acct("p2", "จังหวัดตัวอย่าง ข", "#0e9f6e", 2)} size={48} />
      <Avatar account={acct("p3", "มหาวิทยาลัยตัวอย่าง ก", "#d97706", 3)} size={48} />
      <Avatar account={acct("p4", "มหาวิทยาลัยตัวอย่าง ข", "#7c3aed", 4)} size={48} />
    </div>
  );
}

/** A linked LINE profile photo wins over the emoji (used for people + project avatars). */
export function Photo() {
  const pic =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>" +
        "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
        "<stop offset='0' stop-color='#00d4a4'/><stop offset='1' stop-color='#1a56db'/></linearGradient></defs>" +
        "<circle cx='48' cy='48' r='48' fill='url(#g)'/>" +
        "<text x='48' y='63' font-size='42' text-anchor='middle' fill='white' font-family='sans-serif'>JJ</text></svg>",
    );
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <Avatar account={{ id: "u", name: "JJ", avatarColor: "#1a56db", pictureUrl: pic }} size={32} />
      <Avatar account={{ id: "u", name: "JJ", avatarColor: "#1a56db", pictureUrl: pic }} size={48} />
      <Avatar account={{ id: "u", name: "JJ", avatarColor: "#1a56db", pictureUrl: pic }} size={64} />
    </div>
  );
}
