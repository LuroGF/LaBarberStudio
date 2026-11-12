"use client";

import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const dateValue = (date: Date) => format(date, "yyyy-MM-dd");

export function BookingCalendar({ minDate, maxDate, value, onChange }: { minDate: string; maxDate: string; value: string; onChange: (value: string) => void }) {
  const min = parseDate(minDate);
  const max = parseDate(maxDate);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDate(value || minDate)));
  const firstAllowedMonth = startOfMonth(min);
  const lastAllowedMonth = startOfMonth(max);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }) });

  return (
    <div className="rounded-3xl border border-white/10 bg-[#181818] p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" disabled={!isAfter(visibleMonth, firstAllowedMonth)} onClick={() => setVisibleMonth((month) => addMonths(month, -1))} className="grid size-11 place-items-center rounded-full border border-white/10 transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft size={19} /></button>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">{format(visibleMonth, "MMMM yyyy", { locale: es })}</p>
        <button type="button" aria-label="Mes siguiente" disabled={!isBefore(visibleMonth, lastAllowedMonth)} onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="grid size-11 place-items-center rounded-full border border-white/10 transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-25"><ChevronRight size={19} /></button>
      </div>
      <div className="mt-5 grid grid-cols-7 text-center text-[0.65rem] font-bold uppercase tracking-widest text-muted">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <span key={day} className="py-2">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const disabled = !isSameMonth(day, visibleMonth) || isBefore(day, min) || isAfter(day, max);
          const selected = value ? isSameDay(day, parseDate(value)) : false;
          return <button key={dateValue(day)} type="button" disabled={disabled} aria-pressed={selected} aria-label={format(day, "EEEE d 'de' MMMM", { locale: es })} onClick={() => onChange(dateValue(day))} className={`aspect-square rounded-xl text-sm font-semibold transition sm:text-base ${selected ? "bg-gold text-black shadow-[0_8px_24px_rgba(201,164,92,0.22)]" : disabled ? "cursor-not-allowed text-white/15" : "text-white hover:bg-white/10 hover:text-gold-light"}`}>{format(day, "d")}</button>;
        })}
      </div>
    </div>
  );
}

