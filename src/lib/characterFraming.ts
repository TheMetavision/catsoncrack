/**
 * Tighter crops for character portraits whose character sits small inside a lot of
 * empty background, so they fill their card, avatar or carousel slot like the rest
 * of the cast. Keyed by Sanity image asset id; the value is a CDN `rect`
 * (left,top,width,height in original pixels). The image in Sanity is untouched.
 * sanityImg() applies these automatically.
 */
export const CHARACTER_FRAMING: Record<string, string> = {
	'8b04f4a12236d7ec8c20899cdc291114a997aaf1': '177,458,2300,3409', // Captain Claw
	'4f942caa9ebc18d92d2aaecb7d254c6eb4bffe3e': '186,184,2461,3647', // Felix
	'b94bd80db166290ba4af9dbe448641c4357a0eff': '0,437,2311,3424', // Fido
	'6ea82b36b644f6617cc75e5730861caa10b58d80': '78,118,1282,1930', // Terry
	'5736fef4e970e07e388db618ec9445ee8daefa1b': '262,786,2075,3074', // Trixie
};
