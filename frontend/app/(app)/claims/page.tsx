import { ClaimsTable } from "@/components/claims-table";
import { api, defaultPractice, safe } from "@/lib/api";

export default async function ClaimsPage() {
  const practice = await defaultPractice();
  if (!practice) return null;

  const claims = await safe(api.claims(practice.id), []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Claims</h1>
        <p className="text-sm text-muted-foreground">
          All claims for {practice.name}
        </p>
      </div>
      <ClaimsTable claims={claims} />
    </div>
  );
}
