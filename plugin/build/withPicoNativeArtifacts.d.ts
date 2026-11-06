import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
import type { DiagnosticCheckFinding } from './withPicoDiagnostics';
/**
 * Check the artifacts delivered by an installed renderer, when one is present.
 * Panel apps need no renderer. Upstream Viro releases without a provenance
 * manifest remain supported; paired releases additionally verify their hashes.
 * This check never downloads or modifies a dependency.
 */
export declare function checkPicoNativeArtifacts(projectRoot: string): DiagnosticCheckFinding[];
export declare function usesPicoArtifacts(options: ResolvedPicoOptions): boolean;
export declare const withPicoNativeArtifacts: ConfigPlugin<ResolvedPicoOptions>;
//# sourceMappingURL=withPicoNativeArtifacts.d.ts.map