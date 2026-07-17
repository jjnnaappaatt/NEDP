import { ProjectMultiSelect } from "aai-next-dashboard";

const projects = [
  { id: "p1", name: "โครงการตัวอย่าง A", owner: "ผู้วิจัยตัวอย่าง ก" },
  { id: "p2", name: "โครงการตัวอย่าง B", owner: "ผู้วิจัยตัวอย่าง ข" },
];

/** Searchable multi-select for the dashboard's project scope — an all/none toggle, a count pill, and
 *  ผู้รับผิดชอบ subtitles. Shown collapsed with one project selected. */
export function Default() {
  return (
    <div style={{ maxWidth: 420 }}>
      <ProjectMultiSelect projects={projects} selected={new Set(["p1"])}
        onToggle={() => {}} onSetAll={() => {}} />
    </div>
  );
}
