import { UploadForm } from "@/components/upload-form";
import { defaultPractice } from "@/lib/api-server";

export default async function UploadPage() {
  const practice = await defaultPractice();
  if (!practice) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
        <p className="text-sm text-muted-foreground">
          Upload an EOB or denial letter for {practice.name}. The pipeline
          extracts the claim, classifies the denial, and drafts an appeal when
          warranted.
        </p>
      </div>
      <UploadForm practiceId={practice.id} />
    </div>
  );
}
