/**
 * NEDP screening instrument v1.0 — the port of `V1_SCHEMA` from aai_mvp/nedp/models.py.
 * `nedp.v1.json` is extracted VERBATIM from the Python source (124 questions, 24 tools, 4 sections:
 * general/fall/bmd/nutrition), so there is no hand-transcription drift. Here we only add `version`/`kind`
 * and tag each section's `module` (== its id) to fit the QuestionnaireSchema type.
 */
import raw from "./nedp.v1.json";
import type { QuestionnaireSchema, QSection } from "./schema";

export const NEDP_V1: QuestionnaireSchema = {
  version: "nedp-v1.0",
  kind: "clinical",
  sections: (raw.sections as unknown as QSection[]).map((s) => ({ ...s, module: s.id })),
  tools: raw.tools as QuestionnaireSchema["tools"],
};
