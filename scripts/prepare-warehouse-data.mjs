import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { faker } from "@faker-js/faker";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";

const RAW_EXTRACT_DIR = join(process.cwd(), "data", "raw", "online-retail");
const RAW_CSV_PATH = join(RAW_EXTRACT_DIR, "online_retail.csv");
const OUTPUT_DIR = join(process.cwd(), "data", "generated");

const SCALE_CONFIGS = {
  small: { maxSourceRows: 25_000, supportRatio: 0.12 },
  medium: { maxSourceRows: 200_000, supportRatio: 0.1 },
  large: { maxSourceRows: Number.POSITIVE_INFINITY, supportRatio: 0.08 },
};

const args = parseArgs(process.argv.slice(2));
const scale = args.scale ?? process.env.DEMO_DATA_SCALE ?? "small";
const seed = Number(args.seed ?? process.env.DEMO_DATA_SEED ?? 42042);

if (!SCALE_CONFIGS[scale]) {
  throw new Error(`Unknown scale "${scale}". Use one of: ${Object.keys(SCALE_CONFIGS).join(", ")}`);
}

if (!existsSync(RAW_CSV_PATH)) {
  throw new Error("Converted CSV not found. Run `npm run data:download` and `npm run data:convert` first.");
}

faker.seed(seed);
mkdirSync(OUTPUT_DIR, { recursive: true });

const sourcePath = RAW_CSV_PATH;
const sourceRows = await loadSourceRows(sourcePath);
const sampledRows = takeEvenSample(sourceRows, SCALE_CONFIGS[scale].maxSourceRows);
const shiftedRows = shiftDatesToDemoYears(sampledRows);

const suppliers = createSuppliers(shiftedRows);
const products = createProducts(shiftedRows, suppliers);
const customers = createCustomers(shiftedRows);
const { orders, orderItems, inventoryEvents } = createOrders(shiftedRows, products, customers);
const dailyRevenue = aggregateDailyRevenue(orders);
const adMetrics = createAdMetrics(dailyRevenue);
const emailCampaigns = createEmailCampaigns(customers.length);
const supportThreads = createSupportThreads(orders, customers, SCALE_CONFIGS[scale].supportRatio);
const financeTransactions = createFinanceTransactions(orders);
const workflowEvents = createWorkflowEvents(products, supportThreads, adMetrics);

