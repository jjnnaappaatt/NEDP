/**
 * Build-time registry of canonical questionnaire schemas. Used to SEED / sync the `questionnaires` table
 * (an admin "sync" action pushes each entry via web_upsert_questionnaire). At runtime the app reads the
 * assigned schema from the DB (so it can be versioned/edited), but this is the source of truth for the
 * ported instruments. `code`+`version` are the DB unique key; `schema.version` is a display label.
 */
import type { QuestionnaireSchema } from "./schema";
import { NEDP_V1 } from "./nedp.v1";

export interface RegistryEntry {
  code: string;
  version: string;
  title: string;
  schema: QuestionnaireSchema;
}

export const QUESTIONNAIRE_REGISTRY: RegistryEntry[] = [
  { code: "nedp", version: "v1.0", title: "NEDP คัดกรองสูงวัย (หกล้ม · กระดูก · โภชนาการ)", schema: NEDP_V1 },
  // survey-NN entries are appended here as they are ported (kind:"survey", no tools)
];

export function getRegistryEntry(code: string, version: string): RegistryEntry | null {
  return QUESTIONNAIRE_REGISTRY.find((e) => e.code === code && e.version === version) ?? null;
}
