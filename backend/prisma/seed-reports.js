const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDate(year, month, dayStart = 1, dayEnd = 28) {
  return new Date(year, month - 1, rand(dayStart, dayEnd), rand(7, 18), rand(0, 59));
}
function makeRef(prefix, idx) {
  return `${prefix}-2026-${String(idx).padStart(4, '0')}`;
}

async function main() {
  console.log('🌱 Seeding ALBA SERVICE GROUP demo data...\n');

  const COMPANY_ID = 'company-1';
  const USER_ID = 'user-1';

  // 1. BRANCH & DEPARTMENTS
  console.log('📁 Creating branches and departments...');
  const branch = await prisma.branch.findFirst({ where: { companyId: COMPANY_ID } });
  const branchId = branch ? branch.id : (await prisma.branch.create({
    data: { companyId: COMPANY_ID, name: 'Siège Kindu', address: 'Avenue Lumumba, Kindu', city: 'Kindu', isHead: true }
  })).id;

  const deptNames = [
    ['IMPR', 'Imprimerie'], ['GRAPH', 'Graphisme'], ['SEC', 'Secrétariat'],
    ['DEV', 'Développement'], ['MAINT', 'Maintenance IT'], ['FORM', 'Formation'],
    ['COMM', 'Commercial'], ['ADMIN', 'Administration'], ['FIN', 'Finance']
  ];
  const deptIds = {};
  for (const [code, name] of deptNames) {
    const existing = await prisma.department.findFirst({ where: { code } });
    deptIds[code] = existing ? existing.id : (await prisma.department.create({
      data: { branchId, companyId: COMPANY_ID, code, name }
    })).id;
  }

  // 2. SUPPLIERS
  console.log('🏭 Creating suppliers...');
  const supplierData = [
    { code: 'SUP-001', name: 'Papeterie Centrale de Kindu', contactName: 'Jean Lukusa', phone: '+243 991 234 567', city: 'Kindu', address: 'Av. Mobutu 12' },
    { code: 'SUP-002', name: 'Encre & Fournitures RDC', contactName: 'Marie Kasongo', phone: '+243 992 345 678', city: 'Lubumbashi', address: 'Av. Kasavubu 45' },
    { code: 'SUP-003', name: 'Tech Solutions Kinshasa', contactName: 'Patrick Mbuyi', phone: '+243 993 456 789', city: 'Kinshasa', address: 'Av. Lumumba 88' },
    { code: 'SUP-004', name: 'Impression Pro SARL', contactName: 'Sarah Ngandu', phone: '+243 994 567 890', city: 'Goma', address: 'Av. Patriote 23' },
    { code: 'SUP-005', name: 'Distributeur Papier Congo', contactName: 'Paul Kabongo', phone: '+243 995 678 901', city: 'Mbuji-Mayi', address: 'Av. Kasai 67' },
    { code: 'SUP-006', name: 'Matériel Bureau Express', contactName: 'Anne Mutombo', phone: '+243 996 789 012', city: 'Kinshasa', address: 'Av. Tabora 34' },
  ];
  const supplierIds = [];
  for (const s of supplierData) {
    const existing = await prisma.supplier.findUnique({ where: { code: s.code } });
    supplierIds.push(existing ? existing.id : (await prisma.supplier.create({ data: { ...s, isActive: true } })).id);
  }

  // 3. EXTRA CUSTOMERS
  console.log('👥 Creating additional customers...');
  const extraCustomers = [
    { code: 'CLI-005', firstName: 'Mukendi', lastName: 'Kabongo', companyName: 'Entreprise Kabongo SARL', category: 'ENTERPRISE', email: 'kabongo@enterprise.cd', phone: '+243 810 111 222', city: 'Kindu' },
    { code: 'CLI-006', firstName: 'Grace', lastName: 'Tshimanga', companyName: 'Tshimanga Trading', category: 'PROFESSIONAL', email: 'grace@tshimanga.cd', phone: '+243 810 222 333', city: 'Kindu' },
    { code: 'CLI-007', firstName: 'Samuel', lastName: 'Kasongo', companyName: 'Kasongo & Fils', category: 'PROFESSIONAL', email: 'samuel@kasongo-fils.cd', phone: '+243 810 333 444', city: 'Lubumbashi' },
    { code: 'CLI-008', firstName: 'Bénédicte', lastName: 'Lukusa', companyName: '', category: 'INDIVIDUAL', email: 'benedicte.lukusa@gmail.com', phone: '+243 810 444 555', city: 'Kindu' },
    { code: 'CLI-009', firstName: 'Institut', lastName: 'Trafic', companyName: 'Institut Technique de Kindu', category: 'INSTITUTION', email: 'contact@institut-kindu.cd', phone: '+243 810 555 666', city: 'Kindu' },
    { code: 'CLI-010', firstName: 'Frédéric', lastName: 'Mwamba', companyName: 'Mwamba Enterprises', category: 'ENTERPRISE', email: 'frederic@mwamba.cd', phone: '+243 810 666 777', city: 'Bukavu' },
    { code: 'CLI-011', firstName: 'Espérance', lastName: 'Ilunga', companyName: '', category: 'INDIVIDUAL', email: 'esperance.ilunga@yahoo.fr', phone: '+243 810 777 888', city: 'Kindu' },
    { code: 'CLI-012', firstName: 'Maison', lastName: 'de la Presse', companyName: 'Maison de la Presse Kindu', category: 'INSTITUTION', email: 'info@presse-kindu.cd', phone: '+243 810 888 999', city: 'Kindu' },
  ];
  for (const c of extraCustomers) {
    const existing = await prisma.customer.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.customer.create({
        data: {
          code: c.code, firstName: c.firstName, lastName: c.lastName,
          companyName: c.companyName || null, category: c.category,
          email: c.email, phone: c.phone, city: c.city,
          branchId, totalRevenue: 0, totalOrders: 0, loyaltyPoints: 0, status: 'ACTIVE',
        }
      });
    }
  }

  const allCustomers = await prisma.customer.findMany();
  const cIds = allCustomers.map(c => c.id);
  console.log(`  ✓ ${cIds.length} customers total`);

  // 4. PRODUCTS
  console.log('📦 Creating products...');
  let unitPc = await prisma.productUnit.findFirst({ where: { code: 'pc' } });
  if (!unitPc) unitPc = await prisma.productUnit.create({ data: { name: 'Pièce', code: 'pc' } });
  let unitKg = await prisma.productUnit.findFirst({ where: { code: 'kg' } });
  if (!unitKg) unitKg = await prisma.productUnit.create({ data: { name: 'Kilogramme', code: 'kg' } });
  let unitReam = await prisma.productUnit.findFirst({ where: { code: 'ream' } });
  if (!unitReam) unitReam = await prisma.productUnit.create({ data: { name: 'Rame', code: 'ream' } });
  let unitBottle = await prisma.productUnit.findFirst({ where: { code: 'fl' } });
  if (!unitBottle) unitBottle = await prisma.productUnit.create({ data: { name: 'Flacon', code: 'fl' } });

  let catPapier = await prisma.productCategory.findFirst({ where: { slug: 'papier' } });
  if (!catPapier) catPapier = await prisma.productCategory.create({ data: { name: 'Papier', slug: 'papier' } });
  let catEncre = await prisma.productCategory.findFirst({ where: { slug: 'encre' } });
  if (!catEncre) catEncre = await prisma.productCategory.create({ data: { name: 'Encre & Toner', slug: 'encre' } });
  let catMateriel = await prisma.productCategory.findFirst({ where: { slug: 'materiel-bureau' } });
  if (!catMateriel) catMateriel = await prisma.productCategory.create({ data: { name: 'Matériel Bureau', slug: 'materiel-bureau' } });

  const productData = [
    { code: 'PRD-001', name: 'Papier A4 80g (ramette)', categoryId: catPapier.id, unitId: unitReam.id, supplierId: supplierIds[0], purchasePrice: 25000, sellingPrice: 35000, currentStock: 150, minStock: 30 },
    { code: 'PRD-002', name: 'Papier A3 80g', categoryId: catPapier.id, unitId: unitReam.id, supplierId: supplierIds[0], purchasePrice: 40000, sellingPrice: 55000, currentStock: 80, minStock: 20 },
    { code: 'PRD-003', name: 'Papier Glossy 150g', categoryId: catPapier.id, unitId: unitReam.id, supplierId: supplierIds[1], purchasePrice: 60000, sellingPrice: 85000, currentStock: 45, minStock: 10 },
    { code: 'PRD-004', name: 'Toner HP Noir', categoryId: catEncre.id, unitId: unitPc.id, supplierId: supplierIds[2], purchasePrice: 120000, sellingPrice: 180000, currentStock: 12, minStock: 5 },
    { code: 'PRD-005', name: 'Toner Canon Noir', categoryId: catEncre.id, unitId: unitPc.id, supplierId: supplierIds[2], purchasePrice: 95000, sellingPrice: 140000, currentStock: 8, minStock: 3 },
    { code: 'PRD-006', name: 'Encre Epson Cyan', categoryId: catEncre.id, unitId: unitBottle.id, supplierId: supplierIds[1], purchasePrice: 35000, sellingPrice: 55000, currentStock: 20, minStock: 5 },
    { code: 'PRD-007', name: 'Staples (agrafes) 26/6', categoryId: catMateriel.id, unitId: unitPc.id, supplierId: supplierIds[5], purchasePrice: 8000, sellingPrice: 12000, currentStock: 50, minStock: 10 },
    { code: 'PRD-008', name: 'Plastifiant A4 (rouleau)', categoryId: catMateriel.id, unitId: unitPc.id, supplierId: supplierIds[3], purchasePrice: 15000, sellingPrice: 25000, currentStock: 35, minStock: 8 },
    { code: 'PRD-009', name: 'Papier Cartonné 250g', categoryId: catPapier.id, unitId: unitReam.id, supplierId: supplierIds[4], purchasePrice: 80000, sellingPrice: 120000, currentStock: 25, minStock: 5 },
    { code: 'PRD-010', name: 'Bâche PVC publicitaire (m)', categoryId: catMateriel.id, unitId: unitPc.id, supplierId: supplierIds[3], purchasePrice: 20000, sellingPrice: 35000, currentStock: 100, minStock: 20 },
    { code: 'PRD-011', name: 'Ruban adhésif transparent', categoryId: catMateriel.id, unitId: unitPc.id, supplierId: supplierIds[5], purchasePrice: 3000, sellingPrice: 5000, currentStock: 200, minStock: 50 },
    { code: 'PRD-012', name: 'Papier Photo 260g', categoryId: catPapier.id, unitId: unitReam.id, supplierId: supplierIds[1], purchasePrice: 70000, sellingPrice: 100000, currentStock: 15, minStock: 3 },
  ];
  let createdProducts = 0;
  for (const p of productData) {
    const existing = await prisma.product.findUnique({ where: { code: p.code } });
    if (!existing) { await prisma.product.create({ data: { ...p, isActive: true } }); createdProducts++; }
  }
  console.log(`  ✓ ${createdProducts} new products created`);

  // 5. ACCOUNTS
  console.log('💳 Creating accounts...');
  const accountData = [
    { code: '521', name: 'Caisse Principale', type: 'asset' },
    { code: '522', name: 'Caisse Secondaire', type: 'asset' },
    { code: '523', name: 'Banque Congolaise (BCDC)', type: 'asset' },
    { code: '531', name: 'Mobile Money - M-Pesa', type: 'asset' },
    { code: '707', name: 'Ventes de services', type: 'revenue' },
    { code: '607', name: 'Achats de fournitures', type: 'expense' },
    { code: '613', name: 'Salaires et charges', type: 'expense' },
    { code: '621', name: 'Frais généraux', type: 'expense' },
  ];
  const accountIds = {};
  for (const a of accountData) {
    const existing = await prisma.account.findUnique({ where: { code: a.code } });
    accountIds[a.code] = existing ? existing.id : (await prisma.account.create({ data: { ...a, balance: rand(500000, 5000000) } })).id;
  }

  // 6. EMPLOYEES
  console.log('👩‍💼 Creating employees...');
  const employeeData = [
    { code: 'EMP-001', firstName: 'Albert', lastName: 'Mulonga', gender: 'MALE', position: 'Directeur Général', dept: 'ADMIN', salary: 2500000, hireDate: '2022-01-15' },
    { code: 'EMP-002', firstName: 'Claude', lastName: 'Mwamba', gender: 'MALE', position: 'Chef Comptable', dept: 'FIN', salary: 1800000, hireDate: '2022-03-01' },
    { code: 'EMP-003', firstName: 'Patricia', lastName: 'Kasongo', gender: 'FEMALE', position: 'Chef Imprimerie', dept: 'IMPR', salary: 1500000, hireDate: '2022-06-10' },
    { code: 'EMP-004', firstName: 'David', lastName: 'Lukusa', gender: 'MALE', position: 'Graphiste Senior', dept: 'GRAPH', salary: 1300000, hireDate: '2023-01-05' },
    { code: 'EMP-005', firstName: 'Grâce', lastName: 'Tshilombo', gender: 'FEMALE', position: 'Secrétaire Générale', dept: 'SEC', salary: 900000, hireDate: '2022-09-20' },
    { code: 'EMP-006', firstName: 'Eric', lastName: 'Kalala', gender: 'MALE', position: 'Développeur Full Stack', dept: 'DEV', salary: 1700000, hireDate: '2023-04-15' },
    { code: 'EMP-007', firstName: 'Bénédicte', lastName: 'Ngandu', gender: 'FEMALE', position: 'Technicien IT', dept: 'MAINT', salary: 1200000, hireDate: '2023-07-01' },
    { code: 'EMP-008', firstName: 'Sylvain', lastName: 'Mukendi', gender: 'MALE', position: 'Formateur', dept: 'FORM', salary: 1100000, hireDate: '2023-09-10' },
    { code: 'EMP-009', firstName: 'Marie', lastName: 'Ilunga', gender: 'FEMALE', position: 'Commercial Senior', dept: 'COMM', salary: 1000000, hireDate: '2024-01-08' },
    { code: 'EMP-010', firstName: 'Patrick', lastName: 'Kabongo', gender: 'MALE', position: 'Magasinier', dept: 'IMPR', salary: 750000, hireDate: '2024-03-15' },
    { code: 'EMP-011', firstName: 'Annie', lastName: 'Makambo', gender: 'FEMALE', position: 'Opératrice Imprimerie', dept: 'IMPR', salary: 800000, hireDate: '2024-05-20' },
    { code: 'EMP-012', firstName: 'Roger', lastName: 'Tshimanga', gender: 'MALE', position: 'Opérateur Impression', dept: 'IMPR', salary: 800000, hireDate: '2024-06-01' },
    { code: 'EMP-013', firstName: 'Aimée', lastName: 'Kabuya', gender: 'FEMALE', position: 'Comptable', dept: 'FIN', salary: 950000, hireDate: '2024-08-15' },
    { code: 'EMP-014', firstName: 'Fabrice', lastName: 'Mutombo', gender: 'MALE', position: 'Développeur Backend', dept: 'DEV', salary: 1600000, hireDate: '2025-01-10' },
    { code: 'EMP-015', firstName: 'Sandy', lastName: 'Ngalula', gender: 'FEMALE', position: 'Secrétaire', dept: 'SEC', salary: 850000, hireDate: '2025-03-01' },
  ];
  let createdEmps = 0;
  for (const e of employeeData) {
    const existing = await prisma.employee.findUnique({ where: { code: e.code } });
    if (existing) continue;
    await prisma.employee.create({
      data: {
        code: e.code, firstName: e.firstName, lastName: e.lastName,
        gender: e.gender, position: e.position, departmentId: deptIds[e.dept],
        status: 'ACTIVE', hireDate: new Date(e.hireDate),
        nationality: 'Congolaise', phone: `+243 ${rand(810, 899)} ${rand(100, 999)} ${rand(100, 999)}`,
        email: `${e.firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${e.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@alba-service.com`,
      }
    });
    createdEmps++;
  }
  console.log(`  ✓ ${createdEmps} new employees created`);

  // 7. QUOTES
  console.log('📋 Creating quotes...');
  const quoteItemsPool = [
    { name: 'Impression flyers A4 couleur x500', qty: 1, unitPrice: 120000 },
    { name: 'Cartes de visite x200', qty: 2, unitPrice: 50000 },
    { name: 'Brochure 8 pages A4', qty: 1, unitPrice: 250000 },
    { name: 'Affiche A2 standard', qty: 3, unitPrice: 35000 },
    { name: 'Panneau publicitaire bâche', qty: 1, unitPrice: 180000 },
    { name: 'Programme événement 16 pages', qty: 1, unitPrice: 350000 },
    { name: 'Impression badges plastifiés x100', qty: 1, unitPrice: 80000 },
    { name: 'Timbre encreur personnalisé', qty: 2, unitPrice: 45000 },
    { name: 'Reliure spiralée x50', qty: 1, unitPrice: 150000 },
    { name: 'Tirage A3 couleur x20', qty: 1, unitPrice: 100000 },
    { name: 'Sticker adhésif personnalisé x200', qty: 1, unitPrice: 60000 },
    { name: 'Menu restaurant A4 plastifié x100', qty: 1, unitPrice: 130000 },
  ];
  const quoteStatuses = ['DRAFT', 'SENT', 'VALIDATED', 'PAID', 'CANCELLED'];
  let createdQuotes = 0;
  for (let i = 1; i <= 25; i++) {
    const ref = makeRef('QT', i);
    const existing = await prisma.quote.findUnique({ where: { reference: ref } });
    if (existing) continue;

    const items = [pick(quoteItemsPool), pick(quoteItemsPool)];
    const subtotal = items.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
    const taxAmount = Math.round(subtotal * 0.16);
    const total = subtotal + taxAmount;
    const createdAt = randomDate(2026, rand(1, 8));
    const validUntil = new Date(createdAt.getTime() + 30 * 86400000);

    const quote = await prisma.quote.create({
      data: {
        reference: ref, customerId: pick(cIds), status: pick(quoteStatuses),
        validUntil, subtotal, taxAmount, total, taxRate: 16, discount: 0,
        notes: `Devis ${ref} - Service impression`, createdBy: USER_ID, createdAt,
      }
    });
    for (const item of items) {
      await prisma.quoteItem.create({
        data: { quoteId: quote.id, name: item.name, quantity: item.qty, unitPrice: item.unitPrice, total: item.qty * item.unitPrice }
      });
    }
    createdQuotes++;
  }
  console.log(`  ✓ ${createdQuotes} new quotes created`);

  // 8. SALES ORDERS
  console.log('🛒 Creating sales orders...');
  const orderStatuses = ['DRAFT', 'SENT', 'VALIDATED', 'PARTIAL', 'PAID', 'CANCELLED'];
  let createdOrders = 0;
  for (let i = 1; i <= 30; i++) {
    const ref = makeRef('CMD', i);
    const existing = await prisma.salesOrder.findUnique({ where: { reference: ref } });
    if (existing) continue;

    const items = [pick(quoteItemsPool), pick(quoteItemsPool), pick(quoteItemsPool)];
    const subtotal = items.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
    const taxAmount = Math.round(subtotal * 0.16);
    const total = subtotal + taxAmount;
    const orderDate = randomDate(2026, rand(1, 8));
    const dueDate = new Date(orderDate.getTime() + 14 * 86400000);

    const order = await prisma.salesOrder.create({
      data: {
        reference: ref, customerId: pick(cIds), status: pick(orderStatuses),
        orderDate, dueDate, subtotal, taxAmount, total, taxRate: 16, discount: 0,
        paidAmount: Math.random() > 0.3 ? Math.round(total * rand(50, 100) / 100) : 0,
        notes: `Commande ${ref}`, createdBy: USER_ID,
      }
    });
    for (const item of items) {
      await prisma.salesOrderItem.create({
        data: { orderId: order.id, name: item.name, quantity: item.qty, unitPrice: item.unitPrice, total: item.qty * item.unitPrice }
      });
    }
    createdOrders++;
  }
  console.log(`  ✓ ${createdOrders} new sales orders created`);

  // 9. INVOICES
  console.log('💰 Creating invoices...');
  const invoiceStatuses = ['DRAFT', 'SENT', 'VALIDATED', 'PAID', 'PARTIAL', 'CANCELLED'];
  let createdInvoices = 0;
  const invoiceIds = [];
  for (let i = 1; i <= 35; i++) {
    const ref = makeRef('FAC', i);
    const existing = await prisma.invoice.findUnique({ where: { reference: ref } });
    if (existing) { invoiceIds.push(existing.id); continue; }

    const items = [pick(quoteItemsPool), pick(quoteItemsPool)];
    const subtotal = items.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
    const taxAmount = Math.round(subtotal * 0.16);
    const total = subtotal + taxAmount;
    const paidAmount = Math.random() > 0.25 ? total : (Math.random() > 0.5 ? Math.round(total * 0.5) : 0);
    const invoiceDate = randomDate(2026, rand(1, 8));
    const dueDate = new Date(invoiceDate.getTime() + 30 * 86400000);
    const status = paidAmount >= total ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : pick(['DRAFT', 'SENT', 'VALIDATED']);

    const invoice = await prisma.invoice.create({
      data: {
        reference: ref, customerId: pick(cIds), status,
        invoiceDate, dueDate, subtotal, taxAmount, total, taxRate: 16, discount: 0,
        paidAmount, notes: `Facture ${ref}`, createdBy: USER_ID,
      }
    });
    for (const item of items) {
      await prisma.invoiceItem.create({
        data: { invoiceId: invoice.id, name: item.name, quantity: item.qty, unitPrice: item.unitPrice, total: item.qty * item.unitPrice }
      });
    }
    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id, amount: paidAmount,
          reference: `PAY-${ref}`,
          paymentDate: new Date(invoiceDate.getTime() + rand(1, 10) * 86400000),
          receivedBy: USER_ID,
        }
      });
    }
    invoiceIds.push(invoice.id);
    createdInvoices++;
  }
  console.log(`  ✓ ${createdInvoices} new invoices created`);

  // 10. CASH TRANSACTIONS
  console.log('💸 Creating cash transactions...');
  const incomeDescs = [
    'Paiement facture impression', 'Vente papeterie', 'Service photocopie',
    'Encaissement commande', 'Paiement reliure', 'Vente cartes de visite',
    'Service plastification', 'Paiement brochures', 'Vente affiches',
    'Encaissement badges', 'Paiement programme', 'Service scan & impression',
    'Vente stickers', 'Encaissement menu', 'Paiement banner',
  ];
  const expenseDescs = [
    'Achat papier réam', 'Achat encre Toner', 'Paiement loyer local',
    'Paiement électricité', 'Achat fournitures bureau', 'Frais transport',
    'Paiement salaire', 'Achat matériel impression', 'Frais téléphone',
    'Entretien machine', 'Achat bâche publicitaire', 'Paiement internet',
    'Frais bancaires', 'Carburant générateur', 'Achat ruban adhésif',
  ];
  const methods = ['cash', 'mobile_money', 'bank_transfer', 'check'];

  let createdTx = 0;
  for (let i = 1; i <= 80; i++) {
    const type = Math.random() > 0.35 ? 'revenue' : 'expense';
    const amount = rand(50000, 2000000);
    const createdAt = randomDate(2026, rand(1, 8));
    await prisma.cashTransaction.create({
      data: {
        type, amount,
        category: type === 'revenue' ? 'operations' : pick(['fixed', 'variable', 'investissement']),
        description: type === 'revenue' ? pick(incomeDescs) : pick(expenseDescs),
        reference: `TXN-2026-${String(i).padStart(4, '0')}`,
        paymentMethod: pick(methods),
        userId: USER_ID, createdAt,
      }
    });
    createdTx++;
  }
  console.log(`  ✓ ${createdTx} cash transactions created`);

  // 11. ACCOUNT TRANSACTIONS
  console.log('📊 Creating account transactions...');
  const mainAccountId = accountIds['521'];
  let createdAcctTx = 0;
  for (let i = 1; i <= 60; i++) {
    const type = Math.random() > 0.4 ? 'credit' : 'debit';
    const amount = rand(20000, 1500000);
    const createdAt = randomDate(2026, rand(1, 8));
    await prisma.accountTransaction.create({
      data: {
        accountId: mainAccountId, type, amount,
        description: type === 'credit' ? pick(incomeDescs) : pick(expenseDescs),
        reference: `ACCTX-2026-${String(i).padStart(4, '0')}`,
        createdAt,
      }
    });
    createdAcctTx++;
  }
  console.log(`  ✓ ${createdAcctTx} account transactions created`);

  // 12. PURCHASE ORDERS
  console.log('📦 Creating purchase orders...');
  const purchaseStatuses = ['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'];
  const allProducts = await prisma.product.findMany();
  let createdPurchases = 0;
  for (let i = 1; i <= 15; i++) {
    const ref = makeRef('PA', i);
    const existing = await prisma.purchaseOrder.findUnique({ where: { reference: ref } });
    if (existing) continue;

    const orderDate = randomDate(2026, rand(1, 8));
    const expectedDate = new Date(orderDate.getTime() + rand(5, 15) * 86400000);
    const poItems = [pick(allProducts), pick(allProducts)];
    let subtotal = 0;
    const itemsData = poItems.map(p => {
      const qty = rand(5, 50);
      const unitPrice = Number(p.purchasePrice) || rand(10000, 100000);
      subtotal += qty * unitPrice;
      return { productId: p.id, quantity: qty, unitPrice, totalPrice: qty * unitPrice, receivedQty: 0 };
    });
    const taxAmount = Math.round(subtotal * 0.16);
    const total = subtotal + taxAmount;

    await prisma.purchaseOrder.create({
      data: {
        reference: ref, supplierId: pick(supplierIds),
        status: pick(purchaseStatuses), orderDate, expectedDate,
        subtotal, taxAmount, total,
        notes: `Commande achat ${ref}`, createdBy: USER_ID,
        items: { create: itemsData },
      }
    });
    createdPurchases++;
  }
  console.log(`  ✓ ${createdPurchases} purchase orders created`);

  // 13. PRINT ORDERS
  console.log('🖨️  Creating print orders...');
  const printStatuses = ['PENDING', 'DESIGN', 'VALIDATION', 'PRODUCTION', 'QUALITY_CONTROL', 'FINISHED', 'DELIVERED', 'CANCELLED'];
  const printPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
  const printServices = await prisma.printService.findMany();
  const paperTypes = ['standard', 'glossy', 'matte', 'cartonné'];
  const paperSizes = ['A4', 'A3', 'A2', 'A1'];
  const colorModes = ['color', 'bw'];
  const finishings = ['reliure', 'plastification', 'agrafage', 'dos carré'];

  let createdPrintOrders = 0;
  for (let i = 1; i <= 20; i++) {
    const ref = makeRef('PO', i);
    const existing = await prisma.printOrder.findUnique({ where: { reference: ref } });
    if (existing) continue;

    const svc = printServices.length > 0 ? pick(printServices) : null;
    const status = pick(printStatuses);
    const qty = rand(10, 500);
    const unitPrice = rand(5000, 80000);
    const subtotal = qty * unitPrice;
    const orderedAt = randomDate(2026, rand(1, 8));
    const dueDate = new Date(orderedAt.getTime() + rand(3, 10) * 86400000);

    await prisma.printOrder.create({
      data: {
        reference: ref, customerId: pick(cIds),
        serviceId: svc ? svc.id : null, status, priority: pick(printPriorities),
        description: `${svc ? svc.name : 'Impression'} - ${qty} exemplaires`,
        quantity: qty, pages: rand(1, 32),
        paperType: pick(paperTypes), paperSize: pick(paperSizes),
        colorMode: pick(colorModes), finishing: pick(finishings),
        subtotal, total: subtotal,
        orderedAt, dueDate,
        startedAt: status !== 'PENDING' ? new Date(orderedAt.getTime() + rand(1, 3) * 86400000) : null,
        completedAt: ['FINISHED', 'DELIVERED'].includes(status) ? new Date(dueDate.getTime() - rand(0, 2) * 86400000) : null,
        deliveredAt: status === 'DELIVERED' ? dueDate : null,
      }
    });
    createdPrintOrders++;
  }
  console.log(`  ✓ ${createdPrintOrders} print orders created`);

  // 14. REVENUES & EXPENSES
  console.log('📈 Creating revenues & expenses...');
  const revenueCategories = ['impression', 'photocopie', 'reliure', 'plastification', 'formation', 'maintenance', 'conception_graphique'];
  const expenseCategories = ['fournitures', 'loyer', 'electricite', 'salaires', 'transport', 'entretien', 'materiel'];

  let createdRev = 0;
  for (let i = 1; i <= 40; i++) {
    const date = randomDate(2026, rand(1, 8));
    await prisma.revenue.create({
      data: { description: `Revenu ${pick(revenueCategories)}`, amount: rand(50000, 1500000), category: pick(revenueCategories), date }
    });
    createdRev++;
  }
  let createdExp = 0;
  for (let i = 1; i <= 30; i++) {
    const date = randomDate(2026, rand(1, 8));
    await prisma.expense.create({
      data: { description: `Dépense ${pick(expenseCategories)}`, amount: rand(30000, 800000), category: pick(expenseCategories), date, paidBy: USER_ID }
    });
    createdExp++;
  }
  console.log(`  ✓ ${createdRev} revenues, ${createdExp} expenses`);

  // 15. BUDGET LINES
  console.log('💰 Creating budget lines...');
  const budgetData = [
    { name: 'Fournitures impression', year: 2026, amount: 15000000, category: 'production' },
    { name: 'Salaires et charges', year: 2026, amount: 25000000, category: 'rh' },
    { name: 'Loyer et charges locatives', year: 2026, amount: 6000000, category: 'immobilier' },
    { name: 'Matériel informatique', year: 2026, amount: 8000000, category: 'equipement' },
    { name: 'Marketing et communication', year: 2026, amount: 3000000, category: 'commercial' },
    { name: 'Formation du personnel', year: 2026, amount: 2000000, category: 'formation' },
    { name: 'Transport et carburant', year: 2026, amount: 4000000, category: 'logistique' },
    { name: 'Internet et télécommunications', year: 2026, amount: 1800000, category: 'technologie' },
  ];
  let createdBudget = 0;
  for (const b of budgetData) {
    const existing = await prisma.budget.findFirst({ where: { name: b.name, year: 2026 } });
    if (!existing) {
      await prisma.budget.create({
        data: { ...b, spent: rand(Math.round(b.amount * 0.1), Math.round(b.amount * 0.85)) }
      });
      createdBudget++;
    }
  }
  console.log(`  ✓ ${createdBudget} budget lines`);

  // SUMMARY
  console.log('\n✅ Seeding complete! Database summary:');
  const counts = {
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    employees: await prisma.employee.count(),
    quotes: await prisma.quote.count(),
    salesOrders: await prisma.salesOrder.count(),
    invoices: await prisma.invoice.count(),
    cashTransactions: await prisma.cashTransaction.count(),
    accountTransactions: await prisma.accountTransaction.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    printOrders: await prisma.printOrder.count(),
    revenues: await prisma.revenue.count(),
    expenses: await prisma.expense.count(),
    budgets: await prisma.budget.count(),
    accounts: await prisma.account.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
