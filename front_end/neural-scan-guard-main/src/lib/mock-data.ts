import type { AuthUser } from "./auth";

export type Diagnosis = "Healthy" | "Glioma" | "Meningioma" | "Pituitary";

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  scanDate: string;
  diagnosis: Diagnosis;
  confidence: number;
  physician: string;
  notes?: string;
}

export const patients: PatientRecord[] = [
  { id: "PT-10248", name: "Amelia Hart", age: 54, sex: "F", scanDate: "2026-07-02", diagnosis: "Glioma", confidence: 96.4, physician: "Dr. R. Okafor", notes: "Left temporal lobe, ~2.3cm" },
  { id: "PT-10247", name: "Marcus Chen", age: 41, sex: "M", scanDate: "2026-07-01", diagnosis: "Healthy", confidence: 99.1, physician: "Dr. L. Nakamura" },
  { id: "PT-10246", name: "Sofia Alvarez", age: 63, sex: "F", scanDate: "2026-06-30", diagnosis: "Meningioma", confidence: 92.8, physician: "Dr. R. Okafor", notes: "Right frontal, well-defined" },
  { id: "PT-10245", name: "James Whitaker", age: 37, sex: "M", scanDate: "2026-06-30", diagnosis: "Pituitary", confidence: 88.5, physician: "Dr. E. Bianchi" },
  { id: "PT-10244", name: "Priya Raman", age: 29, sex: "F", scanDate: "2026-06-29", diagnosis: "Healthy", confidence: 98.7, physician: "Dr. L. Nakamura" },
  { id: "PT-10243", name: "Oliver Bennet", age: 58, sex: "M", scanDate: "2026-06-28", diagnosis: "Glioma", confidence: 94.2, physician: "Dr. E. Bianchi", notes: "Requires follow-up MRI in 4 weeks" },
  { id: "PT-10242", name: "Yuki Tanaka", age: 46, sex: "F", scanDate: "2026-06-27", diagnosis: "Meningioma", confidence: 90.6, physician: "Dr. R. Okafor" },
  { id: "PT-10241", name: "Elena Rossi", age: 52, sex: "F", scanDate: "2026-06-26", diagnosis: "Healthy", confidence: 97.3, physician: "Dr. L. Nakamura" },
  { id: "PT-10240", name: "David Kim", age: 33, sex: "M", scanDate: "2026-06-25", diagnosis: "Pituitary", confidence: 91.4, physician: "Dr. E. Bianchi" },
  { id: "PT-10239", name: "Fatima Al-Rashid", age: 61, sex: "F", scanDate: "2026-06-24", diagnosis: "Glioma", confidence: 95.8, physician: "Dr. R. Okafor" },
  { id: "PT-10238", name: "Noah Peterson", age: 44, sex: "M", scanDate: "2026-06-23", diagnosis: "Healthy", confidence: 98.2, physician: "Dr. R. Okafor" },
  { id: "PT-10237", name: "Chloe Martin", age: 35, sex: "F", scanDate: "2026-06-22", diagnosis: "Meningioma", confidence: 89.7, physician: "Dr. L. Nakamura" },
  { id: "PT-10236", name: "Ahmed Nasser", age: 49, sex: "M", scanDate: "2026-06-21", diagnosis: "Healthy", confidence: 97.9, physician: "Dr. E. Bianchi" },
  { id: "PT-10235", name: "Isabella Rossi", age: 27, sex: "F", scanDate: "2026-06-20", diagnosis: "Pituitary", confidence: 90.2, physician: "Dr. R. Okafor" },
  { id: "PT-10234", name: "Liam O'Connor", age: 55, sex: "M", scanDate: "2026-06-19", diagnosis: "Glioma", confidence: 93.6, physician: "Dr. L. Nakamura" },
];

export const scanVolume = [
  { day: "Mon", scans: 42, positive: 11 },
  { day: "Tue", scans: 51, positive: 14 },
  { day: "Wed", scans: 38, positive: 9 },
  { day: "Thu", scans: 63, positive: 18 },
  { day: "Fri", scans: 58, positive: 15 },
  { day: "Sat", scans: 24, positive: 6 },
  { day: "Sun", scans: 19, positive: 4 },
];

export const diagnosisBreakdown = [
  { name: "Healthy", value: 1284, color: "var(--color-chart-3)" },
  { name: "Glioma", value: 342, color: "var(--color-chart-1)" },
  { name: "Meningioma", value: 218, color: "var(--color-chart-2)" },
  { name: "Pituitary", value: 156, color: "var(--color-chart-4)" },
];

export function diagnosisTone(d: Diagnosis) {
  if (d === "Healthy") return "text-success bg-success/10 border-success/20";
  if (d === "Glioma") return "text-destructive bg-destructive/10 border-destructive/20";
  return "text-warning-foreground bg-warning/20 border-warning/30";
}

/** Canonical list of physicians in the department. */
export const departmentDoctors = [
  "Dr. R. Okafor",
  "Dr. L. Nakamura",
  "Dr. E. Bianchi",
] as const;

/**
 * Role-aware patient list.
 * - Head of Department: sees everything (optionally filtered by physician).
 * - Doctor: sees only their own patients.
 */
export function getVisiblePatients(
  user: AuthUser | null,
  physicianFilter?: string | null,
): PatientRecord[] {
  if (!user) return [];
  if (user.role === "head") {
    if (physicianFilter && physicianFilter !== "All") {
      return patients.filter((p) => p.physician === physicianFilter);
    }
    return patients;
  }
  return patients.filter((p) => p.physician === user.physicianName);
}

export interface DoctorStat {
  physician: string;
  total: number;
  positive: number;
  healthy: number;
  avgConfidence: number;
}

export function getDoctorStats(): DoctorStat[] {
  return departmentDoctors.map((physician) => {
    const list = patients.filter((p) => p.physician === physician);
    const positive = list.filter((p) => p.diagnosis !== "Healthy").length;
    const healthy = list.length - positive;
    const avg =
      list.length === 0
        ? 0
        : list.reduce((s, p) => s + p.confidence, 0) / list.length;
    return {
      physician,
      total: list.length,
      positive,
      healthy,
      avgConfidence: avg,
    };
  });
}
