'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import LayoutShell from './LayoutShell';
import { getBrowserClient } from '@/lib/supabase/client';
import useUserRole from '@/app/hooks/useUserRole';
import Link from 'next/link';

export default function OnCallViewer() {
  const supabase = getBrowserClient();
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [plan, setPlan] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [providerData, setProviderData] = useState<any | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ criteria: string; rows: number } | null>(null);

  const role = useUserRole();

  // Treat an on-call "day" as 7:00am local → 6:59am next day
  const effectiveOnCallDate = (dt: Date) => {
    const d = new Date(dt);
    if (d.getHours() < 7) {
      d.setDate(d.getDate() - 1);
    }
    // Normalize to noon to avoid DST/compare issues when we only need Y-M-D
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const cleanPhone = (s: string) => String(s ?? '').replace(/[^\d+]/g, '');
  const toWhatsAppNumber = (raw: string) => {
    const c = cleanPhone(raw);
    const digits = c.startsWith('+') ? c.slice(1).replace(/\D/g, '') : c.replace(/\D/g, '');
    return digits.length === 10 ? `1${digits}` : digits; // assume +1 if 10 digits (US/PR)
  };


  const copyPrimary = async () => {
    if (providerData?.phone_number) {
      await navigator.clipboard.writeText(providerData.phone_number);
      toast.success('Primary phone copied');
    }
  };

  const copySecondary = async () => {
    if (providerData?.second_phone) {
      await navigator.clipboard.writeText(providerData.second_phone);
      toast.success('Resident phone copied');
    }
  };

  const debugRecord = () => {
    if (providerData) {
      console.debug('[OnCallViewer] record:', providerData);
      toast.success('Opened console: on‑call record');
    }
  };

  const dirHref = providerData?.provider_name
    ? `/protected/directory?provider=${encodeURIComponent(providerData.provider_name)}`
    : '/protected/directory';

  const specialties = [
    'Cardiology',
    'Gastroenterology',
    'General Surgery',
    'Internal Medicine',
    'Obstetrics & Gynecology',
    'Orthopedics',
    'Pediatric Surgery',
    'Vascular Surgery'
  ];

  const plans = [
    'Triple S Advantage/Unattached',
    'Vital',
    '405/M88',
    'PAMG',
    'REMAS',
    'SMA',
    'CSE',
    'In Salud',
    'IPA B',
    'MCS',
  ];

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      const baseDate = effectiveOnCallDate(currentDate);
      const dateString = toYMD(baseDate);

      // If Internal Medicine requires a plan and none is selected, show guidance and skip querying
      if (specialty === 'Internal Medicine' && !plan) {
        setProviderData(null);
        setDebugInfo({ criteria: `specialty=${specialty}, plan=<none>, date=${dateString}`, rows: 0 });
        return;
      }

      let query = supabase
        .from('schedules')
        .select('provider_name, show_second_phone, healthcare_plan, second_phone_pref')
        .eq('on_call_date', dateString)
        .eq('specialty', specialty);

      if (specialty === 'Internal Medicine') {
        query = query.eq('healthcare_plan', plan);
      } else {
        query = query.is('healthcare_plan', null);
      }

      const { data: scheduleData, error: scheduleError } = await query;
      if (scheduleError) {
        console.error('Schedules fetch error:', scheduleError);
        toast.error('Error fetching schedule: ' + scheduleError.message);
        setProviderData(null);
        return;
      }
      const rows = Array.isArray(scheduleData) ? scheduleData.length : 0;
      setDebugInfo({ criteria: `specialty=${specialty}, plan=${specialty === 'Internal Medicine' ? (plan || '—') : 'n/a'}, date=${dateString}`, rows });

      if (!scheduleData || scheduleData.length === 0) {
        toast.error('No provider found for this selection.');
        setProviderData(null);
        return;
      }
      const record = scheduleData[0];

      const { data: directoryList } = await supabase
        .from('directory')
        .select('phone_number')
        .eq('provider_name', record.provider_name);

      const directoryData = Array.isArray(directoryList) ? directoryList[0] : null;

      let secondPhone = null;
      let secondSource: string | null = null;
      if (record.show_second_phone) {
        const pref = (record.second_phone_pref as 'auto' | 'pa' | 'residency') ?? 'auto';
        const lookupOrder =
          pref === 'pa'
            ? [`${specialty} PA Phone`]
            : pref === 'residency'
              ? [`${specialty} Residency`]
              : [`${specialty} PA Phone`, `${specialty} Residency`];

        const { data: secondPhoneList, error: secondErr } = await supabase
          .from('directory')
          .select('provider_name, phone_number')
          .in('provider_name', lookupOrder);

        if (secondErr) {
          console.error('Second phone fetch error:', secondErr);
        }
        if (Array.isArray(secondPhoneList) && secondPhoneList.length > 0) {
          const foundByOrder = lookupOrder
            .map(name => secondPhoneList.find(r => r.provider_name === name && r.phone_number))
            .find(Boolean) as { provider_name: string; phone_number: string } | undefined;

          if (foundByOrder) {
            secondPhone = foundByOrder.phone_number;
            secondSource = foundByOrder.provider_name;
          }
        }
      }

      setProviderData({
        ...record,
        phone_number: directoryData?.phone_number || null,
        second_phone: secondPhone,
        _second_phone_source: secondSource
      });
    };

    fetchSchedule();
  }, [specialty, plan, currentDate]);

  const secondPhoneLabel = (() => {
    const s = providerData?._second_phone_source || '';
    if (/PA/i.test(s)) return 'PA';
    if (/Residency/i.test(s)) return 'Resident';
    return 'Resident/PA';
  })();

  return (
    <LayoutShell>
      <div className="app-container px-4 py-6 max-w-[400px] mx-auto bg-gray-100 dark:bg-black">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">On Call List</h2>
          {role === 'admin' && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Admin
            </span>
          )}
          {role === 'scheduler' && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
              Scheduler
            </span>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1">Select a Specialty:</label>
          <select
            value={specialty}
            onChange={(e) => {
              const newSpecialty = e.target.value;
              setSpecialty(newSpecialty);
              if (newSpecialty !== 'Internal Medicine') setPlan('');
            }}
            className="w-full p-2 border border-gray-300 rounded"
          >
            {specialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {specialty === 'Internal Medicine' && (
          <div className="mb-4">
            <label className="block mb-1">Select Healthcare Plan:</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="" disabled>Select Healthcare Plan</option>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {!plan && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Select a healthcare plan to see today’s provider.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={handlePrevDay} className="px-3 py-1 bg-blue-500 text-white rounded">&lt;</button>
          <div>
            {formatDate(effectiveOnCallDate(currentDate))}
            <div className="text-[11px] text-gray-500 dark:text-gray-400">7:00am – 6:59am window</div>
          </div>
          <button onClick={handleNextDay} className="px-3 py-1 bg-blue-500 text-white rounded">&gt;</button>
        </div>

        <div className="text-center mb-4">
          <button onClick={handleToday} className="px-4 py-2 bg-gray-700 text-white rounded">Today</button>
        </div>

        <div id="schedule-container" className="mt-6">
          {providerData ? (
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md text-center">
              <h3 className="text-2xl font-bold">Dr. {providerData.provider_name}</h3>
              {providerData.healthcare_plan && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Plan: {providerData.healthcare_plan}
                </p>
              )}
              {providerData.phone_number && (
                <div className="mt-2 space-y-1">
                  <p className="text-2xl font-semibold text-black dark:text-white">Phone: {providerData.phone_number}</p>
                  <div className="flex justify-center gap-4 mt-2">
                    <a href={`tel:${cleanPhone(providerData.phone_number)}`} title="Call" className="text-blue-500 hover:text-blue-700">
                      <img src="/icons/phone.svg" alt="Call" className="w-10 h-10" />
                    </a>
                    <a href={`sms:${cleanPhone(providerData.phone_number)}`} title="Text" className="text-green-500 hover:text-green-700">
                      <img src="/icons/imessage.svg" alt="iMessage" className="w-10 h-10" />
                    </a>
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(providerData.phone_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="text-green-600 hover:text-green-800"
                    >
                      <img src="/icons/whatsapp.svg" alt="WhatsApp" className="w-10 h-10" />
                    </a>
                  </div>
                </div>
              )}
              {providerData.show_second_phone && providerData.second_phone && (
                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-semibold text-black dark:text-white">
                    {secondPhoneLabel}: {providerData.second_phone}
                  </p>
                  {providerData._second_phone_source && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ({providerData._second_phone_source})
                    </p>
                  )}
                  <div className="flex justify-center gap-4 mt-2">
                    <a href={`tel:${cleanPhone(providerData.second_phone)}`} title="Call" className="text-blue-500 hover:text-blue-700">
                      <img src="/icons/phone.svg" alt="Call" className="w-10 h-10" />
                    </a>
                    <a href={`sms:${cleanPhone(providerData.second_phone)}`} title="Text" className="text-green-500 hover:text-green-700">
                      <img src="/icons/imessage.svg" alt="iMessage" className="w-10 h-10" />
                    </a>
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(providerData.second_phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="text-green-600 hover:text-green-800"
                    >
                      <img src="/icons/whatsapp.svg" alt="WhatsApp" className="w-10 h-10" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              {specialty === 'Internal Medicine' && !plan
                ? 'Please select a healthcare plan.'
                : 'No provider found for this selection.'}
            </p>
          )}
        </div>

        {(role === 'admin' || role === 'scheduler') && debugInfo && (
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
            <div>Query: <code className="font-mono">{debugInfo.criteria}</code></div>
            <div>Schedule rows: <strong>{debugInfo.rows}</strong></div>
          </div>
        )}

        {role === 'admin' && (
          <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Admin Tools</h3>
              <span className="text-xs text-gray-500">Only visible to admins</span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={copyPrimary}
                disabled={!providerData?.phone_number}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Copy primary phone
              </button>
              <button
                onClick={copySecondary}
                disabled={!providerData?.second_phone}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Copy resident phone
              </button>
              <Link
                href="/protected/admin/access?tab=integrity"
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Open Data Integrity
              </Link>
              <Link
                href="/protected/admin/access?tab=usage"
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Admin Dashboard
              </Link>
              <Link
                href={dirHref}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Open Directory Entry
              </Link>
              <button
                onClick={debugRecord}
                disabled={!providerData}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                View raw record (console)
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              TODO: Wire these to edit routes/actions as you roll them out.
            </p>
          </div>
        )}
        {role === 'scheduler' && (
          <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Scheduler Tools</h3>
              <span className="text-xs text-gray-500">Only visible to schedulers</span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={copyPrimary}
                disabled={!providerData?.phone_number}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Copy primary phone
              </button>
              <button
                onClick={copySecondary}
                disabled={!providerData?.second_phone}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Copy resident phone
              </button>
              <Link
                href="/protected/admin/access?tab=integrity"
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Open Data Integrity
              </Link>
              <Link
                href={dirHref}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Open Directory Entry
              </Link>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tip: Use Data Integrity to spot conflicts/gaps before publishing.
            </p>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}