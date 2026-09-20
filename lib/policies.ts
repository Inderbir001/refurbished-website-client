// Policy pages: default wording + a tiny "markdown-lite" format (## headings, - bullets, blank line = new paragraph).
// Tokens such as {{returnDays}} are filled from the store settings, so the text stays correct when settings change.
// The admin can override any policy's wording (Admin → Policies & pages) and reset it to these defaults.

export type PolicyDef = { slug: string; title: string; summary: string; body: string };

export const POLICIES: PolicyDef[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary: "What we collect, why, and the choices you have.",
    body: `{{legalName}} ("we", "us") runs {{website}}. This policy explains how we handle your personal information when you browse, create an account or place an order.

## Information we collect
- Account details: your name, email address, phone number and password (stored only as a secure hash).
- Order details: delivery and billing addresses, the items you buy and their prices.
- Payment status: payments are processed by our payment partners (such as Razorpay or PhonePe). We never see or store your card number, CVV or UPI PIN — we only receive whether the payment succeeded.
- Device and usage data: pages visited, searches and basic technical information, used to keep the site working and to improve it.
- Cookies: described in our Cookie Policy.

## How we use it
- To process and deliver your orders, send order updates and provide support.
- To keep your account and the site secure, and to prevent fraud and misuse.
- To handle returns, refunds and warranty claims.
- To improve our products, prices and website.
- To meet legal, tax and accounting obligations (for example GST invoicing).

## Who we share it with
We share only what is needed with: payment providers, courier and delivery partners, technology providers that host our website and database, and authorities when the law requires it. We do not sell your personal information.

## How long we keep it
We keep order and invoice records for as long as tax and accounting laws require, and other information for as long as your account is active or it is needed for the purposes above.

## Your choices and rights
You can view and update your details in your account. You may ask us to correct or delete your personal information, or to withdraw your consent, by contacting us below. Some records must be kept by law, and we will tell you if that applies.

## Security
We use encryption in transit, hashed passwords and restricted access to protect your information. No system is perfectly secure, so please keep your password private.

## Children
Our shop is meant for adults. We do not knowingly collect information from children.

## Changes to this policy
We may update this policy from time to time. The latest version is always on this page.

## Contact us
{{contactBlock}}`,
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    summary: "The rules for using our website and buying from us.",
    body: `These terms apply to your use of {{website}} and to every order you place with {{legalName}}. By using the site or placing an order you agree to them.

## About our products
We sell new, certified refurbished and pre-owned electronics. Each product page states the condition and, where relevant, the grade and warranty. Photographs are for illustration; refurbished and pre-owned items may show light signs of use as described in their grade.

## Prices and taxes
All prices are in Indian Rupees (INR) and include or show GST as applicable. Delivery charges, if any, are shown at checkout before you pay. We may change prices at any time, but the price you see when you place an order is the price you pay.

## Orders and payment
An order is confirmed only after your payment is successfully verified. We may cancel or refuse an order if an item is unavailable, a price was shown in error, or we suspect fraud; in that case any amount paid is refunded in full to the original payment method.

## Delivery, returns and refunds
Delivery is covered by our Shipping & Delivery Policy. Returns, cancellations and refunds are covered by our Returns, Refunds & Cancellation Policy. Both form part of these terms.

## Warranty
Products carry the warranty period shown on the product page. Warranty covers manufacturing or functional defects during that period and does not cover physical damage, liquid damage, unauthorised repairs or misuse. To claim, contact us with your order number.

## Your account
Keep your login details confidential. You are responsible for activity under your account. Provide accurate information, and tell us if you suspect unauthorised use.

## Acceptable use
You agree not to misuse the website, attempt to gain unauthorised access, place fraudulent orders or use automated tools to scrape or overload the site.

## Intellectual property
The site's content, design and branding belong to {{legalName}} or its licensors and may not be copied or reused without permission. Brand and product names belong to their respective owners.

## Limitation of liability
To the extent permitted by law, we are not liable for indirect or consequential losses. Our total liability for any order is limited to the amount you paid for it. Nothing here limits your rights under Indian consumer protection law.

## Governing law
These terms are governed by the laws of India. Disputes are subject to the courts at the location of our registered office.

## Changes
We may update these terms from time to time; the version on this page applies to orders placed after the update.

## Contact us
{{contactBlock}}`,
  },
  {
    slug: "shipping-policy",
    title: "Shipping & Delivery Policy",
    summary: "Where we deliver, how long it takes and what it costs.",
    body: `This policy explains how {{legalName}} ships your order.

## Where we deliver
We deliver to serviceable PIN codes across India. Enter your PIN code at checkout to confirm delivery to your address.

## Processing time
Orders are checked and packed before dispatch, usually within 1–2 business days of payment confirmation. Refurbished and pre-owned devices go through a final test before they ship.

## Delivery time
Standard delivery usually takes {{deliveryEstimate}} once the order has shipped. The estimated delivery window is shown on your order confirmation page. Remote locations, public holidays and weather can cause delays.

## Delivery charges
- Delivery is free on orders above {{freeShipping}}.
- Below that, the delivery charge is shown at checkout before you pay.

## Tracking
When your order ships you will see the courier and tracking details under Account → Orders.

## Delivery attempts and address
Please make sure the address and phone number are correct — the courier will call before delivery. If delivery fails repeatedly, the parcel may return to us; we will contact you to re-send it or refund you as per our Returns, Refunds & Cancellation Policy.

## Damaged or wrong parcels
Please check the parcel on delivery. If it looks tampered with, damaged or wrong, do not accept it (or record a short video while opening it) and contact us within 48 hours so we can arrange a replacement or refund.

## Contact us
{{contactBlock}}`,
  },
  {
    slug: "refund-policy",
    title: "Returns, Refunds & Cancellation Policy",
    summary: "How to cancel, return an item and get your money back.",
    body: `We want you to be happy with your purchase. This is how cancellations, returns and refunds work at {{legalName}}.

## Cancelling an order
- You can cancel within {{cancellationHours}} hour(s) of placing the order, as long as it has not been shipped. Contact us with your order number.
- Once an order has shipped it can no longer be cancelled, but you can return it under the rules below.

## Returning an item
- You can request a return within {{returnDays}} days of delivery.
- The item must be in the same condition you received it, with all accessories, boxes, manuals and free gifts.
- Devices must not have been tampered with, opened for repair or have their IMEI/serial number altered. Devices must be signed out of any personal account (such as Apple ID, Google account or Mi account) and reset before return.
- Items damaged by the customer (physical or liquid damage) cannot be returned.
- Certified refurbished and pre-owned items may be returned within the same window if they do not match the description or grade shown on the product page.

## How to request a return
Contact us with your order number and the reason. We will confirm the return and arrange a pickup or tell you where to send the item. Please keep the original packaging.

## Inspection and refunds
- After we receive the item we inspect it, usually within 2–3 business days.
- If the return is approved, the refund is sent to your original payment method within 5–7 business days. Your bank may take a few more days to show it.
- If a returned item is incomplete, damaged or used beyond reasonable testing, we may refuse the return or deduct a reasonable amount.

## Defective items and warranty
If a product develops a defect within its warranty period we will repair or replace it, or refund you if a replacement is not possible. See the warranty period on the product page.

## Failed or duplicate payments
If money was deducted but your order was not confirmed, or you were charged twice, it is refunded automatically to the original payment method within 5–7 business days. Contact us if it has not arrived.

## Contact us
{{contactBlock}}`,
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary: "The cookies we use and how you can control them.",
    body: `This page explains how {{website}} uses cookies and similar storage in your browser.

## What we use
- Essential cookies: keep you signed in (a secure session cookie), remember your cart (a cart cookie) and remember your cookie choice. The site cannot work properly without these.
- Local storage: remembers your recent searches on this device.
- Payment partners: when you pay, our payment provider (for example Razorpay) may set its own cookies to secure and complete the payment.
- Analytics cookies: if we introduce analytics to understand how the site is used, they will only run if you choose "Accept all".

We do not use advertising cookies.

## Your choices
When you first visit, you can choose "Accept all" or "Essential only". You can change your mind at any time using "Cookie settings" at the bottom of every page. You can also block or delete cookies in your browser settings, but parts of the site (such as signing in and checkout) may stop working.

## Contact us
{{contactBlock}}`,
  },
];