writeCsv("suppliers.csv", suppliers);
writeCsv("products.csv", products);
writeCsv("customers.csv", customers);
writeCsv("orders.csv", orders);
writeCsv("order_items.csv", orderItems);
writeCsv("inventory_events.csv", inventoryEvents);
writeCsv("ad_campaign_daily_metrics.csv", adMetrics);
writeCsv("email_campaigns.csv", emailCampaigns);
writeCsv("support_threads.csv", supportThreads);
writeCsv("finance_transactions.csv", financeTransactions);
writeCsv("workflow_events.csv", workflowEvents);
writeFileSync(join(OUTPUT_DIR, "load.sql"), createLoadSql(), "utf8");
writeFileSync(
  join(OUTPUT_DIR, "summary.json"),
  JSON.stringify(
    {
      scale,
      seed,
      source: {
        name: "UCI Online Retail",
        url: "https://archive.ics.uci.edu/dataset/352/online+retail",
        local_file: sourcePath,
        sampled_source_rows: shiftedRows.length,
      },
      generated_at: new Date().toISOString(),
      row_counts: {
        suppliers: suppliers.length,
        products: products.length,
        customers: customers.length,
        orders: orders.length,
        order_items: orderItems.length,
        inventory_events: inventoryEvents.length,
        ad_campaign_daily_metrics: adMetrics.length,
        email_campaigns: emailCampaigns.length,
        support_threads: supportThreads.length,
        finance_transactions: financeTransactions.length,
        workflow_events: workflowEvents.length,
      },
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Prepared ${scale} warehouse dataset in ${OUTPUT_DIR}`);
console.table({
  source_rows: shiftedRows.length,
  suppliers: suppliers.length,
  products: products.length,
  customers: customers.length,
  orders: orders.length,
  order_items: orderItems.length,
  inventory_events: inventoryEvents.length,
  ad_campaign_daily_metrics: adMetrics.length,
  email_campaigns: emailCampaigns.length,
  support_threads: supportThreads.length,
  finance_transactions: financeTransactions.length,
  workflow_events: workflowEvents.length,
});

async function loadSourceRows(csvPath) {
  const rows = [];
  const parser = createReadStream(csvPath).pipe(parse({ columns: true, bom: true, trim: true }));

  for await (const record of parser) {
    const row = {
      invoiceNo: String(record.InvoiceNo ?? "").trim(),
      stockCode: String(record.StockCode ?? "").trim(),
      description: cleanText(record.Description),
      quantity: Number(record.Quantity),
      invoiceDate: parseExcelDate(record.InvoiceDate),
      unitPrice: Number(record.UnitPrice),
      customerId: String(record.CustomerID ?? "").trim(),
      country: cleanText(record.Country),
    };

    if (
      row.invoiceNo &&
      !row.invoiceNo.startsWith("C") &&
      row.stockCode &&
      row.description &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0 &&
      Number.isFinite(row.unitPrice) &&
      row.unitPrice > 0 &&
      row.customerId &&
      row.country &&
      row.invoiceDate instanceof Date &&
      !Number.isNaN(row.invoiceDate.getTime())
    ) {
      rows.push(row);
    }
  }

  return rows.sort((a, b) => a.invoiceDate - b.invoiceDate);
}

function shiftDatesToDemoYears(rows) {
  return rows.map((row) => {
    const shifted = new Date(row.invoiceDate);
    shifted.setUTCFullYear(shifted.getUTCFullYear() + 14);
    return { ...row, invoiceDate: shifted };
  });
}

function takeEvenSample(rows, maxRows) {
  if (rows.length <= maxRows) return rows;
  const sampled = [];
  const step = rows.length / maxRows;
  for (let index = 0; index < maxRows; index += 1) {
    sampled.push(rows[Math.floor(index * step)]);
  }
  return sampled;
}

function createSuppliers(rows) {
  const countries = [...new Set(rows.map((row) => row.country))].slice(0, 30);
  const supplierCount = Math.max(10, Math.min(60, Math.ceil(countUnique(rows, "stockCode") / 20)));
  return Array.from({ length: supplierCount }, (_, index) => ({
    supplier_id: id("sup", index + 1),
    supplier_name: faker.company.name(),
    country: countries[index % countries.length] ?? faker.location.country(),
    lead_time_days: faker.number.int({ min: 7, max: 28 }),
    reliability_score: faker.number.float({ min: 82, max: 99, fractionDigits: 2 }).toFixed(2),
    created_at: faker.date.past({ years: 3, refDate: new Date("2024-01-01T00:00:00.000Z") }).toISOString(),
  }));
}

function createProducts(rows, suppliers) {
  const grouped = groupBy(rows, "stockCode");
  return [...grouped.entries()].map(([stockCode, productRows], index) => {
    const firstRow = productRows[0];
    const unitPrice = median(productRows.map((row) => row.unitPrice));
    const unitCost = unitPrice * faker.number.float({ min: 0.35, max: 0.62, fractionDigits: 2 });
    const reorderPoint = faker.number.int({ min: 20, max: 220 });
    const targetStock = reorderPoint + faker.number.int({ min: 100, max: 900 });
    return {
      product_id: id("prod", index + 1),
      supplier_id: suppliers[index % suppliers.length].supplier_id,
      sku: stockCode.replaceAll(/[^A-Za-z0-9-]/g, "").slice(0, 32),
      product_name: firstRow.description.slice(0, 160),
      category: faker.commerce.department(),
      brand: faker.company.name(),
      unit_price: money(unitPrice),
      unit_cost: money(unitCost),
      reorder_point: reorderPoint,
      target_stock: targetStock,
      current_stock: faker.number.int({ min: 0, max: targetStock }),
      is_active: faker.datatype.boolean({ probability: 0.96 }),
      created_at: faker.date.past({ years: 2, refDate: firstRow.invoiceDate }).toISOString(),
    };
  });
}

function createCustomers(rows) {
  const grouped = groupBy(rows, "customerId");
  return [...grouped.entries()].map(([sourceCustomerId, customerRows], index) => {
    const firstRow = customerRows[0];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    return {
      customer_id: id("cust", index + 1),
      email: faker.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      country: firstRow.country,
      state_region: faker.location.state(),
      city: faker.location.city(),
      acquisition_channel: faker.helpers.arrayElement(["google_ads", "meta_ads", "organic_search", "klaviyo_email", "referral", "direct"]),
      customer_segment: faker.helpers.weightedArrayElement([
        { value: "new", weight: 30 },
        { value: "returning", weight: 42 },
        { value: "vip", weight: 8 },
        { value: "at_risk", weight: 16 },
        { value: "wholesale", weight: 4 },
      ]),
      created_at: faker.date.past({ years: 2, refDate: firstRow.invoiceDate }).toISOString(),
      source_customer_id: sourceCustomerId,
    };
  });
}

function createOrders(rows, products, customers) {
  const productByStockCode = new Map(products.map((product) => [product.sku, product]));
  const customerBySourceId = new Map(customers.map((customer) => [customer.source_customer_id, customer]));
  const invoices = groupBy(rows, "invoiceNo");
  const orders = [];
  const orderItems = [];
  const inventoryEvents = [];
  const stockByProduct = new Map(products.map((product) => [product.product_id, product.target_stock]));

  for (const [invoiceNo, invoiceRows] of invoices.entries()) {
    const firstRow = invoiceRows[0];
    const customer = customerBySourceId.get(firstRow.customerId);
    if (!customer) continue;

    let subtotal = 0;
    let discountTotal = 0;
    let refundTotal = 0;
    const orderId = id("ord", orders.length + 1);
    const scenarioTag = blackFridayScenario(firstRow.invoiceDate);

    for (const invoiceRow of invoiceRows) {
      const product = productByStockCode.get(invoiceRow.stockCode.replaceAll(/[^A-Za-z0-9-]/g, "").slice(0, 32));
      if (!product) continue;

      const quantity = Math.min(invoiceRow.quantity, 100);
      const discountAmount = Number(money(invoiceRow.unitPrice * quantity * seasonalDiscountRate(firstRow.invoiceDate)));
      const lineTotal = Number(money(invoiceRow.unitPrice * quantity - discountAmount));
      const refundQuantity = faker.datatype.boolean({ probability: refundProbability(firstRow.invoiceDate) }) ? 1 : 0;
      subtotal += invoiceRow.unitPrice * quantity;
      discountTotal += discountAmount;
      refundTotal += refundQuantity * invoiceRow.unitPrice;

      orderItems.push({
        order_item_id: id("item", orderItems.length + 1),
        order_id: orderId,
        product_id: product.product_id,
        sku: product.sku,
        quantity,
        unit_price: money(invoiceRow.unitPrice),
        unit_cost: product.unit_cost,
        discount_amount: money(discountAmount),
        refund_quantity: refundQuantity,
        line_total: money(lineTotal),
      });

      const stockAfter = (stockByProduct.get(product.product_id) ?? 0) - quantity;
      stockByProduct.set(product.product_id, stockAfter);
      inventoryEvents.push({
        inventory_event_id: id("inv", inventoryEvents.length + 1),
        product_id: product.product_id,
        event_date: firstRow.invoiceDate.toISOString(),
        event_type: "sale",
        quantity_delta: -quantity,
        stock_after: stockAfter,
        reference_id: orderId,
        scenario_tag: scenarioTag,
      });
    }

    if (!orderItems.some((item) => item.order_id === orderId)) continue;

    const shipping = subtotal > 75 ? 0 : faker.helpers.arrayElement([4.99, 6.99, 8.99]);
    const tax = subtotal * faker.number.float({ min: 0.04, max: 0.09, fractionDigits: 4 });
    orders.push({
      order_id: orderId,
      customer_id: customer.customer_id,
      order_number: `CO-${String(orders.length + 10001).padStart(7, "0")}`,
      order_date: firstRow.invoiceDate.toISOString(),
      channel: faker.helpers.weightedArrayElement([
        { value: "shopify_online_store", weight: 52 },
        { value: "amazon_marketplace", weight: 12 },
        { value: "instagram_shop", weight: 14 },
        { value: "tiktok_shop", weight: 8 },
        { value: "manual_invoice", weight: 14 },
      ]),
      status: refundTotal > 0 ? "partially_refunded" : faker.helpers.weightedArrayElement([
        { value: "paid", weight: 80 },
        { value: "fulfilled", weight: 18 },
        { value: "cancelled", weight: 2 },
      ]),
      currency: "USD",
      subtotal: money(subtotal),
      discount_total: money(discountTotal),
      shipping_total: money(shipping),
      tax_total: money(tax),
      refund_total: money(refundTotal),
      grand_total: money(subtotal - discountTotal + shipping + tax - refundTotal),
      scenario_tag: scenarioTag,
    });
  }

  for (const product of products) {
    product.current_stock = Math.max(0, stockByProduct.get(product.product_id) ?? product.current_stock);
    delete product.source_customer_id;
  }
  for (const customer of customers) {
    delete customer.source_customer_id;
  }

  return { orders, orderItems, inventoryEvents };
}

function createAdMetrics(dailyRevenue) {
  const platforms = ["google", "meta"];
  const campaigns = platforms.flatMap((platform) => (
    Array.from({ length: 3 }, (_, index) => ({
      platform,
      campaign_id: `${platform}_${index + 1}`,
      campaign_name: `${platform.toUpperCase()} ${faker.commerce.productAdjective()} ${faker.commerce.department()}`,
      objective: "purchase",
    }))
  ));

  const rows = [];
  for (const day of dailyRevenue) {
    for (const campaign of campaigns) {
      const spend = day.revenue * faker.number.float({ min: 0.015, max: 0.08, fractionDigits: 4 });
      const clicks = Math.max(1, Math.round(spend / faker.number.float({ min: 0.55, max: 3.2, fractionDigits: 2 })));
      const conversions = Math.max(0, Math.round(clicks * faker.number.float({ min: 0.012, max: 0.05, fractionDigits: 4 })));
      rows.push({
        metric_id: id("admet", rows.length + 1),
        metric_date: day.date,
        platform: campaign.platform,
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        objective: campaign.objective,
        spend: money(spend),
        impressions: clicks * faker.number.int({ min: 18, max: 64 }),
        clicks,
        conversions,
        attributed_revenue: money(conversions * faker.number.float({ min: 45, max: 140, fractionDigits: 2 })),
        scenario_tag: day.date >= "2025-11-24" && day.date <= "2025-12-02" ? "black_friday_2025" : "",
      });
    }
  }
  return rows;
}

function createEmailCampaigns(customerCount) {
  const dates = ["2025-02-10", "2025-05-16", "2025-07-08", "2025-09-22", "2025-11-25", "2025-11-29", "2025-12-12"];
  return dates.map((date, index) => {
    const recipients = faker.number.int({ min: Math.min(500, customerCount), max: Math.max(600, customerCount) });
    const opens = Math.round(recipients * faker.number.float({ min: 0.24, max: 0.52, fractionDigits: 4 }));
    const clicks = Math.round(opens * faker.number.float({ min: 0.05, max: 0.18, fractionDigits: 4 }));
    const orders = Math.round(clicks * faker.number.float({ min: 0.08, max: 0.24, fractionDigits: 4 }));
    return {
      campaign_id: id("email", index + 1),
      sent_at: new Date(`${date}T15:00:00.000Z`).toISOString(),
      campaign_name: `${faker.commerce.productAdjective()} ${faker.commerce.department()} Campaign`,
      audience_segment: faker.helpers.arrayElement(["new", "returning", "vip", "at_risk", "all"]),
      subject_line: faker.company.catchPhrase(),
      recipients,
      opens,
      clicks,
      orders,
      attributed_revenue: money(orders * faker.number.float({ min: 50, max: 135, fractionDigits: 2 })),
      scenario_tag: date >= "2025-11-24" && date <= "2025-12-02" ? "black_friday_2025" : "",
    };
  });
}

function createSupportThreads(orders, customers, ratio) {
  const supportCount = Math.max(100, Math.round(orders.length * ratio));
  return Array.from({ length: supportCount }, (_, index) => {
    const order = faker.helpers.arrayElement(orders);
    const customer = customers.find((row) => row.customer_id === order.customer_id) ?? faker.helpers.arrayElement(customers);
    const issueType = faker.helpers.arrayElement(["shipping_delay", "refund_request", "product_question", "damaged_item", "subscription_change", "vip_escalation"]);
    const openedAt = faker.date.soon({ days: 21, refDate: order.order_date });
    return {
      thread_id: id("thread", index + 1),
      customer_id: customer.customer_id,
      order_id: order.order_id,
      opened_at: openedAt.toISOString(),
      channel: faker.helpers.arrayElement(["gmail", "shopify_inbox", "slack_internal", "phone_note"]),
      issue_type: issueType,
      priority: issueType === "vip_escalation" ? "urgent" : faker.helpers.weightedArrayElement([
        { value: "low", weight: 35 },
        { value: "normal", weight: 45 },
        { value: "high", weight: 17 },
        { value: "urgent", weight: 3 },
      ]),
      sentiment: faker.helpers.weightedArrayElement([
        { value: "negative", weight: issueType === "damaged_item" ? 55 : 22 },
        { value: "neutral", weight: 52 },
        { value: "positive", weight: 26 },
      ]),
      status: faker.helpers.weightedArrayElement([
        { value: "open", weight: 14 },
        { value: "waiting_on_customer", weight: 18 },
        { value: "resolved", weight: 62 },
        { value: "escalated", weight: 6 },
      ]),
      subject: faker.lorem.sentence({ min: 4, max: 8 }),
      latest_message: faker.lorem.paragraph({ min: 1, max: 3 }),
      scenario_tag: issueType === "vip_escalation" ? "vip_customer_escalation" : "",
    };
  });
}

function createFinanceTransactions(orders) {
  const rows = [];
  for (const order of orders) {
    rows.push({
      transaction_id: id("fin", rows.length + 1),
      transaction_date: order.order_date.slice(0, 10),
      account: "Sales Revenue",
      transaction_type: "income",
      vendor_or_customer: order.customer_id,
      amount: order.grand_total,
      related_order_id: order.order_id,
      memo: `Revenue for ${order.order_number}`,
      scenario_tag: order.scenario_tag,
    });
    if (Number(order.refund_total) > 0) {
      rows.push({
        transaction_id: id("fin", rows.length + 1),
        transaction_date: order.order_date.slice(0, 10),
        account: "Refunds",
        transaction_type: "refund",
        vendor_or_customer: order.customer_id,
        amount: money(-Number(order.refund_total)),
        related_order_id: order.order_id,
        memo: `Refund for ${order.order_number}`,
        scenario_tag: order.scenario_tag,
      });
    }
  }
  return rows;
}

function createWorkflowEvents(products, supportThreads, adMetrics) {
  const rows = [];
  for (const product of products.filter((row) => row.current_stock <= row.reorder_point).slice(0, 80)) {
    rows.push({
      workflow_event_id: id("wf", rows.length + 1),
      occurred_at: faker.date.recent({ days: 45, refDate: new Date("2026-01-15T00:00:00.000Z") }).toISOString(),
      workflow_name: "low_stock_alert",
      source_system: "commerceops",
      event_type: "alert_created",
      severity: product.current_stock < product.reorder_point / 2 ? "high" : "medium",
      entity_type: "product",
      entity_id: product.product_id,
      message: `${product.sku} is below reorder point and needs purchasing review.`,
      scenario_tag: product.current_stock < product.reorder_point / 2 ? "hero_sku_stockout_risk" : "",
    });
  }
  for (const thread of supportThreads.filter((row) => row.priority === "urgent").slice(0, 80)) {
    rows.push({
      workflow_event_id: id("wf", rows.length + 1),
      occurred_at: thread.opened_at,
      workflow_name: "vip_support_escalation",
      source_system: thread.channel,
      event_type: "escalation_created",
      severity: "high",
      entity_type: "support_thread",
      entity_id: thread.thread_id,
      message: `Urgent ${thread.issue_type} thread requires manager review.`,
      scenario_tag: thread.scenario_tag,
    });
  }
  for (const metric of adMetrics.filter((row) => Number(row.spend) > 0 && Number(row.attributed_revenue) / Number(row.spend) < 1.2).slice(0, 80)) {
    rows.push({
      workflow_event_id: id("wf", rows.length + 1),
      occurred_at: new Date(`${metric.metric_date}T18:00:00.000Z`).toISOString(),
      workflow_name: "paid_media_roas_alert",
      source_system: metric.platform,
      event_type: "budget_alert",
      severity: "high",
      entity_type: "ad_campaign",
      entity_id: metric.campaign_id,
      message: `${metric.campaign_name} ROAS dropped below target.`,
      scenario_tag: "paid_media_efficiency_alert",
    });
  }
  return rows;
}

function createLoadSql() {
  const tables = [
    ["commerce.suppliers", "suppliers.csv"],
    ["commerce.products", "products.csv"],
    ["commerce.customers", "customers.csv"],
    ["commerce.orders", "orders.csv"],
    ["commerce.order_items", "order_items.csv"],
    ["commerce.inventory_events", "inventory_events.csv"],
    ["commerce.ad_campaign_daily_metrics", "ad_campaign_daily_metrics.csv"],
    ["commerce.email_campaigns", "email_campaigns.csv"],
    ["commerce.support_threads", "support_threads.csv"],
    ["commerce.finance_transactions", "finance_transactions.csv"],
    ["commerce.workflow_events", "workflow_events.csv"],
  ];
  return [
    "\\set ON_ERROR_STOP on",
    ...tables.map(([table, file]) => `\\copy ${table} FROM 'data/generated/${file}' WITH (FORMAT csv, HEADER true)`),
    "",
  ].join("\n");
}

function aggregateDailyRevenue(orders) {
  const daily = new Map();
  for (const order of orders) {
    const date = order.order_date.slice(0, 10);
    daily.set(date, (daily.get(date) ?? 0) + Number(order.grand_total));
  }
  return [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

function writeCsv(fileName, rows) {
  if (!rows.length) {
    throw new Error(`No rows generated for ${fileName}`);
  }
  writeFileSync(
    join(OUTPUT_DIR, fileName),
    stringify(rows, {
      header: true,
      cast: {
        boolean: (value) => (value ? "true" : "false"),
      },
    }),
    "utf8",
  );
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      parsed[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return parsed;
}

function parseExcelDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  return new Date(value);
}

function cleanText(value) {
  return String(value ?? "").trim().replaceAll(/\s+/g, " ");
}

function countUnique(rows, key) {
  return new Set(rows.map((row) => row[key])).size;
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row);
  }
  return grouped;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function money(value) {
  return Number(value).toFixed(2);
}

function id(prefix, number) {
  return `${prefix}_${String(number).padStart(6, "0")}`;
}

function seasonalDiscountRate(date) {
  const ymd = date.toISOString().slice(5, 10);
  if (ymd >= "11-24" && ymd <= "12-02") return faker.number.float({ min: 0.12, max: 0.3, fractionDigits: 4 });
  return faker.datatype.boolean({ probability: 0.18 }) ? faker.number.float({ min: 0.04, max: 0.16, fractionDigits: 4 }) : 0;
}

function refundProbability(date) {
  const ymd = date.toISOString().slice(5, 10);
  return ymd >= "04-03" && ymd <= "04-20" ? 0.06 : 0.015;
}

function blackFridayScenario(date) {
  const ymd = date.toISOString().slice(5, 10);
  return ymd >= "11-24" && ymd <= "12-02" ? "black_friday_2025" : "";
}
