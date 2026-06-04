import { defineType, defineField } from 'sanity';

/**
 * Order — a read-only record written by the Stripe webhook on a completed
 * checkout. NOT hand-authored: `readOnly: true` keeps it un-editable in Studio
 * (the API write from the function bypasses this, which is what we want).
 *
 * Deploy like product.ts: drop into sanity/schemas/, register in schemas/index.js,
 * then `npx sanity deploy` + `npx sanity schema deploy` from the Studio folder.
 */
export default defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  readOnly: true,
  icon: () => '🧾',
  fields: [
    defineField({ name: 'orderRef', title: 'Order Ref', type: 'string' }),
    defineField({ name: 'placedAt', title: 'Placed At', type: 'datetime' }),
    defineField({
      name: 'status', title: 'Status', type: 'string',
      options: { list: [
        { title: 'Paid (not yet fulfilled)', value: 'paid' },
        { title: 'Fulfilled (sent to Printful)', value: 'fulfilled' },
        { title: 'Fulfilment FAILED — action needed', value: 'fulfilment-failed' },
      ] },
    }),
    defineField({ name: 'customerName', title: 'Customer Name', type: 'string' }),
    defineField({ name: 'customerEmail', title: 'Customer Email', type: 'string' }),
    defineField({
      name: 'items', title: 'Items', type: 'array',
      of: [{
        type: 'object',
        name: 'lineItem',
        fields: [
          { name: 'title', title: 'Item', type: 'string' },
          { name: 'productType', title: 'Garment', type: 'string' },
          { name: 'colour', title: 'Colour', type: 'string' },
          { name: 'size', title: 'Size', type: 'string' },
          { name: 'quantity', title: 'Qty', type: 'number' },
          { name: 'price', title: 'Line Total (£)', type: 'number' },
        ],
        preview: {
          select: { title: 'title', qty: 'quantity', price: 'price' },
          prepare: ({ title, qty, price }) => ({
            title: title || 'Item',
            subtitle: `Qty ${qty ?? 1} · £${(price ?? 0).toFixed(2)}`,
          }),
        },
      }],
    }),
    defineField({ name: 'shippingCost', title: 'Shipping (£)', type: 'number' }),
    defineField({ name: 'total', title: 'Total (£)', type: 'number' }),
    defineField({ name: 'currency', title: 'Currency', type: 'string' }),
    defineField({
      name: 'shippingAddress', title: 'Shipping Address', type: 'object',
      fields: [
        { name: 'name', title: 'Name', type: 'string' },
        { name: 'line1', title: 'Line 1', type: 'string' },
        { name: 'line2', title: 'Line 2', type: 'string' },
        { name: 'city', title: 'City', type: 'string' },
        { name: 'state', title: 'State/County', type: 'string' },
        { name: 'postalCode', title: 'Postcode', type: 'string' },
        { name: 'country', title: 'Country', type: 'string' },
      ],
    }),
    defineField({ name: 'stripeSessionId', title: 'Stripe Session ID', type: 'string' }),
    defineField({ name: 'printfulOrderId', title: 'Printful Order ID', type: 'string' }),
  ],
  orderings: [
    { title: 'Newest first', name: 'placedAtDesc', by: [{ field: 'placedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { ref: 'orderRef', email: 'customerEmail', total: 'total', status: 'status', placedAt: 'placedAt' },
    prepare: ({ ref, email, total, status, placedAt }) => {
      const badge = status === 'fulfilment-failed' ? '⚠️ ' : status === 'fulfilled' ? '✓ ' : '• ';
      const date = placedAt ? new Date(placedAt).toLocaleDateString('en-GB') : '';
      return {
        title: `${badge}#${ref || '—'} · £${(total ?? 0).toFixed(2)}`,
        subtitle: [email, date].filter(Boolean).join(' · '),
      };
    },
  },
});