export const findPolicy = (slug: string) => POLICIES.find((policy) => policy.slug === slug);

export type PolicyVars = Record<string, string>;
export function fillTokens(text: string, vars: PolicyVars) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}

export type Block = { type: "h2"; text: string } | { type: "ul"; items: string[] } | { type: "p"; text: string };
export function parseBlocks(text: string): Block[] {
  return text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean).flatMap<Block>((chunk) => {
    const lines = chunk.split("\n");
    // a heading may be followed directly by content on the next lines
    if (lines[0].startsWith("## ")) {
      const rest = lines.slice(1).join("\n").trim();
      const head: Block = { type: "h2", text: lines[0].slice(3).trim() };
      return rest ? [head, ...parseBlocks(rest)] : [head];
    }
    if (lines.every((line) => line.startsWith("- "))) return [{ type: "ul", items: lines.map((line) => line.slice(2).trim()) }];
    return [{ type: "p", text: chunk }];
  });
}

export const TOKEN_HELP: [string, string][] = [
  ["{{legalName}}", "Your registered business name"],
  ["{{website}}", "Your website address"],
  ["{{returnDays}}", "Return window (Settings)"],
  ["{{cancellationHours}}", "Cancellation window (Settings)"],
  ["{{freeShipping}}", "Free-delivery amount (Settings)"],
  ["{{deliveryEstimate}}", "Typical delivery time"],
  ["{{contactBlock}}", "Your email, phone and address"],
];
