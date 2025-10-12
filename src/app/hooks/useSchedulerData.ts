import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

export function useSchedulerData(selectedDate: Date) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const fromDate = new Date(selectedDate);
      fromDate.setHours(7, 0, 0, 0);
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 1);

      const { data, error } = await supabase
        .from("oncall_schedule")
        .select("*")
        .gte("date", fromDate.toISOString())
        .lt("date", toDate.toISOString());

      if (!error) setEntries(data);
      setLoading(false);
    };

    fetchData();
  }, [selectedDate]);

  const refreshCalendar = async (newDate: Date) => {
    setLoading(true);
    const fromDate = new Date(newDate);
    fromDate.setHours(7, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 1);

    const { data, error } = await supabase
      .from("oncall_schedule")
      .select("*")
      .gte("date", fromDate.toISOString())
      .lt("date", toDate.toISOString());

    if (!error) setEntries(data);
    setLoading(false);
  };

  return { entries, loading, refreshCalendar };
}
