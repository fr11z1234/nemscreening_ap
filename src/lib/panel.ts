/**
 * Svaret fra en handling i et af kontorets paneler.
 *
 * Enten en fejl eller en kvittering, aldrig begge. Ligger for sig, saa
 * materialepanelet og indstillingerne deler den samme — og saa en ny
 * handling ikke opfinder sin egen form for «det gik godt».
 */
export type PanelState = { error?: string; ok?: string };
