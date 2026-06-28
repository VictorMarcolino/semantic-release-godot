export class GodotPluginError extends Error {
	public override readonly name = "SemanticReleaseError";
	public readonly semanticRelease = true;

	public constructor(
		public readonly code: string,
		message: string,
		public readonly details?: string,
	) {
		super(message);
	}
}
