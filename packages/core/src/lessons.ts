import type {
  ChangedField,
  JsonObject,
  JsonValue,
} from "@agentclutch/action-card";
import type { ActionProposal, ClutchDecision } from "@agentclutch/loop";

export const LESSON_CONFIDENCE_THRESHOLD = 0.75;
export const NEW_LESSON_CONFIDENCE = 0.8;

export interface Lesson {
  id: string;
  action_kind: string;
  target_app: string;
  field: string;
  original_value: JsonValue;
  corrected_value: JsonValue;
  confidence: number;
  created_at: string;
  usage_count: number;
  trusted?: boolean;
  auto_apply?: boolean;
}

export interface AppliedLesson {
  id: string;
  action_kind: string;
  target_app: string;
  field: string;
  original_value: JsonValue;
  corrected_value: JsonValue;
  confidence: number;
  source: "learned from prior correction";
}

export interface LessonApplicationResult {
  proposal: ActionProposal;
  appliedLessons: AppliedLesson[];
}

export type LessonDecision = "accepted" | "rejected" | "disabled";

interface FsPromises {
  readFile(path: string, encoding: "utf8"): Promise<string>;
  mkdir(path: string, options: { recursive: boolean }): Promise<unknown>;
  writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
}

export function lessonsFilePath(rootDir = ".agentclutch"): string {
  return `${trimTrailingSlash(rootDir)}/lessons/lessons.json`;
}

