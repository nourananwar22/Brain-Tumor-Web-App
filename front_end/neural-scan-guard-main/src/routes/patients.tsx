import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  departmentDoctors,
  diagnosisTone,
  getVisiblePatients,
} from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/patients")({
  component: PatientsPage,
});

const filters = ["All", "Healthy", "Glioma", "Meningioma", "Pituitary"] as const;

function PatientsPage() {
  const { user } = useAuth();
  const isHead = user?.role === "head";

  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const [doctorFilter, setDoctorFilter] = useState<string>("All");

  const scoped = useMemo(
    () => getVisiblePatients(user, isHead ? doctorFilter : null),
    [user, isHead, doctorFilter],
  );

  const rows = useMemo(() => {
    return scoped.filter((p) => {
      if (f !== "All" && p.diagnosis !== f) return false;
      if (q && !`${p.name} ${p.id}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [scoped, q, f]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Records"
        title={isHead ? "Department Patient History" : "My Patient History"}
        description={
          isHead
            ? "All MRI scans processed across the department. Filter by doctor to focus on a caseload."
            : "MRI scans assigned to you, with diagnoses and confidence scores."
        }
      />

      {/* Role badge */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            isHead
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-chart-2/30 bg-chart-2/10 text-chart-2"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {isHead ? "Head of Department · Viewing all cases" : `Doctor · ${user?.physicianName}`}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isHead && (
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All doctors</option>
            {departmentDoctors.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto">
          {filters.map((x) => (
            <button
              key={x}
              onClick={() => setF(x)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                f === x
                  ? "bg-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-6 py-3 font-medium">Patient</th>
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Scan Date</th>
                <th className="text-left px-4 py-3 font-medium">Diagnosis</th>
                <th className="text-left px-4 py-3 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Physician</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40 transition group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
                        {p.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.age}y · {p.sex}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{p.scanDate}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${diagnosisTone(p.diagnosis)}`}>
                      {p.diagnosis}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full gradient-primary" style={{ width: `${p.confidence}%` }} />
                      </div>
                      <span className="font-mono text-xs">{p.confidence.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{p.physician}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      to="/patients/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition"
                    >
                      Report
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground text-sm">
                    No patients match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {rows.length} of {scoped.length} records</span>
          <span>Updated 2 minutes ago</span>
        </div>
      </div>
    </div>
  );
}
