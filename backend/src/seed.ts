// Resets the database to the Bahrain demo scenario. Run with `npm run seed`.
// WARNING: deletes every request, RFQ, purchase order, notification and counter.
//
// Scenario (all amounts in BD, submitted by Sarah Chen, decided by Omar Haddad):
//   1. Dell Laptops ×15        IT          approved → RFQ (3 quotes) → awarded to Al Jazeera → PO-2026-001
//   2. Office Furniture ×20    HR          approved, awaiting RFQ
//   3. Cisco Network Switch ×4 IT          high priority, pending approval
//   4. Coffee Machine ×1       Operations  rejected (exceeds discretionary limit)

import mongoose, { type Model } from 'mongoose';
import dotenv from 'dotenv';
import RequestModel from './models/Request';
import RFQ from './models/RFQ';
import PurchaseOrder from './models/PurchaseOrder';
import Notification from './models/Notification';
import Counter from './models/Counter';

dotenv.config();

const REQUESTER = 'Sarah Chen';
const APPROVER = 'Omar Haddad';
const YEAR = 2026;

// Fixed dates so the demo (and its charts) look the same every time it's seeded.
const at = (date: string) => new Date(`${date}+03:00`); // Bahrain time

// Validate against the Mongoose schema (defaults included), then insert as-is so
// the scenario's historical createdAt/updatedAt dates are kept.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- works across all the app's models
async function insert(model: Model<any>, data: Record<string, unknown>, createdAt: Date, updatedAt = createdAt) {
  const doc = new model({ ...data, createdAt, updatedAt });
  await doc.validate();
  await model.collection.insertOne({ ...(doc.toObject() as Record<string, unknown>), createdAt, updatedAt });
  return doc;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI ?? '');

  await Promise.all([
    RequestModel.deleteMany({}),
    RFQ.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  /* 1. Dell Laptops: the full source-to-pay flow -------------------------- */
  const laptops = await insert(
    RequestModel,
    {
      itemName: 'Dell Laptops',
      description: 'Dell Latitude 5450 (Core Ultra 5, 16GB RAM, 512GB SSD) for the new developer intake.',
      quantity: 15,
      estimatedPrice: 380,
      preferredVendor: 'Al Jazeera Electronics',
      department: 'IT',
      priority: 'medium',
      requestedBy: REQUESTER,
      status: 'approved',
      history: [
        { action: 'submitted', by: REQUESTER, at: at('2026-09-07T09:15:00') },
        { action: 'approved', by: APPROVER, comment: 'Within the IT hardware refresh budget.', at: at('2026-09-08T11:40:00') },
      ],
    },
    at('2026-09-07T09:15:00'),
    at('2026-09-08T11:40:00')
  );

  const rfq = await insert(
    RFQ,
    {
      requestId: laptops._id,
      vendors: [
        {
          name: 'Al Jazeera Electronics',
          estimatedPrice: 375,
          quotedPrice: 365,
          deliveryDays: 10,
          notes: 'Includes 3-year Dell ProSupport warranty.',
          status: 'quoted',
        },
        {
          name: 'Gulf IT Solutions',
          estimatedPrice: 385,
          quotedPrice: 372.5,
          deliveryDays: 7,
          notes: 'On-site imaging and setup included.',
          status: 'quoted',
        },
        {
          name: 'Electroland',
          estimatedPrice: 390,
          quotedPrice: 389,
          deliveryDays: 5,
          notes: 'Available from local stock.',
          status: 'quoted',
        },
      ],
      deadline: at('2026-09-16T23:59:59'),
      notes: 'Delivery to Batelco Building, Hamad Town. Quote unit price in BD including warranty.',
      status: 'awarded',
    },
    at('2026-09-09T10:00:00'),
    at('2026-09-17T14:30:00')
  );
  const winner = rfq.get('vendors')[0];

  const unitPrice = winner.quotedPrice as number;
  const po = await insert(
    PurchaseOrder,
    {
      poNumber: `PO-${YEAR}-001`,
      requestId: laptops._id,
      rfqId: rfq._id,
      vendor: { name: winner.name },
      items: [{ itemName: 'Dell Laptops', quantity: 15, unitPrice, totalPrice: unitPrice * 15 }],
      totalAmount: unitPrice * 15, // excl. VAT; the PO document adds 10% VAT
      status: 'acknowledged',
    },
    at('2026-09-17T14:30:00'),
    at('2026-09-18T09:00:00')
  );
  await RFQ.collection.updateOne(
    { _id: rfq._id },
    { $set: { awardedVendorId: winner._id, purchaseOrderId: po._id } }
  );
  // The next PO generated in the app will be PO-2026-002.
  await Counter.collection.insertOne({ _id: `po-${YEAR}` as never, seq: 1 });

  /* 2. Office Furniture: approved, awaiting RFQ --------------------------- */
  await insert(
    RequestModel,
    {
      itemName: 'Office Furniture',
      description: 'Ergonomic desks and chairs for the HR office refit on the 2nd floor.',
      quantity: 20,
      estimatedPrice: 150,
      preferredVendor: 'Jashanmal Bahrain',
      department: 'HR',
      priority: 'medium',
      requestedBy: REQUESTER,
      status: 'approved',
      history: [
        { action: 'submitted', by: REQUESTER, at: at('2026-09-24T08:50:00') },
        { action: 'approved', by: APPROVER, comment: 'Approved for the Q4 office refit.', at: at('2026-09-25T13:05:00') },
      ],
    },
    at('2026-09-24T08:50:00'),
    at('2026-09-25T13:05:00')
  );

  /* 3. Cisco Network Switch: high priority, pending ----------------------- */
  await insert(
    RequestModel,
    {
      itemName: 'Cisco Network Switch',
      description: 'Cisco Catalyst 9200 48-port switches to replace end-of-life core switches on floor 3.',
      quantity: 4,
      estimatedPrice: 850,
      preferredVendor: 'Gulf IT Solutions',
      department: 'IT',
      priority: 'high',
      requestedBy: REQUESTER,
      status: 'pending',
      history: [{ action: 'submitted', by: REQUESTER, at: at('2026-10-09T10:20:00') }],
    },
    at('2026-10-09T10:20:00')
  );

  /* 4. Coffee Machine: rejected ------------------------------------------- */
  await insert(
    RequestModel,
    {
      itemName: 'Coffee Machine',
      description: 'Commercial bean-to-cup coffee machine for the staff pantry.',
      quantity: 1,
      estimatedPrice: 2500,
      preferredVendor: 'Al Hawaj Home Appliances',
      department: 'Operations',
      priority: 'low',
      requestedBy: REQUESTER,
      status: 'rejected',
      history: [
        { action: 'submitted', by: REQUESTER, at: at('2026-10-01T09:30:00') },
        {
          action: 'rejected',
          by: APPROVER,
          comment: 'Exceeds discretionary budget limit for single items',
          at: at('2026-10-02T15:10:00'),
        },
      ],
    },
    at('2026-10-01T09:30:00'),
    at('2026-10-02T15:10:00')
  );

  /* Notifications, matching what the app would have sent ------------------ */
  const notifications: [string, 'info' | 'success' | 'warning', string, string, boolean][] = [
    ['New purchase request: Dell Laptops from IT', 'info', '/requests', '2026-09-07T09:15:00', true],
    ['Dell Laptops request has been approved', 'success', '/requests', '2026-09-08T11:40:00', true],
    ['RFQ sent for Dell Laptops', 'info', `/rfq/${rfq._id}`, '2026-09-09T10:00:00', true],
    ['Purchase Order PO-2026-001 created', 'success', `/purchase-orders/${po._id}`, '2026-09-17T14:30:00', true],
    ['New purchase request: Office Furniture from HR', 'info', '/requests', '2026-09-24T08:50:00', true],
    ['Office Furniture request has been approved', 'success', '/requests', '2026-09-25T13:05:00', true],
    ['New purchase request: Coffee Machine from Operations', 'info', '/requests', '2026-10-01T09:30:00', true],
    [
      'Coffee Machine request was rejected: Exceeds discretionary budget limit for single items',
      'warning',
      '/requests',
      '2026-10-02T15:10:00',
      false,
    ],
    ['New purchase request: Cisco Network Switch from IT', 'info', '/requests', '2026-10-09T10:20:00', false],
  ];
  for (const [message, type, link, date, read] of notifications) {
    await insert(Notification, { message, type, link, read }, at(date));
  }

  const counts = await Promise.all([
    RequestModel.countDocuments(),
    RFQ.countDocuments(),
    PurchaseOrder.countDocuments(),
    Notification.countDocuments(),
  ]);
  console.log(
    `Seeded: ${counts[0]} requests, ${counts[1]} RFQ, ${counts[2]} purchase order (PO-${YEAR}-001), ${counts[3]} notifications.`
  );
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
