import { cn } from "@/lib/utils";

/**
 * Hand-built product mockups (no stock imagery).
 * Each key renders a screen of the Nazzim system as it looks inside a sheet.
 */
export type VisualKey = "dashboard" | "habits" | "tasks" | "goals" | "progress" | "system";

export const visualTitles: Record<VisualKey, string> = {
  dashboard: "اللوحة الرئيسية",
  habits: "متابعة العادات",
  tasks: "إدارة المهام",
  goals: "متابعة الأهداف",
  progress: "نظرة على التقدم",
  system: "النظام الكامل (Google Sheets)",
};

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-surface/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong/70" />
          <span className="size-2.5 rounded-full bg-border-strong/40" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
        <span className="latin text-[10px] font-semibold tracking-widest text-muted-foreground">
          NAZZIM
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const week = ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

function HabitGrid({ rows }: { rows: { name: string; days: boolean[]; rate: number }[] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_repeat(7,minmax(0,1.1rem))_2.6rem] items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>العادة</span>
        {week.map((d) => (
          <span key={d} className="text-center">
            {d}
          </span>
        ))}
        <span className="text-center">%</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[1fr_repeat(7,minmax(0,1.1rem))_2.6rem] items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2 py-1.5"
        >
          <span className="truncate text-[11px] font-medium">{row.name}</span>
          {row.days.map((done, i) => (
            <span
              key={i}
              className={cn(
                "mx-auto grid size-4 place-items-center rounded-[5px] text-[9px] font-bold",
                done ? "bg-primary text-primary-foreground" : "bg-surface text-transparent",
              )}
            >
              ✓
            </span>
          ))}
          <span className="text-center text-[10px] font-semibold tabular-nums text-primary">
            {row.rate}
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskList({ items }: { items: { title: string; tag: string; done?: boolean }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li
          key={t.title}
          className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background px-2.5 py-2"
        >
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded-[5px] border text-[9px] font-bold",
              t.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border-strong text-transparent",
            )}
          >
            ✓
          </span>
          <span
            className={cn(
              "flex-1 truncate text-[11px]",
              t.done && "text-muted-foreground line-through",
            )}
          >
            {t.title}
          </span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] text-muted-foreground">
            {t.tag}
          </span>
        </li>
      ))}
    </ul>
  );
}

function GoalList({ items }: { items: { title: string; step: string; value: number }[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((g) => (
        <div key={g.title} className="rounded-xl border border-border/70 bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold">{g.title}</p>
            <span className="text-[10px] font-semibold tabular-nums text-primary">{g.value}%</span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">الخطوة الحالية: {g.step}</p>
          <div className="mt-2">
            <Bar value={g.value} />
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyChart() {
  const values = [55, 70, 45, 85, 60, 95, 78];
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <p className="text-[11px] font-semibold">النظرة الأسبوعية</p>
      <div className="mt-3 flex h-24 items-end justify-between gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className={cn("w-full rounded-t-[4px]", i === 5 ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${v}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{week[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductVisual({
  variant,
  className,
}: {
  variant: string;
  className?: string;
}) {
  const key = (["dashboard", "habits", "tasks", "goals", "progress", "system"] as VisualKey[]).includes(
    variant as VisualKey,
  )
    ? (variant as VisualKey)
    : "dashboard";

  return (
    <div className={className}>
      <Chrome title={visualTitles[key]}>
        {key === "dashboard" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="مهام اليوم" value="6 / 8" />
              <Stat label="نسبة الإنجاز" value="82%" />
              <Stat label="أطول سلسلة" value="14 يوم" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">مهام اليوم</p>
                <TaskList
                  items={[
                    { title: "مراجعة خطة الأسبوع", tag: "عمل", done: true },
                    { title: "قراءة 20 صفحة", tag: "شخصي" },
                    { title: "تمرين المشي", tag: "صحة", done: true },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">العادات</p>
                <HabitGrid
                  rows={[
                    { name: "قراءة", days: [true, true, false, true, true, true, false], rate: 71 },
                    { name: "رياضة", days: [true, false, true, true, false, true, true], rate: 71 },
                    { name: "نوم مبكر", days: [true, true, true, false, true, true, true], rate: 86 },
                  ]}
                />
              </div>
            </div>
            <WeeklyChart />
          </div>
        )}

        {key === "habits" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="عادات نشطة" value="5" />
              <Stat label="الالتزام" value="79%" hint="هذا الأسبوع" />
              <Stat label="السلسلة" value="14" hint="يوم" />
            </div>
            <HabitGrid
              rows={[
                { name: "قراءة", days: [true, true, false, true, true, true, false], rate: 71 },
                { name: "رياضة", days: [true, false, true, true, false, true, true], rate: 71 },
                { name: "نوم مبكر", days: [true, true, true, false, true, true, true], rate: 86 },
                { name: "كتابة يومية", days: [false, true, true, true, true, false, true], rate: 71 },
                { name: "ماء", days: [true, true, true, true, true, true, true], rate: 100 },
              ]}
            />
          </div>
        )}

        {key === "tasks" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="اليوم" value="8" />
              <Stat label="مكتملة" value="6" />
              <Stat label="متأخرة" value="1" />
            </div>
            <TaskList
              items={[
                { title: "إنهاء تقرير الشهر", tag: "أولوية عالية" },
                { title: "الرد على البريد", tag: "عمل", done: true },
                { title: "مراجعة الميزانية", tag: "مالي" },
                { title: "تحديث خطة الأسبوع", tag: "تخطيط", done: true },
                { title: "شراء مستلزمات", tag: "شخصي", done: true },
              ]}
            />
          </div>
        )}

        {key === "goals" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="أهداف" value="4" />
              <Stat label="متوسط التقدم" value="58%" />
              <Stat label="خطوات مكتملة" value="19" />
            </div>
            <GoalList
              items={[
                { title: "قراءة 12 كتابًا", step: "الكتاب السابع", value: 58 },
                { title: "إطلاق المشروع الجانبي", step: "تجهيز الصفحة", value: 40 },
                { title: "تعلّم مهارة جديدة", step: "الوحدة الرابعة", value: 75 },
              ]}
            />
          </div>
        )}

        {key === "progress" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="الإنجاز" value="82%" hint="هذا الأسبوع" />
              <Stat label="العادات" value="79%" />
              <Stat label="الأهداف" value="58%" />
            </div>
            <WeeklyChart />
            <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
              {[
                { label: "مهام مكتملة", value: 82 },
                { label: "التزام العادات", value: 79 },
                { label: "تقدّم الأهداف", value: 58 },
              ].map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold tabular-nums">{r.value}%</span>
                  </div>
                  <Bar value={r.value} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Chrome>
    </div>
  );
}
