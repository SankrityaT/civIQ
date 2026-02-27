// TODO (Kinjal): Build full document management UI
import DocumentList from "@/components/dashboard/DocumentList";
import DocumentUpload from "@/components/dashboard/DocumentUpload";

export default function DocumentsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Training Documents</h1>
        <DocumentUpload />
      </div>
      <DocumentList />
    </div>
  );
}
