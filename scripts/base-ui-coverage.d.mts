export interface ExceptionEntry { component: string; part?: string; reason: string }
export interface ComponentSpec { component: string; namespace: string | null; parts: string[] }
export interface SourceFile { path: string; text: string }
export interface Usage { dirs: string[]; members: string[] }
export interface CoverageRow { component: string; namespace: string | null; dirs: string[]; total: number; used: string[]; missing: string[]; waived: string[]; covered: boolean; waivedComponent: boolean }
export function listComponents(exportsMap: Record<string, unknown>): string[];
export function namespaceOf(component: string, mod: Record<string, unknown>): { name: string | null; parts: string[] };
export function scanSources(files: SourceFile[]): Record<string, Usage>;
export function validateExceptions(exceptions: unknown, components: ComponentSpec[]): string[];
export function computeCoverage(components: ComponentSpec[], usages: Record<string, Usage>, exceptions: unknown): { rows: CoverageRow[]; failures: string[] };
export function renderMarkdown(rows: CoverageRow[], failures: string[]): string;
export function runCoverage(options?: { root?: string; baseUiDir?: string; exceptionsPath?: string }): { rows: CoverageRow[]; failures: string[]; markdown: string };
