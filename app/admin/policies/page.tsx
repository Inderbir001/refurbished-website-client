import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { PolicyEditor } from "@/components/admin/policy-editor";
import { currentSession } from "@/lib/auth";
import { POLICIES } from "@/lib/policies";
import { getBusinessDetails, readContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AdminPolicies() {
  const session = await currentSession();
  const allowed: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.PRODUCT_MANAGER];
  if (!session || !allowed.includes(session.role)) redirect("/login");
  const canEdit = session.role === Role.SUPER_ADMIN || session.role === Role.ADMIN;
  const [business, overrides] = await Promise.all([getBusinessDetails(), Promise.all(POLICIES.map((policy) => readContent<{ body: string }>(`policy:${policy.slug}`)))]);
  const items = POLICIES.map((policy, index) => ({ slug: policy.slug, title: policy.title, summary: policy.summary, defaultBody: policy.body, body: overrides[index]?.value.body ?? policy.body, customised: Boolean(overrides[index]) }));
  return <section className="admin-page">
    <p className="eyebrow">STORE</p>
    <h1>Policies &amp; pages</h1>
    <PolicyEditor business={business} items={items} canEdit={canEdit} />
  </section>;
}
