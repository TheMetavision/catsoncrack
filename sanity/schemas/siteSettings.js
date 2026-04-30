// schemas/siteSettings.js — drop-in replacement for the Cats On Crack Studio
//
// Project: 8ksun996 (Cats On Crack)  Workspace: catsoncrack  Dataset: production
//
// What this file does
// -------------------
// Defines the singleton siteSettings document type. The 16 existing fields
// (verified live via MCP get_schema 2026-04-30) are preserved verbatim with
// the same types and validation. NOTE: this drop-in cannot recover initialValue
// strings that exist in Alan's local siteSettings.js but aren't visible in the
// deployed schema. If your local file has rich defaults you want preserved,
// use siteSettings-themeAudio-PATCH.js instead — it adds just the 5 new fields
// without touching the existing 16.
//
// What's new
// ----------
// 5 fields appended for the IP brand theme-tune feature (build #4 of 4 — FINAL —
// see /handoffs/arc-to-axiom-coc-theme-tune-spec-2026-04-30.md):
//   - themeTrackTitle             (string, default "Cats On Crack Main Theme")
//   - themeTrackArtist            (string, optional, default placeholder)
//   - themeAudioFile              (file — main theme .mp3)
//   - themeEnabled                (boolean, default true — kill switch)
//   - themeAutoplayPolicy         (string, locked to "click-to-play")
//
// Note: NO themeEngineSfxFile (BB-only — COC has no SFX prologue per Arc I.2).
//
// All 5 sit inside a collapsible `themeAudio` fieldset so they group cleanly
// in Studio without crowding the existing 16 brand fields.
//
// SAFE PATCH ALTERNATIVE — PRIMARY RECOMMENDATION FOR COC
// -------------------------------------------------------
// Because COC's local siteSettings.js was not uploaded for this build, this
// drop-in is built purely from the deployed schema field shapes — it cannot
// preserve any initialValue defaults you've configured locally that aren't
// part of the deployed schema. Use siteSettings-themeAudio-PATCH.js (the
// alternative file in this folder) to add just the 5 new themeAudio fields
// WITHOUT replacing your existing siteSettings.js. Patch path is safer for
// COC. Drop-in is here as a backup if the patch path runs into issues.

export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fieldsets: [
    {
      name: 'themeAudio',
      title: 'Theme audio',
      description:
        'Site-wide theme tune ("Glitchy Chaos Button"). Click-to-play, persists across pages. Canonically a Gizmo the Genius invention.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    // ── Existing 16 fields (verbatim, in published-schema order) ─────────────
    {
      name: 'siteName',
      title: 'Site Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    { name: 'tagline', type: 'string' },
    { name: 'siteDescription', title: 'Default Site Description', type: 'text' },
    { name: 'logo', title: 'Site Logo', type: 'image' },
    { name: 'favicon', type: 'image' },
    { name: 'ogImage', title: 'Default OG Image', type: 'image' },
    { name: 'contactEmail', type: 'string' },
    {
      name: 'currency',
      type: 'string',
      options: {
        list: [
          { title: 'GBP (£)', value: 'GBP' },
          { title: 'USD ($)', value: 'USD' },
          { title: 'EUR (€)', value: 'EUR' },
        ],
      },
    },
    { name: 'storeOpenDate', title: 'Store Launch Date', type: 'datetime' },
    {
      name: 'youtubeChannelUrl',
      title: 'YouTube Channel URL',
      type: 'url',
      validation: (Rule) =>
        Rule.uri({ scheme: ['http', 'https'], allowRelative: false }),
    },
    { name: 'trailerYoutubeId', title: 'Trailer YouTube Embed ID', type: 'string' },
    {
      name: 'socialLinks',
      title: 'Social Media Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              type: 'string',
              options: {
                list: [
                  { title: 'YouTube', value: 'youtube' },
                  { title: 'TikTok', value: 'tiktok' },
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'Facebook', value: 'facebook' },
                  { title: 'X (Twitter)', value: 'x' },
                ],
              },
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) =>
                Rule.uri({ scheme: ['http', 'https'], allowRelative: false }),
            },
          ],
        },
      ],
    },
    { name: 'newsletterHeading', type: 'string' },
    { name: 'newsletterText', type: 'text' },
    { name: 'homepageHeroImage', type: 'image', options: { hotspot: true } },
    { name: 'homepageHeroPortrait', type: 'image', options: { hotspot: true } },

    // ── New 5 fields — theme audio ───────────────────────────────────────────
    {
      name: 'themeTrackTitle',
      title: 'Theme track title',
      type: 'string',
      fieldset: 'themeAudio',
      description:
        'Display title for the theme tune. Surfaces in expanded-state tooltip and ARIA fallbacks.',
      initialValue: 'Cats On Crack Main Theme',
      validation: (Rule) => Rule.max(80),
    },
    {
      name: 'themeTrackArtist',
      title: 'Theme track composer / artist credit',
      type: 'string',
      fieldset: 'themeAudio',
      description:
        'Optional. Composer or artist credit. Shown in expanded-state if present.',
      initialValue: '[Composer credit TBC — Alan to confirm]',
      validation: (Rule) => Rule.max(120),
    },
    {
      name: 'themeAudioFile',
      title: 'Theme audio file (.mp3)',
      type: 'file',
      fieldset: 'themeAudio',
      description:
        'Upload the main theme .mp3 here. The original .wav stays on the local master. Sanity serves the .mp3 from its CDN — no R2 needed.',
      options: { accept: 'audio/mpeg,audio/mp3' },
    },
    {
      name: 'themeEnabled',
      title: 'Theme audio enabled',
      type: 'boolean',
      fieldset: 'themeAudio',
      description:
        'Master kill switch. Set to false to hide the control across the entire site without a code deploy.',
      initialValue: true,
    },
    {
      name: 'themeAutoplayPolicy',
      title: 'Autoplay policy',
      type: 'string',
      fieldset: 'themeAudio',
      description:
        'Reserved for future flexibility. Currently only "click-to-play" is supported by the component.',
      initialValue: 'click-to-play',
      options: {
        list: [{ title: 'Click to play (default — recommended)', value: 'click-to-play' }],
        layout: 'radio',
      },
      readOnly: true,
    },
  ],
  __experimental_actions: ['update', 'publish'],
};