export async function loadLessons(rootDir = ".agentclutch"): Promise<Lesson[]> {
  const { readFile } = await fsPromises();

  let file: string;

  try {
    file = await readFile(lessonsFilePath(rootDir), "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }

  if (file.trim() === "") return [];

  const parsed = JSON.parse(file) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("AgentClutch lessons file must contain a JSON array.");
  }

  return parsed.map((item, index) => {
    if (!isLesson(item)) {
      throw new Error(`Invalid AgentClutch lesson at index ${index}.`);
    }

    return item;
  });
}

export async function saveLessons(
  lessons: readonly Lesson[],
  rootDir = ".agentclutch",
): Promise<void> {
  const { mkdir, writeFile } = await fsPromises();

  await mkdir(`${trimTrailingSlash(rootDir)}/lessons`, { recursive: true });
  await writeFile(
    lessonsFilePath(rootDir),
    `${JSON.stringify(dedupeLessons(lessons), null, 2)}\n`,
    "utf8",
  );
}

export function applyLessonsToProposal(
  proposal: ActionProposal,
  lessons: readonly Lesson[],
  confidenceThreshold = LESSON_CONFIDENCE_THRESHOLD,
): LessonApplicationResult {
  const targetApp = targetAppForProposal(proposal);
  const applicableLessons = lessons
    .filter((lesson) => lesson.confidence >= confidenceThreshold)
    .filter(
      (lesson) =>
        lesson.action_kind === proposal.proposedAction.kind &&
        lesson.target_app === targetApp,
    );

  if (applicableLessons.length === 0) {
    return { proposal, appliedLessons: [] };
  }

  let nextProposal = cloneProposal(proposal);
  const appliedLessons: AppliedLesson[] = [];

  for (const lesson of applicableLessons) {
    const applied = applyLesson(nextProposal, lesson);

    if (applied === undefined) continue;

    nextProposal = applied.proposal;
    appliedLessons.push(...applied.appliedLessons);
  }

  if (appliedLessons.length === 0) {
    return { proposal, appliedLessons: [] };
  }

  nextProposal = attachLessonMetadata(nextProposal, appliedLessons);

  return {
    proposal: nextProposal,
    appliedLessons,
  };
}

export function applyAutoApplyLessonsToProposal(
  proposal: ActionProposal,
  lessons: readonly Lesson[],
  confidenceThreshold = LESSON_CONFIDENCE_THRESHOLD,
): LessonApplicationResult {
  return applyLessonsToProposal(
    proposal,
    lessons.filter((lesson) => lesson.auto_apply === true || lesson.trusted === true),
    confidenceThreshold,
  );
}

export function captureLessonsFromEdit(
  proposal: ActionProposal,
  decision: ClutchDecision,
  createdAt = new Date().toISOString(),
): Lesson[] {
  if (decision.type !== "edit") return [];

  const lessons: Lesson[] = [];

  for (const patch of decision.patch) {
    if (patch.op !== "replace") continue;

    const field = fieldFromChangedFieldPatch(patch.path);
    if (field === undefined) continue;

    const original =
      toJsonValue(patch.from) ?? fieldValueFromProposal(proposal, field);
    const corrected = toJsonValue(patch.value);

    if (original === undefined || corrected === undefined) continue;
    if (jsonValueEquals(original, corrected)) continue;

    lessons.push({
      id: lessonId(
        proposal.proposedAction.kind,
        targetAppForProposal(proposal),
        field,
        original,
      ),
      action_kind: proposal.proposedAction.kind,
      target_app: targetAppForProposal(proposal),
      field,
      original_value: original,
      corrected_value: corrected,
      confidence: NEW_LESSON_CONFIDENCE,
      created_at: createdAt,
      usage_count: 0,
    });
  }

  return dedupeLessons(lessons);
}

export function upsertLessons(
  existing: readonly Lesson[],
  candidates: readonly Lesson[],
): Lesson[] {
  return dedupeLessons([...existing, ...candidates]);
}

export function updateLessonsAfterDecision(
  lessons: readonly Lesson[],
  appliedLessons: readonly AppliedLesson[],
  decision: LessonDecision,
): Lesson[] {
  if (appliedLessons.length === 0) return [...lessons];

  const appliedIds = new Set(appliedLessons.map((lesson) => lesson.id));

  return lessons.map((lesson) => {
    if (!appliedIds.has(lesson.id)) return lesson;

    switch (decision) {
      case "accepted":
        return {
          ...lesson,
          confidence: clampConfidence(lesson.confidence + 0.05),
          usage_count: lesson.usage_count + 1,
        };
      case "rejected":
        return {
          ...lesson,
          confidence: clampConfidence(lesson.confidence - 0.2),
        };
      case "disabled":
        return {
          ...lesson,
          confidence: 0,
        };
    }
  });
}

export function appliedLessonsFromActionCardMetadata(
  metadata: JsonObject | undefined,
): AppliedLesson[] {
  const value = metadata?.["applied_lessons"];

  if (!Array.isArray(value)) return [];

  const lessons: AppliedLesson[] = [];

  for (const item of value) {
    if (isAppliedLesson(item)) lessons.push(item);
  }

  return lessons;
}

export function lessonSummary(lesson: AppliedLesson | Lesson): string {
  return `${lesson.field}: ${formatJsonValue(lesson.original_value)} -> ${formatJsonValue(lesson.corrected_value)}`;
}

export function lessonEvidence(lesson: AppliedLesson): ActionProposal["evidence"][number] {
  return {
    label: "Applied Lesson",
    source: `lesson:${lesson.id}`,
    summary: `${lessonSummary(lesson)}; Source: learned from prior correction`,
  };
}

function applyLesson(
  proposal: ActionProposal,
  lesson: Lesson,
): LessonApplicationResult | undefined {
  const value = fieldValueFromProposal(proposal, lesson.field);

  if (value === undefined || !jsonValueEquals(value, lesson.original_value)) {
    return undefined;
  }

  const applied: AppliedLesson = {
    id: lesson.id,
    action_kind: lesson.action_kind,
    target_app: lesson.target_app,
    field: lesson.field,
    original_value: lesson.original_value,
    corrected_value: lesson.corrected_value,
    confidence: lesson.confidence,
    source: "learned from prior correction",
  };

  let next = replaceVisibleField(proposal, lesson);
  next = replaceMetadataChangedField(next, lesson);
  next = replaceRawInputChangedField(next, lesson);
  next = {
    ...next,
    evidence: [...next.evidence, lessonEvidence(applied)],
  };

  return {
    proposal: next,
    appliedLessons: [applied],
  };
}

function attachLessonMetadata(
  proposal: ActionProposal,
  appliedLessons: AppliedLesson[],
): ActionProposal {
  return {
    ...proposal,
    metadata: {
      ...(proposal.metadata ?? {}),
      applied_lessons: appliedLessons.map(appliedLessonToJson),
    },
  };
}

function replaceVisibleField(
  proposal: ActionProposal,
  lesson: Lesson,
): ActionProposal {
  const fields = proposal.visibleContext?.fields;

  if (fields === undefined || !(lesson.field in fields)) return proposal;

  return {
    ...proposal,
    visibleContext: {
      ...proposal.visibleContext,
      fields: {
        ...fields,
        [lesson.field]: lesson.corrected_value,
      },
    },
  };
}

function replaceMetadataChangedField(
  proposal: ActionProposal,
  lesson: Lesson,
): ActionProposal {
  const changedFields = changedFieldsFromUnknown(
    proposal.metadata?.["changedFields"],
  );

  if (changedFields === undefined) return proposal;

  return {
    ...proposal,
    metadata: {
      ...(proposal.metadata ?? {}),
      changedFields: replaceChangedField(changedFields, lesson),
    },
  };
}

function replaceRawInputChangedField(
  proposal: ActionProposal,
  lesson: Lesson,
): ActionProposal {
  const rawInput = proposal.proposedAction.rawInput;

  if (!isRecord(rawInput)) return proposal;

  const changedFields = changedFieldsFromUnknown(rawInput["changedFields"]);

  if (changedFields === undefined) return proposal;

  return {
    ...proposal,
    proposedAction: {
      ...proposal.proposedAction,
      rawInput: {
        ...rawInput,
        changedFields: replaceChangedField(changedFields, lesson),
      },
    },
  };
}

function replaceChangedField(
  changedFields: readonly ChangedField[],
  lesson: Lesson,
): ChangedField[] {
  return changedFields.map((field) => {
    if (
      field.field !== lesson.field ||
      !jsonValueEquals(field.after, lesson.original_value)
    ) {
      return field;
    }

    return {
      ...field,
      before: field.before ?? lesson.original_value,
      after: lesson.corrected_value,
    };
  });
}

function fieldValueFromProposal(
  proposal: ActionProposal,
  field: string,
): JsonValue | undefined {
  const metadataFields = changedFieldsFromUnknown(
    proposal.metadata?.["changedFields"],
  );
  const metadataValue = metadataFields?.find((item) => item.field === field);

  if (metadataValue !== undefined) return metadataValue.after;

  const rawInput = proposal.proposedAction.rawInput;
  if (isRecord(rawInput)) {
    const rawFields = changedFieldsFromUnknown(rawInput["changedFields"]);
    const rawValue = rawFields?.find((item) => item.field === field);

    if (rawValue !== undefined) return rawValue.after;
  }

  return toJsonValue(proposal.visibleContext?.fields?.[field]);
}

function changedFieldsFromUnknown(value: unknown): ChangedField[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const changedFields = value.filter(isChangedField);
  return changedFields.length === 0 ? undefined : changedFields;
}

function isChangedField(value: unknown): value is ChangedField {
  if (!isRecord(value) || typeof value["field"] !== "string") return false;

  const after = toJsonValue(value["after"]);
  if (after === undefined) return false;

  return true;
}

function fieldFromChangedFieldPatch(path: string): string | undefined {
  const prefix = "/changed_fields/";
  const suffix = "/after";

  if (!path.startsWith(prefix) || !path.endsWith(suffix)) return undefined;

  return unescapeJsonPointerSegment(path.slice(prefix.length, -suffix.length));
}

function unescapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function appliedLessonToJson(lesson: AppliedLesson): JsonObject {
  return {
    id: lesson.id,
    action_kind: lesson.action_kind,
    target_app: lesson.target_app,
    field: lesson.field,
    original_value: lesson.original_value,
    corrected_value: lesson.corrected_value,
    confidence: lesson.confidence,
    source: lesson.source,
  };
}

function isAppliedLesson(value: unknown): value is AppliedLesson {
  if (!isRecord(value)) return false;

  return (
    typeof value["id"] === "string" &&
    typeof value["action_kind"] === "string" &&
    typeof value["target_app"] === "string" &&
    typeof value["field"] === "string" &&
    toJsonValue(value["original_value"]) !== undefined &&
    toJsonValue(value["corrected_value"]) !== undefined &&
    typeof value["confidence"] === "number" &&
    value["source"] === "learned from prior correction"
  );
}

function isLesson(value: unknown): value is Lesson {
  if (!isRecord(value)) return false;
  const usageCount = value["usage_count"];

  return (
    typeof value["id"] === "string" &&
    typeof value["action_kind"] === "string" &&
    typeof value["target_app"] === "string" &&
    typeof value["field"] === "string" &&
    toJsonValue(value["original_value"]) !== undefined &&
    toJsonValue(value["corrected_value"]) !== undefined &&
    typeof value["confidence"] === "number" &&
    value["confidence"] >= 0 &&
    value["confidence"] <= 1 &&
    typeof value["created_at"] === "string" &&
    Number.isInteger(usageCount) &&
    typeof usageCount === "number" &&
    usageCount >= 0
  );
}

function dedupeLessons(lessons: readonly Lesson[]): Lesson[] {
  const deduped = new Map<string, Lesson>();

  for (const lesson of lessons) {
    const key = lessonKey(lesson);
    const existing = deduped.get(key);

    if (existing === undefined) {
      deduped.set(key, lesson);
      continue;
    }

    deduped.set(key, {
      ...lesson,
      id: existing.id,
      created_at: existing.created_at,
      confidence: clampConfidence(
        Math.max(existing.confidence, lesson.confidence) + 0.1,
      ),
      usage_count: existing.usage_count,
    });
  }

  return [...deduped.values()];
}

function lessonKey(lesson: Lesson): string {
  return `${lesson.action_kind}\u0000${lesson.target_app}\u0000${lesson.field}\u0000${JSON.stringify(lesson.original_value)}`;
}

function lessonId(
  actionKind: string,
  targetApp: string,
  field: string,
  originalValue: JsonValue,
): string {
  return `lesson_${stableHash(
    `${actionKind}\u0000${targetApp}\u0000${field}\u0000${JSON.stringify(originalValue)}`,
  )}`;
}

function stableHash(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function targetAppForProposal(proposal: ActionProposal): string {
  return proposal.proposedAction.targetApp ?? "unknown";
}

function formatJsonValue(value: JsonValue): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function cloneProposal(proposal: ActionProposal): ActionProposal {
  return {
    ...proposal,
    proposedAction: {
      ...proposal.proposedAction,
      ...(proposal.proposedAction.rawInput === undefined
        ? {}
        : { rawInput: cloneUnknown(proposal.proposedAction.rawInput) }),
    },
    ...(proposal.visibleContext === undefined
      ? {}
      : {
          visibleContext: {
            ...proposal.visibleContext,
            ...(proposal.visibleContext.fields === undefined
              ? {}
              : { fields: { ...proposal.visibleContext.fields } }),
          },
        }),
    evidence: [...proposal.evidence],
    ...(proposal.metadata === undefined
      ? {}
      : { metadata: cloneUnknown(proposal.metadata) as Record<string, unknown> }),
  };
}

function cloneUnknown(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const values: JsonValue[] = [];

    for (const item of value) {
      const jsonValue = toJsonValue(item);
      if (jsonValue !== undefined) values.push(jsonValue);
    }

    return values;
  }

  if (isRecord(value)) {
    const object: JsonObject = {};

    for (const [key, item] of Object.entries(value)) {
      const jsonValue = toJsonValue(item);
      if (jsonValue !== undefined) object[key] = jsonValue;
    }

    return object;
  }

  return undefined;
}

function jsonValueEquals(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/[\\/]+$/, "");
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function fsPromises(): Promise<FsPromises> {
  const specifier = "node:fs/promises";

  return (await import(specifier)) as FsPromises;
}
