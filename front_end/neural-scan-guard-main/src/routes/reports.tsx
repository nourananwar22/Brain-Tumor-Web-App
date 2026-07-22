import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { diagnosisTone, patients } from "@/lib/mock-data";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Documentation"
        title="Medical Reports"
        description="Generated diagnostic reports ready for review, signature, and archiving."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((p) => (
          <Link
            key={p.id}
            to="/patients/$id"
            params={{ id: p.id }}
            className="group rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${diagnosisTone(p.diagnosis)}`}>
                {p.diagnosis}
              </span>
            </div>
            <p className="font-display font-semibold truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.id}</p>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.scanDate}</span>
              <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                Open report <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
