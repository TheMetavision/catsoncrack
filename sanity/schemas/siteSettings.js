export default {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'siteName', title: 'Site Name', type: 'string', initialValue: 'Cats On Crack' },
    { name: 'tagline', title: 'Tagline', type: 'string', initialValue: 'The Wildest Alley Cats You\'ll Ever Meet' },
    { name: 'siteDescription', title: 'Site Description', type: 'text', rows: 3, initialValue: 'Join Cats On Crack for wild, chaotic adventures in our animated series. Watch character videos, read the book series, and shop official merch!' },
    { name: 'contactEmail', title: 'Contact Email', type: 'string', initialValue: 'contact@catsoncrack.com' },
    { name: 'youtubeChannel', title: 'YouTube Channel URL', type: 'url' },
    {
      name: 'socialLinks', title: 'Social Links', type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'platform', title: 'Platform', type: 'string', options: { list: ['Instagram', 'TikTok', 'X', 'Facebook', 'YouTube', 'Threads'] } },
        { name: 'url', title: 'URL', type: 'url' },
      ]}],
    },
    { name: 'announcementBar', title: 'Announcement Bar', type: 'string' },
    { name: 'logo', title: 'Logo', type: 'image' },
    { name: 'footerLogo', title: 'Footer Logo', type: 'image' },
    { name: 'footerText', title: 'Footer Text', type: 'text', rows: 2, initialValue: '© The Metavision 2026. All rights reserved.' },
    { name: 'newsletterHeadline', title: 'Newsletter Headline', type: 'string', initialValue: 'Join the Crew' },
    { name: 'newsletterSubtext', title: 'Newsletter Subtext', type: 'string', initialValue: 'Get the latest drops, stories, and chaos delivered to your inbox.' },
  ],
  __experimental_actions: ['update', 'publish'],
};
