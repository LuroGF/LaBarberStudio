export type StatsAppointment = {
  starts_at: string;
  service_name: string;
  price_cents: number;
  status: string;
};

export type ServiceStat = { name: string; count: number; percentage: number };

export function buildAdminStats(appointments: StatsAppointment[], now = new Date()) {
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const inRange = (item: StatsAppointment, start: Date, end: Date) => {
    const time = new Date(item.starts_at).getTime();
    return time >= start.getTime() && time < end.getTime();
  };
  const current = appointments.filter((item) => inRange(item, currentStart, now));
  const previous = appointments.filter((item) => inRange(item, previousStart, currentStart));
  const count = (status: string) => current.filter((item) => item.status === status).length;
  const completedRevenue = current.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.price_cents, 0);
  const previousRevenue = previous.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.price_cents, 0);
  const completed = count("completed");
  const cancelled = count("cancelled");
  const noShow = count("no_show");
  const resolved = completed + cancelled + noShow;

  const serviceCounts = new Map<string, number>();
  current
    .filter((item) => !["cancelled", "rejected", "expired"].includes(item.status))
    .forEach((item) => serviceCounts.set(item.service_name, (serviceCounts.get(item.service_name) ?? 0) + 1));
  const serviceTotal = [...serviceCounts.values()].reduce((sum, value) => sum + value, 0);
  const topServices: ServiceStat[] = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 4)
    .map(([name, serviceCount]) => ({
      name,
      count: serviceCount,
      percentage: serviceTotal === 0 ? 0 : Math.round((serviceCount / serviceTotal) * 100),
    }));

  return {
    completedRevenue,
    revenueChange: previousRevenue === 0 ? null : Math.round(((completedRevenue - previousRevenue) / previousRevenue) * 100),
    completed,
    cancelled,
    noShow,
    completionRate: resolved === 0 ? null : Math.round((completed / resolved) * 100),
    topServices,
  };
}
