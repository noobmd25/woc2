'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import LayoutShell from './LayoutShell';
import { getBrowserClient } from '@/lib/supabase/client';
import { usePageRefresh } from '@/components/PullToRefresh';
import useUserRole from '@/app/hooks/useUserRole';
import Link from 'next/link';
import { resolveDirectorySpecialty } from '@/lib/specialtyMapping';
const supabase = getBrowserClient();

export default function OnCallViewer() {
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [plan, setPlan] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [providerData, setProviderData] = useState<any | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ criteria: string; rows: number } | null>(null);

  const role = useUserRole();

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyFetchMeta, setSpecialtyFetchMeta] = useState<{ error?: string; count: number; ts?: number }>({ count: 0 });
  const specialtyToastRef = useRef(false);
  const [specialtyLoading, setSpecialtyLoading] = useState(false); // loading state for refresh control

  const fetchSpecialties = useCallback(async () => {
    specialtyToastRef.current = false; // allow new toast on retry
    setSpecialtyLoading(true);
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('name, show_oncall')
        .eq('show_oncall', true)
        .order('name', { ascending: true });

      if (error) {
        setSpecialties([]);
        setSpecialtyFetchMeta({ error: error.message, count: 0, ts: Date.now() });
        toast.error('Specialties fetch failed: ' + error.message);
        return;
      }
      const names = Array.isArray(data) ? data.map((s: { name: string }) => s.name) : [];
      setSpecialties(names);
      setSpecialtyFetchMeta({ count: names.length, ts: Date.now() });
      if (names.length === 0 && !specialtyToastRef.current) {
        specialtyToastRef.current = true;
        toast.error('No specialties returned (possible RLS / role issue).');
      }
    } finally {
      setSpecialtyLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

  // Register refresh handler (now full page reload instead of partial refetch)
  usePageRefresh(null); // full reload on pull-to-refresh; specialties & schedule refetched via normal lifecycle

  // Toast fallback on render if still empty after first load (avoid spamming)
  useEffect(() => {
    if (specialties.length === 0 && !specialtyFetchMeta.error && specialtyFetchMeta.ts && !specialtyToastRef.current) {
      specialtyToastRef.current = true;
      toast('Specialty list empty. Check RLS / viewer role mapping.');
    }
  }, [specialties, specialtyFetchMeta]);

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

  const dirHref = providerData?.provider_name
    ? `/directory?provider=${encodeURIComponent(providerData.provider_name)}`
    : '/directory';


  const planGateActive = specialty === 'Internal Medicine' && !plan;

  // Add missing navigation handlers
  const handlePrevDay = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  }, []);

  const handleToday = useCallback(() => {
    setCurrentDate(() => new Date());
  }, []);

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
        // select all to be resilient if new columns (cover, covering_provider) are not yet migrated
        .select('*')
        .eq('on_call_date', dateString)
        .eq('specialty', specialty);

      if (specialty === 'Internal Medicine') {
        query = query.eq('healthcare_plan', plan);
      } else {
        query = query.is('healthcare_plan', null);
      }

      const { data: scheduleData, error: scheduleError } = await query;
      if (scheduleError) {
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
        const baseSpec = resolveDirectorySpecialty(specialty);
        const lookupOrder =
          pref === 'pa'
            ? [`${baseSpec} PA Phone`]
            : pref === 'residency'
              ? [`${baseSpec} Residency`]
              : [`${baseSpec} PA Phone`, `${baseSpec} Residency`];

        const { data: secondPhoneList } = await supabase
          .from('directory')
          .select('provider_name, phone_number')
          .in('provider_name', lookupOrder);

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

      // If cover is enabled, try to fetch the cover provider phone number
      let coverPhone: string | null = null;
      let coverProviderName: string | null = null;
      if (record?.cover && record?.covering_provider) {
        coverProviderName = record.covering_provider as string;
        const { data: coverDir } = await supabase
          .from('directory')
          .select('phone_number')
          .eq('provider_name', coverProviderName);
        const coverDirRow = Array.isArray(coverDir) ? coverDir[0] : null;
        coverPhone = coverDirRow?.phone_number ?? null;
      }

      setProviderData({
        ...record,
        phone_number: directoryData?.phone_number || null,
        second_phone: secondPhone,
        _second_phone_source: secondSource,
        cover_phone: coverPhone,
        cover_provider_name: coverProviderName,
      });
    };

    fetchSchedule();
  }, [specialty, plan, currentDate, supabase]);

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
          <div className="flex items-center justify-between mb-1">
            <label className="block">Select a Specialty:</label>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
              {specialtyFetchMeta.ts && !specialtyLoading && (
                <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                  Updated {new Date(specialtyFetchMeta.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => fetchSpecialties()}
                disabled={specialtyLoading}
                className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh specialties"
              >
                {specialtyLoading ? '...' : 'Refresh'}
              </button>
            </div>
          </div>
          {specialties.length === 0 && (
            <div className="mb-2 p-2 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {specialtyFetchMeta.error
                ? `Error loading specialties: ${specialtyFetchMeta.error}`
                : 'No specialties available. Viewer role may lack RLS select permission.'}
              <div className="mt-1 flex gap-2">
                <button
                  onClick={fetchSpecialties}
                  className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Retry
                </button>
                {role === 'admin' && (
                  <button
                    onClick={() => {
                      toast(JSON.stringify({ meta: specialtyFetchMeta }, null, 2));
                    }}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Debug Meta
                  </button>
                )}
              </div>
            </div>
          )}
          <select
            value={specialty}
            onChange={(e) => {
              const newSpecialty = e.target.value;
              setSpecialty(newSpecialty);
              if (newSpecialty !== 'Internal Medicine') setPlan('');
            }}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={specialties.length === 0}
          >
            {specialties.length === 0 && <option value="">(none)</option>}
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
              {['Triple S Advantage/Unattached','Vital','405/M88','PAMG','REMAS','SMA','CSE','In Salud','IPA B','MCS'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="mt-2 flex gap-2 justify-end">
              <Link
                href="/lookup/mmm-pcp"
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#009c94] hover:bg-[#007F77] rounded shadow-sm"
              >
                MMM Group Lookup
              </Link>
              <Link
                href="/lookup/vital-groups"
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#5c5ca2] hover:bg-[#4a4a88] rounded shadow-sm"
              >
                Vital Group Lookup
              </Link>
            </div>
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
            {(() => { const d = effectiveOnCallDate(currentDate); return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); })()}
            <div className="text-[11px] text-gray-500 dark:text-gray-400">7:00am – 6:59am window</div>
          </div>
          <button onClick={handleNextDay} className="px-3 py-1 bg-blue-500 text-white rounded">&gt;</button>
        </div>
        <div className="text-center mb-4">
          <button onClick={handleToday} className="px-4 py-2 bg-gray-700 text-white rounded">Today</button>
        </div>

        {/* Schedule / Provider block with interaction gate */}
        <div className={`relative ${planGateActive ? 'opacity-60' : ''}`}>
          {planGateActive && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-transparent cursor-not-allowed"
              onClick={() => toast.error('Select a healthcare plan first.')}
            >
              <span className="text-xs text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 px-2 py-1 rounded">
                Plan required
              </span>
            </div>
          )}
          <div id="schedule-container" className="mt-6 pointer-events-auto">
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
        </div>

        {/* Cover physician section */}
        {providerData?.cover && providerData?.cover_provider_name && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Call cover physician</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold">Dr. {providerData.cover_provider_name}</p>
                {!providerData.cover_phone && (
                  <p className="text-xs text-gray-500">No phone found in directory</p>
                )}
              </div>
              {providerData.cover_phone && (
                <div className="flex space-x-8">
                  <a href={`tel:${cleanPhone(providerData.cover_phone)}`} title="Call" className="text-blue-500 hover:text-blue-700">
                    <img src="/icons/phone.svg" alt="Call" className="w-10 h-10" />
                  </a>
                  <a href={`sms:${cleanPhone(providerData.cover_phone)}`} title="Text" className="text-green-500 hover:text-green-700">
                    <img src="/icons/imessage.svg" alt="iMessage" className="w-10 h-10" />
                  </a>
                  <a
                    href={`https://wa.me/${toWhatsAppNumber(providerData.cover_phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="text-green-600 hover:text-green-800"
                  >
                    <img src="/icons/whatsapp.svg" alt="WhatsApp" className="w-10 h-10" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

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
                href="/admin?tab=integrity"
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
              >
                Open Data Integrity
              </Link>
              <Link
                href="/admin?tab=usage"
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
                href="/admin?tab=integrity"
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
