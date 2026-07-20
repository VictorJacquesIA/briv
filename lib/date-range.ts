import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type DateRangeParams = {
  range?: string;
  from?: string;
  to?: string;
};

export function resolveDateRange(params: DateRangeParams) {
  const now = new Date();

  if (params.range === "custom" && params.from && params.to) {
    return {
      from: startOfDay(new Date(params.from)).toISOString(),
      to: endOfDay(new Date(params.to)).toISOString(),
    };
  }

  if (params.range === "semana") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    };
  }

  if (params.range === "mes") {
    return {
      from: startOfMonth(now).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }

  return {
    from: startOfDay(now).toISOString(),
    to: endOfDay(now).toISOString(),
  };
}
