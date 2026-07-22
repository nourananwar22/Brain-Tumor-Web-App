import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Brain,
  Download,
  Printer,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";
import { diagnosisTone, patients } from "@/lib/mock-data";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/patients/$id")({
  loader: ({ params }) => {
    const patient = patients.find((p) => p.id === params.id);
    if (!patient) throw notFound();
    // RBAC: doctors can only open their own patients.
    const user = getUser();
    if (user?.role === "doctor" && patient.physician !== user.physicianName) {
      throw notFound();
    }
    return { patient };
  },
  component: ReportPage,
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p className="text-muted-foreground">Patient not found or not accessible.</p>
      <Link to="/patients" className="text-primary text-sm mt-3 inline-block">
        ← Back to records
      </Link>
    </div>
  ),
});

function ReportPage() {
  const { patient } = Route.useLoaderData();
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");
  const today = new Date();

  const reportNo = `NS-${patient.id.replace("PT-", "")}-${today.getFullYear()}`;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Top nav — hidden on print */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to records
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ============ OFFICIAL REPORT SHEET ============ */}
      <article className="relative rounded-sm border border-border bg-white text-slate-900 shadow-elegant print:shadow-none print:border-0 overflow-hidden">
        {/* Watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.035] select-none"
        >
          <Brain className="h-[520px] w-[520px]" />
        </div>

        {/* Colored top rule (hospital letterhead) */}
        <div className="h-2 gradient-primary" />

        <div className="relative p-8 md:p-12">
          {/* Letterhead */}
          <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md gradient-primary shadow-elegant shrink-0">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight leading-none font-display">
                  NeuroScan Medical Center
                </h1>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-1">
                  Department of Neuro-Radiology
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-snug">
                  1 Radiology Way, Boston, MA 02115 · +1 (555) 908-2210<br />
                  reports@neuroscan.med · License #MA-RAD-4482
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="inline-block border border-slate-900 px-3 py-2">
                <p className="text-[9px] uppercase tracking-widest text-slate-500">
                  Report No.
                </p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {reportNo}
                </p>
              </div>
              <p className="mt-3">
                <span className="text-slate-500">Issued: </span>
                <span className="font-medium">{today.toLocaleDateString()}</span>
              </p>
              <p>
                <span className="text-slate-500">Status: </span>
                <span className="font-medium text-emerald-700">FINAL</span>
              </p>
            </div>
          </header>

          {/* Title band */}
          <div className="my-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
              Diagnostic Imaging Report
            </p>
            <h2 className="text-2xl font-bold font-display mt-1">
              Brain MRI · AI-Assisted Analysis
            </h2>
          </div>

          {/* Patient info block */}
          <section className="rounded-sm border border-slate-300 bg-slate-50/60">
            <div className="px-4 py-2 border-b border-slate-300 bg-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-700">
                Patient Information
              </p>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 p-5 text-sm">
              <Field label="Full Name" value={patient.name} />
              <Field label="Patient ID" value={patient.id} mono />
              <Field label="Age / Sex" value={`${patient.age} · ${patient.sex}`} />
              <Field label="Scan Date" value={patient.scanDate} />
              <Field label="Referring Physician" value={patient.physician} />
              <Field label="Modality" value="MRI · T1 + T2 FLAIR" />
              <Field label="Study" value="Brain, contrast-enhanced" />
              <Field label="Model" value="NeuroNet v3.2" mono />
            </dl>
          </section>

          {/* MRI Image + Diagnosis side-by-side */}
          <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* MRI Image */}
            <figure className="border border-slate-300 rounded-sm overflow-hidden">
              <figcaption className="px-4 py-2 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-700">
                  MRI Scan
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  AX · T1w
                </span>
              </figcaption>
              <div className="relative aspect-square bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 grid place-items-center">
                <Brain className="h-28 w-28 text-slate-300/70" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-300/80">
                    R
                  </div>
                  <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-300/80">
                    L
                  </div>
                  <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-300/80">
                    SLICE 24/48
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-300/80">
                    TE 90 · TR 4200
                  </div>
                </div>
                {patient.diagnosis !== "Healthy" && (
                  <div className="absolute h-16 w-16 rounded-full border-2 border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.6)] animate-pulse"
                       style={{ top: "36%", left: "42%" }} />
                )}
              </div>
            </figure>

            {/* AI Diagnosis */}
            <div className="border border-slate-300 rounded-sm overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-slate-300 bg-slate-100">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-700">
                  AI Diagnosis
                </p>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className={`rounded-md border p-4 ${diagnosisTone(patient.diagnosis)}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                    Prediction
                  </p>
                  <p className="text-xl font-bold mt-0.5 leading-tight">
                    {patient.diagnosis === "Healthy"
                      ? "No tumor detected"
                      : `${patient.diagnosis} detected`}
                  </p>
                </div>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="Classification" value={patient.diagnosis} />
                  <Row
                    label="Certainty"
                    value={
                      patient.confidence > 95
                        ? "Very High"
                        : patient.confidence > 90
                        ? "High"
                        : "Moderate"
                    }
                  />
                  <Row
                    label="Priority"
                    value={patient.diagnosis === "Healthy" ? "Routine" : "Urgent review"}
                  />
                </dl>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Confidence Score</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {patient.confidence.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full gradient-primary"
                      style={{ width: `${patient.confidence}%` }}
                    />
                  </div>
                </div>

                {patient.notes && (
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                      Observations
                    </p>
                    <p className="text-sm text-slate-700">{patient.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ============ Doctor's Notes & Signature ============ */}
          <section className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                Doctor's Notes & Signature
              </h3>
              <div className="flex-1 h-px bg-slate-300" />
            </div>

            <div className="rounded-sm border border-slate-300">
              {/* Notes textarea */}
              <div className="p-4">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Physician Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write clinical impression, correlation with symptoms, and recommended next steps..."
                  rows={5}
                  className="mt-2 w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed print:placeholder:opacity-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 27px, #e2e8f0 27px, #e2e8f0 28px)",
                    lineHeight: "28px",
                    paddingTop: "0px",
                  }}
                />
              </div>

              {/* Signature row */}
              <div className="grid grid-cols-1 md:grid-cols-3 border-t border-slate-300 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                <div className="p-4">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    Signature
                  </label>
                  <input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Dr. ______________"
                    className="mt-6 w-full bg-transparent border-b border-slate-900 pb-1 font-display italic text-lg focus:outline-none text-slate-900 placeholder:text-slate-400 placeholder:italic print:placeholder:opacity-0"
                  />
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                    Reviewing Radiologist
                  </p>
                </div>
                <div className="p-4">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    Date
                  </label>
                  <p className="mt-6 border-b border-slate-900 pb-1 text-sm text-slate-900">
                    {today.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                    Report Date
                  </p>
                </div>
                <div className="p-4 flex flex-col items-start justify-between">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    Official Seal
                  </label>
                  <div className="mt-2 self-center relative h-24 w-24 rounded-full border-2 border-emerald-700/70 grid place-items-center rotate-[-8deg]">
                    <div className="absolute inset-1 rounded-full border border-dashed border-emerald-700/50" />
                    <div className="text-center leading-tight text-emerald-700">
                      <CheckCircle2 className="h-5 w-5 mx-auto" />
                      <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5">
                        Verified
                      </p>
                      <p className="text-[7px] font-mono">
                        {today.getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Legal footer */}
          <footer className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 leading-relaxed">
            <p className="italic">
              This report was generated with AI assistance (NeuroNet v3.2) and
              must be reviewed and validated by a licensed radiologist prior to
              any clinical decision-making. NeuroScan is a decision-support tool
              and does not replace professional medical judgment. Confidential —
              contains protected health information under HIPAA.
            </p>
            <div className="flex justify-between mt-3">
              <span>NeuroScan Medical Center · Confidential</span>
              <span className="font-mono">{reportNo}</span>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
        {label}
      </dt>
      <dd className={`mt-0.5 text-slate-900 ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
