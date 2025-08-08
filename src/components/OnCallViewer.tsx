'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import LayoutShell from './LayoutShell';
import { supabase } from '@/lib/supabaseClient';

export default function OnCallViewer() {
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [plan, setPlan] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [providerData, setProviderData] = useState<any | null>(null);

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
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      let query = supabase
        .from('schedules')
        .select('provider_name, show_second_phone, healthcare_plan')
        .eq('on_call_date', dateString)
        .eq('specialty', specialty);

      if (specialty === 'Internal Medicine') {
        if (!plan) return;
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
      if (record.show_second_phone) {
        const { data: secondPhoneList } = await supabase
          .from('directory')
          .select('phone_number')
          .eq('provider_name', `${specialty} Residency`);

        const secondPhoneData = Array.isArray(secondPhoneList) ? secondPhoneList[0] : null;
        secondPhone = secondPhoneData?.phone_number || null;
      }

      setProviderData({
        ...record,
        phone_number: directoryData?.phone_number || null,
        second_phone: secondPhone
      });
    };

    fetchSchedule();
  }, [specialty, plan, currentDate]);

  return (
    <LayoutShell>
      <div className="app-container px-4 py-6 max-w-[400px] mx-auto bg-gray-100 dark:bg-black">        <h2 className="text-center text-xl font-semibold mb-4">On Call List</h2>

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
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={handlePrevDay} className="px-3 py-1 bg-blue-500 text-white rounded">&lt;</button>
          <div>{formatDate(currentDate)}</div>
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
                    <a href={`tel:${providerData.phone_number}`} title="Call" className="text-blue-500 hover:text-blue-700">
                      <img src="/icons/phone.svg" alt="Call" className="w-10 h-10" />
                    </a>
                    <a href={`sms:${providerData.phone_number}`} title="Text" className="text-green-500 hover:text-green-700">
                      <img src="/icons/imessage.svg" alt="iMessage" className="w-10 h-10" />
                    </a>
                    <a
                      href={`https://wa.me/${providerData.phone_number.replace(/\D/g, '')}`}
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
                  <p className="text-2xl font-semibold text-black dark:text-white">Resident: {providerData.second_phone}</p>
                  <div className="flex justify-center gap-4 mt-2">
                    <a href={`tel:${providerData.second_phone}`} title="Call" className="text-blue-500 hover:text-blue-700">
                      <img src="/icons/phone.svg" alt="Call" className="w-10 h-10" />
                    </a>
                    <a href={`sms:${providerData.second_phone}`} title="Text" className="text-green-500 hover:text-green-700">
                      <img src="/icons/imessage.svg" alt="iMessage" className="w-10 h-10" />
                    </a>
                    <a
                      href={`https://wa.me/${providerData.second_phone.replace(/\D/g, '')}`}
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
            <p className="text-center text-gray-500">No provider found for this selection.</p>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}