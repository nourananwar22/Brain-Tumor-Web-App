import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

import {
  Activity,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  TrendingUp,
  UserCircle2,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { diagnosisTone } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const DIAGNOSIS_COLORS: Record<string, string> = {
  Healthy: "var(--color-chart-3, #22c55e)",
  glioma: "var(--color-chart-1, #0ea5e9)",
  meningioma: "var(--color-chart-2, #14b8a6)",
  pituitary: "var(--color-chart-4, #6366f1)",
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) navigate({ to: "/login", replace: true });
  }, [navigate]);

  const isHead = user?.role === "head";
  const [doctorFilter, setDoctorFilter] = useState<string>("All");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url =
      isHead || !user?.doctorId
        ? "http://127.0.0.1:8000/patients"
        : `http://127.0.0.1:8000/patients?doctor_id=${user.doctorId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isHead, user?.doctorId]);

  // All doctor names present in the data, for the filter dropdown
  const departmentDoctors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.DoctorName).filter(Boolean))),
    [rows],
  );

  // Scope rows: head sees everyone (optionally filtered by dropdown),
  // a regular doctor's `rows` already comes pre-scoped from the backend.
  const visible = useMemo(() => {
    if (isHead) {
      return doctorFilter === "All" ? rows : rows.filter((r) => r.DoctorName === doctorFilter);
    }
    return rows;
  }, [rows, isHead, doctorFilter]);

  const positiveCount = visible.filter((p) => p.TumorType && p.TumorType !== "Healthy").length;
  const avgConfidence =
    visible.length === 0
      ? 0
      : visible.reduce((s, p) => s + (Number(p.ConfidenceScore) || 0), 0) / visible.length;

  const stats = isHead
    ? [
        { label: "Total Scans (Dept.)", value: String(rows.length), delta: "", icon: ScanLine, tone: "text-primary" },
        { label: "Active Doctors", value: String(departmentDoctors.length), delta: "", icon: Users, tone: "text-chart-2" },
        { label: "Tumors Detected", value: String(rows.filter((p) => p.TumorType && p.TumorType !== "Healthy").length), delta: "", icon: Brain, tone: "text-destructive" },
        {
          label: "Avg Confidence",
          value: rows.length ? `${(rows.reduce((s, p) => s + (Number(p.ConfidenceScore) || 0), 0) / rows.length).toFixed(1)}%` : "0%",
          delta: "",
          icon: TrendingUp,
          tone: "text-success",
        },
      ]
    : [
        { label: "My Scans", value: String(visible.length), delta: "", icon: ScanLine, tone: "text-primary" },
        { label: "My Patients", value: String(new Set(visible.map((p) => p.PatientID)).size), delta: "Active caseload", icon: Users, tone: "text-chart-2" },
        { label: "Tumors Detected", value: String(positiveCount), delta: `${visible.length - positiveCount} healthy`, icon: Brain, tone: "text-destructive" },
        { label: "Avg Confidence", value: `${avgConfidence.toFixed(1)}%`, delta: "Your cases", icon: TrendingUp, tone: "text-success" },
      ];

  // Team performance: cases + positives per doctor, built from real rows (head-only, department-wide)
  const doctorStats = useMemo(() => {
    const map = new Map<string, { physician: string; total: number; positive: number; confidenceSum: number }>();
    for (const r of rows) {
      const name = r.DoctorName || "Unassigned";
      if (!map.has(name)) map.set(name, { physician: name, total: 0, positive: 0, confidenceSum: 0 });
      const entry = map.get(name)!;
      entry.total += 1;
      if (r.TumorType && r.TumorType !== "Healthy") entry.positive += 1;
      entry.confidenceSum += Number(r.ConfidenceScore) || 0;
    }
    return Array.from(map.values()).map((d) => ({
      ...d,
      avgConfidence: d.total ? d.confidenceSum / d.total : 0,
    }));
  }, [rows]);

  // Diagnosis split: counts per TumorType, scoped to the current view (own patients, or head's filter)
  const diagnosisBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of visible) {
      const key = r.TumorType || "Healthy";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      color: DIAGNOSIS_COLORS[name] || "var(--color-muted-foreground)",
    }));
  }, [visible]);

  // Scan volume: count of diagnoses per day, scoped to the current view, for the most recent 7 distinct days present
  const scanVolume = useMemo(() => {
    const map = new Map<string, { day: string; scans: number; positive: number }>();
    for (const r of visible) {
      if (!r.DiagnosisDate) continue;
      const day = String(r.DiagnosisDate).slice(0, 10);
      if (!map.has(day)) map.set(day, { day, scans: 0, positive: 0 });
      const entry = map.get(day)!;
      entry.scans += 1;
      if (r.TumorType && r.TumorType !== "Healthy") entry.positive += 1;
    }
    return Array.from(map.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);
  }, [visible]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={isHead ? "Department Overview" : "My Workspace"}
        title={isHead ? "Head of Department Dashboard" : `Welcome, ${user?.displayName ?? "Doctor"}`}
        description={
          isHead
            ? "Full department visibility: all doctors, all cases, all performance metrics."
            : "Real-time overview of your patients, MRI analyses, and diagnostic performance."
        }
        actions={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90 transition"
          >
            <ScanLine className="h-4 w-4" />
            New Analysis
          </Link>
        }
      />

      {/* Role badge + Head filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-medium ${
            isHead
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-chart-2/30 bg-chart-2/10 text-chart-2"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {isHead ? "Head of Department · Full access" : `Doctor · ${user?.physicianName}`}
        </span>

        {isHead && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="doc-filter" className="text-xs font-medium text-muted-foreground">
              View doctor:
            </label>
            <select
              id="doc-filter"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All doctors</option>
              {departmentDoctors.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="mb-6 text-sm text-muted-foreground">Loading dashboard data…</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elegant transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`grid h-10 w-10 place-items-center rounded-lg bg-muted ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              {s.delta && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  {s.delta}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Head-only: Team performance */}
      {isHead && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Team Performance</h3>
                <p className="text-xs text-muted-foreground">Cases managed per doctor</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={doctorStats} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="physician"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" name="Total cases" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="positive" name="Tumors detected" fill="var(--color-destructive)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold mb-4">Doctor Ranking</h3>
            <div className="space-y-3">
              {[...doctorStats]
                .sort((a, b) => b.total - a.total)
                .map((d, i) => (
                  <div key={d.physician} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
                      #{i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.physician}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.total} cases · {d.positive} positive
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {d.avgConfidence.toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold">Scan Volume</h3>
              <p className="text-xs text-muted-foreground">Most recent days on record</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Positive</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={scanVolume}>
              <defs>
                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="scans" stroke="var(--color-primary)" strokeWidth={2} fill="url(#scanGrad)" />
              <Area type="monotone" dataKey="positive" stroke="var(--color-destructive)" strokeWidth={2} fill="url(#posGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-1">Diagnosis Split</h3>
          <p className="text-xs text-muted-foreground mb-4">All-time distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={diagnosisBreakdown} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                {diagnosisBreakdown.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {diagnosisBreakdown.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium text-foreground">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent + System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="font-display text-lg font-semibold">
              {isHead
                ? doctorFilter === "All"
                  ? "Recent Patients (All Doctors)"
                  : `Recent Patients · ${doctorFilter}`
                : "My Recent Patients"}
            </h3>
            <Link to="/patients" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {[...visible]
              .sort((a, b) => String(b.DiagnosisDate).localeCompare(String(a.DiagnosisDate)))
              .slice(0, 5)
              .map((p, idx) => {
                const fullName = `${p.FirstName ?? ""} ${p.LastName ?? ""}`.trim();
                return (
                  <Link
                    key={`${p.PatientID}-${p.DiagnosisDate}-${idx}`}
                    to="/patients/$id"
                    params={{ id: String(p.PatientID) }}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition"
                  >
                    <div className="h-9 w-9 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold shrink-0">
                      {fullName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.PatientID} · {String(p.DiagnosisDate).slice(0, 10)}
                        {isHead && <span className="ml-2 inline-flex items-center gap-1"><UserCircle2 className="h-3 w-3" />{p.DoctorName}</span>}
                      </p>
                    </div>
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${diagnosisTone(p.TumorType || "Healthy")}`}>
                      {p.TumorType || "Healthy"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {Number(p.ConfidenceScore).toFixed(1)}%
                    </span>
                  </Link>
                );
              })}
            {visible.length === 0 && !loading && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No patients assigned to you yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            {[
              { label: "AI Inference Engine", val: "Operational", ok: true },
              { label: "DICOM Parser", val: "Operational", ok: true },
              { label: "Database (SQL Server)", val: "Operational", ok: true },
              { label: "Model v3.2", val: "Active", ok: true },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="inline-flex items-center gap-1.5 text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {r.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}